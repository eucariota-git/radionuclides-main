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

function validateNuclides() {
  const nuclideMap = loadNuclideData();
  let passed = 0, failed = 0;

  for (const [id, expected] of Object.entries(REFERENCE_VALUES)) {
    const actual = nuclideMap[id];
    if (!actual) {
      console.error(`✗ ${id}: not found in parsed data`);
      failed++;
      continue;
    }

    const errors = [];

    if (expected.gammaH10 !== null) {
      const tolerance = 0.1;
      const diff = Math.abs(actual.gamma_H10 - expected.gammaH10);
      if (diff > tolerance) {
        errors.push(`γ_H10: expected ${expected.gammaH10}, got ${actual.gamma_H10} (diff: ${diff.toFixed(2)})`);
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

  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${Object.keys(REFERENCE_VALUES).length} checks`);
  process.exit(failed > 0 ? 1 : 0);
}

validateNuclides();
