#!/usr/bin/env node

/**
 * add-shielding-spectra.js — Add dose-weighted photon spectra for shielding (2026-06)
 *
 * Single-energy narrow-beam attenuation underestimates the required shielding for
 * multi-line emitters: after a few HVLs of the representative line, the harder
 * lines dominate the transmitted dose (spectral hardening). This tool stores in
 * each curated nuclide a compact dose-weighted line spectrum so js/physics.js can
 * compute spectrum-weighted narrow-beam transmission:
 *     T(x) = Σ wᵢ · exp(−μ(Eᵢ)·x)
 * with wᵢ = nᵢ·h*(10)(Eᵢ) normalized to Σwᵢ = 1 (relative contribution of each
 * line to the unshielded H*(10) dose rate).
 *
 * Spectrum source: ICRP 107 photon data (data/icrp107-index.json), with chain
 * members combined in secular equilibrium exactly as in add-therapy-nuclides.js
 * (same chainMembers/combinedPhotons logic for Ra-223 and Ac-225).
 * Filter: G/X rays, E ≥ 20 keV, yield ≥ 0.01%. Lines contributing < 0.1% of
 * the dose are dropped and the rest renormalized.
 *
 * EQUILIBRIUM_OVERRIDES: the icrp107-index decay_modes are missing the
 * metastable daughters Tc-99m (Mo-99 lists only the direct 12.27% branch to
 * Tc-99) and Ba-137m (Cs-137 lists no daughter at all), so the generic chain
 * walker cannot reconstruct these two equilibria. Their member lists are given
 * explicitly, with activity ratios matching the curated Γ definitions:
 *   Mo-99+Tc-99m: A(Tc-99m)/A(Mo-99) = 0.8773 × λd/(λd−λp) = 0.9654
 *                 (transient equilibrium; b = 0.8773 from ICRP 107)
 *   Cs-137:       A(Ba-137m)/A(Cs-137) = 0.944 (branching to Ba-137m)
 * Cross-check: these reproduce the stored Cornejo Γ_H10 (45 and 93.1) within
 * the 1.5% tolerance below.
 *
 * Format stored in nuclides.json:
 *     "shielding_spectrum": [[E_keV, w], ...]   (E to 0.1 keV, w to 4 decimals)
 *
 * Notes:
 *  - Archer nuclides (Tc-99m, F-18, I-131, Lu-177) also get a spectrum: Archer
 *    parameters take precedence in PHYSICS, but the spectrum covers materials
 *    without published Archer fits and custom comparisons.
 *  - Weights use h*(10); for H'(0.07) scenarios the same weights are applied
 *    (differences are small in the <300 keV region where H'(0.07) governs).
 *  - Y-90 is skipped (bremsstrahlung continuum, handled by Y90_CONTAINERS).
 *  - Consistency check: Σ nᵢ·h*(10)(Eᵢ)·28.648 recomputed here must match the
 *    stored gamma_H10 within 1.5% (it was produced by the same pipeline).
 *
 * Usage: node tools/add-shielding-spectra.js   (runs generate-data.js reminder)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// --- ICRU 57 table (MUST mirror js/data.js) ------------------------------------
const ICRU57 = [
  [0.010, 0.061, 7.220], [0.015, 0.830, 3.210], [0.020, 1.050, 1.810],
  [0.030, 0.810, 0.901], [0.040, 0.640, 0.604], [0.050, 0.550, 0.502],
  [0.060, 0.510, 0.447], [0.080, 0.530, 0.475], [0.100, 0.610, 0.577],
  [0.150, 0.890, 0.852], [0.200, 1.200, 1.160], [0.300, 1.800, 1.750],
  [0.400, 2.380, 2.290], [0.500, 2.930, 2.930], [0.600, 3.440, 3.440],
  [0.800, 4.380, 4.380], [1.000, 5.200, 5.200], [1.250, 6.110, 6.110],
  [1.500, 6.910, 6.910], [2.000, 8.330, 8.330], [3.000, 10.600, 10.600],
  [4.000, 12.500, 12.500], [5.000, 14.100, 14.100], [6.000, 15.600, 15.600],
  [8.000, 18.200, 18.200], [10.000, 20.400, 20.400],
];

const GAMMA_FACTOR = 28.648;

function interpLogLog(table, x, colX, colY) {
  if (x <= table[0][colX]) return table[0][colY];
  if (x >= table[table.length - 1][colX]) return table[table.length - 1][colY];
  for (let i = 0; i < table.length - 1; i++) {
    const x0 = table[i][colX], x1 = table[i + 1][colX];
    if (x >= x0 && x <= x1) {
      const y0 = table[i][colY], y1 = table[i + 1][colY];
      const t = Math.log(x / x0) / Math.log(x1 / x0);
      return Math.exp(Math.log(y0) + t * (Math.log(y1) - Math.log(y0)));
    }
  }
  return table[table.length - 1][colY];
}

// --- Chain walker (same logic as add-therapy-nuclides.js) ------------------------

function chainMembers(headId, icrpMap) {
  const head = icrpMap[headId];
  const members = [];
  const queue = [{ id: headId, branch: 1 }];
  const seen = new Map();
  while (queue.length) {
    const { id, branch } = queue.shift();
    const n = icrpMap[id];
    if (!n) continue;
    if (id !== headId && (!n.half_life_s || n.half_life_s >= 0.1 * head.half_life_s)) continue;
    seen.set(id, (seen.get(id) || 0) + branch);
    for (const d of n.decay_modes || []) {
      if (d.daughter && d.branching > 0) {
        queue.push({ id: d.daughter, branch: branch * d.branching });
      }
    }
  }
  for (const [id, branch] of seen) members.push({ id, branch });
  return members;
}

function combinedPhotons(members, icrpMap) {
  const photons = [];
  for (const { id, branch } of members) {
    const n = icrpMap[id];
    for (const p of (n.photons || [])) {
      photons.push({
        energy_keV: p.energy_keV,
        yield_percent: p.yield_percent * branch,
      });
    }
  }
  return photons.filter(p => p.yield_percent >= 0.01).sort((a, b) => a.energy_keV - b.energy_keV);
}

// Explicit equilibrium member lists where icrp107-index decay_modes are
// incomplete (see header). [memberId, activityRatioToParent]
const EQUILIBRIUM_OVERRIDES = {
  'Mo-99+Tc-99m': [['Mo-99', 1], ['Tc-99m', 0.9654]],
  'Cs-137':       [['Cs-137', 1], ['Ba-137m', 0.944]],
};

// --- Main -----------------------------------------------------------------------

const nuclideJsonPath = path.join(__dirname, '..', 'data', 'nuclides.json');
const icrpJsonPath    = path.join(__dirname, '..', 'data', 'icrp107-index.json');

const nuclideData = JSON.parse(fs.readFileSync(nuclideJsonPath, 'utf8'));
const icrpData    = JSON.parse(fs.readFileSync(icrpJsonPath, 'utf8'));
const icrpMap = {};
for (const n of icrpData.nuclides) icrpMap[n.id] = n;

let added = 0, skipped = 0, warnings = 0;

for (const n of nuclideData.nuclides) {
  if (n.id === 'Y-90') {
    skipped++;
    console.log(`↷ ${n.id}: bremsstrahlung continuum (Y90_CONTAINERS) — no line spectrum`);
    continue;
  }
  const headId = n.id.split('+')[0];          // 'Mo-99+Tc-99m' → 'Mo-99'
  if (!icrpMap[headId]) {
    skipped++;
    console.log(`↷ ${n.id}: head ${headId} not in ICRP 107 index — skipped`);
    continue;
  }

  const members = EQUILIBRIUM_OVERRIDES[n.id]
    ? EQUILIBRIUM_OVERRIDES[n.id].map(([id, branch]) => ({ id, branch }))
    : chainMembers(headId, icrpMap);
  const photons = combinedPhotons(members, icrpMap);

  // dose-weighted lines
  let lines = [];
  let sH10 = 0;
  for (const p of photons) {
    const E = p.energy_keV / 1000;
    const y = p.yield_percent / 100;
    if (E < 0.020 || y < 0.0001) continue;
    const c = y * interpLogLog(ICRU57, E, 0, 1);
    sH10 += c;
    lines.push({ E_keV: p.energy_keV, c });
  }
  if (!lines.length) {
    skipped++;
    console.log(`↷ ${n.id}: no photons ≥ 20 keV — skipped`);
    continue;
  }

  // consistency: recomputed Γ_H10 must match stored (same pipeline)
  const gammaRecomp = sH10 * GAMMA_FACTOR;
  if (n.gamma_H10 && Math.abs(gammaRecomp - n.gamma_H10) / n.gamma_H10 > 0.015) {
    warnings++;
    console.warn(`⚠ ${n.id}: spectrum Γ_H10 = ${gammaRecomp.toFixed(2)} vs stored ${n.gamma_H10} (>1.5%) — check chain handling`);
  }

  // drop <0.1% contributors, renormalize, round
  lines = lines.filter(l => l.c / sH10 >= 0.001);
  const sKept = lines.reduce((s, l) => s + l.c, 0);
  const spectrum = lines
    .map(l => [Math.round(l.E_keV * 10) / 10, Math.round((l.c / sKept) * 10000) / 10000])
    .sort((a, b) => a[0] - b[0]);
  // fix rounding drift so Σw = 1 exactly on the largest weight
  const drift = 1 - spectrum.reduce((s, l) => s + l[1], 0);
  let iMax = 0;
  for (let i = 1; i < spectrum.length; i++) if (spectrum[i][1] > spectrum[iMax][1]) iMax = i;
  spectrum[iMax][1] = Math.round((spectrum[iMax][1] + drift) * 10000) / 10000;

  n.shielding_spectrum = spectrum;
  added++;
  console.log(`✓ ${n.id.padEnd(14)} ${String(spectrum.length).padStart(2)} lines  (Γ_H10 recomp ${gammaRecomp.toFixed(2)} vs stored ${n.gamma_H10})`);
}

console.log(`\n${added} spectra added, ${skipped} skipped, ${warnings} warnings`);
if (warnings > 0) {
  console.error('Aborting write — resolve warnings first.');
  process.exit(1);
}
fs.writeFileSync(nuclideJsonPath, JSON.stringify(nuclideData, null, 2) + '\n', 'utf8');
console.log(`✓ ${nuclideJsonPath} updated. Run: node tools/generate-data.js`);
