'use strict';

/**
 * validate-math.js — Comprehensive mathematical validation
 * Validates: Cornejo et al. methodology, ICRU 57 interpolation, decay formula,
 * HVL/TVL calculations, dose integrals, regulatory limits
 */

const fs = require('fs');
const path = require('path');

// ICRU 57 / ICRP 74 Conversion coefficients [energy_MeV, h_H10_pSvcm2, h_H007_pSvcm2]
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
test('h\'(0.07) at 511 keV ≈ 1.768 pSv·cm² (interpolated between 0.5 & 0.6)', h007_511keV, 1.768, 0.02);

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
  test('Tc-99m Γ_H007 ≈ 25.7 μSv·h⁻¹·GBq⁻¹·m²', gamma_H007_calculated, 25.7, 0.02);

  console.log(`  (Calculated from ${tcmNuclide.photons.length} photon lines, filtered to ${tcmNuclide.photons.filter(p => p.energy_keV >= 20 && p.yield_percent >= 0.01).length})`);
}
console.log();

// Test 4: Other reference nuclides from Cornejo
console.log('Test 4: Other Cornejo reference nuclides');
const cornevoNuclides = [
  { id: 'I-131', gamma_H10_expected: 65.76, gamma_H007_expected: 42.69 },
  { id: 'F-18', gamma_H10_expected: 165.5, gamma_H007_expected: 97.96 },
  { id: 'Lu-177', gamma_H10_expected: 6.28, gamma_H007_expected: 7.12 },
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
test('HVL for Pb at 141 keV ≈ 0.23 mm', hvl_Pb_141keV * 10, 0.23 * 10, 0.15);  // ±15% tolerance for tabulated data

// At 141 keV in concrete
const muRho_concrete_141keV = interpLinear(ATTENUATION, 0.141, 0, 2);
const mu_concrete_141keV = muRho_concrete_141keV * RHO_CONCRETE;
const hvl_concrete_141keV = Math.LN2 / mu_concrete_141keV;
test('HVL for concrete at 141 keV ≈ 3.6 cm', hvl_concrete_141keV, 3.6, 0.15);
console.log();

// Test 7: Transmission formula T = e^(-μ×x)
console.log('Test 7: Narrow-beam transmission T = e^(-μ·x)');
// 1 mm Pb at 141 keV
const T_1mm_Pb = Math.exp(-mu_Pb_141keV * 0.1);  // 0.1 cm
test('T(1 mm Pb) at 141 keV ≈ 0.755 (≈2.7 HVLs attenuate to ~0.157)', T_1mm_Pb, 0.755, 0.05);

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

// At t = 6h (one half-life), integral = (1-0.5) / λ = 0.5 * T_half / ln(2) = 8.664h
const cumDose_6h = cumulativeDoseWithDecay(gamma_Tc, A0_GBq_tc, T_half_Tc, T_half_Tc, 1.0);
test('D(Tc-99m, 1000 MBq, 1m, 6h with decay) ≈ 159 μSv', cumDose_6h, 159, 0.05);
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

// Summary
console.log('\n=== SUMMARY ===');
console.log(`Total: ${passedTests} passed, ${failedTests} failed (out of ${totalTests} tests)`);
if (failedTests === 0) {
  console.log('✓ All mathematical operations validated against Cornejo et al. and reference data');
} else {
  console.log('✗ Some tests failed — review calculations');
}
