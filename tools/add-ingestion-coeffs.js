#!/usr/bin/env node

/**
 * add-ingestion-coeffs.js — Fill ingestion e(g) and liquid effluent limits (2026-06)
 *
 * Source: ICRP Publication 119 (2012), Annex F, Table F.1 — committed effective
 * dose per ingestion intake for ADULT members of the public, e(g) in Sv/Bq.
 * (The PDF is copyrighted by ICRP and is NOT versioned in this repository;
 * maintainers keep a local copy at references/ICRP 119 - Coeficientes de
 * dosis.pdf, which .gitignore excludes. ICRP 119 is freely downloadable from
 * https://www.icrp.org/publication.asp?id=ICRP%20Publication%20119)
 *
 * Adds e(g) and the controlled liquid effluent concentration limit for the 6
 * therapy/imaging nuclides added in this round. The effluent limit uses the
 * project's existing formula (IS-28 Anexo II II.A.4):
 *     C_liq [Bq/L] = (1 mSv/y) / (e(g) [Sv/Bq] × 600 L/y) = 0.001 / (e(g)·600)
 * rounded to 3 significant figures, matching the existing curated entries.
 *
 * Also VERIFIES that the 28 e(g) values already stored match Table F.1 exactly
 * (the only DB column not yet cross-checked against its primary source). Any
 * mismatch is reported and aborts the write.
 *
 * For the alpha-therapy chains (Ra-223, Ac-225) the ICRP 119 parent ingestion
 * coefficient already accounts for radioactive progeny formed in body organs
 * (Publication 71 methodology), so no extra summation is needed.
 *
 * Usage: node tools/add-ingestion-coeffs.js   (then tools/generate-data.js — run here)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ICRP 119 Table F.1, ADULT column (Sv/Bq). null = not tabulated (noble gases,
// short-lived parents like N-13/O-15 absent from the ingestion table).
const E_G_ADULT = {
  'C-11': 2.4e-11, 'N-13': null, 'O-15': null, 'F-18': 4.9e-11,
  'Na-24': 4.3e-10, 'K-42': 4.3e-10, 'Cr-51': 3.8e-11, 'Co-57': 2.1e-10,
  'Co-58': 7.4e-10, 'Fe-59': 1.8e-9, 'Co-60': 3.4e-9, 'Cu-64': 1.2e-10,
  'Ga-67': 1.9e-10, 'Ga-68': 1.0e-10, 'Se-75': 2.6e-9, 'Tc-99m': 2.2e-11,
  'Pd-103': 1.9e-10, 'In-111': 2.9e-10, 'I-123': 2.1e-10, 'I-125': 1.5e-8,
  'I-131': 2.2e-8, 'Xe-133': null, 'Cs-137': 1.3e-8, 'Sm-153': 7.4e-10,
  'Yb-169': 7.1e-10, 'Tm-170': 1.3e-9, 'Lu-177': 5.3e-10, 'Re-186': 1.5e-9,
  'Re-188': 1.4e-9, 'Ir-192': 1.4e-9, 'Au-198': 1.0e-9, 'Tl-201': 9.5e-11,
  'Y-90': 2.7e-9,
  // New therapy/imaging additions (2026-06)
  'Zr-89': 7.9e-10, 'Cu-67': 3.4e-10, 'Tb-161': 7.2e-10, 'Ho-166': 1.4e-9,
  'Ra-223': 1.0e-7, 'Ac-225': 2.4e-8,
};

const NEW_IDS = new Set(['Zr-89', 'Cu-67', 'Tb-161', 'Ho-166', 'Ra-223', 'Ac-225']);
const SOURCE = 'IS-28 Annex II II.A.4; ICRP 119 Annex F Table F.1 adult ingestion';

// 3 significant figures, matching the existing curated effluent values
function sig3(x) {
  if (x === 0) return 0;
  const d = Math.ceil(Math.log10(Math.abs(x)));
  const power = 3 - d;
  const f = Math.pow(10, power);
  return Math.round(x * f) / f;
}

const jsonPath = path.join(__dirname, '..', 'data', 'nuclides.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

let verified = 0, updated = 0, mismatches = 0;

for (const n of data.nuclides) {
  if (!(n.id in E_G_ADULT)) continue;
  const eg = E_G_ADULT[n.id];

  if (NEW_IDS.has(n.id)) {
    n.ingestion_dose_coeff_adult_Sv_per_Bq = eg;
    if (eg !== null) {
      n.effluent_liquid_limit_Bq_per_L = sig3(0.001 / (eg * 600));
      n.effluent_liquid_limit_source = SOURCE;
    }
    updated++;
    console.log(`✓ ${n.id.padEnd(8)} e(g)=${eg}  effluent=${n.effluent_liquid_limit_Bq_per_L} Bq/L`);
  } else if (eg !== null) {
    // verify existing value matches ICRP 119 exactly
    const stored = n.ingestion_dose_coeff_adult_Sv_per_Bq;
    if (stored == null || Math.abs(stored - eg) / eg > 1e-6) {
      mismatches++;
      console.error(`✗ ${n.id}: stored e(g)=${stored} ≠ ICRP 119 Table F.1 adult value ${eg}`);
    } else {
      verified++;
    }
  }
}

console.log(`\nExisting e(g) verified against ICRP 119 Table F.1: ${verified} OK, ${mismatches} mismatch`);
if (mismatches > 0) {
  console.error('Aborting write due to mismatches.');
  process.exit(1);
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`✓ ${jsonPath}: ${updated} new nuclides given e(g)/effluent. Run tools/generate-data.js`);
