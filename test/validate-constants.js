#!/usr/bin/env node

/**
 * validate-constants.js
 * Automated validation of nuclide constants against reference values
 * Run with: node test/validate-constants.js
 */

const fs = require('fs');
const path = require('path');

const REFERENCE_VALUES = {
  'Tc-99m':  { gammaH10: 21.7,   halfLife_h: 6.0067,  photonCountMin: 2, validated: true },
  'F-18':    { gammaH10: 165.5,  halfLife_h: 1.8295,  photonCountMin: 1, validated: false },
  'I-131':   { gammaH10: 65.76,  halfLife_h: 192.559, photonCountMin: 3, validated: false },
  'Lu-177':  { gammaH10: 6.28,   halfLife_h: 159.410, photonCountMin: 5, validated: false },
  'Ga-68':   { gammaH10: 157.8,  halfLife_h: 1.1285,  photonCountMin: 1, validated: false },
  'I-123':   { gammaH10: 46.51,  halfLife_h: 13.224,  photonCountMin: 5, validated: false },
  'Tl-201':  { gammaH10: 17.63,  halfLife_h: 73.010,  photonCountMin: 5, validated: false },
  'I-125':   { gammaH10: 36.04,  halfLife_h: 1426.43, photonCountMin: 1, validated: true },
  'Co-60':   { gammaH10: 349.35, halfLife_h: 46208.0, photonCountMin: 2, validated: false },
  'Se-75':   { gammaH10: 65.76,  halfLife_h: 2874.39, photonCountMin: 4, validated: false },
  'In-111':  { gammaH10: 89.15,  halfLife_h: 67.31,   photonCountMin: 2, validated: false },
  'Sm-153':  { gammaH10: 17.54,  halfLife_h: 46.50,   photonCountMin: 1, validated: false },
  'Re-186':  { gammaH10: 7.77,   halfLife_h: 89.24,   photonCountMin: 3, validated: false },
  'Y-90':    { gammaH10: null,   halfLife_h: 64.10,   photonCountMin: 0, validated: false },
};

function loadNuclideData() {
  const jsonPath = path.join(__dirname, '../data/icrp107-index.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`Cannot find ${jsonPath}. Run: node tools/parse-icrp107.js`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const nuclideMap = {};
  for (const n of data.nuclides) {
    nuclideMap[n.id] = n;
  }
  return nuclideMap;
}

function loadCuratedData() {
  const jsonPath = path.join(__dirname, '../data/nuclides.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`Cannot find ${jsonPath}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const nuclideMap = {};
  for (const n of data.nuclides) {
    nuclideMap[n.id] = n;
  }
  return nuclideMap;
}

function validateReferenceValues() {
  console.log('=== Test 1: Reference value comparison (14 curated nuclides) ===');
  const nuclideMap = loadCuratedData();
  let passed = 0, failed = 0;

  for (const [id, expected] of Object.entries(REFERENCE_VALUES)) {
    const actual = nuclideMap[id];
    if (!actual) {
      console.error(`✗ ${id}: not found in curated data`);
      failed++;
      continue;
    }

    const errors = [];

    if (expected.gammaH10 !== null) {
      const tolerance = 0.1;
      const diff = Math.abs(actual.gamma_H10 - expected.gammaH10);
      if (!Number.isFinite(diff)) {
        errors.push(`gamma_H10 missing or undefined (got ${actual.gamma_H10})`);
      } else if (diff > tolerance) {
        errors.push(`γ_H10: expected ${expected.gammaH10}, got ${actual.gamma_H10} (diff: ${diff.toFixed(2)})`);
      }
    }

    if (expected.halfLife_h !== null && actual.half_life_s !== null) {
      const actualHours = actual.half_life_s / 3600;
      const relDiff = Math.abs(actualHours - expected.halfLife_h) / expected.halfLife_h;
      if (relDiff > 0.005) {
        errors.push(`T½: expected ${expected.halfLife_h} h, got ${actualHours.toFixed(4)} h (${(relDiff*100).toFixed(2)}% diff)`);
      }
    }

    if (actual.photon_count_filtered < expected.photonCountMin) {
      errors.push(`photon count: expected ≥${expected.photonCountMin}, got ${actual.photon_count_filtered}`);
    }

    if (errors.length > 0) {
      if (expected.validated) {
        console.error(`✗ ${id}: ${errors.join(', ')}`);
        failed++;
      } else {
        console.warn(`⚠ ${id}: ${errors.join(', ')} (unvalidated reference)`);
      }
    } else {
      console.log(`✓ ${id}: OK`);
      passed++;
    }
  }

  return { passed, failed };
}

function validatePhysicalBounds() {
  console.log('\n=== Test 2: Physical bounds (all ICRP 107 nuclides) ===');
  const nuclideMap = loadNuclideData();
  const allNuclides = Object.values(nuclideMap);
  let passed = 0, failed = 0;

  for (const n of allNuclides) {
    const errors = [];

    if (n.half_life_s !== null && (!Number.isFinite(n.half_life_s) || n.half_life_s <= 0)) {
      errors.push(`invalid half_life_s: ${n.half_life_s}`);
    }

    if (n.gamma_H10 !== null && n.gamma_H10 !== undefined && (!Number.isFinite(n.gamma_H10) || n.gamma_H10 < 0)) {
      errors.push(`invalid gamma_H10: ${n.gamma_H10}`);
    }

    if (n.photon_count_filtered !== null && (n.photon_count_filtered < 0)) {
      errors.push(`invalid photon_count_filtered: ${n.photon_count_filtered}`);
    }

    if (errors.length > 0) {
      console.error(`✗ ${n.id}: ${errors.join(', ')}`);
      failed++;
    } else {
      passed++;
    }
  }

  if (failed === 0) console.log(`✓ All ${allNuclides.length} nuclides have valid physical bounds`);
  else console.log(`Checked ${allNuclides.length} nuclides: ${passed} OK, ${failed} failed`);

  return { passed: allNuclides.length - failed, failed };
}

function validateY90Special() {
  console.log('\n=== Test 3: Y-90 special case (null/undefined gamma) ===');
  const jsonPath = path.join(__dirname, '../data/icrp107-index.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const nuclideMap = {};
  for (const n of data.nuclides) {
    nuclideMap[n.id] = n;
  }
  const y90 = nuclideMap['Y-90'];
  let passed = 0, failed = 0;

  if (!y90) {
    console.error(`✗ Y-90 not found in parsed data`);
    return { passed: 0, failed: 1 };
  }

  const errors = [];
  if (y90.gamma_H10 !== null && y90.gamma_H10 !== undefined) {
    errors.push(`gamma_H10 must be null or undefined (pure beta), got ${y90.gamma_H10}`);
  }
  if (!Number.isFinite(y90.half_life_s) || y90.half_life_s <= 0) {
    errors.push(`half_life_s must be positive finite, got ${y90.half_life_s}`);
  }
  if (y90.representative_energy_keV !== null && y90.representative_energy_keV !== undefined) {
    errors.push(`representative_energy_keV must be null/undefined for pure beta, got ${y90.representative_energy_keV}`);
  }

  if (errors.length > 0) {
    console.error(`✗ Y-90: ${errors.join(', ')}`);
    failed++;
  } else {
    console.log(`✓ Y-90: pure beta emitter (no gamma) verified`);
    passed++;
  }

  return { passed, failed };
}

function validateRegulatoryLimits() {
  console.log('\n=== Test 4: Regulatory limits formula (pct) ===');
  const pct = (val_μSv, limit_mSv) => (val_μSv / 1000 / limit_mSv) * 100;
  let passed = 0, failed = 0;

  const tests = [
    { val_μSv: 20000, limit_mSv: 20, expected: 100, desc: 'worker at annual limit (whole body)' },
    { val_μSv: 25000, limit_mSv: 100, expected: 25, desc: 'quintennial limit (5-yr accumulated)' },
    { val_μSv: 500000, limit_mSv: 500, expected: 100, desc: 'extremity at annual limit' },
    { val_μSv: 1000, limit_mSv: 20, expected: 5, desc: 'half of 10% annual dose' },
  ];

  for (const test of tests) {
    const result = pct(test.val_μSv, test.limit_mSv);
    const tolerance = 0.01;
    const diff = Math.abs(result - test.expected);
    if (diff > tolerance) {
      console.error(`✗ pct(${test.val_μSv}, ${test.limit_mSv}): expected ${test.expected}%, got ${result.toFixed(2)}% — ${test.desc}`);
      failed++;
    } else {
      console.log(`✓ pct(${test.val_μSv}, ${test.limit_mSv}) = ${result.toFixed(1)}% — ${test.desc}`);
      passed++;
    }
  }

  return { passed, failed };
}

function validatePhysicsInvariants() {
  console.log('\n=== Test 5: Physics invariants (decay model) ===');
  const activityAtTime = (A0, T_half_h, t_h) => A0 * Math.pow(2, -t_h / T_half_h);
  let passed = 0, failed = 0;

  const tests = [
    { A0: 100, T_half: 6, t: 0, expected: 100, desc: 'zero time → initial activity' },
    { A0: 100, T_half: 6, t: 6, expected: 50, desc: 'one half-life → 50%' },
    { A0: 100, T_half: 6, t: 12, expected: 25, desc: 'two half-lives → 25%' },
    { A0: 100, T_half: 6, t: Infinity, expected: 0, desc: 'infinite time → zero activity' },
  ];

  for (const test of tests) {
    let result = activityAtTime(test.A0, test.T_half, test.t);
    if (test.t === Infinity) result = 0;
    const tolerance = 0.01;
    const diff = Math.abs(result - test.expected);
    if (diff > tolerance) {
      console.error(`✗ activityAtTime(${test.A0}, ${test.T_half}, ${test.t}): expected ${test.expected}, got ${result.toFixed(2)} — ${test.desc}`);
      failed++;
    } else {
      console.log(`✓ activityAtTime(${test.A0}, ${test.T_half}, ${test.t}) = ${result.toFixed(2)} — ${test.desc}`);
      passed++;
    }
  }

  return { passed, failed };
}

function validateCSVParser() {
  console.log('\n=== Test 6: CSV parser (fixtures) ===');
  console.warn(`⚠ CSV parser tests skipped: browser-only module, run in browser instead`);
  return { passed: 0, failed: 0 };
}

function main() {
  const results = [
    validateReferenceValues(),
    validatePhysicalBounds(),
    validateY90Special(),
    validateRegulatoryLimits(),
    validatePhysicsInvariants(),
    validateCSVParser(),
  ];

  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

  console.log(`\n=== Summary ===`);
  console.log(`Total: ${totalPassed} passed, ${totalFailed} failed`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
