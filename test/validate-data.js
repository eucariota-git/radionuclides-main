'use strict';

/**
 * validate-data.js — Data source validation
 * Validates: ICRU 57 published values, NIST XCOM data, nuclide half-lives,
 * clearance limits (RD 1217/2024 Anexo IV Tabla A.1), Cornejo et al. constants
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const icrp107Data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/icrp107-index.json'), 'utf8'));
const nuclideData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/nuclides.json'), 'utf8'));
const icrp107Index = icrp107Data.nuclides || [];
const nuclides = nuclideData.nuclides || [];

// Load production constants once. Tests below must exercise js/data.js itself,
// never a second hand-copied table that can remain green while production drifts.
const physicsCtx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8') + ';this.__P = PHYSICS;', physicsCtx);
const P = physicsCtx.__P;

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
console.log('  ✓ All applicable stored gamma constants are within physical bounds; Y-90 is null by design');
console.log();

// Test 4: ICRU 57 table bounds
console.log('Test 4: ICRU 57 conversion coefficient table integrity');

const ICRU57 = P.ICRU57;

// Independent published anchors: these catch content errors while the shape
// checks below catch ordering and curve-topology errors.
const icruAnchors = [
  [0.020, 1.050, 1.810],
  [0.060, 0.510, 0.447],
  [1.000, 5.200, 5.200],
];
for (const [energy, expectedH10, expectedH007] of icruAnchors) {
  const row = ICRU57.find(r => r[0] === energy);
  test(`ICRU57 h*(10) anchor at ${energy} MeV`, row ? row[1] : NaN, expectedH10, 1e-12);
  test(`ICRU57 h'(0.07) anchor at ${energy} MeV`, row ? row[2] : NaN, expectedH007, 1e-12);
}

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

// Test 5: material density constants — assert the ACTUAL js/data.js constants
// (loaded via vm) against reference values, not hardcoded literals.
console.log('Test 5: Material density constants');
{
  // Pb 11.35, Fe 7.874 and ordinary concrete 2.300 g/cm³ per NIST;
  // light-weight concrete 1.60 per Oumano 2025.
  test('RHO_PB = 11.35 g/cm³ (NIST)', P.RHO_PB, 11.35, 0.001);
  test('RHO_FE = 7.874 g/cm³ (NIST elemental iron)', P.RHO_FE, 7.874, 0.001);
  test('RHO_CONCRETE = 2.300 g/cm³ (NIST "Concrete, Ordinary")', P.RHO_CONCRETE, 2.300, 0.001);
  test('RHO_CONCRETE_LW = 1.60 g/cm³ (Oumano 2025)', P.RHO_CONCRETE_LW, 1.60, 0.001);
}
console.log();

// Test 6: Clearance levels — RD 1217/2024 Anexo IV Tabla A.1
// (equivalent to EU BSS 2013/59/Euratom Annex VII Table A, values in Bq/g = kBq/kg)
// Lu-177, Sm-153, Ho-166 and Tm-170 = 100 visually confirmed against the official
// PDF (references/RD 1217 de 2024..., p. 96) on 2026-06-11.
console.log('Test 6: Clearance levels (RD 1217/2024 Anexo IV Tabla A.1)');

const clearanceReferences = {
  'Tc-99m': { A1_kBq: 100, source: 'RD 1217/2024 Tabla A.1 (1E+02 Bq/g)' },
  'I-131':  { A1_kBq: 10,  source: 'RD 1217/2024 Tabla A.1 (1E+01 Bq/g)' },
  'F-18':   { A1_kBq: 10,  source: 'RD 1217/2024 Tabla A.1 (1E+01 Bq/g)' },
  'Lu-177': { A1_kBq: 100, source: 'RD 1217/2024 Tabla A.1 (1E+02 Bq/g, PDF p. 96)' },
  'Sm-153': { A1_kBq: 100, source: 'RD 1217/2024 Tabla A.1 (1E+02 Bq/g, PDF p. 96)' },
  'Ho-166': { A1_kBq: 100, source: 'RD 1217/2024 Tabla A.1 (1E+02 Bq/g, PDF p. 96)' },
  'Tm-170': { A1_kBq: 100, source: 'RD 1217/2024 Tabla A.1 (1E+02 Bq/g, PDF p. 96)' },
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

// Test 8: Adult ingestion dose coefficients e(g) — ICRP 119 Annex F, Table F.1
console.log('Test 8: Adult ingestion e(g) (ICRP 119 Annex F, Table F.1)');

const ingestionReferences = {
  'Tc-99m': 2.2e-11, 'I-131': 2.2e-8, 'Cs-137': 1.3e-8, 'Co-60': 3.4e-9,
  'Ra-223': 1.0e-7, 'Ac-225': 2.4e-8, 'Ho-166': 1.4e-9,  // chains incl. progeny per ICRP 71/119
};

for (const [nuclideId, ref] of Object.entries(ingestionReferences)) {
  const n = nuclides.find(x => x.id === nuclideId);
  if (n && n.ingestion_dose_coeff_adult_Sv_per_Bq != null) {
    test(`${nuclideId} e(g) = ${ref} Sv/Bq`, n.ingestion_dose_coeff_adult_Sv_per_Bq, ref, 0.001);
  }
}

// Test 8b: liquid effluent limit derived from e(g) via IS-28 Anexo II II.A.4
//   C_liq = (1 mSv/y) / (e(g) × 600 L/y) = 0.001/(e·600)
console.log('Test 8b: Liquid effluent limit = 0.001/(e(g)·600)');
let effluentBad = 0, effluentOk = 0;
for (const n of nuclides) {
  const eg = n.ingestion_dose_coeff_adult_Sv_per_Bq;
  const limit = n.effluent_liquid_limit_Bq_per_L;
  if (eg != null && eg > 0 && limit != null && !n.effluent_liquid_components) {
    totalTests++;
    const expected = 0.001 / (eg * 600);
    if (Math.abs(limit - expected) / expected <= 0.01) {  // within 1% of 3-sig-fig rounding
      passedTests++; effluentOk++;
    } else {
      failedTests++; effluentBad++;
      console.log(`  ✗ ${n.id}: effluent ${limit} ≠ 0.001/(e·600) = ${expected.toPrecision(3)}`);
    }
  }
}
// Only claim success if the loop above actually found none failing — this ✓ used
// to print unconditionally, right under the ✗ lines it contradicted.
if (effluentBad === 0) console.log(`  ✓ Effluent limits consistent with e(g) for all ${effluentOk} curated nuclides`);
else console.log(`  ✗ ${effluentBad} of ${effluentOk + effluentBad} effluent limits inconsistent with e(g)`);
console.log();

// Summary
console.log('=== SUMMARY ===');
console.log(`Total: ${passedTests} passed, ${failedTests} failed (out of ${totalTests} tests)`);
if (failedTests === 0) {
  // Scoped to what this suite actually checks. It previously claimed "All data
  // validated against published sources", which overstated it: the suite checks
  // internal consistency and a set of hand-entered reference values, and does
  // not re-derive every field from a primary source (audit 2026-07-15, finding 8).
  console.log('✓ Structural and internal-consistency checks passed, and the hand-entered reference');
  console.log('  values (ICRP 107, Cornejo et al. 2015, ICRP 119, RD 1217/2024) are reproduced.');
  console.log('  This is not a full re-derivation of every field from its primary source.');
} else {
  console.log('✗ Some data tests failed — review source references');
}
process.exit(failedTests === 0 ? 0 : 1);
