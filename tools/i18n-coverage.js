#!/usr/bin/env node

/**
 * i18n-coverage.js — coverage of the Spanish display overlay (js/i18n-es.js).
 *
 * Renders every page in a set of representative states in headless Chrome,
 * once in English and once in Spanish, and lists:
 *   - the texts that stay identical in Spanish and contain words (untranslated),
 *     from text nodes, translated attributes, option texts, chart legends, axis
 *     titles and tooltips, and the printed report;
 *   - the catalog entries never used in any state (candidates for removal, or
 *     states missing from this list).
 * Elements with translate="no" (references, identifiers) and the blocks of the
 * other language (data-lang-only, hidden) are ignored.
 *
 * Development only (tools/ is not shipped). Requires Node ≥ 22 and Chrome/Edge.
 *
 * Usage:
 *   node tools/i18n-coverage.js                 all pages
 *   node tools/i18n-coverage.js index decay     only these pages
 *   node tools/i18n-coverage.js --json out.json also write the full result
 */

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const BASE = pathToFileURL(ROOT + path.sep).href;
const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const only = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--json');
const PORT = 9300 + Math.floor(Math.random() * 90);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Representative states: [page, label, action run after load (or null), report button id]
const set = (id, v, ev = 'change') => `(() => { const e = document.getElementById('${id}'); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('${ev}', { bubbles: true })); })();`;
const STATES = [
  ['index', 'table', null],
  ['index', 'filter therapy', `document.querySelector('[data-modality="therapy"]').click();`],
  ['index', 'search extended Ge-68', set('searchInput', 'Ge-68', 'input')],
  ['index', 'search no result', set('searchInput', 'zzzz', 'input')],
  ['index', 'notes open', `document.querySelectorAll('details').forEach(d => d.open = true);`],
  ['index?id=Lu-177', 'detail Lu-177', `document.querySelectorAll('details').forEach(d => d.open = true);`],
  ['index?id=Lu-177', 'detail Lu-177 dose share', `document.querySelector('[data-spectrum-view="dose"]').click();`],
  ['index?id=Tc-99m', 'detail Tc-99m', null],
  ['index?id=Y-90', 'detail Y-90', null],
  ['index?id=Ra-223', 'detail Ra-223', null],
  ['index?id=Mo-99', 'detail Mo-99', null],
  ['index?id=Pd-103', 'detail Pd-103', null],
  ['index?id=Ge-68', 'detail Ge-68 (extended)', null],
  ['index?id=Na-22', 'detail Na-22 (extended)', null],
  ['index?id=C-14', 'detail C-14 (extended, no photons)', null],
  ['index?id=Nb-98', 'regulatory only Nb-98', null],
  ['decay?id=Lu-177', 'no time', null, 'btnPrintDecay'],
  ['decay?id=Lu-177', 'elapsed + target + mass', set('elapsed', '10') + set('elapsedUnit', 'd') + set('Atarget', '100') + set('vialWeight', '10') + set('vialWeightUnit', 'kg'), 'btnPrintDecay'],
  ['decay?id=Tc-99m', 'target above A0', set('elapsed', '6') + set('Atarget', '2000'), 'btnPrintDecay'],
  ['decay?id=Ge-68', 'extended Ge-68 with mass', set('elapsed', '30') + set('elapsedUnit', 'd') + set('vialWeight', '2000') + set('vialWeightUnit', 'kg'), 'btnPrintDecay'],
  ['decay?id=Lu-177', 'error', set('A0', '', 'input')],
  ['dose?id=Lu-177', 'default', null, 'btnPrintDose'],
  ['dose?id=Tc-99m', 'Archer Pb', set('shieldThickness', '0.2') + set('shieldMaterial', 'Pb'), 'btnPrintDose'],
  ['dose?id=Pd-103', 'out of range Pb', set('distance', '0.1') + set('shieldThickness', '10.5') + set('shieldMaterial', 'Pb') + `document.querySelectorAll('details').forEach(d => d.open = true);`, 'btnPrintDose'],
  ['dose?id=Ga-67', 'Fe, patient tx', set('shieldThickness', '1') + set('shieldMaterial', 'Fe') + set('patientTx', '60', 'input'), 'btnPrintDose'],
  ['dose?id=Ge-68', 'extended progeny', null, 'btnPrintDose'],
  ['dose?id=Ge-68', 'extended parent only', set('progenyMode', 'parent'), null],
  ['dose?id=Y-90', 'Y-90', null, 'btnPrintDose'],
  ['dose?id=C-14', 'no photons', null],
  ['dose?id=Lu-177', 'error', set('distance', '1.000,5', 'input')],
  ['effluent', 'default', `document.querySelectorAll('details').forEach(d => d.open = true);`, 'btnPrint'],
  ['effluent', 'tanks + F-18 + L10', `document.querySelectorAll('input[type=checkbox]').forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });` + set('geometry', 'L10') + `document.querySelectorAll('details').forEach(d => d.open = true);`, 'btnPrint'],
  ['effluent', 'no criterion', set('common_criterion_mSv_y', '0', 'input')],
  ['effluent', 'error', set('s1_t_external_h_y', '', 'input')],
  ['caregiver', 'default', `document.querySelectorAll('details').forEach(d => d.open = true);`, 'btnPrint'],
  ['caregiver', 'I-131 preset, other criterion', `(() => { const p = document.getElementById('preset'); p.selectedIndex = p.options.length - 2; p.dispatchEvent(new Event('change', { bubbles: true })); })();` + set('category', 'other') + set('manual_criterion_mSv', '1', 'input'), 'btnPrint'],
  ['caregiver', 'own profile', set('profile', 'own'), 'btnPrint'],
  ['caregiver', 'impossible common restriction', set('rate_1m_uSv_h', '10', 'input') + set('day_days', '0', 'input') + set('day_h_during', '20', 'input') + set('day_d_during', '1') + set('day_h_after', '0', 'input') + set('sleep_days', '3', 'input') + set('sleep_h_during', '8', 'input') + set('sleep_d_during', '1') + set('sleep_h_after', '8', 'input') + set('sleep_d_after', '0.1'), null],
  ['caregiver', 'error', set('rate_1m_uSv_h', 'x', 'input')],
  ['about', 'about', null],
];

// Collected in the page: every visible text (collapsed white space) outside
// translate="no", the translated attributes, chart texts and the report.
const COLLECT = `(() => {
  const ATTRS = ['title', 'placeholder', 'aria-label', 'data-tooltip', 'data-label'];
  const out = new Set();
  const norm = s => String(s || '').replace(/\\s+/g, ' ').trim();
  const skip = e => { for (; e && e.nodeType === 1; e = e.parentElement) if (['SCRIPT','STYLE','CODE','NOSCRIPT'].includes(e.tagName) || e.getAttribute('translate') === 'no' || (e.hidden && e.hasAttribute('data-lang-only'))) return true; return false; };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    if (n.nodeType === 3) { if (!skip(n.parentElement)) { const t = norm(n.data); if (t) out.add('T|' + t); } }
    else if (!skip(n)) for (const a of ATTRS) if (n.hasAttribute(a)) { const t = norm(n.getAttribute(a)); if (t) out.add('A|' + t); }
  }
  out.add('T|' + norm(document.title));
  if (window.Chart) for (const cv of document.querySelectorAll('canvas')) {
    const c = Chart.getChart(cv); if (!c) continue;
    (c.legend && c.legend.legendItems || []).forEach(l => out.add('C|' + norm(l.text)));
    for (const s of Object.values(c.options.scales || {})) if (s.title && s.title.text) out.add('C|' + norm(s.title.text));
    const ds = c.data.datasets.find(d => d.data && d.data.length);
    const cb = c.options.plugins.tooltip.callbacks;
    if (ds) {
      const p = ds.data[Math.floor(ds.data.length / 2)];
      const item = { parsed: { x: p.x, y: p.y }, raw: p, dataset: ds, datasetIndex: c.data.datasets.indexOf(ds), label: '' };
      try { const tt = cb.title && cb.title.call({}, [item]); if (tt) out.add('C|' + norm(I18N.getLang() === 'es' ? (I18N.lookup(tt, cv) || tt) : tt)); } catch (e) {}
      try { const tl = cb.label && cb.label.call({}, item); if (tl) out.add('C|' + norm(I18N.getLang() === 'es' ? (I18N.lookup(tl, cv) || tl) : tl)); } catch (e) {}
    }
  }
  return [...out];
})()`;

// "Looks like words": an ASCII word of 3+ letters that is not a unit or symbol
const UNIT = /^(PET|SPECT|Gamma|Esc|Alt|ECB|Publication|keV|MeV|GBq|MBq|kBq|TBq|mCi|mSv|Sv|kg|min|mfp|nSv|ICRP|ICRU|NIST|XCOM|PHITS|NUREG|IAEA|SRS|STP|EDAR|CSN|BOE|RD|IS|DDEP|LNHB|CEA|CSV|PDF|SEFM|SEPR|PMMA|PSMA|DOTATATE|Lutathera|NETs|Archer|Oumano|Cornejo|Zanzonico|Trubey|Kennedy|Kurth|Demir|Gayol|Vilorio|Monserrat|Fuertes|Foro|Planner|Radionuclide|NM)$/;
const wordy = t => (t.match(/[A-Za-z]{3,}/g) || []).some(w => !UNIT.test(w));

async function main() {
  const chromePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => fs.existsSync(p));
  if (!chromePath) { console.error('Chrome/Edge not found'); process.exit(2); }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nm-i18n-'));
  const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
  const result = { untranslated: {}, unusedEntries: [] };
  try {
    let targets = null;
    for (let i = 0; i < 60 && !targets; i++) {
      try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (t.some(x => x.type === 'page')) targets = t; } catch (e) { /* not up */ }
      if (!targets) await sleep(250);
    }
    const ws = new WebSocket(targets.find(x => x.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));
    let id = 0; const pend = new Map();
    ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result.result?.value;
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.addScriptToEvaluateOnNewDocument', { source:
      'window.alert=()=>{};window.confirm=()=>true;window.print=()=>{};' +
      'URL.createObjectURL=()=>"blob:x";HTMLAnchorElement.prototype.click=function(){};' +
      'document.addEventListener("DOMContentLoaded",()=>{if(window.Chart)Chart.defaults.animation=false;});' +
      'try{localStorage.setItem("nm_decimal","point");localStorage.setItem("nm_lang",new URLSearchParams(location.search).get("lang")==="es"?"es":"en")}catch(e){}' });
    const hits = new Set();
    const states = STATES.filter(([pg]) => !only.length || only.includes(pg.split('?')[0]));
    for (const [pg, label, action, reportBtn] of states) {
      const [file, query] = pg.split('?');
      const url = `${BASE}${file}.html?${query ? query + '&' : ''}lang=`;
      const snap = {};
      for (const lang of ['en', 'es']) {
        await send('Page.navigate', { url: url + lang });  // a distinct query per language: a hash change does not reload
        await sleep(1700);
        if (action) { await ev(action); await sleep(600); }
        let texts = await ev(COLLECT);
        if (reportBtn) {
          await ev(`(() => { const b = document.getElementById('${reportBtn}'); if (b) b.click(); window.dispatchEvent(new Event('beforeprint')); })()`);
          await sleep(200);
          texts = texts.concat((await ev(COLLECT)).filter(x => !texts.includes(x)));
        }
        snap[lang] = new Set(texts);
        if (lang === 'es') (await ev('I18N.hits()')).forEach(h => hits.add(h));
      }
      const left = [...snap.es].filter(x => snap.en.has(x) && wordy(x.slice(2)));
      for (const x of left) (result.untranslated[file] = result.untranslated[file] || {})[x] = label;
      console.log(`${pg.padEnd(18)} ${label.padEnd(34)} ${left.length} untranslated`);
    }
    if (!only.length) {
      const catalog = fs.readFileSync(path.join(ROOT, 'js/i18n-es.js'), 'utf8');
      const ctx = {}; new Function('ctx', catalog + ';ctx.c = I18N_ES;')(ctx);
      const keys = [...Object.keys(ctx.c.exact), ...Object.values(ctx.c.scoped || {}).flatMap(m => Object.keys(m)), ...(ctx.c.patterns || []).map(([re]) => re.source)];
      result.unusedEntries = keys.filter(k => !hits.has(k));
    }
    ws.close();
  } finally {
    chrome.kill();
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* in use */ }
  }
  for (const [file, m] of Object.entries(result.untranslated)) {
    console.log(`\n== ${file}: ${Object.keys(m).length} untranslated texts`);
    for (const [x, label] of Object.entries(m)) console.log(`  [${label}] ${x}`);
  }
  if (!only.length) console.log(`\n== unused catalog entries: ${result.unusedEntries.length}\n` + result.unusedEntries.map(k => '  ' + k).join('\n'));
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(result, null, 1));
}

main().catch(err => { console.error(err); process.exitCode = 1; });
