'use strict';

/**
 * validate-math.js — Comprehensive mathematical validation
 * Validates: Cornejo et al. methodology, ICRU 57 interpolation, decay formula,
 * HVL/TVL calculations, dose integrals, regulatory limits
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---------------------------------------------------------------------------
// Load the REAL production modules. Nothing here re-implements them.
//
// This file used to carry its own copies of ICRU57 and ATTENUATION plus an
// `interpLinear` helper, and cross-checked the Cornejo constants with those —
// while production interpolates log-log via PHYSICS.getH10/getMu. So the suite
// validated an implementation that never runs, and a typo copied into both the
// table and its duplicate would pass. The gap was not academic: linear vs
// log-log on μ/ρ for Pb at 141 keV differ by 11% (2.650 vs 2.351 cm²/g), and
// the duplicate skipped the K-edge split entirely (audit 2026-07-15, finding 8).
//
// External anchors (published values, hand-entered below) are what make this an
// independent check — not a second copy of the tables.
// ---------------------------------------------------------------------------
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8') + ';this.__P = PHYSICS;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/physics.js'), 'utf8') + ';this.__C = CALC;', ctx);
const PHYSICS_ = ctx.__P, CALC_ = ctx.__C;

// Published densities (NIST) — external anchors, not copies of app state.
const RHO_PB = 11.35;          // g/cm³
const RHO_FE = 7.874;          // g/cm³ (NIST elemental iron)
const RHO_CONCRETE = 2.300;    // g/cm³
const RHO_CONCRETE_LW = 1.60;  // g/cm³

// Gamma factor constant (Cornejo eq. 1)
const GAMMA_FACTOR = (1 / (4 * Math.PI)) * 1e9 * 3600 * 1e6 * 1e-16;

// Load ICRP 107 data for photon information
const icrp107Data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/icrp107-index.json'), 'utf8'));
const icrp107Index = icrp107Data.nuclides || [];
const nuclides = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/nuclides.json'), 'utf8')).nuclides || [];

/**
 * Log-log interpolation between two PUBLISHED anchor points, written out here
 * from the documented method (js/data.js: "log-log for attenuation/ICRU").
 * Used to predict what production must return at an off-grid energy from the
 * two bracketing published values — an independent re-derivation, not a copy of
 * the production table.
 */
function logLogFromAnchors(x0, y0, x1, y1, x) {
  const t = Math.log(x / x0) / Math.log(x1 / x0);
  return Math.exp(Math.log(y0) + t * (Math.log(y1) - Math.log(y0)));
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

// Test 2: ICRU 57 conversion coefficients — PHYSICS.getH10/getH007 against the
// PUBLISHED ICRU 57 / ICRP 74 values (grid points must reproduce exactly;
// off-grid points must match the log-log interpolation of the two published
// neighbours). Exercises the production functions, not a local copy.
console.log('Test 2: ICRU 57 conversion coefficients (published anchors)');

// Grid points — published h*(10) values, must be reproduced exactly
for (const [E, published] of [[0.020, 1.050], [0.060, 0.510], [0.100, 0.610],
                              [0.150, 0.890], [1.000, 5.200], [10.000, 20.400]]) {
  test(`h*(10) at ${E * 1000} keV = ${published} pSv·cm² (ICRU 57 grid point)`,
    PHYSICS_.getH10(E), published, 1e-9);
}

// 141 keV (Tc-99m representative) — between the published 0.100→0.610 and 0.150→0.890
test('h*(10) at 141 keV = log-log interp of published 0.610 / 0.890',
  PHYSICS_.getH10(0.141), logLogFromAnchors(0.100, 0.610, 0.150, 0.890, 0.141), 1e-9);

// 511 keV (PET annihilation quantum) — between published 0.500→2.930 and 0.600→3.440
test('h*(10) at 511 keV = log-log interp of published 2.930 / 3.440',
  PHYSICS_.getH10(0.511), logLogFromAnchors(0.500, 2.930, 0.600, 3.440, 0.511), 1e-9);
test('h\'(0.07) at 511 keV = h*(10) (kerma approximation above 500 keV)',
  PHYSICS_.getH007(0.511), PHYSICS_.getH10(0.511), 1e-9);

// 364 keV (I-131 representative) — between published 0.300→1.800 and 0.400→2.380
test('h*(10) at 364 keV = log-log interp of published 1.800 / 2.380',
  PHYSICS_.getH10(0.364), logLogFromAnchors(0.300, 1.800, 0.400, 2.380, 0.364), 1e-9);

// h'(0.07) grid points — published ICRP 74 hK'(0.07) region (see js/data.js provenance)
for (const [E, published] of [[0.020, 1.810], [0.060, 0.447], [0.100, 0.577]]) {
  test(`h'(0.07) at ${E * 1000} keV = ${published} pSv·cm² (grid point)`,
    PHYSICS_.getH007(E), published, 1e-9);
}
console.log();

// Test 3: Tc-99m dose rate constant (Cornejo manual calculation)
console.log('Test 3: Tc-99m dose rate constant (manual from ICRP 107)');
const tcmNuclide = icrp107Index.find(n => n.id === 'Tc-99m');
if (tcmNuclide && tcmNuclide.photons) {
  // Cornejo eq. 1 summed here from the ICRP 107 emission list, using the
  // PRODUCTION conversion coefficients (PHYSICS.getH10/getH007). The reference
  // values on the right are Cornejo's published constants — the external anchor.
  let sumH10 = 0, sumH007 = 0;
  const photonThreshold = 0.0001;  // 0.01% yield threshold

  for (const photon of tcmNuclide.photons) {
    const E_MeV = photon.energy_keV / 1000;
    const yieldFrac = photon.yield_percent / 100;

    if (E_MeV >= 0.020 && yieldFrac >= photonThreshold) {
      sumH10  += yieldFrac * PHYSICS_.getH10(E_MeV);
      sumH007 += yieldFrac * PHYSICS_.getH007(E_MeV);
    }
  }

  const gamma_H10_calculated = sumH10 * GAMMA_FACTOR;
  const gamma_H007_calculated = sumH007 * GAMMA_FACTOR;

  test('Tc-99m Γ_H10 ≈ 21.7 μSv·h⁻¹·GBq⁻¹·m² (Cornejo published)', gamma_H10_calculated, 21.7, 0.01);
  test('Tc-99m Γ_H007 ≈ 21.0 μSv·h⁻¹·GBq⁻¹·m²', gamma_H007_calculated, 21.0, 0.02);

  // The same sum through PHYSICS.calcGammaConstants must agree: this is the code
  // path the app actually calls, filter included.
  const viaApi = PHYSICS_.calcGammaConstants(tcmNuclide.photons.map(p => ({
    energy_keV: p.energy_keV, yield_percent: p.yield_percent, type: p.type || 'G',
  })));
  test('Tc-99m: calcGammaConstants reproduces the manual Cornejo sum',
    viaApi.gammaH10, gamma_H10_calculated, 1e-9);

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
        sumH10  += yieldFrac * PHYSICS_.getH10(E_MeV);
        sumH007 += yieldFrac * PHYSICS_.getH007(E_MeV);
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
// (uncollided-beam arithmetic from μ; the app's CALC.hvlTvl additionally
// includes ANS-6.4.3 exposure buildup — covered by Tests 11–12)
console.log('Test 6: HVL calculation (uncollided narrow-beam, from μ)');
// At 141 keV in Lead — μ from PHYSICS.getMu (production, log-log). The previous
// local linear interpolation gave μ/ρ = 2.650 vs the real 2.351 cm²/g (+11%),
// so this test's HVL was ~11% off from the app's and nobody could tell.
const mu_Pb_141keV = PHYSICS_.getMu(0.141, 'Pb');
const hvl_Pb_141keV = Math.LN2 / mu_Pb_141keV;
// hvl_Pb_141keV is in cm; ×10 → mm. Narrow-beam HVL for Pb at 141 keV ≈ 0.26 mm.
test('HVL for Pb at 141 keV ≈ 0.26 mm', hvl_Pb_141keV * 10, 0.26, 0.15);  // ±15% tolerance for tabulated data

// Cross-check μ against the two PUBLISHED NIST neighbours (0.100 → 5.549,
// 0.150 → 2.014 cm²/g) interpolated log-log — an external anchor for the value
// production uses at this off-grid energy.
test('μ/ρ Pb at 141 keV = log-log interp of published NIST 5.549 / 2.014',
  mu_Pb_141keV / RHO_PB, logLogFromAnchors(0.100, 5.549, 0.150, 2.014, 0.141), 1e-9);

// At 141 keV in concrete — narrow-beam value (broad-beam literature values are
// larger, ~3-4 cm, because they include buildup; this app's narrow-beam fallback
// is intentionally conservative).
const mu_concrete_141keV = PHYSICS_.getMu(0.141, 'concrete_NW');
const hvl_concrete_141keV = Math.LN2 / mu_concrete_141keV;
test('HVL for concrete at 141 keV ≈ 2.02 cm (narrow beam)', hvl_concrete_141keV, 2.02, 0.05);
console.log();

// Test 7: Transmission formula T = e^(-μ×x)
// (uncollided component only; CALC.transmission applies buildup on top — Tests 11–12)
console.log('Test 7: Uncollided narrow-beam transmission T = e^(-μ·x)');
// 1 mm Pb at 141 keV — μ ≈ 26.7 cm⁻¹ → 1 mm ≈ 3.85 HVLs → T ≈ e^(−2.67) ≈ 0.069
//
// This expected value was 0.049 until 2026-07-15, derived from the test's own
// LINEAR interpolation of μ (30.1 cm⁻¹). Production interpolates log-log, as
// attenuation coefficients require, giving 26.7 cm⁻¹ — a 42% difference in T
// that the test could not see because it never called production. The log-log
// value is the correct one: it puts the Pb HVL at 141 keV at 0.260 mm, inside
// the 0.25–0.3 mm range published for Tc-99m in lead, whereas the linear one
// gave 0.230 mm (audit 2026-07-15, finding 8).
const T_1mm_Pb = Math.exp(-mu_Pb_141keV * 0.1);  // 0.1 cm
test('T(1 mm Pb) at 141 keV ≈ 0.069 (narrow beam, ≈3.85 HVLs)', T_1mm_Pb, 0.069, 0.05);

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
// (PHYSICS_ / CALC_ are loaded once at the top of this file)

// 11a: single-line spectrum must equal the mono-energetic exponential
test('single-line spectrum [511 keV] equals e^(−μx) at 1 cm Pb',
  CALC_.transmissionSpectrum(1, [[511, 1]], 'Pb'),
  CALC_.transmission(1, 0.511, 'Pb'), 1e-9);

// 11b: two-line manual sum Σ wᵢ·min(1, B(Eᵢ)·e^(−μᵢx)), x = 0.3 cm Pb
{
  const expected = [[0.100, 0.7], [0.500, 0.3]].reduce((s, [E, w]) => {
    const mfp = PHYSICS_.getMu(E, 'Pb') * 0.3;
    return s + w * Math.min(1, PHYSICS_.getBuildup(E, mfp, 'Pb') * Math.exp(-mfp));
  }, 0);
  test('two-line spectrum manual sum (with buildup) at 0.3 cm Pb',
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

// 11g: PHYSICS.buildShieldingSpectrum — dynamic spectrum for ICRP 107 extended
//      nuclides (dose.html resolveNuclide) must follow the same pipeline as the
//      stored spectra and fix the single-representative-line error (audit
//      2026-07-13 finding 1: Sn-113 at 5 mm Pb, full 9-line spectrum T ≈ 2.2e-3
//      with the NIST-corrected μ, vs 7.70e-112 for the 24.2 keV representative
//      line — the first audit's independent estimate was 2.45e-3, same order)
{
  const icrpIndex = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/icrp107-index.json'), 'utf8'));
  const sn113 = icrpIndex.nuclides.find(n => n.id === 'Sn-113');
  const sp = PHYSICS_.buildShieldingSpectrum(sn113.photons);
  test('Sn-113 dynamic spectrum is normalized (Σw = 1)',
    sp.reduce((s, l) => s + l[1], 0), 1, 1e-9);
  test('Sn-113 dynamic spectrum T(0.5 cm Pb) ≈ 2.18e-3 (NIST μ)',
    CALC_.transmissionSpectrum(0.5, sp, 'Pb'), 2.180e-3, 0.01);

  // pipeline consistency: for a chainless curated nuclide the dynamic spectrum
  // must reproduce the stored shielding_spectrum (tools/add-shielding-spectra.js)
  const ga67idx = icrpIndex.nuclides.find(n => n.id === 'Ga-67');
  const ga67cur = nuclides.find(n => n.id === 'Ga-67');
  const dyn = PHYSICS_.buildShieldingSpectrum(ga67idx.photons);
  let match = dyn.length === ga67cur.shielding_spectrum.length &&
    dyn.every((l, i) => Math.abs(l[0] - ga67cur.shielding_spectrum[i][0]) < 0.05 &&
                        Math.abs(l[1] - ga67cur.shielding_spectrum[i][1]) < 1e-4);
  totalTests++;
  if (match) { passedTests++; console.log(`  ✓ Ga-67 dynamic spectrum matches stored shielding_spectrum (${dyn.length} lines, w within 1e-4)`); }
  else { failedTests++; console.log(`  ✗ Ga-67 dynamic spectrum diverges from stored (${dyn.length} vs ${ga67cur.shielding_spectrum.length} lines)`); }

  test('buildShieldingSpectrum returns null when no line passes the filter',
    PHYSICS_.buildShieldingSpectrum([{ energy_keV: 10, yield_percent: 50, type: 'X' }]) === null ? 1 : 0, 1, 0);
}
console.log();

// Test 11i: the two operational quantities need their OWN weighted spectrum.
//   Audit 2026-07-15 finding 4: H'(0.07) was shielded with H*(10) weights.
//   h'(0.07) favours the soft lines a shield removes first, so T_H'(0.07) must be
//   ≤ T_H*(10) for every nuclide, with the published gaps reproduced at 1 mm Pb.
console.log('Test 11i: separate H*(10) and H\'(0.07) shielding spectra');
{
  // Reference gaps measured against the audit's independent reproduction:
  // 100·(T_H10 − T_H007)/T_H007 at 1 mm Pb.
  const gaps = [['Pd-103', 73.7], ['I-125', 18.5], ['Tb-161', 14.6],
                ['Xe-133', 13.2], ['In-111', 12.4], ['I-123', 10.5]];
  for (const [id, expected] of gaps) {
    const n = nuclides.find(x => x.id === id);
    if (!n || !n.shielding_spectrum_h007) {
      totalTests++; failedTests++;
      console.log(`  ✗ ${id}: shielding_spectrum_h007 missing`);
      continue;
    }
    const T10 = CALC_.transmissionSpectrum(0.1, n.shielding_spectrum, 'Pb');
    const T07 = CALC_.transmissionSpectrum(0.1, n.shielding_spectrum_h007, 'Pb');
    test(`${id} T_H*(10)/T_H'(0.07) gap at 1 mm Pb = +${expected}%`,
      100 * (T10 - T07) / T07, expected, 0.02);
  }

  // The SIGN of the H*(10) vs H'(0.07) difference is not universal, because the
  // h'(0.07)/h*(10) response ratio is not monotonic: 1.72 at 20 keV, dipping to
  // 0.876 at 60 keV, back to 1.00 above 500 keV. So H'(0.07) weighting boosts
  // BOTH the softest and the hardest lines and suppresses the 40–300 keV band.
  // Soft emitters therefore transmit less under H'(0.07) weights (Pd-103 −42%),
  // while emitters with a hard tail transmit MORE (Re-186 +7.8%). Anything that
  // assumes one direction — including "H*(10) weights are conservative for skin
  // dose" — is wrong; that is why each quantity needs its own spectrum.
  test('Pd-103 (soft emitter): T_H\'(0.07) below T_H*(10) at 5 mm Pb',
    100 * (CALC_.transmissionSpectrum(0.5, nuclides.find(n => n.id === 'Pd-103').shielding_spectrum_h007, 'Pb') /
           CALC_.transmissionSpectrum(0.5, nuclides.find(n => n.id === 'Pd-103').shielding_spectrum,      'Pb') - 1),
    -42.5, 0.02);
  test('Re-186 (hard tail): T_H\'(0.07) ABOVE T_H*(10) at 5 mm Pb (sign flips)',
    100 * (CALC_.transmissionSpectrum(0.5, nuclides.find(n => n.id === 'Re-186').shielding_spectrum_h007, 'Pb') /
           CALC_.transmissionSpectrum(0.5, nuclides.find(n => n.id === 'Re-186').shielding_spectrum,      'Pb') - 1),
    7.8, 0.05);

  // Structural invariant: every curated nuclide carries both spectra, same lines,
  // both normalized. (No inequality between them — see above.)
  let bad = [];
  for (const n of nuclides) {
    if (!n.shielding_spectrum) continue;              // Y-90: bremsstrahlung model
    const a = n.shielding_spectrum, b = n.shielding_spectrum_h007;
    if (!b) { bad.push(`${n.id} missing h007 spectrum`); continue; }
    if (a.length !== b.length) bad.push(`${n.id} line count ${a.length} vs ${b.length}`);
    const sum = b.reduce((s, l) => s + l[1], 0);
    if (Math.abs(sum - 1) > 0.005) bad.push(`${n.id} Σw(h007)=${sum.toFixed(4)}`);
    const eOk = b.every((l, i) => Math.abs(l[0] - a[i][0]) < 1e-9);
    if (!eOk) bad.push(`${n.id} h007 spectrum lines misaligned with h10`);
  }
  totalTests++;
  if (!bad.length) { passedTests++; console.log(`  ✓ all curated nuclides carry both spectra: same lines, both normalized`); }
  else { failedTests++; bad.slice(0, 5).forEach(m => console.log(`  ✗ ${m}`)); }

  // buildShieldingSpectrum must honour the quantity argument (ICRP-107 runtime path)
  const icrpIdx = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/icrp107-index.json'), 'utf8'));
  const pd = icrpIdx.nuclides.find(n => n.id === 'Pd-103');
  const dyn10 = PHYSICS_.buildShieldingSpectrum(pd.photons, 'H10');
  const dyn07 = PHYSICS_.buildShieldingSpectrum(pd.photons, 'H007');
  test('buildShieldingSpectrum defaults to H*(10) weights',
    PHYSICS_.buildShieldingSpectrum(pd.photons)[0][1], dyn10[0][1], 1e-12);
  totalTests++;
  if (Math.abs(dyn07[0][1] - dyn10[0][1]) > 1e-6) {
    passedTests++;
    console.log(`  ✓ 'H007' yields different weights than 'H10' (Pd-103 line 1: ${dyn07[0][1].toFixed(6)} vs ${dyn10[0][1].toFixed(6)})`);
  } else { failedTests++; console.log('  ✗ quantity argument ignored — H007 weights identical to H10'); }
}
console.log();

// Test 11j: getShieldingRange reports the tables' real bounds (UI warnings read
// these instead of hardcoding them — audit 2026-07-15, shielding validity range)
console.log('Test 11j: getShieldingRange reflects the tables');
{
  const pb = PHYSICS_.getShieldingRange('Pb');
  test('Pb build-up table starts at 30 keV', pb.buildup_E_min_MeV, 0.03, 1e-12);
  test('build-up validity ends at 40 mfp', pb.buildup_mfp_max, 40, 1e-12);
  test('attenuation table ends at 10 MeV', pb.atten_E_max_MeV, 10, 1e-12);
  const co = PHYSICS_.getShieldingRange('concrete_NW');
  test('concrete build-up table starts at 15 keV', co.buildup_E_min_MeV, 0.015, 1e-12);
  const fe = PHYSICS_.getShieldingRange('Fe');
  test('iron build-up table starts at 15 keV', fe.buildup_E_min_MeV, 0.015, 1e-12);

  // Pd-103 at 1 mm Pb: the case that produced no warning at all before, because
  // only the representative line was checked.
  const pd = nuclides.find(n => n.id === 'Pd-103');
  const wOut = pd.shielding_spectrum
    .filter(([E]) => PHYSICS_.getMu(E / 1000, 'Pb') * 0.1 > 40)
    .reduce((s, [, w]) => s + w, 0);
  totalTests++;
  if (wOut > 0.99) { passedTests++; console.log(`  ✓ Pd-103 at 1 mm Pb: ${(wOut*100).toFixed(1)}% of dose weight beyond 40 mfp (must warn)`); }
  else { failedTests++; console.log(`  ✗ Pd-103 out-of-range weight ${(wOut*100).toFixed(1)}%, expected >99%`); }
}
console.log();

// Test 11h: μ/ρ regression against the EXTERNAL NIST source (not the in-repo
// table). getMu(E)/ρ must reproduce the published NIST XAAMDI values for lead,
// elemental iron (z26) and ordinary concrete within 1%. This guards against the class of error
// found in the 2026-07-15 audit, where the table silently diverged from NIST.
console.log('Test 11h: μ/ρ matches published NIST XAAMDI values (external anchor)');
{
  // [material, E_MeV, ρ, NIST μ/ρ cm²/g]
  const nistAnchors = [
    ['Pb',          1.000, RHO_PB,       0.07102],
    ['Pb',          0.100, RHO_PB,       5.549  ],
    ['Pb',          0.060, RHO_PB,       5.021  ],
    ['Pb',          0.150, RHO_PB,       2.014  ],
    ['Fe',          1.000, RHO_FE,       0.05995],
    ['Fe',          0.100, RHO_FE,       0.3717 ],
    ['Fe',          0.030, RHO_FE,       8.176  ],
    ['concrete_NW', 1.000, RHO_CONCRETE, 0.06495],
    ['concrete_NW', 0.030, RHO_CONCRETE, 0.9601 ],
    ['concrete_NW', 0.300, RHO_CONCRETE, 0.1097 ],
  ];
  for (const [mat, E, rho, nist] of nistAnchors) {
    test(`μ/ρ ${mat} @ ${E} MeV = ${nist} (NIST)`, PHYSICS_.getMu(E, mat) / rho, nist, 0.01);
  }
}
console.log();

// Test 12: Exposure buildup factors (ANSI/ANS-6.4.3 / NUREG/CR-5740 Table 3)
console.log('Test 12: Exposure buildup B(E, mfp) and buildup-aware transmission');

// 12a: grid-point reproduction — values transcribed from NUREG/CR-5740 Table 3
//      (Iron p. II-33, Lead p. II-40, Concrete p. II-44) and verified visually on the scan
{
  const gridChecks = [
    ['Pb', 1.0, 10, 3.51], ['Pb', 0.089, 40, 2.36e12], ['Pb', 0.088, 0.5, 1.05],
    ['Pb', 15, 40, 5.59e5], ['Pb', 0.2, 4, 1.27], ['Pb', 0.13, 40, 2.08e5],
    ['Fe', 0.1, 1, 1.40], ['Fe', 1.0, 40, 114], ['Fe', 0.015, 40, 1.01],
    ['Fe', 0.5, 20, 55.4],
    ['concrete_NW', 0.1, 1, 2.78], ['concrete_NW', 1.0, 40, 164],
    ['concrete_LW', 0.2, 20, 201], ['concrete_NW', 0.015, 40, 1.11],
    ['concrete_NW', 0.04, 7, 2.35],
  ];
  for (const [mat, E, mfp, exp] of gridChecks) {
    test(`B(${E} MeV, ${mfp} mfp, ${mat}) = ${exp}`, PHYSICS_.getBuildup(E, mfp, mat), exp, 1e-9);
  }
}

// 12b: B(E, 0) = 1 and clamp beyond the 40-mfp validity limit
test('B(0.5 MeV, 0 mfp, Pb) = 1', PHYSICS_.getBuildup(0.5, 0, 'Pb'), 1, 1e-12);
test('B clamps beyond 40 mfp (concrete, 1 MeV)',
  PHYSICS_.getBuildup(1, 80, 'concrete_NW'), PHYSICS_.getBuildup(1, 40, 'concrete_NW'), 1e-12);

// 12c: Pb K-edge is not interpolated across (B jumps ~25× at 5 mfp)
{
  const sub = PHYSICS_.getBuildup(0.0879, 5, 'Pb');
  const sup = PHYSICS_.getBuildup(0.0891, 5, 'Pb');
  totalTests++;
  if (sub < 1.2 && sup > 25) {
    passedTests++;
    console.log(`  ✓ Pb K-edge split: B(87.9 keV)=${sub.toFixed(2)} | B(89.1 keV)=${sup.toFixed(1)}`);
  } else {
    failedTests++;
    console.log(`  ✗ Pb K-edge split broken: sub=${sub}, super=${sup}`);
  }
}

// 12c-bis: getMu and getBuildup MUST switch branch at the same energy.
//   Regression for audit 2026-07-15 finding 1: getMu switched at 0.08800 and
//   getBuildup at 0.0885, so photons in [88.0, 88.5) keV got post-edge μ with
//   pre-edge B — T(88.2 keV, 1 mm Pb) = 1.97e-4 instead of 6.11e-2 (~300×, in
//   the NON-conservative direction). 120 ICRP-107 lines across 67 nuclides sit
//   in that window. Test 12c above only probes 87.9/89.1 keV, straddling the
//   gap without ever entering it — hence this test.
{
  // Locate each function's switch energy by bisection on a bracket that
  // contains the edge; both jump upward when crossing it.
  const switchEnergy = (jumped) => {
    let lo = 0.0870, hi = 0.0895;           // lo: sub-edge, hi: post-edge
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (jumped(mid)) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  };
  const muSwitch = switchEnergy(E => PHYSICS_.getMu(E, 'Pb') > 50);            // 21.7 → 87 cm⁻¹
  const bSwitch  = switchEnergy(E => PHYSICS_.getBuildup(E, 5, 'Pb') > 10);    // ~1.1 → ~28

  test('getMu Pb K-edge switch = 0.0880045 MeV (NIST)', muSwitch, 0.0880045, 1e-4);
  test('getBuildup Pb K-edge switch = getMu switch (same branch, no mixing)',
    bSwitch, muSwitch, 1e-9);

  // No spurious discontinuity INSIDE the post-edge branch: 88.2 → 88.6 keV must
  // vary smoothly (it jumped ~300× before the fix).
  const T = (E) => {
    const mfp = PHYSICS_.getMu(E, 'Pb') * 0.1;                                  // 1 mm Pb
    return Math.min(1, PHYSICS_.getBuildup(E, mfp, 'Pb') * Math.exp(-mfp));
  };
  totalTests++;
  const rIn = T(0.0886) / T(0.0882);
  if (rIn > 0.9 && rIn < 1.1) {
    passedTests++;
    console.log(`  ✓ no jump inside post-edge branch: T(88.6)/T(88.2) = ${rIn.toFixed(3)}`);
  } else {
    failedTests++;
    console.log(`  ✗ spurious jump inside post-edge branch: T(88.6)/T(88.2) = ${rIn.toExponential(2)} (μ/B branches mixed?)`);
  }

  // Crossing the edge must DROP transmission (more absorption), by ~2× at 1 mm
  // Pb — not by 4 orders of magnitude.
  totalTests++;
  const rEdge = T(0.0879) / T(0.0882);
  if (rEdge > 1 && rEdge < 10) {
    passedTests++;
    console.log(`  ✓ K-edge step is physical: T(87.9)/T(88.2) = ${rEdge.toFixed(2)} (1 mm Pb)`);
  } else {
    failedTests++;
    console.log(`  ✗ K-edge step unphysical: T(87.9)/T(88.2) = ${rEdge.toExponential(2)}`);
  }

  // Lines stored at exactly 88.0 keV (ICRP-107 rounds to 0.1 keV; e.g. Cd-109,
  // true 88.034 keV) must take the sub-edge branch — the conservative choice.
  test('88.0 keV line takes the sub-edge μ (conservative, source rounds to 0.1 keV)',
    PHYSICS_.getMu(0.0880, 'Pb') / RHO_PB, 1.910, 1e-3);
}

// 12d: T(x) with buildup is monotonically non-increasing (min(1,·) clamp)
{
  let ok = true;
  for (const [E, mat, xmax] of [[0.1, 'concrete_NW', 60], [0.662, 'concrete_NW', 80], [0.141, 'Pb', 3], [0.364, 'Pb', 8], [0.141, 'Fe', 8], [0.662, 'Fe', 20]]) {
    let prev = 1 + 1e-12;
    for (let x = 0; x <= xmax; x += xmax / 240) {
      const T = CALC_.transmission(x, E, mat);
      if (T > prev + 1e-12) { ok = false; console.log(`  ✗ T not monotone at ${E} MeV ${mat} x=${x}`); break; }
      prev = T;
    }
  }
  totalTests++;
  if (ok) { passedTests++; console.log('  ✓ T(x) non-increasing for mono-line cases (Pb, Fe & concrete, low/high E)'); }
  else failedTests++;
}

// 12e: cross-validation vs Archer broad-beam Monte Carlo fits (full-spectrum,
//      buildup inherently included). The point-isotropic narrow+buildup model
//      and the broad-beam Archer fit legitimately diverge at deep penetration:
//      they agree within ~3× at 2 HVL, and the narrow-beam stays CONSERVATIVE
//      (predicts equal-or-higher transmitted dose) out to 10 HVL, where the gap
//      widens to ~5.6× for the softest case (I-131 in 70 cm of concrete). This
//      accredits order of magnitude and the conservative direction, not
//      equivalence. Lower bound guards against non-conservative under-prediction.
{
  const archerNuclides = ['Tc-99m', 'I-131'];
  let ok = 0, bad = 0;
  for (const id of archerNuclides) {
    const n = nuclides.find(x => x.id === id);
    for (const mat of ['Pb', 'concrete_NW']) {
      const ap = n.archer_params[mat];
      const hvl = CALC_.hvlTvl(0, mat, ap, null).hvl_cm;
      for (const k of [2, 10]) {
        const x = k * hvl;
        const Ta = CALC_.transmissionArcher(x * 10, ap);
        const Tn = CALC_.transmissionSpectrum(x, n.shielding_spectrum, mat);
        const ratio = Tn / Ta;
        const hi = k >= 10 ? 8 : 3;   // wider band at deep penetration
        if (ratio > 1 / 3 && ratio < hi) {
          ok++;
          console.log(`  ✓ ${id} ${mat} ${k}×HVL: narrow+B/Archer = ${ratio.toFixed(2)}`);
        } else {
          bad++;
          console.log(`  ✗ ${id} ${mat} ${k}×HVL: ratio ${ratio.toFixed(2)} outside [0.33, ${hi}]`);
        }
      }
    }
  }
  totalTests++;
  if (bad === 0) passedTests++; else failedTests++;
}

// 12f: thickness solver round-trips with buildup (mono and spectral)
{
  const ga67 = nuclides.find(n => n.id === 'Ga-67');
  const xs = CALC_.thicknessForAttenuation(0.1, 0.093, 'Pb', null, ga67.shielding_spectrum);
  test('Ga-67 spectral+buildup TVL round-trip',
    CALC_.transmissionSpectrum(xs, ga67.shielding_spectrum, 'Pb'), 0.1, 1e-6);
  const xm = CALC_.thicknessForAttenuation(0.05, 0.662, 'concrete_NW', null, null);
  test('mono-line 662 keV concrete round-trip T(x(0.05)) = 0.05',
    CALC_.transmission(xm, 0.662, 'concrete_NW'), 0.05, 1e-6);
  const xf = CALC_.thicknessForAttenuation(0.1, 0.662, 'Fe', null, null);
  test('mono-line 662 keV iron round-trip T(x(0.1)) = 0.1',
    CALC_.transmission(xf, 0.662, 'Fe'), 0.1, 1e-6);
}
console.log();

// ---------------------------------------------------------------------------
// TEST 13: Liquid effluent — NUREG/CR-5814 Scenario No. 2 (STP sludge operator)
// ---------------------------------------------------------------------------
console.log('TEST 13: Effluent Scenarios 1 and 2 (CALC.sewerInspectorScenario1, CALC.sludgeOperatorScenario2, EFFLUENT.evaluate)');
{
  const S_PER_D = 86400, S_PER_H = 3600;
  const kSI = k_nSv_h => k_nSv_h * 1e-9 / S_PER_H;
  // Workbook defaults (IRA-xxxx_Lu-177_dosis_en_escenario2_v1.xlsx, sheet Escenario-2).
  const base = {
    transit_s: 3 * S_PER_D, wet_sludge_kg_per_y: 5090e3, solids_fraction: 0.25,
    wet_density_kg_m3: 1200, dust_kg_m3: 1e-7, respirable_fraction: 0.2, sludge_fraction: 1,
    breathing_m3_s: 1.2 / S_PER_H, t_ext_s: 1500 * S_PER_H, t_inh_s: 300 * S_PER_H, geometry_factor: 1,
  };

  // 13a: workbook regression for A_ref = 1 GBq, Lu-177 with the WORKBOOK half-life
  // (6.647 d) and coefficients — cached values of cells D47, D51–D56.
  const xl = CALC_.sludgeOperatorScenario2(Object.assign({}, base, {
    lambda_s: Math.LN2 / (6.647 * S_PER_D), A_Bq_per_y: 1e9,
    k_Sv_m3_per_Bq_s: kSI(4.117e-6), e_inh_Sv_per_Bq: 1.1e-9,
  }));
  test('workbook D47 DF = 0.7313676', xl.DF, 0.7313675753068278, 1e-9);
  test('workbook D51 C dry = 574.7486 Bq/kg', xl.C_dry, 574.7485857028117, 1e-9);
  test('workbook D52 C wet = 1.724246E5 Bq/m³', xl.C_wet, 172424.57571084352, 1e-9);
  test('workbook D53 C air = 1.149497E-5 Bq/m³', xl.C_air, 1.1494971714056235e-05, 1e-9);
  test('workbook D54 D ext = 1.064808E-3 mSv/GBq', xl.E_ext * 1e3, 0.0010648079673023138, 1e-9);
  test('workbook D55 D inh = 4.552009E-9 mSv/GBq', xl.E_inh * 1e3, 4.552008798766269e-09, 1e-9);
  test('workbook D62 FD = 1.064813 µSv/GBq', xl.E * 1e6, 1.0648125193111126, 1e-9);
  test('workbook E62 E = FD × 732.6 GBq/y = 0.7800817 mSv/y', xl.FD_Sv_per_Bq * 732.6e9 * 1e3, 0.7800816516473212, 1e-9);

  // 13b: NUREG/CR-5814 structural check. With the NUREG reference plant
  // (1700 t/y dry sludge, 30 % solids, 1200 kg/m³, 3 d, 1500 h) and the GENII
  // 'STP WKR' factor of Table A.21 for I-131 (3.82E-10 Sv/y per Bq/m³, y = 8766 h),
  // 1 Ci/y must reproduce Table B.7: external 3.9E-2 rem/y. Tolerance 3 % covers
  // the two-figure rounding of the table and the year length convention.
  const i131 = nuclides.find(n => n.id === 'I-131');
  const nureg = CALC_.sludgeOperatorScenario2(Object.assign({}, base, {
    lambda_s: Math.LN2 / i131.half_life_s, A_Bq_per_y: 3.7e10,
    wet_sludge_kg_per_y: 1700e3 / 0.30, solids_fraction: 0.30,
    k_Sv_m3_per_Bq_s: 3.82e-10 / (8766 * S_PER_H), e_inh_Sv_per_Bq: 0,
  }));
  test('NUREG Table B.7 I-131 fraction remaining after 3 d = 0.77', nureg.DF, 0.77, 0.01);
  test('NUREG Table B.7 I-131 external = 3.9E-2 rem/y per Ci/y', nureg.E_ext * 100, 3.9e-2, 0.03);
  test('NUREG Table A.16 wet sludge = 2.1E-4 Ci/m³ per Ci/y (before decay)', nureg.C_wet / nureg.DF / 3.7e10, 2.1e-4, 0.03);

  // 13c: input validation
  let threw = 0;
  for (const bad of [{ solids_fraction: 0 }, { solids_fraction: 1.2 }, { respirable_fraction: -0.1 },
                     { wet_sludge_kg_per_y: 0 }, { t_ext_s: NaN }, { A_Bq_per_y: -1 }]) {
    try {
      CALC_.sludgeOperatorScenario2(Object.assign({}, base, {
        lambda_s: 1e-6, A_Bq_per_y: 1e9, k_Sv_m3_per_Bq_s: 1e-18, e_inh_Sv_per_Bq: 1e-9 }, bad));
    } catch (e) { if (e.name === 'RangeError') threw++; }   // cross-realm: compare by name
  }
  test('invalid inputs (fractions outside [0,1], zero sludge, NaN, negative) are rejected', threw, 6, 0);

  // 13d: Scenario 1 (sewer inspector) — workbook regression. Cached values of
  // 'Efluentes - Dosis precisas escenarios 1_2_4 v2.xlsx', sheet Escenario-1,
  // cells D43, D47–D52, E58, with that workbook's own inputs: F-18, T½ =
  // 0.076229 d, t = 0.008333 d, V = 20 000 m³/y, k = 7.197E-5, e = 5.6E-11.
  const s1base = {
    transit_s: 0.008333 * S_PER_D, water_volume_m3_per_y: 20000, water_density_kg_m3: 1000,
    aerosol_kg_m3: 1e-7, respirable_fraction: 0.2, breathing_m3_s: 1.2 / S_PER_H,
    t_ext_s: 100 * S_PER_H, t_inh_s: 20 * S_PER_H, geometry_factor: 1,
  };
  const xl1 = CALC_.sewerInspectorScenario1(Object.assign({}, s1base, {
    lambda_s: Math.LN2 / (0.076229 * S_PER_D), A_Bq_per_y: 1e9,
    k_Sv_m3_per_Bq_s: kSI(7.197e-5), e_inh_Sv_per_Bq: 5.6e-11,
  }));
  test('workbook Sc.1 D43 DF = 0.9270279', xl1.DF, 0.9270278892989039, 1e-9);
  test('workbook Sc.1 D47 C wastewater = 46 351.39 Bq/m³', xl1.C_water, 46351.394464945195, 1e-9);
  test('workbook Sc.1 D48 C wastewater = 46.35139 Bq/kg', xl1.C_water_kg, 46.351394464945194, 1e-9);
  test('workbook Sc.1 D49 C air = 9.270279E-7 Bq/m³', xl1.C_air, 9.270278892989039e-07, 1e-9);
  test('workbook Sc.1 D50 D ext = 3.335910E-4 mSv/GBq', xl1.E_ext * 1e3, 0.00033359098596421054, 1e-9);
  test('workbook Sc.1 D51 D inh = 1.245925E-12 mSv/GBq', xl1.E_inh * 1e3, 1.2459254832177265e-12, 1e-9);
  test('workbook Sc.1 D58 FD = 0.3335910 µSv/GBq', xl1.E * 1e6, 0.333590987210136, 1e-9);
  test('workbook Sc.1 E58 E = FD × 412.5 GBq/y = 0.1376063 mSv/y', xl1.FD_Sv_per_Bq * 412.5e9 * 1e3, 0.13760628222418114, 1e-9);
  let threw1 = 0;
  for (const bad of [{ water_volume_m3_per_y: 0 }, { water_density_kg_m3: 0 }, { respirable_fraction: 1.5 },
                     { geometry_factor: -1 }, { t_inh_s: Infinity }]) {
    try {
      CALC_.sewerInspectorScenario1(Object.assign({}, s1base, {
        lambda_s: 1e-6, A_Bq_per_y: 1e9, k_Sv_m3_per_Bq_s: 1e-18, e_inh_Sv_per_Bq: 1e-9 }, bad));
    } catch (e) { if (e.name === 'RangeError') threw1++; }
  }
  test('Sc.1 invalid inputs (zero volume or density, fraction > 1, negative, infinite) are rejected', threw1, 5, 0);

  // 13e: application chain with the shipped data file and default inputs
  // (half-lives from nuclides.json; Lu-177m from the data file's ICRP 107
  // fallback). Reference values computed independently during planning
  // (Scenario 2: 2026-10-02; Scenario 1: 2026-10-03).
  const effCtx = vm.createContext({ console, fetch: async () => { throw new Error('offline test'); } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8'), effCtx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/physics.js'), 'utf8'), effCtx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../data/effluent-scenarios-data.js'), 'utf8'), effCtx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/effluent.js'), 'utf8') +
    ';this.__EFF = EFFLUENT; this.__ED = EFFLUENT_DATA;', effCtx);
  const EFF = effCtx.__EFF, ED = effCtx.__ED;
  const halfLife = nd => EFF.halfLifeOf(nd, nuclides.find(n => n.id === nd.id) || null);
  const defaults = geo => {
    const inp = EFF.defaultInput(ED, halfLife, geo);
    inp.nuclides.forEach(n => { n.include = true; });
    return inp;
  };
  const l45 = EFF.evaluate(defaults('L45')), l10 = EFF.evaluate(defaults('L10'));
  const row = (res, id) => res.rows.find(r => r.id === id);
  // Source term (v1.4.1): A_adm = patients × cycles × administered activity;
  // in-hospital fraction leaves through the facility (Scenario 1 and 2); the rest
  // is excreted at home and reaches the STP × catchment (Scenario 2 only).
  // Defaults: Lu-177 75 × 6 × 7.4 GBq, f_hosp 0.45; I-131 50 × 1 × 0.8 GBq, f_hosp 0.5;
  // catchment 40 %; no nuclide in decay tanks. Expected activities computed by hand;
  // doses = activity × the per-GBq factors verified above (Sc. 2 FD unchanged).
  test('app Sc.1 Lu-177 leaves hospital = 3330 × 0.45 = 1498.5 GBq/y', row(l45.s1, 'Lu-177').A_GBq_y, 1498.5, 1e-9);
  test('app Sc.1 Lu-177 FD = 0.0114651 µSv/GBq', row(l45.s1, 'Lu-177').per_GBq.FD_uSv, 0.01146505198, 1e-6);
  test('app Sc.1 Lu-177 E = 0.0171804 mSv/y', row(l45.s1, 'Lu-177').E_mSv_y, 0.01718038039, 1e-6);
  test('app Sc.1 I-131 leaves hospital = 40 × 0.5 = 20 GBq/y', row(l45.s1, 'I-131').A_GBq_y, 20, 1e-9);
  test('app Sc.1 I-131 FD = 0.135353 µSv/GBq', row(l45.s1, 'I-131').per_GBq.FD_uSv, 0.1353527017, 1e-6);
  test('app Sc.1 I-131 E = 0.00270705 mSv/y', row(l45.s1, 'I-131').E_mSv_y, 0.002707054034, 1e-6);
  test('app Sc.1 Lu-177m (ICRP 107 T½) FD = 0.340488 µSv/GBq', row(l45.s1, 'Lu-177m').per_GBq.FD_uSv, 0.3404880508, 1e-6);
  test('app Sc.1 Lu-177m E = 5.10221E-5 mSv/y', row(l45.s1, 'Lu-177m').E_mSv_y, 5.102213441e-05, 1e-6);
  test('app Sc.1 F-18 FD equals the workbook factor (0.333591 µSv/GBq)', row(l45.s1, 'F-18').per_GBq.FD_uSv, 0.333590987210136, 1e-5);   // app transit 0.2 h vs workbook 0.008333 d
  test('app Sc.1 Tc-99m default source term is zero (no workbook default)', row(l45.s1, 'Tc-99m').E_mSv_y, 0, 0);
  test('app Sc.2 Lu-177 to STP = 1498.5 + 3330 × 0.55 × 0.40 = 2231.1 GBq/y', row(l45.s2, 'Lu-177').A_GBq_y, 2231.1, 1e-9);
  test('app Sc.2 L45 Lu-177 FD = 1.06479 µSv/GBq (unchanged)', row(l45.s2, 'Lu-177').per_GBq.FD_uSv, 1.064791672, 1e-6);
  test('app Sc.2 L45 Lu-177 E = 2.37566 mSv/y', row(l45.s2, 'Lu-177').E_mSv_y, 2.375656699, 1e-6);
  test('app Sc.2 I-131 to STP = 20 + 40 × 0.5 × 0.40 = 28 GBq/y', row(l45.s2, 'I-131').A_GBq_y, 28, 1e-9);
  test('app Sc.2 L45 I-131 DF = 0.771688', row(l45.s2, 'I-131').DF, 0.7716876942, 1e-6);
  test('app Sc.2 L45 I-131 FD = 13.0990 µSv/GBq (unchanged)', row(l45.s2, 'I-131').per_GBq.FD_uSv, 13.09901400, 1e-6);
  test('app Sc.2 L45 I-131 E = 0.366772 mSv/y', row(l45.s2, 'I-131').E_mSv_y, 0.366772392, 1e-6);
  test('app Sc.2 L10 Lu-177 E = 1.63164 mSv/y', row(l10.s2, 'Lu-177').E_mSv_y, 1.631635434, 1e-6);
  test('app Sc.2 L10 I-131 E = 0.259874 mSv/y', row(l10.s2, 'I-131').E_mSv_y, 0.2598737855, 1e-6);
  test('app Sc.1 total is the sum of its rows', l45.s1.total_mSv_y,
    l45.s1.rows.reduce((a, r) => a + r.E_mSv_y, 0), 1e-12);
  // Decay tanks: Lu-177 and I-131 controlled share the 1 GBq/y discharge in
  // proportion to the activity excreted into the tanks (1498.5 + 20 = 1518.5 GBq/y).
  {
    const inp = defaults('L45');
    inp.nuclides.forEach(n => { n.include = ['Lu-177', 'I-131'].includes(n.id); n.controlled = n.include; });
    const o = EFF.evaluate(inp);
    test('tanks: Σ excreted into tanks = 1518.5 GBq/y', o.source.sumControlled_GBq_y, 1518.5, 1e-12);
    test('tanks: Lu-177 leaves hospital = 1 × 1498.5 / 1518.5 GBq/y', row(o.s1, 'Lu-177').A_GBq_y, 1498.5 / 1518.5, 1e-12);
    test('tanks: I-131 leaves hospital = 1 × 20 / 1518.5 GBq/y', row(o.s1, 'I-131').A_GBq_y, 20 / 1518.5, 1e-12);
    test('tanks: controlled discharges add up to the 1 GBq/y limit',
      row(o.s1, 'Lu-177').A_GBq_y + row(o.s1, 'I-131').A_GBq_y, 1, 1e-12);
    test('tanks: Lu-177 to STP = tank share + home part 732.6 GBq/y', row(o.s2, 'Lu-177').A_GBq_y, 1498.5 / 1518.5 + 732.6, 1e-12);
    // only I-131 controlled, below the limit after scaling patients down: no decay credit
    inp.nuclides.forEach(n => { n.controlled = n.id === 'I-131'; if (n.id === 'I-131') n.patients_per_y = 2; });
    const o2 = EFF.evaluate(inp);
    test('tanks: excreted into tanks below the limit (0.8 GBq/y) is discharged in full', row(o2.s1, 'I-131').A_GBq_y, 0.8, 1e-12);
    test('tanks: an uncontrolled nuclide is unaffected by the tank limit', row(o2.s1, 'Lu-177').A_GBq_y, 1498.5, 1e-12);
  }
  // F-18 has no Scenario 2 coefficient: flagged, not zero, not in the total
  totalTests++;
  if (row(l45.s2, 'F-18').no_coefficient === true && !('E_mSv_y' in row(l45.s2, 'F-18'))) {
    passedTests++; console.log('  ✓ app Sc.2 F-18 is flagged as "no coefficient", not computed as zero');
  } else { failedTests++; console.log('  ✗ app Sc.2 F-18 should be flagged as "no coefficient"'); }
  test('app Sc.2 total is the sum of the rows that have a coefficient', l45.s2.total_mSv_y,
    l45.s2.rows.filter(r => !r.no_coefficient).reduce((a, r) => a + r.E_mSv_y, 0), 1e-12);

  // 13f: every input changes the result in the expected direction / proportion
  const ratio = (scen, group, key, factor) => {
    const inp = defaults('L45');
    inp[group][key] *= factor;
    return EFF.evaluate(inp)[scen].total_mSv_y / l45[scen].total_mSv_y;
  };
  {
    const inp = defaults('L45');
    inp.s2.catchment_pct = 20;
    test('Sc.2: catchment 40 → 20 % halves only the home part (Lu-177 1498.5 + 366.3 GBq/y)',
      row(EFF.evaluate(inp).s2, 'Lu-177').A_GBq_y, 1498.5 + 3330 * 0.55 * 0.2, 1e-12);
  }
  test('Sc.1: catchment has no effect', ratio('s1', 's2', 'catchment_pct', 0.5), 1, 1e-12);
  test('Sc.2: wet sludge mass × 2 halves the total', ratio('s2', 's2', 'wet_sludge_t_per_y', 2), 0.5, 1e-9);
  test('Sc.2: external time × 2 ≈ doubles the total (external dominant)', ratio('s2', 's2', 't_external_h_y', 2), 2, 1e-4);
  test('Sc.2: geometry factor × 0.5 ≈ halves the total', ratio('s2', 's2', 'geometry_factor', 0.5), 0.5, 1e-4);
  test('Sc.2: density × 2 ≈ doubles the total', ratio('s2', 's2', 'wet_density_kg_m3', 2), 2, 1e-4);
  test('Sc.1: water volume × 2 halves the total', ratio('s1', 's1', 'water_volume_m3_y', 2), 0.5, 1e-9);
  test('Sc.1: external time × 2 ≈ doubles the total', ratio('s1', 's1', 't_external_h_y', 2), 2, 1e-4);
  test('Sc.1: geometry factor × 0.5 ≈ halves the total', ratio('s1', 's1', 'geometry_factor', 0.5), 0.5, 1e-4);
  test('Sc.1: Scenario 2 parameters have no effect', ratio('s1', 's2', 'wet_sludge_t_per_y', 3), 1, 1e-12);
  test('Sc.2: Scenario 1 parameters have no effect', ratio('s2', 's1', 'water_volume_m3_y', 3), 1, 1e-12);
  {
    const inp = defaults('L45');
    inp.nuclides.forEach(n => { n.include = n.id !== 'I-131'; });
    const o = EFF.evaluate(inp);
    test('excluding I-131 removes it from both scenarios', o.s2.total_mSv_y,
      l45.s2.total_mSv_y - row(l45.s2, 'I-131').E_mSv_y, 1e-12);
  }
  // PHITS vs NUREG Table A.21: k(nSv/h per Bq/m³) = factor(Sv/y per Bq/m³) / 8766 h × 1e9
  const cmpI = EFF.nuregComparison(ED.nuclides.find(n => n.id === 'I-131'), 'L45');
  test('NUREG A.21 I-131 SEWER MAINT → 1.0027E-5 (nSv/h)/(Bq/m³)', cmpI.k1_nureg, 8.79e-11 / 8766 * 1e9, 1e-12);
  test('PHITS / NUREG ratio, I-131 Scenario 1 = 2.70', cmpI.ratio1, 2.709e-5 / (8.79e-11 / 8766 * 1e9), 1e-12);
  test('PHITS L45 / NUREG ratio, I-131 Scenario 2 = 1.10', cmpI.ratio2, 4.800e-5 / (3.82e-10 / 8766 * 1e9), 1e-12);
  totalTests++;
  if (EFF.nuregComparison(ED.nuclides.find(n => n.id === 'Lu-177'), 'L45') === null &&
      EFF.nuregComparison(ED.nuclides.find(n => n.id === 'F-18'), 'L45').ratio2 === null) {
    passedTests++; console.log('  ✓ NUREG comparison absent for Lu-177 (not tabulated) and Sc. 2 ratio absent for F-18 (no PHITS k)');
  } else { failedTests++; console.log('  ✗ NUREG comparison availability wrong for Lu-177 / F-18'); }
  const plant = defaults('L45').s2;

  // 13f: cross-check of the NUREG Table B.7 rescaling for the workbook plant:
  // 10.5 × (1700 / 1272.5) × (0.25 / 0.30) = 11.6896 µSv/GBq.
  const cc = EFF.crossChecks(ED.nuclides.find(n => n.id === 'I-131'), i131.half_life_s, plant);
  test('NUREG B.7 rescaled to the workbook plant = 11.69 µSv/GBq', cc.nureg_uSv_per_GBq, 10.5 * 1700 / 1272.5 * 0.25 / 0.30, 1e-9);
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
// Exit non-zero on failure. Without this the suite printed "Some tests failed"
// and still exited 0, so nothing — CI, a pre-commit hook, `&&` in a shell —
// could ever notice (audit 2026-07-15, finding 8).
process.exit(failedTests === 0 ? 0 : 1);
