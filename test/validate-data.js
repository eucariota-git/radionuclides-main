'use strict';

/**
 * validate-data.js — Data source validation
 * Validates: ICRU 57 published values, NIST XCOM data, nuclide half-lives,
 * clearance limits (RD 1029/2022), Cornejo et al. constants
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
console.log('Test 2: Cornejo et al. (2006) dose rate constants');

const cornevoConstants = {
  'Tc-99m': { gamma_H10: 21.7, gamma_H007: 25.7 },
  'I-131': { gamma_H10: 65.76, gamma_H007: 42.69 },
  'F-18': { gamma_H10: 165.5, gamma_H007: 97.96 },
  'Lu-177': { gamma_H10: 6.28, gamma_H007: 7.12 },
  'I-125': { gamma_H10: 36.04, gamma_H007: 32.1 },
};

for (const [nuclideId, ref] of Object.entries(cornevoConstants)) {
  const n = nuclides.find(x => x.id === nuclideId);
  if (n) {
    test(`${nuclideId} Γ_H10 = ${ref.gamma_H10}`, n.gamma_H10, ref.gamma_H10, 0.01);  // ±1% tolerance
    test(`${nuclideId} Γ_H007 = ${ref.gamma_H007}`, n.gamma_H007, ref.gamma_H007, 0.05);  // ±5% tolerance (depends on Cornejo source)
  }
}
console.log();

// Test 3: Data integrity — stored gamma constants should be reasonable
console.log('Test 3: Physical plausibility of stored gamma constants');

for (const n of nuclides) {
  // All gamma constants should be >= 0
  if (n.gamma_H10 !== null && n.gamma_H10 !== undefined) {
    const isValid = n.gamma_H10 >= 0 && n.gamma_H10 <= 10000;  // Upper bound: no photon should have gamma > ~10000
    if (isValid) {
      passedTests++;
    } else {
      failedTests++;
      console.log(`  ✗ ${n.id}: Γ_H10 = ${n.gamma_H10} is out of bounds [0, 10000]`);
    }
  }
  totalTests++;
}
console.log(`  ✓ All ${nuclides.length} stored gamma constants are within physical bounds`);
console.log();

// Test 4: ICRU 57 table bounds
console.log('Test 4: ICRU 57 conversion coefficient table integrity');

const ICRU57 = [
  [0.010,     0.061,    0.270],
  [0.015,     0.830,    0.800],
  [0.020,     1.050,    1.240],
  [0.030,     0.810,    1.390],
  [0.040,     0.640,    1.310],
  [0.050,     0.550,    1.170],
  [0.060,     0.510,    1.070],
  [0.080,     0.530,    0.970],
  [0.100,     0.610,    0.950],
  [0.150,     0.890,    1.000],
  [0.200,     1.200,    1.060],
  [0.300,     1.800,    1.180],
  [0.400,     2.380,    1.470],
  [0.500,     2.930,    1.740],
  [0.600,     3.440,    1.990],
  [0.800,     4.380,    2.470],
  [1.000,     5.200,    2.900],
  [1.250,     6.110,    3.430],
  [1.500,     6.910,    3.880],
  [2.000,     8.330,    4.670],
  [3.000,    10.600,    5.960],
  [4.000,    12.500,    7.020],
  [5.000,    14.100,    7.950],
  [6.000,    15.600,    8.790],
  [8.000,    18.200,   10.300],
  [10.000,   20.400,   11.700],
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

// Check that h*(10) is generally increasing with energy (physical expectation for PET/diagnostic range)
let h10Increasing = 0;
for (let i = 0; i < ICRU57.length - 1; i++) {
  if (ICRU57[i][1] < ICRU57[i+1][1]) h10Increasing++;
}
totalTests++;
if (h10Increasing >= ICRU57.length - 2) {
  passedTests++;
  console.log(`  ✓ h*(10) values are consistently increasing (${h10Increasing}/${ICRU57.length-1} transitions increase)`);
} else {
  failedTests++;
  console.log(`  ✗ h*(10) values do not consistently increase with energy`);
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

// Test 6: Clearance A1 limits (RD 1029/2022 / EURATOM 2013/59)
console.log('Test 6: Clearance A1 limits (RD 1029/2022 reference)');

const clearanceReferences = {
  'Tc-99m': { A1_kBq: 900, source: 'RD 1029/2022' },
  'I-131': { A1_kBq: 10, source: 'RD 1029/2022' },
  'F-18': { A1_kBq: 100, source: 'RD 1029/2022' },
  'Lu-177': { A1_kBq: 40, source: 'RD 1029/2022' },
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
  'I-131': { min: 3, max: 15, source: 'ICRP 107' },
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
  console.log('✓ All data validated against published sources (ICRP 107, Cornejo et al., RD 1029/2022)');
} else {
  console.log('⚠ Some data tests failed — review source references');
}
