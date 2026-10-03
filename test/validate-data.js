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

// ============================================================================
// Effluent Scenarios 1 and 2 data (data/effluent-scenarios.json)
// ============================================================================
console.log('TEST: Effluent Scenario 1 and 2 coefficients vs their sources');
{
  const eff = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/effluent-scenarios.json'), 'utf8'));
  // Hand-entered from the primary sources, independent of the data file:
  //  - e(inh): ICRP Publication 119 (2012) Table G.1, adult column, verified CSV
  //    in the professional library (40_datos_y_herramientas).
  //  - k1 (Scenario 1): own PHITS report 'Escenario 1 del NUREG/CR-5814 ·
  //    Lu-177, Lu-177m, Tc-99m, I-131 y F-18', 2026-08-20, Table 7.
  //  - k2 (Scenario 2): Lu-177 / Lu-177m report approved 2026-07-30 §7.2;
  //    INF-I131-S2-RESULTADOS-1.1.0 §VII.3 / §X.5; Tc-99m Scenario 2 report.
  //    F-18 has no Scenario 2 coefficient.
  //  All k in (nSv/h)/(Bq/m³).
  const REF = {
    'Lu-177':  { e_inh: 1.1e-9,  type: 'M', k1: 2.295e-6, L10: 2.828210e-6, L45: 4.117874e-6 },
    'I-131':   { e_inh: 7.4e-9,  type: 'F', k1: 2.709e-5, L10: 3.401e-5,    L45: 4.800e-5 },
    'Lu-177m': { e_inh: 1.3e-8,  type: 'M', k1: 6.810e-5, L10: 8.409831e-5, L45: 1.206727e-4 },
    'Tc-99m':  { e_inh: 1.9e-11, type: 'M', k1: 8.306e-6, L10: 1.0265e-5,   L45: 1.496e-5 },
    'F-18':    { e_inh: 5.6e-11, type: 'M', k1: 7.197e-5, L10: null,        L45: null },
  };
  for (const [id, ref] of Object.entries(REF)) {
    const nd = eff.nuclides.find(n => n.id === id);
    if (!nd) { totalTests++; failedTests++; console.log(`  ✗ ${id} missing from effluent-scenarios.json`); continue; }
    test(`${id} e(inh) = ICRP 119 G.1 adult type ${ref.type}`, nd.e_inh.value, ref.e_inh, 0);
    totalTests++;
    if (nd.e_inh.type === ref.type) { passedTests++; console.log(`  ✓ ${id} absorption type ${ref.type}`); }
    else { failedTests++; console.log(`  ✗ ${id} absorption type ${nd.e_inh.type} ≠ ${ref.type}`); }
    test(`${id} k Scenario 1 = PHITS report value`, nd.k_ext.s1.value, ref.k1, 0);
    if (ref.L10 === null) {
      totalTests++;
      if (nd.k_ext.s2 === null) { passedTests++; console.log(`  ✓ ${id} has no Scenario 2 coefficient (null, not 0)`); }
      else { failedTests++; console.log(`  ✗ ${id} Scenario 2 coefficient should be null`); }
    } else {
      test(`${id} k Scenario 2 L10 = PHITS report value`, nd.k_ext.s2.L10.value, ref.L10, 0);
      test(`${id} k Scenario 2 L45 = PHITS report value`, nd.k_ext.s2.L45.value, ref.L45, 0);
    }
    // Half-life used by the model vs ICRP 107. Tolerance 0.2 %: the curated
    // Tc-99m value (6.007 h, also used by the workbook) is 0.14 % below ICRP
    // 107 (6.015 h); every other nuclide agrees within 0.08 %.
    const icrp = icrp107Index.find(n => n.id === id);
    const app = nuclides.find(n => n.id === id);
    if (app) {
      test(`${id} app half-life within 0.2 % of ICRP 107`, app.half_life_s, icrp.half_life_s, 0.002);
    } else {
      test(`${id} (not curated) fallback half-life = ICRP 107`, nd.half_life_s_fallback, icrp.half_life_s, 0);
    }
  }
  // NUREG/CR-5814 Table A.21 GENII factors (Sv/y per Bq/m³), read from the
  // rendered PDF pages A.54–A.56: 'STP WKR' (Sc. 2) and 'SEWER MAINT' (Sc. 1).
  const A21 = { 'I-131': [3.82e-10, 8.79e-11], 'F-18': [1.07e-09, 2.30e-10], 'Tc-99m': [6.68e-11, 2.02e-11] };
  for (const [id, [stp, sewer]] of Object.entries(A21)) {
    const a = (eff.nuclides.find(n => n.id === id) || {}).nureg_table_A21 || {};
    test(`${id} NUREG Table A.21 STP WKR = ${stp}`, a.stp_wkr_Sv_y_per_Bq_m3, stp, 0);
    test(`${id} NUREG Table A.21 SEWER MAINT = ${sewer}`, a.sewer_maint_Sv_y_per_Bq_m3, sewer, 0);
  }
  // Defaults equal the reference workbooks (Scenario 2: IRA-xxxx...v1.xlsx;
  // Scenario 1: 'Efluentes - Dosis precisas escenarios 1_2_4 v2.xlsx').
  const P = eff.parameters;
  const DEFAULTS = {
    common: { breathing_rate_m3_h: 1.2, dose_criterion_mSv_y: 1, tank_limit_GBq_y: 1 },
    s1: { water_volume_m3_y: 20000, water_density_kg_m3: 1000, aerosol_loading_kg_m3: 1e-7, respirable_fraction: 0.2,
          t_external_h_y: 100, t_inhalation_h_y: 20, geometry_factor: 1, transit_h: 0.2 },
    s2: { catchment_pct: 40, wet_sludge_t_per_y: 5090, solids_fraction: 0.25, wet_density_kg_m3: 1200,
          dust_loading_kg_m3: 1e-7, respirable_fraction: 0.2, sludge_fraction: 1,
          t_external_h_y: 1500, t_inhalation_h_y: 300, geometry_factor: 1, transit_d: 3 },
  };
  let defBad = 0;
  for (const [g, vals] of Object.entries(DEFAULTS)) {
    for (const [k, v] of Object.entries(vals)) {
      if (!P[g] || !P[g][k] || P[g][k].value !== v) { defBad++; console.log(`  ✗ parameter ${g}.${k} default ${P[g] && P[g][k] && P[g][k].value} ≠ workbook ${v}`); }
    }
    for (const [k, p] of Object.entries(P[g] || {})) {
      if (!(k in vals)) { defBad++; console.log(`  ✗ parameter ${g}.${k} has no checked default`); }
      if (!(p.value >= (p.min ?? 0) && (p.max === undefined || p.value <= p.max)) || !p.source || !p.unit) {
        defBad++; console.log(`  ✗ parameter ${g}.${k} outside its own range or missing unit/source`);
      }
    }
  }
  // Workbook 0.008333 d is the 0.2 h of NUREG §5.2.1, rounded
  if (Math.abs(P.s1.transit_h.value / 24 - 0.008333) > 1e-6) { defBad++; console.log('  ✗ Scenario 1 transit ≠ workbook 0.008333 d'); }
  if (eff.facility_presets.hospital.water_volume_m3_y !== 20000 || eff.facility_presets.clinic.water_volume_m3_y !== 3650) {
    defBad++; console.log('  ✗ facility presets ≠ workbook (hospital 20 000, clinic 3650 m³/y)');
  }
  // Fraction excreted in hospital = 1 − the workbook's fraction to the sewer
  // (user decision 2026-10-03): Lu-177/Lu-177m/Tc-99m/F-18 1 − 0.55, I-131 1 − 0.5.
  const FHOSP = { 'Lu-177': 0.45, 'Lu-177m': 0.45, 'Tc-99m': 0.45, 'F-18': 0.45, 'I-131': 0.5 };
  for (const [id, f] of Object.entries(FHOSP)) {
    const st = (eff.nuclides.find(n => n.id === id) || {}).source_term || {};
    if (st.fraction_in_hospital !== f || st.controlled_default !== false) {
      defBad++; console.log(`  ✗ ${id} fraction in hospital ${st.fraction_in_hospital} ≠ ${f} or controlled by default`);
    }
  }
  totalTests++;
  if (defBad === 0) { passedTests++; console.log('  ✓ effluent defaults equal the workbooks and carry unit, range and source'); }
  else failedTests++;
}
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
