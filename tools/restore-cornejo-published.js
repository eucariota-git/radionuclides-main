#!/usr/bin/env node

/**
 * restore-cornejo-published.js — One-off data correction (2026-06 audit)
 *
 * Problem: tools/recalc-gamma.js stored the app's PREVIOUS (already recalculated)
 * values in `cornejo_validation`, so the field did not contain the published
 * Cornejo values as claimed by README.md and index.html.
 *
 * This script writes the actual published values from:
 *   Cornejo Díaz N., Brosed Serreta A., Ruiz Manzano P. "Constantes de tasa de
 *   kerma en aire y de tasa de equivalente de dosis ambiental de algunos
 *   radionucleidos utilizados en aplicaciones médicas." Radioprotección (SEPR),
 *   Nº 83, pp. 39–42, octubre 2015 — Tabla III.
 *   (PDF: references/Artículo Radioprotección - Constante de tasa de dosis.pdf)
 *
 * Γ^H'(0.07) is only published (in parentheses in Tabla III) when all photon
 * energies are < 300 keV and H'(0.07) > H*(10): Pd-103, In-111, I-125, Xe-133.
 * For the rest, gamma_H007_Cornejo is null (not published).
 *
 * Also updates the top-level `reference` citation (was wrongly cited as
 * "Rev. Fis. Med. 2006") and regenerates data/nuclides-data.js.
 *
 * Usage: node tools/restore-cornejo-published.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Tabla III, Cornejo et al. 2015: [Γ^K-air, Γ^H*(10), Γ^H'(0.07) in parentheses or null]
const CORNEJO_TABLE_III = {
  'C-11':         [139,   171,   null],
  'N-13':         [140,   171,   null],
  'O-15':         [140,   171,   null],
  'F-18':         [135,   166,   null],
  'Na-24':        [435,   496,   null],
  'K-42':         [32.4,  37.2,  null],
  'Cr-51':        [4.19,  5.44,  null],
  'Co-57':        [13.2,  20.7,  null],
  'Co-58':        [130,   155,   null],
  'Fe-59':        [148,   171,   null],
  'Co-60':        [307,   355,   null],
  'Cu-64':        [25.3,  31.0,  null],
  'Ga-67':        [21.0,  29.0,  null],
  'Se-75':        [51.0,  69.3,  null],
  'Tc-99m':       [14.6,  21.7,  null],
  'Mo-99+Tc-99m': [33.9,  45.0,  null],
  'Pd-103':       [35.9,  23.1,  38.0],
  'In-111':       [76.7,  89.9,  96.1],
  'I-123':        [38.5,  46.4,  null],
  'I-125':        [34.5,  35.3,  40.9],
  'I-131':        [52.0,  65.7,  null],
  'Xe-133':       [12.5,  16.3,  16.8],
  'Cs-137':       [77.5,  93.1,  null],
  'Sm-153':       [10.6,  16.7,  null],
  'Yb-169':       [43.0,  66.8,  null],
  'Tm-170':       [0.563, 0.957, null],
  'Lu-177':       [4.09,  6.00,  null],
  'Re-186':       [2.42,  3.86,  null],
  'Re-188':       [7.08,  9.44,  null],
  'Ir-192':       [109,   139,   null],
  'Au-198':       [54.6,  68.6,  null],
  'Tl-201':       [10.4,  17.4,  null],
};

const CITATION =
  'Cornejo Díaz N., Brosed Serreta A., Ruiz Manzano P. Constantes de tasa de ' +
  'kerma en aire y de tasa de equivalente de dosis ambiental de algunos ' +
  'radionucleidos utilizados en aplicaciones médicas. Radioprotección (SEPR), ' +
  'Nº 83, pp. 39–42, octubre 2015.';

const jsonPath = path.join(__dirname, '..', 'data', 'nuclides.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

data.reference = CITATION;

let updated = 0, removed = 0;
for (const n of data.nuclides) {
  const pub = CORNEJO_TABLE_III[n.id];
  if (pub) {
    n.cornejo_validation = {
      gamma_Kair_Cornejo: pub[0],
      gamma_H10_Cornejo:  pub[1],
      gamma_H007_Cornejo: pub[2],
      source: 'Cornejo et al., Radioprotección Nº 83 (2015), Tabla III',
    };
    updated++;
  } else if (n.cornejo_validation) {
    // Ga-68 / Y-90 are additions beyond Cornejo — must not carry the field
    delete n.cornejo_validation;
    removed++;
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`✓ ${jsonPath}: ${updated} cornejo_validation fields set from Tabla III, ${removed} removed`);
console.log('  Now run: node tools/generate-data.js');
