#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ICRU 57 / ICRP 74 conversion coefficients [energy_MeV, h_H10, h_H007]
const ICRU57 = [
  [0.010,   0.061,   0.270],
  [0.015,   0.830,   0.800],
  [0.020,   1.050,   1.240],
  [0.030,   0.810,   1.390],
  [0.040,   0.640,   1.310],
  [0.050,   0.550,   1.170],
  [0.060,   0.510,   1.070],
  [0.080,   0.530,   0.970],
  [0.100,   0.610,   0.950],
  [0.150,   0.890,   1.000],
  [0.200,   1.200,   1.060],
  [0.300,   1.800,   1.180],
  [0.400,   2.380,   1.470],
  [0.500,   2.930,   1.740],
  [0.600,   3.440,   1.990],
  [0.800,   4.380,   2.470],
  [1.000,   5.200,   2.900],
  [1.250,   6.110,   3.430],
  [1.500,   6.910,   3.880],
  [2.000,   8.330,   4.670],
  [3.000,  10.600,   5.960],
  [4.000,  12.500,   7.020],
  [5.000,  14.100,   7.950],
  [6.000,  15.600,   8.790],
  [8.000,  18.200,  10.300],
  [10.000, 20.400,  11.700],
];

const GAMMA_FACTOR = 28.648;  // Cornejo conversion factor

function interpLinear(table, x, colX, colY) {
  if (x <= table[0][colX]) return table[0][colY];
  if (x >= table[table.length - 1][colX]) return table[table.length - 1][colY];
  for (let i = 0; i < table.length - 1; i++) {
    const x0 = table[i][colX], x1 = table[i + 1][colX];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return table[i][colY] + t * (table[i + 1][colY] - table[i][colY]);
    }
  }
  return table[table.length - 1][colY];
}

function getH10(EMeV) {
  return interpLinear(ICRU57, EMeV, 0, 1);
}

function getH007(EMeV) {
  return interpLinear(ICRU57, EMeV, 0, 2);
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
  const nuclideJsonPath = path.join(__dirname, '../data/nuclides.json');
  const icrpJsonPath = path.join(__dirname, '../data/icrp107-index.json');

  console.log('Loading nuclides.json...');
  const nuclideData = JSON.parse(fs.readFileSync(nuclideJsonPath, 'utf8'));
  const nuclides = nuclideData.nuclides;

  console.log('Loading icrp107-index.json...');
  const icrpData = JSON.parse(fs.readFileSync(icrpJsonPath, 'utf8'));
  const icrpMap = {};
  for (const n of icrpData.nuclides) {
    icrpMap[n.id] = n;
  }

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

    // Save Cornejo value for validation
    nuclide.cornejo_validation = {
      gamma_H10_Cornejo: oldH10,
      gamma_H007_Cornejo: oldH007,
    };

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
    y90.source = 'Zanzonico et al. 1999 (bremsstrahlung in PMMA container)';
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
