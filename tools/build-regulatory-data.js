#!/usr/bin/env node
/**
 * build-regulatory-data.js — Build data/regulatory.json
 *
 * Contents
 *   rd1217_annex4.a1 / .b   RD 1217/2024 Annex IV Tables A1 (clearance / exemption
 *                           of unlimited quantities, kBq/kg) and B (exemption of
 *                           moderate quantities: column 2 kBq/kg, column 3 Bq),
 *                           with the per-table notes and progeny as printed.
 *   ingestion_public_adult  e(g) adult (> 17 y) for members of the public:
 *                           RD 783/2001 Annex III table a), kept in force by the
 *                           CSN Resolution of 3 April 2024; numerical transcription
 *                           ICRP 119 Table F.1 (all chemical-form rows).
 *
 * Inputs (read only; nothing is written outside data/)
 *   --library <dir>   professional library folder '40_datos_y_herramientas' with
 *                     the verified CSVs:
 *                       'RD 1217 de 2024 - Anexo IV, exencion y desclasificacion.csv'
 *                       'RD 1217 de 2024 - Anexo IV, progenies consideradas.csv'
 *                       'ICRP 119 (2012) - Tabla F1, dosis efectiva por ingestion, publico.csv'
 *   --html <file>     extraction of the official BOE consolidated HTML with the
 *                     notes kept PER TABLE (output/auditoria-rd1217-2026-10-03/
 *                     cotejo.json, cross-checked there against the PDF text layer).
 *
 * Why two sources. The library CSV stores ONE 'nota' column for A1 and B on the
 * same row, so per-table notes are lost: Mo-99 carries A1's '(a)' although its
 * B row has no note, and U-240's B '(b)' row is merged with the A1 '(a)' row.
 * Notes and row structure are therefore taken from the HTML extraction, and
 * EVERY value is required to match the library CSV exactly (the build aborts on
 * any difference). Progeny comes from the library CSV plus the one line it
 * misses (A1 'Es-254 m → Fm-254', continued on BOE p. 164687; checked against
 * the rendered page on 2026-10-03).
 *
 * Source inconsistencies kept AS PRINTED in the BOE (checked on the rendered
 * pages, 2026-10-03) and flagged per row:
 *   A1: U-231 is marked (a) but has no progeny entry; Ce-144 has a progeny entry
 *       but its row carries no (a).
 *   B:  Ag-108m and U-230 have progeny entries but their rows carry no (b).
 *
 * Usage
 *   node tools/build-regulatory-data.js --library "<...>/40_datos_y_herramientas" \
 *        --html output/auditoria-rd1217-2026-10-03/cotejo.json
 *   node tools/generate-data.js        # writes the data/regulatory-data.js twin
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
}
function fail(msg) { console.error(`✗ ${msg}`); process.exit(1); }

const LIB = arg('--library');
const HTML = arg('--html');
if (!LIB || !HTML) fail('usage: --library <dir> --html <cotejo.json>');

const F_ANNEX = path.join(LIB, 'RD 1217 de 2024 - Anexo IV, exencion y desclasificacion.csv');
const F_PROG = path.join(LIB, 'RD 1217 de 2024 - Anexo IV, progenies consideradas.csv');
const F_F1 = path.join(LIB, 'ICRP 119 (2012) - Tabla F1, dosis efectiva por ingestion, publico.csv');
for (const f of [F_ANNEX, F_PROG, F_F1, HTML]) if (!fs.existsSync(f)) fail(`missing input ${f}`);

const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

// Minimal CSV reader (quoted fields, '#' comment lines skipped)
function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).join('\n');
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  row.push(field); rows.push(row);
  const [head, ...body] = rows;
  return body.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

// "Mn-52 m" → "Mn-52m"; "Tl-208 (0,36)" kept with its branching fraction
const normId = s => s.trim().replace(/\.$/, '').replace(/\s+m\b/, 'm');
const splitProgeny = s => s.split(';').map(x => x.trim().replace(/\.$/, '')).filter(Boolean)
  .map(x => x.replace(/^([A-Z][a-z]?-\d+)\s+m\b/, '$1m'));

// ---- progeny (library + the missing continuation line) ----
const progeny = { A1: {}, B: {} };
for (const r of readCsv(F_PROG)) progeny[r.tabla][normId(r.padre)] = splitProgeny(r.progenie);
if (progeny.A1['Es-254m']) fail('library progeny now contains Es-254m — remove the manual addition');
progeny.A1['Es-254m'] = ['Fm-254'];

// ---- HTML extraction: structure and per-table notes ----
const html = JSON.parse(fs.readFileSync(HTML, 'utf8'));
const lib = readCsv(F_ANNEX);
const libA1 = lib.filter(r => r.conc_A1_kBq_kg !== '').map(r => ({ id: r.nucleido, v: Number(r.conc_A1_kBq_kg) }));
const libB = lib.filter(r => r.conc_B_kBq_kg !== '').map(r => ({ id: r.nucleido, c: Number(r.conc_B_kBq_kg), a: Number(r.actividad_B_Bq) }));

if (html.A1.length !== libA1.length) fail(`A1 rows: HTML ${html.A1.length} ≠ library ${libA1.length}`);
if (html.B.length !== libB.length) fail(`B rows: HTML ${html.B.length} ≠ library ${libB.length}`);

const flags = [];
function consistency(table, id, note) {
  const has = !!progeny[table][id];
  const marked = table === 'A1' ? note === 'a' : note === 'b';
  if (marked && !has) return `As printed in the BOE: the row is marked (${table === 'A1' ? 'a' : 'b'}) but the progeny list has no entry for ${id}.`;
  if (!marked && has) return `As printed in the BOE: the progeny list includes ${id} but its Table ${table} row carries no note (${table === 'A1' ? 'a' : 'b'}).`;
  return null;
}

const a1 = html.A1.map((r, i) => {
  const l = libA1[i];
  if (r.id !== l.id || r.values.length !== 1 || r.values[0] !== l.v) fail(`A1 row ${i}: HTML ${r.id} ${r.values} ≠ library ${l.id} ${l.v}`);
  const note = r.note || null;
  const row = { id: r.id, note, kBq_kg: r.values[0], progeny: (note === 'a' || progeny.A1[r.id]) ? (progeny.A1[r.id] || []) : [] };
  const inc = consistency('A1', r.id, note);
  if (inc) { row.source_inconsistency = inc; flags.push(`A1 ${r.id}`); }
  return row;
});
// Library B rows: match by id + values (U-240 appears twice; order may differ)
const libBPool = libB.slice();
const b = html.B.map((r, i) => {
  const [c, a] = r.values;
  const k = libBPool.findIndex(x => x.id === r.id && x.c === c && x.a === a);
  if (k < 0) fail(`B row ${i}: HTML ${r.id} ${c} / ${a} has no identical library row`);
  libBPool.splice(k, 1);
  const note = r.note || null;
  // A nuclide printed twice (U-240: with and without (b)) — the unmarked twin is
  // a legitimate separate row, not an inconsistency, and gets no progeny.
  const markedTwin = note !== 'b' && html.B.some(x => x.id === r.id && x.note === 'b');
  const row = { id: r.id, note, conc_kBq_kg: c, activity_Bq: a,
    progeny: (note === 'b' || (progeny.B[r.id] && !markedTwin)) ? (progeny.B[r.id] || []) : [] };
  const inc = note === '1' || markedTwin ? null : consistency('B', r.id, note);
  if (inc) { row.source_inconsistency = inc; flags.push(`B ${r.id}`); }
  if (note === '1') row.note_text = 'Note (1): potassium salts in quantities below 1000 kg are exempt ("Quedan exentas las sales de potasio en cantidades inferiores a 1.000 kg").';
  return row;
});
if (libBPool.length) fail(`library B rows not matched: ${libBPool.map(x => x.id).join(', ')}`);

const EXPECTED_FLAGS = ['A1 Ce-144', 'A1 U-231', 'B Ag-108m', 'B U-230'];
if (JSON.stringify(flags.slice().sort()) !== JSON.stringify(EXPECTED_FLAGS)) {
  fail(`unexpected source-consistency flags: ${flags.join(', ')} (expected ${EXPECTED_FLAGS.join(', ')})`);
}

// ---- ICRP 119 F.1 adult column ----
const f1 = readCsv(F_F1).map(r => ({
  id: r.nucleido, f1: Number(r.f1_gt_1a), e_Sv_per_Bq: Number(r.e_gt_17a), compound: r.compuesto || null,
}));
if (f1.some(r => !(r.e_Sv_per_Bq > 0))) fail('F.1 row without a positive adult coefficient');

const out = {
  meta: {
    id: 'regulatory',
    version: '1.0.0',
    built: '2026-10-03',
    sources: {
      annex_iv_csv_sha256: sha(F_ANNEX),
      progeny_csv_sha256: sha(F_PROG),
      icrp119_f1_csv_sha256: sha(F_F1),
      html_extraction_sha256: sha(HTML),
      html_source_sha256: html.source_sha256 || null,
    },
  },
  rd1217_annex4: {
    source: 'Real Decreto 1217/2024, de 3 de diciembre, Reglamento sobre instalaciones nucleares y radiactivas — Anexo IV (BOE-A-2024-25205; consolidated text, last updated 2024-12-04).',
    a1_title: 'Table A1 — activity concentration values for exemption of practices or clearance of materials, applicable by default to any quantity and any type of solid material (artificial radionuclides), kBq/kg.',
    b_title: 'Table B — exemption of practices with moderate quantities (≤ 1000 kg) of any type of material: column 2 activity concentration (kBq/kg), column 3 total activity (Bq).',
    note_a: '(a) Parent radionuclide whose listed progeny is already accounted for in the value: only the parent is checked (Annex II A.3.b).',
    note_b: '(b) Parent radionuclide whose listed progeny is already accounted for in the value: only the parent is checked (Annex II A.3.b).',
    not_tabulated_a1: 'Not in Table A1. For clearance, Annex III.1.b applies complementarily the clearance levels of the latest version of the European Commission document "Radiation Protection 122 Part 1" (not included in this app).',
    not_tabulated_b: 'Not in Table B. Annex II A.3.a: the exemption values established by the Consejo de Seguridad Nuclear apply (not included in this app).',
    natural_note: 'Natural radionuclides in solid materials in secular equilibrium are covered by Table A2 (U-238 and Th-232 series, K-40), with its own conditions (Annex III.3) — not implemented in this app.',
    criteria: 'Annex II A.1: a) sources — total activity not above column 3 of Table B (sum of ratios ≤ 1 for several sources); b) moderate quantity (≤ 1000 kg) — activity per unit mass not above column 2 of Table B; c) unlimited quantity — activity per unit mass not above Table A1. Annex III.1.a: for mixtures, Σ(Cᵢ/Lᵢ) ≤ 1.',
    a1,
    b,
  },
  ingestion_public_adult: {
    source: 'e(g) for members of the public, adult (> 17 y): RD 783/2001 Annex III table a), repealed by RD 1029/2022 but kept in force by its third transitional provision and by the CSN Resolution of 3 April 2024. Numerical transcription: ICRP Publication 119 (2012) Table F.1, adult column (verified against the BOE scan).',
    governing_rule: 'When several chemical forms are tabulated, the most restrictive (largest e(g)) governs by default.',
    rows: f1,
  },
};

const dest = path.join(__dirname, '..', 'data', 'regulatory.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`✓ ${dest}`);
console.log(`  A1 ${a1.length} rows, B ${b.length} rows (${new Set(b.map(r => r.id)).size} ids), F.1 ${f1.length} rows (${new Set(f1.map(r => r.id)).size} nuclides)`);
console.log(`  source inconsistencies flagged: ${flags.join(', ')}`);
