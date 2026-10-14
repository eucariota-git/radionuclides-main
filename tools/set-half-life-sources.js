#!/usr/bin/env node

/**
 * set-half-life-sources.js — Record (and, where needed, replace) the source of
 * every curated half-life (audit 2026-10-14, N-03).
 *
 * Until v1.10.1 the curated half-lives carried no provenance and mixed two
 * evaluations without saying so. Each value was compared with ICRP 107 (2008)
 * (data/icrp107-index.json) and with the DDEP recommended value (LNHB/CEA
 * "Table de Radionucléides", per-nuclide tables consulted 2026-10-14):
 *   - a value within 0.015 % of one source is attributed to it (to the closer
 *     one when both match);
 *   - a value matching neither (O-15, Mo-99, Lu-177, Y-90, K-42) is REPLACED by
 *     the DDEP value, or by ICRP 107 where DDEP has no table (K-42).
 * The DDEP values below are transcribed from the LNHB tables (value and standard
 * uncertainty in the last digits, as printed; 1 a = 365.2422 d).
 *
 * Usage: node tools/set-half-life-sources.js [--write]   then generate-data.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const nuclidesPath = path.join(DATA, 'nuclides.json');
const nuclideData = JSON.parse(fs.readFileSync(nuclidesPath, 'utf8'));
const icrp = new Map(JSON.parse(fs.readFileSync(path.join(DATA, 'icrp107-index.json'), 'utf8')).nuclides.map(n => [n.id, n]));
const WRITE = process.argv.includes('--write');

const UNIT_S = { s: 1, min: 60, h: 3600, d: 86400, a: 365.2422 * 86400 };
// [value, uncertainty, unit, edition note] — value and uncertainty as printed
const DDEP = {
  'C-11': ['20.361', '0.023', 'min'], 'N-13': ['9.9589', '0.0037', 'min'], 'O-15': ['122.266', '0.049', 's'],
  'F-18': ['1.82890', '0.00023', 'h'], 'Na-24': ['14.958', '0.002', 'h'], 'Cr-51': ['27.704', '0.004', 'd'],
  'Co-57': ['271.81', '0.04', 'd'], 'Co-58': ['70.85', '0.03', 'd'], 'Fe-59': ['44.494', '0.012', 'd'],
  'Co-60': ['5.2711', '0.0008', 'a'], 'Cu-64': ['12.7004', '0.0020', 'h'], 'Ga-67': ['3.2613', '0.0005', 'd'],
  'Ga-68': ['67.83', '0.20', 'min'], 'Se-75': ['119.781', '0.024', 'd'], 'Tc-99m': ['6.0067', '0.0010', 'h'],
  'Mo-99+Tc-99m': ['2.7479', '0.0006', 'd', 'Mo-99'], 'Pd-103': ['17.00', '0.05', 'd', 'Metrologia 62 (2025)'],
  'In-111': ['2.8049', '0.0004', 'd'], 'I-123': ['13.2234', '0.0037', 'h'], 'I-125': ['59.388', '0.028', 'd'],
  'I-131': ['8.0233', '0.0019', 'd'], 'Xe-133': ['5.2474', '0.0005', 'd'], 'Cs-137': ['30.018', '0.022', 'a', 'Metrologia 62 (2025)'],
  'Sm-153': ['1.92855', '0.00005', 'd'], 'Yb-169': ['32.018', '0.005', 'd'], 'Tm-170': ['127.8', '0.6', 'd'],
  'Lu-177': ['6.6443', '0.0009', 'd', 'Metrologia 63 (2026) 019001'], 'Re-186': ['3.7186', '0.0017', 'd'],
  'Re-188': ['17.005', '0.004', 'h'], 'Ir-192': ['73.827', '0.013', 'd'], 'Au-198': ['2.6943', '0.0003', 'd'],
  'Tl-201': ['3.0421', '0.0017', 'd'], 'Y-90': ['2.6684', '0.0013', 'd'], 'Zr-89': ['78.42', '0.13', 'h'],
  'Cu-67': ['61.82', '0.05', 'h'], 'Ho-166': ['26.808', '0.020', 'h', 'Metrologia 62 (2025)'],
  'Ra-223': ['11.43', '0.03', 'd'], 'Ac-225': ['9.9172', '0.0021', 'd', 'Metrologia 62 (2025)'],
};
const TOL = 1.5e-4;   // 0.015 %
// value and uncertainty kept as printed strings, so 17.00(5) keeps its digits
const fmtUnc = (v, u) => {
  const dec = (v.split('.')[1] || '').length;
  return `${v}(${Math.round(Number(u) * 10 ** dec)})`;
};
const ICRP_LABEL = 'ICRP Publication 107 (2008)';
const ddepLabel = (id, r) => `DDEP — LNHB/CEA Table de Radionucléides${r[3] && r[3] !== 'Mo-99' ? `, ${r[3]}` : ''}: T½ = ${fmtUnc(r[0], r[1])} ${r[2]}${r[3] === 'Mo-99' ? ' (Mo-99)' : ''} (consulted 2026-10-14)`;

// Keep the unit and decimals of the existing display string (Y-90 stays in h)
const DISPLAY_S = { s: 1, min: 60, h: 3600, d: 86400, y: 365.25 * 86400 };
function display(s, old) {
  const [num, unit] = old.split(' ');
  const dec = (num.split('.')[1] || '').length;
  return `${(s / DISPLAY_S[unit]).toFixed(dec)} ${unit}`;
}

const report = [];
for (const n of nuclideData.nuclides) {
  const icrpId = n.id === 'Mo-99+Tc-99m' ? 'Mo-99' : n.id;
  const tI = icrp.get(icrpId) ? icrp.get(icrpId).half_life_s : null;
  const r = DDEP[n.id];
  const tD = r ? Number(r[0]) * UNIT_S[r[2]] : null;
  const dI = tI ? Math.abs(n.half_life_s / tI - 1) : Infinity;
  const dD = tD ? Math.abs(n.half_life_s / tD - 1) : Infinity;
  let source, newT = null;
  if (Math.min(dI, dD) <= TOL) {
    source = dD < dI ? ddepLabel(n.id, r) : ICRP_LABEL;
    // The value must BE the source's, not just lie within TOL of it (audit
    // 2026-10-14 v1.11, R-05: C-11, Se-75 and Cs-137 were 0.011 % off theirs).
    const exact = Number((dD < dI ? tD : tI).toPrecision(10));
    if (n.half_life_s !== exact) newT = exact;
  } else if (r) {
    newT = Number(tD.toPrecision(8)); source = ddepLabel(n.id, r);
  } else {
    newT = tI; source = ICRP_LABEL;
  }
  const before = `${n.half_life_s} s (${n.half_life_display})`;
  if (newT !== null) {
    n.half_life_s = newT;
    n.half_life_display = display(newT, n.half_life_display);
  }
  n.half_life_source = source;
  report.push(`${n.id.padEnd(13)} ${newT !== null ? 'REPLACED ' + before + ' → ' + n.half_life_s + ' s (' + n.half_life_display + ')' : 'kept ' + before}  ← ${source}`);
}
console.log(report.join('\n'));
if (WRITE) {
  nuclideData.notes.half_life_source_note = 'Per-nuclide provenance in half_life_source (audit 2026-10-14, N-03): each curated half-life matches ICRP Publication 107 (2008) or the DDEP recommended value (LNHB/CEA) within 0.015 %; the values that matched neither (O-15, Mo-99, Lu-177, Y-90 → DDEP; K-42 → ICRP 107) were replaced. Photon yields and Γ constants remain ICRP 107.';
  nuclideData.notes.last_modified_at = new Date().toISOString();
  fs.writeFileSync(nuclidesPath, JSON.stringify(nuclideData, null, 2) + '\n', 'utf8');
  console.log('✓ written — now run node tools/generate-data.js');
} else {
  console.log('(dry run — pass --write to apply)');
}
