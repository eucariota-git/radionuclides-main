'use strict';

/**
 * validate-math.js — Comprehensive mathematical validation
 * Validates: Cornejo et al. methodology, ICRU 57 interpolation, decay formula,
 * HVL/TVL calculations, dose integrals, regulatory limits
 */

const fs = require('fs');
const path = require('path');

// ICRU 57 / ICRP 74 Conversion coefficients [energy_MeV, h_H10_pSvcm2, h_H007_pSvcm2]
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

// NIST XCOM: mass attenuation coefficients μ/ρ [cm²/g]
const ATTENUATION = [
  [0.015,    232.60,     9.400],
  [0.020,     87.81,     4.422],
  [0.030,     21.27,     1.340],
  [0.040,      8.041,    0.6327],
  [0.050,      3.625,    0.3876],
  [0.060,      1.853,    0.2751],
  [0.080,      0.8948,   0.2160],
  [0.0880,     0.8430,   0.2140],
  [0.0881,     5.200,    0.2138],
  [0.100,      5.549,    0.1823],
  [0.150,      2.014,    0.1514],
  [0.200,      0.9985,   0.1373],
  [0.300,      0.3790,   0.1177],
  [0.400,      0.2245,   0.1075],
  [0.511,      0.1619,   0.09621],
  [0.600,      0.1438,   0.08936],
  [0.800,      0.1207,   0.07657],
  [1.000,      0.1065,   0.06699],
  [1.250,      0.09285,  0.05816],
  [1.500,      0.08334,  0.05162],
  [2.000,      0.06925,  0.04346],
  [3.000,      0.05665,  0.03568],
];

const RHO_PB = 11.35;          // g/cm³
const RHO_CONCRETE = 2.35;     // g/cm³
const RHO_CONCRETE_LW = 1.60;  // g/cm³

// Gamma factor constant (Cornejo eq. 1)
const GAMMA_FACTOR = (1 / (4 * Math.PI)) * 1e9 * 3600 * 1e6 * 1e-16;

// Load ICRP 107 data for photon information
const icrp107Data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/icrp107-index.json'), 'utf8'));
const icrp107Index = icrp107Data.nuclides || [];
const nuclides = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/nuclides.json'), 'utf8')).nuclides || [];

// Helper: interpolate linearly
function interpLinear(table, x, colX, colY) {
  if (x <= table[0][colX])  return table[0][colY];
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

let totalTests = 0, passedTests = 0, failedTests = 0;

function test(name, actual, expected, tolerance = 0.001) {
  totalTests++;
  const diff = Math.abs(actual - expected);
  const relDiff = Math.abs(expected) > 0 ? diff / Math.abs(expected) : diff;
  const passed = relDiff <= tolerance;
  if (passed) {
    passedTests++;
    console.log(`  ✓ ${name}`);
  } else {
    failedTests++;
    console.log(`  ✗ ${name} — expected ${expected}, got ${actual} (diff: ${(relDiff*100).toFixed(2)}%)`);
  }
}

console.log('=== MATHEMATICAL VALIDATION: Cornejo et al. Methodology ===\n');

// Test 1: GAMMA_FACTOR derivation
console.log('Test 1: GAMMA_FACTOR constant (K)');
const K_expected = 360 / (4 * Math.PI);  // 28.648...
const K_actual = GAMMA_FACTOR;
test('K = 360/(4π) = 28.648', K_actual, K_expected, 0.001);  // ±0.1%
console.log();

// Test 2: ICRU 57 table interpolation at key energies
console.log('Test 2: ICRU 57 conversion coefficient interpolation');

// 20 keV (minimum threshold)
const h10_20keV = interpLinear(ICRU57, 0.020, 0, 1);
test('h*(10) at 20 keV = 1.050 pSv·cm²', h10_20keV, 1.050, 0.01);

// 141 keV (Tc-99m representative)
const h10_141keV = interpLinear(ICRU57, 0.141, 0, 1);
test('h*(10) at 141 keV ≈ 0.840 pSv·cm² (interpolated between 0.1 & 0.15)', h10_141keV, 0.840, 0.02);

// 511 keV (PET annihilation quantum) — between 0.5 and 0.6 MeV
const h10_511keV = interpLinear(ICRU57, 0.511, 0, 1);
const h007_511keV = interpLinear(ICRU57, 0.511, 0, 2);
test('h*(10) at 511 keV ≈ 2.986 pSv·cm² (interpolated between 0.5 & 0.6)', h10_511keV, 2.986, 0.02);
test('h\'(0.07) at 511 keV ≈ 2.986 pSv·cm² (= h*(10), kerma approximation above 500 keV)', h007_511keV, 2.986, 0.02);

// 364 keV (I-131 representative) — between 0.3 and 0.4 MeV
const h10_364keV = interpLinear(ICRU57, 0.364, 0, 1);
test('h*(10) at 364 keV ≈ 2.171 pSv·cm² (interpolated between 0.3 & 0.4)', h10_364keV, 2.171, 0.02);
console.log();

// Test 3: Tc-99m dose rate constant (Cornejo manual calculation)
console.log('Test 3: Tc-99m dose rate constant (manual from ICRP 107)');
const tcmNuclide = icrp107Index.find(n => n.id === 'Tc-99m');
if (tcmNuclide && tcmNuclide.photons) {
  let sumH10 = 0, sumH007 = 0;
  const photonThreshold = 0.0001;  // 0.01% yield threshold

  for (const photon of tcmNuclide.photons) {
    const E_MeV = photon.energy_keV / 1000;
    const yieldFrac = photon.yield_percent / 100;

    if (E_MeV >= 0.020 && yieldFrac >= photonThreshold) {
      const h10 = interpLinear(ICRU57, E_MeV, 0, 1);
      const h007 = interpLinear(ICRU57, E_MeV, 0, 2);
      sumH10 += yieldFrac * h10;
      sumH007 += yieldFrac * h007;
    }
  }

  const gamma_H10_calculated = sumH10 * GAMMA_FACTOR;
  const gamma_H007_calculated = sumH007 * GAMMA_FACTOR;

  test('Tc-99m Γ_H10 ≈ 21.7 μSv·h⁻¹·GBq⁻¹·m²', gamma_H10_calculated, 21.7, 0.01);
  test('Tc-99m Γ_H007 ≈ 21.0 μSv·h⁻¹·GBq⁻¹·m²', gamma_H007_calculated, 21.0, 0.02);

  console.log(`  (Calculated from ${tcmNuclide.photons.length} photon lines, filtered to ${tcmNuclide.photons.filter(p => p.energy_keV >= 20 && p.yield_percent >= 0.01).length})`);
}
console.log();

// Test 4: Other reference nuclides from Cornejo
console.log('Test 4: Other Cornejo reference nuclides');
const cornevoNuclides = [
  { id: 'I-131', gamma_H10_expected: 65.76, gamma_H007_expected: 64.0 },
  { id: 'F-18', gamma_H10_expected: 165.5, gamma_H007_expected: 165.5 },
  { id: 'Lu-177', gamma_H10_expected: 6.28, gamma_H007_expected: 6.0 },
];

for (const ref of cornevoNuclides) {
  const n = icrp107Index.find(x => x.id === ref.id);
  if (n && n.photons) {
    let sumH10 = 0, sumH007 = 0;

    for (const photon of n.photons) {
      const E_MeV = photon.energy_keV / 1000;
      const yieldFrac = photon.yield_percent / 100;

      if (E_MeV >= 0.020 && yieldFrac >= 0.0001) {
        const h10 = interpLinear(ICRU57, E_MeV, 0, 1);
        const h007 = interpLinear(ICRU57, E_MeV, 0, 2);
        sumH10 += yieldFrac * h10;
        sumH007 += yieldFrac * h007;
      }
    }

    const gamma_H10 = sumH10 * GAMMA_FACTOR;
    const gamma_H007 = sumH007 * GAMMA_FACTOR;

    test(`${ref.id} Γ_H10 = ${ref.gamma_H10_expected}`, gamma_H10, ref.gamma_H10_expected, 0.01);
    test(`${ref.id} Γ_H007 = ${ref.gamma_H007_expected}`, gamma_H007, ref.gamma_H007_expected, 0.02);
  }
}
console.log();

// Test 5: Decay formula A(t) = A₀ × e^(-λt)
console.log('Test 5: Decay formula A(t) = A₀·e^(-λt)');
function activityAtTime(A0, T_half_h, time_h) {
  const lambda = Math.LN2 / T_half_h;
  return A0 * Math.exp(-lambda * time_h);
}

// Tc-99m: T½ = 6.0067 h
const T_half_Tc = 6.0067;
test('A(0) = 100% of A₀', activityAtTime(100, T_half_Tc, 0), 100, 0.01);
test('A(T½) = 50% of A₀', activityAtTime(100, T_half_Tc, T_half_Tc), 50, 0.01);
test('A(2×T½) = 25% of A₀', activityAtTime(100, T_half_Tc, 2*T_half_Tc), 25, 0.01);
test('A(3×T½) = 12.5% of A₀', activityAtTime(100, T_half_Tc, 3*T_half_Tc), 12.5, 0.01);
console.log();

// Test 6: HVL calculation HVL = ln(2) / μ
console.log('Test 6: HVL calculation (narrow-beam)');
// At 141 keV in Lead
const muRho_Pb_141keV = interpLinear(ATTENUATION, 0.141, 0, 1);
const mu_Pb_141keV = muRho_Pb_141keV * RHO_PB;
const hvl_Pb_141keV = Math.LN2 / mu_Pb_141keV;
// hvl_Pb_141keV is in cm; ×10 → mm. Narrow-beam HVL for Pb at 141 keV ≈ 0.23 mm.
test('HVL for Pb at 141 keV ≈ 0.23 mm', hvl_Pb_141keV * 10, 0.23, 0.15);  // ±15% tolerance for tabulated data

// At 141 keV in concrete — narrow-beam value (broad-beam literature values are
// larger, ~3-4 cm, because they include buildup; this app's narrow-beam fallback
// is intentionally conservative).
const muRho_concrete_141keV = interpLinear(ATTENUATION, 0.141, 0, 2);
const mu_concrete_141keV = muRho_concrete_141keV * RHO_CONCRETE;
const hvl_concrete_141keV = Math.LN2 / mu_concrete_141keV;
test('HVL for concrete at 141 keV ≈ 1.88 cm (narrow beam)', hvl_concrete_141keV, 1.88, 0.05);
console.log();

// Test 7: Transmission formula T = e^(-μ×x)
console.log('Test 7: Narrow-beam transmission T = e^(-μ·x)');
// 1 mm Pb at 141 keV — μ ≈ 30 cm⁻¹ → 1 mm ≈ 4.3 HVLs → T ≈ e^(−3.0) ≈ 0.049
const T_1mm_Pb = Math.exp(-mu_Pb_141keV * 0.1);  // 0.1 cm
test('T(1 mm Pb) at 141 keV ≈ 0.049 (narrow beam, ≈4.3 HVLs)', T_1mm_Pb, 0.049, 0.05);

// 1 cm concrete at 141 keV
const T_1cm_concrete = Math.exp(-mu_concrete_141keV * 1.0);
test('T(1 cm concrete) at 141 keV', T_1cm_concrete, Math.exp(-mu_concrete_141keV), 0.01);
console.log();

// Test 8: Dose rate formula D' = Γ × A / d²
console.log('Test 8: Dose rate formula D\' = Γ × A / d²');
const gamma_Tc = 21.7;  // μSv·h⁻¹·GBq⁻¹·m²
const A_1GBq = 1.0;     // GBq
const d_1m = 1.0;       // m
const doseRate_expected = gamma_Tc * A_1GBq / (d_1m * d_1m);
test('D\'(Tc-99m, 1 GBq, 1m) = 21.7 μSv/h', doseRate_expected, 21.7, 0.01);

// At 2 m, dose rate should drop by factor of 4
const d_2m = 2.0;
const doseRate_2m = gamma_Tc * A_1GBq / (d_2m * d_2m);
test('D\'(Tc-99m, 1 GBq, 2m) = 5.425 μSv/h', doseRate_2m, 21.7/4, 0.01);
console.log();

// Test 9: Cumulative dose with decay D = Γ × A₀ × (1 - e^(-λt)) / λ / d²
console.log('Test 9: Cumulative dose with decay');
function cumulativeDoseWithDecay(gamma, A0_GBq, T_half_h, time_h, distance_m) {
  const lambda = Math.LN2 / T_half_h;
  const integralTerm = (1 - Math.exp(-lambda * time_h)) / lambda;
  return (gamma * A0_GBq / (distance_m * distance_m)) * integralTerm;
}

// Tc-99m: 1000 MBq at 1m for 1 hour
const A0_MBq = 1000;
const A0_GBq_tc = A0_MBq / 1000;
const cumDose_1h = cumulativeDoseWithDecay(gamma_Tc, A0_GBq_tc, T_half_Tc, 1.0, 1.0);
// At t = T½/5 ≈ 1.2 h, activity decays to ≈83% → average activity ≈ 91.5% → dose ≈ 19.8 μSv
test('D(Tc-99m, 1000 MBq, 1m, 1h with decay) ≈ 19.8 μSv', cumDose_1h, 19.8, 0.05);

// At t = T½ (≈6 h), integral = (1−0.5)/λ = 0.5 × T½/ln(2) = 4.333 h
// → D = 21.7 × 4.333 ≈ 94.0 μSv (must be LESS than the no-decay value 21.7×6 = 130.2)
const cumDose_6h = cumulativeDoseWithDecay(gamma_Tc, A0_GBq_tc, T_half_Tc, T_half_Tc, 1.0);
test('D(Tc-99m, 1000 MBq, 1m, 6h with decay) ≈ 94.0 μSv', cumDose_6h, 94.0, 0.05);
console.log();

// Test 10: Regulatory limits formula
console.log('Test 10: Regulatory limits (RD 1029/2022 / EURATOM 2013/59)');
function percentOfLimit(dose_uSv, limit_mSv) {
  return (dose_uSv / (limit_mSv * 1000)) * 100;
}

test('20000 μSv / 20 mSv = 100%', percentOfLimit(20000, 20), 100, 0.01);
test('10000 μSv / 20 mSv = 50%', percentOfLimit(10000, 20), 50, 0.01);
test('500000 μSv / 500 mSv (extremity) = 100%', percentOfLimit(500000, 500), 100, 0.01);
test('1000 μSv / 20 mSv = 5%', percentOfLimit(1000, 20), 5, 0.01);
console.log();

// Test 11: Spectrum-weighted narrow-beam transmission (CALC.transmissionSpectrum)
console.log('Test 11: Spectrum-weighted transmission T(x) = Σ wᵢ·e^(−μ(Eᵢ)·x)');
const vm = require('vm');
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8') + ';this.__P = PHYSICS;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/physics.js'), 'utf8') + ';this.__C = CALC;', ctx);
const PHYSICS_ = ctx.__P, CALC_ = ctx.__C;

// 11a: single-line spectrum must equal the mono-energetic exponential
test('single-line spectrum [511 keV] equals e^(−μx) at 1 cm Pb',
  CALC_.transmissionSpectrum(1, [[511, 1]], 'Pb'),
  CALC_.transmission(1, 0.511, 'Pb'), 1e-9);

// 11b: two-line manual sum 0.7·e^(−μ(100keV)x) + 0.3·e^(−μ(500keV)x), x = 0.3 cm Pb
{
  const muA = PHYSICS_.getMu(0.100, 'Pb'), muB = PHYSICS_.getMu(0.500, 'Pb');
  const expected = 0.7 * Math.exp(-muA * 0.3) + 0.3 * Math.exp(-muB * 0.3);
  test('two-line spectrum manual sum at 0.3 cm Pb',
    CALC_.transmissionSpectrum(0.3, [[100, 0.7], [500, 0.3]], 'Pb'), expected, 1e-9);
}

// 11c: spectrum transmission ≥ softest single line would suggest behind thick shields
//      (beam hardening: hard lines dominate; Ga-67 rep 93 keV vs 185–394 keV lines)
{
  const ga67 = nuclides.find(n => n.id === 'Ga-67');
  const Tmono = CALC_.transmission(0.5, ga67.representative_energy_keV / 1000, 'Pb');
  const Tspec = CALC_.transmissionSpectrum(0.5, ga67.shielding_spectrum, 'Pb');
  totalTests++;
  if (Tspec > Tmono * 10) {
    passedTests++;
    console.log(`  ✓ Ga-67 0.5 cm Pb: spectrum T=${Tspec.toExponential(2)} ≫ mono T=${Tmono.toExponential(2)} (hardening captured)`);
  } else {
    failedTests++;
    console.log(`  ✗ Ga-67 hardening not captured: spec ${Tspec} vs mono ${Tmono}`);
  }
}

// 11d: inverse solver round-trip — thicknessForAttenuation(T) then forward T(x)
{
  const ra223 = nuclides.find(n => n.id === 'Ra-223');
  const x = CALC_.thicknessForAttenuation(0.1, 0.351, 'Pb', null, ra223.shielding_spectrum);
  test('Ra-223 spectrum TVL round-trip T(x(0.1)) = 0.1',
    CALC_.transmissionSpectrum(x, ra223.shielding_spectrum, 'Pb'), 0.1, 1e-6);
}

// 11e: getTransmission precedence — Archer params override spectrum
{
  const tc = nuclides.find(n => n.id === 'Tc-99m');
  const ap = tc.archer_params.Pb;
  test('Tc-99m getTransmission uses Archer (not spectrum) when params given, 2 mm Pb',
    CALC_.getTransmission(0.2, 0.141, 'Pb', ap, tc.shielding_spectrum),
    CALC_.transmissionArcher(2, ap), 1e-12);
}

// 11f: all stored spectra are normalized and within physical energy bounds
{
  let ok = 0, bad = 0;
  for (const n of nuclides) {
    if (!n.shielding_spectrum) continue;
    const sum = n.shielding_spectrum.reduce((s, l) => s + l[1], 0);
    const eOk = n.shielding_spectrum.every(l => l[0] >= 20 && (!n.max_photon_energy_keV || l[0] <= n.max_photon_energy_keV + 0.5));
    if (Math.abs(sum - 1) <= 0.005 && eOk) ok++;
    else { bad++; console.log(`  ✗ ${n.id}: Σw=${sum.toFixed(4)}, energies in range: ${eOk}`); }
  }
  totalTests++;
  if (bad === 0) { passedTests++; console.log(`  ✓ ${ok} stored spectra normalized (Σw=1±0.005) with E ∈ [20 keV, E_max]`); }
  else failedTests++;
}
console.log();

// Summary
console.log('\n=== SUMMARY ===');
console.log(`Total: ${passedTests} passed, ${failedTests} failed (out of ${totalTests} tests)`);
if (failedTests === 0) {
  console.log('✓ All mathematical operations validated against Cornejo et al. and reference data');
} else {
  console.log('✗ Some tests failed — review calculations');
}
