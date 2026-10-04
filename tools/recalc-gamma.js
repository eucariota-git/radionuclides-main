#!/usr/bin/env node
/**
 * recalc-gamma.js — Recalculate the curated Γ^H*(10) and Γ^H'(0.07) constants
 *
 * Γ [μSv·h⁻¹·GBq⁻¹·m²] = K × Σ nᵢ·h(Eᵢ), with the conversion table, the
 * interpolation and the line filter of the APP ITSELF (PHYSICS from js/data.js,
 * loaded in a vm sandbox) — there is no second copy of the ICRP 74 A.21 table
 * here, so stored and runtime constants cannot drift apart (audit 2026-10-03, H-01).
 *
 * What is recalculated
 *   - entries computed from ICRP 107 photons ('ICRP 107 (photon data) …' sources);
 *   - chain entries (chain_members: Ra-223, Ac-225): the photon spectra of ALL
 *     members, each weighted by its equilibrium_activity_fraction — the same rule
 *     as tools/add-therapy-nuclides.js. Until 2026-10 this script used the parent
 *     only and silently dropped the progeny (Ra-223 52.86 → 24.02; audit H-04).
 * What is never touched
 *   - published constants (source 'Cornejo et al.…': Mo-99+Tc-99m, Cs-137);
 *   - Y-90 (no photon dose-rate constant, null);
 *   - cornejo_validation (the PUBLISHED reference values) and every other field
 *     except gamma_H10, gamma_H007 and the source text.
 *
 * Usage
 *   node tools/recalc-gamma.js              # dry run: prints old → new, writes nothing
 *   node tools/recalc-gamma.js --write      # writes data/nuclides.json
 *   node tools/recalc-gamma.js --data-js <path>   # use another data.js (e.g. to
 *       check that the previous table reproduces the stored values exactly)
 * Then: node tools/add-shielding-spectra.js && node tools/generate-data.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const argIdx = process.argv.indexOf('--data-js');
const DATA_JS = argIdx > 0 ? process.argv[argIdx + 1] : path.join(ROOT, 'js/data.js');
const WRITE = process.argv.includes('--write');

const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(DATA_JS, 'utf8') + ';this.__P = PHYSICS;', ctx);
const PHYSICS = ctx.__P;

const NUCLIDES_JSON = path.join(ROOT, 'data/nuclides.json');
const nuclideData = JSON.parse(fs.readFileSync(NUCLIDES_JSON, 'utf8'));
const icrp = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/icrp107-index.json'), 'utf8')).nuclides.map(n => [n.id, n]));

const round2 = x => Math.round(x * 100) / 100;
const SRC_SINGLE = 'ICRP 107 (photon data) / ICRP 74 Table A.21 (conversion coefficients)';
const SRC_CHAIN = 'ICRP 107 (photon data, incl. progeny in secular equilibrium) / ICRP 74 Table A.21 (conversion coefficients)';

/** Photon list of a chain: every member's lines × its equilibrium activity fraction
 *  (rounding and 0.01 % cut as tools/add-therapy-nuclides.js combinedPhotons). */
function chainPhotons(members) {
  const out = [];
  for (const { id, equilibrium_activity_fraction: f } of members) {
    const m = icrp.get(id);
    if (!m) throw new Error(`chain member ${id} missing from ICRP 107`);
    for (const p of m.photons || []) {
      out.push({ energy_keV: p.energy_keV, yield_percent: Math.round(p.yield_percent * f * 10000) / 10000, type: p.type });
    }
  }
  return out.filter(p => p.yield_percent >= 0.01);
}

const rows = [];
for (const n of nuclideData.nuclides) {
  const src = n.source || '';
  if (n.id === 'Y-90' || src.startsWith('Cornejo') || src.startsWith('Not applicable')) {
    rows.push({ id: n.id, action: 'kept (published / not applicable)', h10: n.gamma_H10, h007: n.gamma_H007 });
    continue;
  }
  let photons;
  if (Array.isArray(n.chain_members) && n.chain_members.length) photons = chainPhotons(n.chain_members);
  else {
    const m = icrp.get(n.id);
    if (!m || !m.photons || !m.photons.length) { rows.push({ id: n.id, action: 'skipped: no ICRP 107 photons' }); continue; }
    photons = m.photons;
  }
  const g = PHYSICS.calcGammaConstants(photons);
  const h10 = round2(g.gammaH10), h007 = round2(g.gammaH007);
  rows.push({ id: n.id, action: n.chain_members ? 'chain' : 'single', old10: n.gamma_H10, h10, old007: n.gamma_H007, h007 });
  if (WRITE) {
    // gamma_Kair is NOT recalculated here: its provenance is kept per value in
    // gamma_Kair_source (published Cornejo value for 32 entries), and `source`
    // describes H*(10) and H'(0.07) only (copy audit 2026-10-03, T07).
    n.gamma_H10 = h10;
    n.gamma_H007 = h007;
    n.source = n.chain_members ? SRC_CHAIN : SRC_SINGLE;
  }
}

const pct = (a, b) => (b ? ((a / b - 1) * 100).toFixed(2) + ' %' : '—');
let changed = 0;
for (const r of rows) {
  if (r.old10 === undefined) { console.log(`  ${r.id.padEnd(14)} ${r.action}`); continue; }
  const d = r.h10 !== r.old10 || r.h007 !== r.old007;
  if (d) changed++;
  console.log(`  ${r.id.padEnd(14)} H*(10) ${String(r.old10).padStart(8)} → ${String(r.h10).padStart(8)} (${pct(r.h10, r.old10)})   ` +
              `H'(0.07) ${String(r.old007).padStart(8)} → ${String(r.h007).padStart(8)} (${pct(r.h007, r.old007)})${r.action === 'chain' ? '   [chain]' : ''}`);
}
console.log(`\n${changed} of ${rows.filter(r => r.old10 !== undefined).length} recalculated entries change.`);

if (WRITE) {
  nuclideData.notes = nuclideData.notes || {};
  // One instant for both stamps, so last_modified_at can never be older than
  // generated_at (audit 2026-10-04, A06).
  const now = new Date().toISOString();
  nuclideData.notes.generated_at = now;
  nuclideData.notes.generated_by_script = 'tools/recalc-gamma.js';
  nuclideData.notes.last_modified_at = now;
  nuclideData.notes.last_modified_by_script = 'tools/recalc-gamma.js';
  nuclideData.notes.gamma_regenerated = `${now.slice(0, 10)} by tools/recalc-gamma.js with the ICRP 74 Table A.21 conversion table of js/data.js`;
  fs.writeFileSync(NUCLIDES_JSON, JSON.stringify(nuclideData, null, 2) + '\n', 'utf8');
  console.log(`✓ wrote ${NUCLIDES_JSON} — now run tools/add-shielding-spectra.js and tools/generate-data.js`);
} else {
  console.log('(dry run — nothing written; use --write)');
}
