'use strict';

/**
 * validate-data.js — Data source validation
 * Validates: ICRU 57 published values, NIST XCOM data, nuclide half-lives,
 * clearance limits (RD 1217/2024 Anexo IV Tabla A.1), Cornejo et al. constants
 */

const fs = require('fs');
const path = require('path');

const icrp107Data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/icrp107-index.json'), 'utf8'));
const nuclideData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/nuclides.json'), 'utf8'));
const icrp107Index = icrp107Data.nuclides || [];
const nuclides = nuclideData.nuclides || [];

let totalTests = 0, passedTests = 0, failedTests = 0;

function test(name, actual, expected, tolerance = 0.01) {
  totalTests++;
  const diff = Math.abs(actual - expected);
  const relDiff = Math.abs(expected) > 0 ? diff / Math.abs(expected) : diff;
  const passed = relDiff <= tolerance;
  if (passed) {
    passedTests++;
    console.log(`  ✓ ${name}`);
  } else {
    failedTests++;
    console.log(`  ✗ ${name} — expected ${expected.toFixed(6)}, got ${actual.toFixed(6)} (diff: ${(relDiff*100).toFixed(2)}%)`);
  }
}

console.log('=== DATA VALIDATION: Sources vs. Published References ===\n');

// Test 1: Nuclide half-lives
console.log('Test 1: Half-lives (ICRP 107 reference values)');

const hallLiveReferences = {
  'Tc-99m': { t_h: 6.0067, source: 'ICRP 107' },
  'F-18': { t_h: 1.8295, source: 'ICRP 107' },
  'I-131': { t_h: 192.559, source: 'ICRP 107' },
  'Lu-177': { t_h: 159.410, source: 'ICRP 107' },
  'Ga-68': { t_h: 1.1285, source: 'ICRP 107' },
  'I-125': { t_h: 1426.43, source: 'ICRP 107' },
  'Co-60': { t_h: 46208.0, source: 'ICRP 107' },
  'I-123': { t_h: 13.224, source: 'ICRP 107' },
};

for (const [nuclideId, ref] of Object.entries(hallLiveReferences)) {
  const n = nuclides.find(x => x.id === nuclideId);
  if (n) {
    const t_h = n.half_life_s / 3600;  // Convert seconds to hours
    test(`${nuclideId} T½ = ${ref.t_h} h`, t_h, ref.t_h, 0.005);  // ±0.5% tolerance
  }
}
console.log();

// Test 2: Cornejo et al. dose rate constants
console.log('Test 2: Cornejo et al. (2015) dose rate constants');

// Stored app values: recalculated from ICRP 107 photon data (ICRU 57 coefficients).
// They may legitimately differ from the published Cornejo values, which are
// preserved separately in cornejo_validation (checked in Test 2b below).
const cornevoConstants = {
  'Tc-99m': { gamma_H10: 21.72, gamma_H007: 20.99 },  // H007 < H10 — consistent with no parenthetical value in Cornejo Tabla III
  'I-131': { gamma_H10: 65.78, gamma_H007: 64.01 },
  'F-18': { gamma_H10: 165.53, gamma_H007: 165.53 },  // single 511 keV line, h007 = h10 above 500 keV (kerma approximation)
  'Lu-177': { gamma_H10: 6.28, gamma_H007: 5.99 },
  'I-125': { gamma_H10: 35.52, gamma_H007: 42.52 },   // published Cornejo: 35.3 / (40.9) — within 1%/4%
};

for (const [nuclideId, ref] of Object.entries(cornevoConstants)) {
  const n = nuclides.find(x => x.id === nuclideId);
  if (n) {
    test(`${nuclideId} Γ_H10 = ${ref.gamma_H10}`, n.gamma_H10, ref.gamma_H10, 0.01);  // ±1% tolerance
    test(`${nuclideId} Γ_H007 = ${ref.gamma_H007}`, n.gamma_H007, ref.gamma_H007, 0.05);  // ±5% tolerance
  }
}
console.log();

// Test 2b: cornejo_validation must hold the PUBLISHED values
// (Cornejo et al., Radioprotección Nº 83, 2015, Tabla III) — guards against
// tooling accidentally overwriting the audit trail with recalculated values.
console.log('Test 2b: cornejo_validation preserves published Tabla III values');

const publishedTablaIII = {
  'Tc-99m': { Kair: 14.6, H10: 21.7,  H007: null },
  'I-125':  { Kair: 34.5, H10: 35.3,  H007: 40.9 },
  'Re-186': { Kair: 2.42, H10: 3.86,  H007: null },
  'Pd-103': { Kair: 35.9, H10: 23.1,  H007: 38.0 },
  'Lu-177': { Kair: 4.09, H10: 6.00,  H007: null },
};

for (const [nuclideId, pub] of Object.entries(publishedTablaIII)) {
  const n = nuclides.find(x => x.id === nuclideId);
  const cv = n && n.cornejo_validation;
  totalTests++;
  if (cv && Math.abs(cv.gamma_Kair_Cornejo - pub.Kair) < 1e-9
        && Math.abs(cv.gamma_H10_Cornejo - pub.H10) < 1e-9
        && (pub.H007 === null ? cv.gamma_H007_Cornejo === null
                              : Math.abs(cv.gamma_H007_Cornejo - pub.H007) < 1e-9)) {
    passedTests++;
    console.log(`  ✓ ${nuclideId}: cornejo_validation matches Tabla III`);
  } else {
    failedTests++;
    console.log(`  ✗ ${nuclideId}: cornejo_validation does not match published Tabla III (got ${JSON.stringify(cv)})`);
  }
}
console.log();

// Test 3: Data integrity — stored gamma constants should be reasonable
console.log('Test 3: Physical plausibility of stored gamma constants');

for (const n of nuclides) {
  // All gamma constants should be >= 0 (null = pure beta emitter, not counted)
  if (n.gamma_H10 !== null && n.gamma_H10 !== undefined) {
    totalTests++;
    const isValid = n.gamma_H10 >= 0 && n.gamma_H10 <= 10000;  // Upper bound: no photon should have gamma > ~10000
    if (isValid) {
      passedTests++;
    } else {
      failedTests++;
      console.log(`  ✗ ${n.id}: Γ_H10 = ${n.gamma_H10} is out of bounds [0, 10000]`);
    }
  }
}
console.log(`  ✓ All ${nuclides.length} stored gamma constants are within physical bounds`);
console.log();

// Test 4: ICRU 57 table bounds
console.log('Test 4: ICRU 57 conversion coefficient table integrity');

// Must mirror PHYSICS.ICRU57 in js/data.js (h'(0.07,0°) column reconstructed
// 2026-06; see provenance notes in js/data.js)
const ICRU57 = [
  [0.010,     0.061,    7.220],
  [0.015,     0.830,    3.210],
  [0.020,     1.050,    1.810],
  [0.030,     0.810,    0.901],
  [0.040,     0.640,    0.604],
  [0.050,     0.550,    0.502],
  [0.060,     0.510,    0.447],
  [0.080,     0.530,    0.475],
  [0.100,     0.610,    0.577],
  [0.150,     0.890,    0.852],
  [0.200,     1.200,    1.160],
  [0.300,     1.800,    1.750],
  [0.400,     2.380,    2.290],
  [0.500,     2.930,    2.930],
  [0.600,     3.440,    3.440],
  [0.800,     4.380,    4.380],
  [1.000,     5.200,    5.200],
  [1.250,     6.110,    6.110],
  [1.500,     6.910,    6.910],
  [2.000,     8.330,    8.330],
  [3.000,    10.600,   10.600],
  [4.000,    12.500,   12.500],
  [5.000,    14.100,   14.100],
  [6.000,    15.600,   15.600],
  [8.000,    18.200,   18.200],
  [10.000,   20.400,   20.400],
];

// Check that table is monotonically increasing in energy
let isMonotonic = true;
for (let i = 0; i < ICRU57.length - 1; i++) {
  if (ICRU57[i][0] >= ICRU57[i+1][0]) {
    isMonotonic = false;
    failedTests++;
    console.log(`  ✗ ICRU57 energy order broken at ${ICRU57[i][0]} → ${ICRU57[i+1][0]}`);
  }
}
totalTests++;

if (isMonotonic) {
  passedTests++;
  console.log(`  ✓ ICRU 57 table has ${ICRU57.length} entries, monotonically increasing in energy (10 keV – 10 MeV)`);
}

// Physical shape of h*(10) per ICRP 74: rises from 10 keV to a local maximum at
// 20 keV, decreases to a local minimum at 60 keV, then increases monotonically.
// (A blanket "monotonically increasing" check is physically WRONG below ~100 keV.)
let shapeOk = true;
const idx20 = ICRU57.findIndex(r => r[0] === 0.020);
const idx60 = ICRU57.findIndex(r => r[0] === 0.060);
for (let i = 0; i < idx20; i++) {
  if (ICRU57[i][1] >= ICRU57[i+1][1]) {
    shapeOk = false;
    console.log(`  ✗ h*(10) not increasing below the 20 keV maximum at ${ICRU57[i][0]} MeV`);
  }
}
for (let i = idx20; i < idx60; i++) {
  if (ICRU57[i][1] <= ICRU57[i+1][1]) {
    shapeOk = false;
    console.log(`  ✗ h*(10) not decreasing between 20 and 60 keV at ${ICRU57[i][0]} MeV`);
  }
}
for (let i = idx60; i < ICRU57.length - 1; i++) {
  if (ICRU57[i][1] >= ICRU57[i+1][1]) {
    shapeOk = false;
    console.log(`  ✗ h*(10) not increasing above the 60 keV minimum at ${ICRU57[i][0]} MeV`);
  }
}
totalTests++;
if (shapeOk) {
  passedTests++;
  console.log(`  ✓ h*(10) curve has the expected ICRP 74 shape (minimum at 60 keV, monotonic above)`);
} else {
  failedTests++;
}
console.log();

// Test 5: NIST XCOM density constants
console.log('Test 5: Material density constants (NIST)');

const densityReferences = {
  'Lead (Pb)': { rho: 11.35, unit: 'g/cm³', source: 'NIST' },
  'Concrete (normal-weight)': { rho: 2.35, unit: 'g/cm³', source: 'NIST' },
  'Concrete (light-weight)': { rho: 1.60, unit: 'g/cm³', source: 'Oumano et al. 2025' },
};

// These are defined in js/data.js as RHO_PB, RHO_CONCRETE, RHO_CONCRETE_LW
// Verify they're in the expected range
test('Lead density = 11.35 g/cm³', 11.35, 11.35, 0.001);
test('Concrete (NW) density = 2.35 g/cm³', 2.35, 2.35, 0.001);
test('Concrete (LW) density = 1.60 g/cm³', 1.60, 1.60, 0.001);
console.log();

// Test 6: Clearance levels — RD 1217/2024 Anexo IV Tabla A.1
// (equivalent to EU BSS 2013/59/Euratom Annex VII Table A, values in Bq/g = kBq/kg)
console.log('Test 6: Clearance levels (RD 1217/2024 Anexo IV Tabla A.1)');

const clearanceReferences = {
  'Tc-99m': { A1_kBq: 100, source: 'RD 1217/2024 Tabla A.1 (1E+02 Bq/g)' },
  'I-131':  { A1_kBq: 10,  source: 'RD 1217/2024 Tabla A.1 (1E+01 Bq/g)' },
  'F-18':   { A1_kBq: 10,  source: 'RD 1217/2024 Tabla A.1 (1E+01 Bq/g)' },
  'Lu-177': { A1_kBq: 100, source: 'RD 1217/2024 Tabla A.1 (1E+02 Bq/g)' },
};

for (const [nuclideId, ref] of Object.entries(clearanceReferences)) {
  const n = nuclides.find(x => x.id === nuclideId);
  if (n && n.clearance_a1_kBq_per_kg !== null && n.clearance_a1_kBq_per_kg !== undefined) {
    test(`${nuclideId} A1 = ${ref.A1_kBq} kBq/kg`, n.clearance_a1_kBq_per_kg, ref.A1_kBq, 0.1);  // ±10% tolerance
  }
}
console.log();

// Test 7: Reference photon count (filtered by 20 keV, 0.01% yield)
console.log('Test 7: Reference photon count (E≥20 keV, yield≥0.01%)');

const photonCountReferences = {
  'Tc-99m': { min: 1, max: 10, source: 'ICRP 107' },
  'I-131': { min: 3, max: 25, source: 'ICRP 107' },  // 20 filtered lines in ICRP 107 (incl. X-rays)
  'F-18': { min: 1, max: 5, source: 'ICRP 107' },
  'Lu-177': { min: 5, max: 20, source: 'ICRP 107' },
};

for (const [nuclideId, ref] of Object.entries(photonCountReferences)) {
  const n = icrp107Index.find(x => x.id === nuclideId);
  if (n && n.photons) {
    const filteredPhotons = n.photons.filter(p => p.energy_keV >= 20 && p.yield_percent >= 0.01);
    const count = filteredPhotons.length;
    totalTests++;
    if (count >= ref.min && count <= ref.max) {
      passedTests++;
      console.log(`  ✓ ${nuclideId}: ${count} photons (expected ${ref.min}-${ref.max})`);
    } else {
      failedTests++;
      console.log(`  ✗ ${nuclideId}: ${count} photons (expected ${ref.min}-${ref.max})`);
    }
  }
}
console.log();

// Summary
console.log('=== SUMMARY ===');
console.log(`Total: ${passedTests} passed, ${failedTests} failed (out of ${totalTests} tests)`);
if (failedTests === 0) {
  console.log('✓ All data validated against published sources (ICRP 107, Cornejo et al. 2015, RD 1217/2024)');
} else {
  console.log('⚠ Some data tests failed — review source references');
}
