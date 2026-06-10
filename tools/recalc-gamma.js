#!/usr/bin/env node

/**
 * ⚠️ WARNING ⚠️
 *
 * This script recalculates dose rate constants (gamma) from ICRP 107 photon emissions
 * using ICRU 57 conversion coefficients. It then OVERWRITES nuclides.json with the
 * calculated values and stores the PREVIOUS values in cornejo_validation.
 *
 * DANGER: If executed carelessly, this destroys the published Cornejo et al. 2015
 * reference values that are critical for data integrity and validation.
 *
 * DO NOT RUN ROUTINELY. Only use this script if:
 *   - You are explicitly auditing gamma constants against ICRP 107
 *   - You have backed up nuclides.json
 *   - You understand the implications of overwriting cornejo_validation
 *
 * FOR ROUTINE DATA SYNCHRONIZATION: Use tools/generate-data.js instead.
 * It only wraps nuclides.json as JavaScript without modifying any data.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ICRU 57 / ICRP 74 conversion coefficients [energy_MeV, h_H10, h_H007]
// MUST stay identical to PHYSICS.ICRU57 in js/data.js (see provenance notes there).
const ICRU57 = [
  [0.010,   0.061,   7.220],
  [0.015,   0.830,   3.210],
  [0.020,   1.050,   1.810],
  [0.030,   0.810,   0.901],
  [0.040,   0.640,   0.604],
  [0.050,   0.550,   0.502],
  [0.060,   0.510,   0.447],
  [0.080,   0.530,   0.475],
  [0.100,   0.610,   0.577],
  [0.150,   0.890,   0.852],
  [0.200,   1.200,   1.160],
  [0.300,   1.800,   1.750],
  [0.400,   2.380,   2.290],
  [0.500,   2.930,   2.930],
  [0.600,   3.440,   3.440],
  [0.800,   4.380,   4.380],
  [1.000,   5.200,   5.200],
  [1.250,   6.110,   6.110],
  [1.500,   6.910,   6.910],
  [2.000,   8.330,   8.330],
  [3.000,  10.600,  10.600],
  [4.000,  12.500,  12.500],
  [5.000,  14.100,  14.100],
  [6.000,  15.600,  15.600],
  [8.000,  18.200,  18.200],
  [10.000, 20.400,  20.400],
];

const GAMMA_FACTOR = 28.648;  // Cornejo conversion factor

// Log-log interpolation — identical to PHYSICS.interpLogLog in js/data.js, so the
// stored constants match exactly what the app computes from the same photon lists.
function interpLogLog(table, x, colX, colY) {
  if (x <= table[0][colX]) return table[0][colY];
  if (x >= table[table.length - 1][colX]) return table[table.length - 1][colY];
  for (let i = 0; i < table.length - 1; i++) {
    const x0 = table[i][colX], x1 = table[i + 1][colX];
    if (x >= x0 && x <= x1) {
      const y0 = table[i][colY], y1 = table[i + 1][colY];
      if (y0 <= 0 || y1 <= 0) {
        const t = (x - x0) / (x1 - x0);
        return y0 + t * (y1 - y0);
      }
      const t = Math.log(x / x0) / Math.log(x1 / x0);
      return Math.exp(Math.log(y0) + t * (Math.log(y1) - Math.log(y0)));
    }
  }
  return table[table.length - 1][colY];
}

function getH10(EMeV) {
  return interpLogLog(ICRU57, EMeV, 0, 1);
}

function getH007(EMeV) {
  return interpLogLog(ICRU57, EMeV, 0, 2);
}

function calcGammaConstants(photons) {
  let gammaH10 = 0, gammaH007 = 0;

  for (const photon of photons) {
    const energyMeV = photon.energy_keV / 1000;
    const yieldFraction = photon.yield_percent / 100;

    const h10 = getH10(energyMeV);
    const h007 = getH007(energyMeV);

    gammaH10 += yieldFraction * h10;
    gammaH007 += yieldFraction * h007;
  }

  return {
    gamma_H10: Math.round(gammaH10 * GAMMA_FACTOR * 100) / 100,
    gamma_H007: Math.round(gammaH007 * GAMMA_FACTOR * 100) / 100,
  };
}

function main() {
  if (!process.argv.includes('--force')) {
    console.error('ERROR: This script overwrites cornejo_validation fields. Run with --force to confirm you have a backup.');
    process.exit(1);
  }

  const nuclideJsonPath = path.join(__dirname, '../data/nuclides.json');
  const icrpJsonPath = path.join(__dirname, '../data/icrp107-index.json');

  console.log('Loading nuclides.json...');
  const nuclideData = JSON.parse(fs.readFileSync(nuclideJsonPath, 'utf8'));
  const nuclides = nuclideData.nuclides;

  console.log('Loading icrp107-index.json...');
  const icrpFileContent = fs.readFileSync(icrpJsonPath, 'utf8');
  const icrpData = JSON.parse(icrpFileContent);
  const icrpSha256 = crypto.createHash('sha256').update(icrpFileContent).digest('hex');
  const icrpMap = {};
  for (const n of icrpData.nuclides) {
    icrpMap[n.id] = n;
  }

  // Add traceability fields to notes
  nuclideData.notes = nuclideData.notes || {};
  nuclideData.notes.generated_at = new Date().toISOString();
  nuclideData.notes.generated_by_script = 'tools/recalc-gamma.js';
  nuclideData.notes.icrp107_index_sha256 = icrpSha256;

  console.log(`\nRecalculating gamma constants for ${nuclides.length} nuclides...\n`);

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const nuclide of nuclides) {
    const icrpNuclide = icrpMap[nuclide.id];

    if (!icrpNuclide) {
      console.log(`⚠  ${nuclide.id}: not found in ICRP 107 (will skip)`);
      skipped++;
      continue;
    }

    if (!icrpNuclide.photons || icrpNuclide.photons.length === 0) {
      console.log(`⚠  ${nuclide.id}: no photons in ICRP 107 (likely pure beta, keeping Cornejo value)`);
      skipped++;
      continue;
    }

    // Calculate new gamma constants
    const calc = calcGammaConstants(icrpNuclide.photons);
    const oldH10 = nuclide.gamma_H10;
    const oldH007 = nuclide.gamma_H007;

    // Check if values changed significantly
    const h10Diff = Math.abs(calc.gamma_H10 - oldH10) / oldH10 * 100;
    const h007Diff = Math.abs(calc.gamma_H007 - oldH007) / oldH007 * 100;

    // Update values
    nuclide.gamma_H10 = calc.gamma_H10;
    nuclide.gamma_H007 = calc.gamma_H007;

    // Add beta energy fields
    if (icrpNuclide.e_mean_electron_MeV !== undefined && icrpNuclide.e_mean_electron_MeV !== null) {
      nuclide.e_mean_electron_MeV = icrpNuclide.e_mean_electron_MeV;
    }
    if (icrpNuclide.e_max_beta_MeV !== undefined && icrpNuclide.e_max_beta_MeV !== null) {
      nuclide.e_max_beta_MeV = icrpNuclide.e_max_beta_MeV;
    }

    // IMPORTANT: do NOT touch cornejo_validation here. It holds the PUBLISHED
    // values from Cornejo et al. (Radioprotección Nº 83, 2015, Tabla III), set by
    // tools/restore-cornejo-published.js. Overwriting it with previous app values
    // (which may already be recalculated) destroys the audit trail.

    // Update source
    const oldSource = nuclide.source;
    nuclide.source = 'ICRP 107 (photon data) / ICRU 57 (conversion coefficients)';

    updated++;

    // Show differences > 5%
    if (h10Diff > 5 || h007Diff > 5) {
      console.log(`   ${nuclide.id}: H10 ${oldH10} → ${calc.gamma_H10} (${h10Diff.toFixed(1)}% change), H007 ${oldH007} → ${calc.gamma_H007} (${h007Diff.toFixed(1)}% change)`);
    } else {
      console.log(`   ${nuclide.id}: ✓ (H10 ${h10Diff.toFixed(1)}% change, H007 ${h007Diff.toFixed(1)}% change)`);
    }
  }

  // Special case: Y-90 should keep Zanzonico value
  const y90 = nuclides.find(n => n.id === 'Y-90');
  if (y90) {
    y90.gamma_H10 = 0;  // Beta emitter, no significant photon dose
    y90.gamma_H007 = 0;
    y90.source = 'Zanzonico et al. 1999 methodology — container bremsstrahlung estimate (PMMA); container values not tabulated in the publication';
    delete y90.cornejo_validation;
    console.log(`   Y-90: kept as special case (bremsstrahlung)`);
  }

  // Save updated nuclides.json
  console.log(`\nWriting updated ${nuclideJsonPath}...`);
  fs.writeFileSync(nuclideJsonPath, JSON.stringify(nuclideData, null, 2) + '\n', 'utf8');

  // Regenerate nuclides-data.js
  const jsPath = path.join(__dirname, '../data/nuclides-data.js');
  console.log(`Writing updated ${jsPath}...`);
  fs.writeFileSync(
    jsPath,
    `// Generated by tools/recalc-gamma.js. Do not edit manually.\nconst NUCLIDE_DATA = ${JSON.stringify(nuclideData, null, 2)};\n`,
    'utf8'
  );

  console.log(`\n✓ Done!`);
  console.log(`  ${updated} nuclides updated with ICRP 107 gamma constants`);
  console.log(`  ${skipped} nuclides skipped (no photons or not in ICRP 107)`);
}

main();
