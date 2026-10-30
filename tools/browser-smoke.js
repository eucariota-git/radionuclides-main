#!/usr/bin/env node

/**
 * browser-smoke.js — Render the six pages in a real (headless) Chrome and check
 * what the Node suites cannot see (audit 2026-10-14, M-07).
 *
 * The four test suites run the production modules and inspect the page
 * sources, but they never RENDER a page: the Decay curve was drawn on a
 * category axis that cut it at 7 of 33 d from v1.2 to v1.10.0, and every
 * suite stayed green. This script loads each page over file:// (or --base),
 * runs representative cases and fails (exit 1) on:
 *   - uncaught exceptions and console errors/warnings (except the expected
 *     file:// fetch/manifest CORS refusals, which the embedded data replaces);
 *   - horizontal overflow of the document at 1280 px and 390 px;
 *   - Chart.js: a category x axis, or any data point outside the visible x/y
 *     range of its scales (the N-01 defect class);
 *   - key values that differ from the expected ones (same anchors as the
 *     acceptance sheet);
 *   - the dark-mode toggle not recolouring the charts.
 *
 * Requires Node ≥ 22 (global WebSocket/fetch) and Chrome or Edge. Not part of
 * the distribution package (tools/ is not shipped).
 *
 * Usage:
 *   node tools/browser-smoke.js                 file:// pages of this checkout
 *   node tools/browser-smoke.js --base http://localhost:8000/
 *   CHROME_PATH="/path/to/chrome" node tools/browser-smoke.js
 *   node tools/browser-smoke.js --shots out/    also save a screenshot per case
 */

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const argVal = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const BASE = argVal('--base') || pathToFileURL(ROOT + path.sep).href;
const SHOTS = argVal('--shots');
const PORT = 9400 + Math.floor(Math.random() * 400);

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find(p => fs.existsSync(p)) || null;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

// Expected-noise filter: over file:// the loaders' fetch() and the manifest are
// refused by CORS; the pages fall back to the embedded data on purpose.
const EXPECTED_NOISE = /Access to (fetch|manifest) at 'file:|net::ERR_FAILED|ERR_FILE_NOT_FOUND.*favicon/;

// In-page checks of every Chart.js chart: no category x axis, every point inside
// the visible range of both scales.
const CHART_AUDIT = `(() => {
  if (typeof Chart === 'undefined') return [];
  return [...document.querySelectorAll('canvas')].map(cv => Chart.getChart(cv)).filter(Boolean).map(c => {
    const x = c.scales.x, y = c.scales.y, problems = [];
    if (x.type === 'category') problems.push('category x axis (min/max are read as indices)');
    let n = 0, out = 0;
    for (const ds of c.data.datasets) ds.data.forEach((p, i) => {
      if (p == null) return;
      if (typeof p !== 'object') {            // category axis: the index is the x position
        n++;
        if (i < x.min || i > x.max) out++;
        return;
      }
      n++;
      const tol = v => Math.abs(v) * 1e-9 + 1e-12;
      if (p.x < x.min - tol(x.min) || p.x > x.max + tol(x.max) || p.y < y.min - tol(y.min) || p.y > y.max + tol(y.max)) out++;
    });
    if (out) problems.push(out + ' of ' + n + ' points outside the visible range (x ' + x.min + '–' + x.max + ', y ' + y.min + '–' + y.max + ')');
    return { id: c.canvas.id, points: n, problems, colours: c.data.datasets.map(d => String(d.borderColor)) };
  });
})()`;

async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    console.error('✗ Chrome/Edge not found — set CHROME_PATH');
    process.exit(2);
  }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nm-smoke-'));
  const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });

  let ws;
  try {
    let targets = null;
    for (let i = 0; i < 60 && !targets; i++) {
      try {
        const t = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
        if (t.some(x => x.type === 'page')) targets = t;
      } catch (e) { /* not up yet */ }
      if (!targets) await sleep(250);
    }
    if (!targets) throw new Error('Chrome DevTools endpoint did not start');
    ws = new WebSocket(targets.find(x => x.type === 'page').webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });

    let id = 0;
    const pending = new Map();
    let errors = [];
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
      if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails;
        errors.push('exception: ' + ((d.exception && d.exception.description) || d.text));
      } else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(m.params.type)) {
        errors.push(`console.${m.params.type}: ` + m.params.args.map(a => a.value ?? a.description).join(' '));
      } else if (m.method === 'Log.entryAdded' && ['error', 'warning'].includes(m.params.entry.level)) {
        errors.push(`log ${m.params.entry.level}: ${m.params.entry.text} ${m.params.entry.url || ''}`);
      }
    });
    const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async expr => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'evaluate failed');
      return r.result.result.value;
    };
    await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
    // No animations (charts are read at once); dialogs and print never block.
    await send('Page.addScriptToEvaluateOnNewDocument', { source:
      'window.alert=()=>{};window.confirm=()=>true;window.print=()=>{window.__printed=true};' +
      'document.addEventListener("DOMContentLoaded",()=>{if(window.Chart)Chart.defaults.animation=false;});' +
      'try{localStorage.removeItem("nm_dark_mode");localStorage.removeItem("nm_lang")}catch(e){}' +
      // The expected values below are written with a decimal point: pin it,
      // except on URLs marked #auto-decimal (browser-language default test).
      'try{if(location.hash==="#auto-decimal")localStorage.removeItem("nm_decimal");else localStorage.setItem("nm_decimal","point")}catch(e){}' +
      // CSV downloads: keep the Blob so a case can read the file
      'URL.createObjectURL=b=>{window.__csvBlob=b;return "blob:smoke";};URL.revokeObjectURL=()=>{};' +
      'HTMLAnchorElement.prototype.click=function(){window.__downloaded=this.download;};' });

    const realErrors = () => errors.filter(e => !EXPECTED_NOISE.test(e));
    async function open(url, width) {
      errors = [];
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
      await send('Page.navigate', { url: BASE + url });
      for (let i = 0; i < 40; i++) {           // wait for load + the page's own auto-calculation
        await sleep(150);
        if (await ev('document.readyState === "complete"')) break;
      }
      await sleep(900);
    }
    // sel: capture only that element (page coordinates), else the whole page
    async function shot(name, sel) {
      if (!SHOTS) return;
      fs.mkdirSync(SHOTS, { recursive: true });
      const clip = sel ? await ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();
        return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height, scale: 1 }; })()`) : undefined;
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, ...(clip ? { clip } : {}) });
      fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.result.data, 'base64'));
    }
    const text = sel => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent||''`);
    async function pageChecks(label) {
      check(`${label}: no console errors or exceptions`, realErrors().length === 0, realErrors().slice(0, 3).join(' | '));
      const o = await ev('({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})');
      check(`${label}: no horizontal overflow`, o.sw <= o.cw + 1, `${o.sw} > ${o.cw}`);
      const charts = await ev(CHART_AUDIT);
      for (const c of charts) check(`${label}: chart #${c.id} — linear axes, every point visible (${c.points} points)`, c.problems.length === 0, c.problems.join('; '));
      return charts;
    }

    // A case that throws (e.g. an element missing in an older version) counts as
    // one failure and the run continues.
    async function guard(name, fn) {
      try { await fn(); } catch (err) { check(`${name}: case ran to completion`, false, err.message); }
    }

    // ---- 1. Every page loads cleanly at desktop and phone width ----
    const PAGES = ['index.html', 'decay.html?id=Lu-177', 'dose.html?id=Lu-177', 'effluent.html', 'caregiver.html', 'about.html'];
    for (const width of [1280, 390]) {
      console.log(`\nPages at ${width} px`);
      for (const p of PAGES) {
        await open(p, width);
        await pageChecks(`${p} @${width}`);
        await shot(`${p.replace(/[?=.]/g, '_')}_${width}`);
      }
    }

    // ---- 2. Representative cases with expected values ----
    console.log('\nCases');
    await guard('Decay: Lu-177, 2000 MBq, 10 d, 10 kg', async () => {
      // Decay: Lu-177, 2000 MBq, 10 d, 10 kg → A1 level reached ≈ 72.86 d; curve to the end of its range
      await open('decay.html?id=Lu-177', 1280);
      await ev(`(() => { const s = (i, v) => { document.getElementById(i).value = v; };
        s('A0', '2000'); s('elapsed', '10'); s('elapsedUnit', 'd'); s('vialWeight', '10'); s('vialWeightUnit', 'kg');
        document.getElementById('vialWeightUnit').dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await sleep(600);
      {
        const charts = await pageChecks('decay Lu-177 2000 MBq 10 kg');
        const d = await ev(`(() => { const c = Chart.getChart('decayChart'); const ds = c.data.datasets;
          const curve = ds[0].data, a1 = ds.find(x => /Table A1 level reached/.test(x.label));
          return { xmax: c.scales.x.max, last: curve[curve.length - 1].x, ytype: c.scales.y.type, a1: a1 ? a1.data[0].x : null }; })()`);
        check('decay: curve reaches the end of the axis', Math.abs(d.last - d.xmax) < 1e-6 * d.xmax, `${d.last} vs ${d.xmax}`);
        check('decay: Table A1 mark at 72.86 d (Lu-177, T½ DDEP 6.6443 d)', d.a1 !== null && Math.abs(d.a1 - 72.86) < 0.01, String(d.a1));
        check('decay: concentration chart on a logarithmic axis', d.ytype === 'logarithmic', d.ytype);
        await shot('case_decay_lu177_mass');
        // dark mode recolours the chart
        await ev(`document.getElementById('darkToggle').click()`); await sleep(300);
        const dark = await ev(CHART_AUDIT);
        check('decay: dark mode recolours the chart without errors',
          realErrors().length === 0 && JSON.stringify(dark[0].colours) !== JSON.stringify(charts[0].colours));
        await ev(`document.getElementById('darkToggle').click()`);
      }
    });
    await guard('Decay: Tc-99m default', async () => {
      // Decay: Tc-99m default → curve covers 30 h
      await open('decay.html?id=Tc-99m', 1280);
      {
        await pageChecks('decay Tc-99m');
        const xmax = await ev(`Chart.getChart('decayChart').scales.x.max`);
        check('decay Tc-99m: axis to 5 half-lives (≈ 30 h)', Math.abs(xmax - 30.03) < 0.05, String(xmax));
      }
    });
    await guard('Dose: Lu-177 1 GBq at 0.3 m', async () => {
      // Dose: Lu-177 1 GBq at 0.3 m → 69.8 µSv/h; marker at the exact distance, also beyond 5 m
      for (const [dist, label] of [['0.33', '0.33 m'], ['7', '7 m']]) {
        await open('dose.html?id=Lu-177', 1280);
        await ev(`(() => { const d = document.getElementById('distance'); d.value = '${dist}'; d.dispatchEvent(new Event('input', { bubbles: true })); })()`);
        await sleep(600);
        await pageChecks(`dose Lu-177 at ${label}`);
        const m = await ev(`(() => { const c = Chart.getChart('distChart'); const mk = c.data.datasets.find(d => /^d = /.test(d.label)); return mk && mk.data[0] ? mk.data[0].x : null; })()`);
        check(`dose: distance mark at exactly ${label}`, m !== null && Math.abs(m - Number(dist)) < 1e-12, String(m));
      }
      await open('dose.html?id=Lu-177', 1280);
      check('dose Lu-177 1 GBq at 0.3 m: H*(10) rate 69.8 µSv/h', /69\.8/.test(await text('#resultsBody')));
    });
    await guard('Effluent defaults', async () => {
      // Effluent defaults: Scenario 1 0.0199 mSv/y, Scenario 2 2.74 mSv/y (acceptance A11/A12)
      await open('effluent.html', 1280);
      {
        const s1 = await text('#s1Total'), s2 = await text('#s2Total');
        const near = (txt, ref) => Math.abs(parseFloat(txt) / ref - 1) < 0.005;   // ±0.5 %, display rounding
        check('effluent defaults: Scenario 1 total 0.0199 mSv/y', near(s1, 0.0199), s1);
        check('effluent defaults: Scenario 2 total 2.74 mSv/y', near(s2, 2.742), s2);
        check('effluent: E (mSv/y) is the second column', /E \(mSv\/y\)/.test(await text('#s1Table th:nth-child(2)')));
        // v1.20.1: no visible source-term notes; per-nuclide ⓘ (amber for I-131); warnings head the collapsible sources
        const st = await ev(`(() => { const rows = [...document.querySelectorAll('#sourceBody tr')];
          const tip = id => { const r = rows.find(tr => tr.querySelector('.sym').textContent.startsWith(id)); const t = r && r.querySelector('.hint-tip'); return t ? t.className : ''; };
          return { notesUnder: document.querySelectorAll('#sourceBody .form-hint').length, lu: tip('Lu-177'), i131: tip('I-131'), f18: tip('F-18'),
            notes: document.getElementById('sourceNotes').textContent, warnList: !!document.getElementById('sourceWarnings') }; })()`);
        check('effluent: per-nuclide ⓘ (I-131 in amber, none for Lu-177), no notes under the fields, warnings in «Sources and assumptions»',
          st.notesUnder === 0 && st.lu === '' && /\bwarn\b/.test(st.i131) && /in-cell/.test(st.f18) && !st.warnList &&
          /I-131:\s*⚠ The 0\.8 GBq default/.test(st.notes) && /F-18:\s*No Scenario 2 coefficient/.test(st.notes), JSON.stringify(st).slice(0, 300));
        const colsOff = await ev(`getComputedStyle(document.querySelector('#s1Table th.col-int')).display`);
        await ev(`document.getElementById('btnIntermediate').click()`);
        const colsOn = await ev(`[getComputedStyle(document.querySelector('#s2Table td.col-int')).display, document.getElementById('btnIntermediate').getAttribute('aria-pressed')]`);
        check('effluent: intermediate columns hidden by default, shown by the button (aria-pressed)', colsOff === 'none' && colsOn[0] === 'table-cell' && colsOn[1] === 'true', JSON.stringify([colsOff, colsOn]));
      }
    });
    await guard('Field help ⓘ (v1.20.0)', async () => {
      // Hidden until focused or tapped; the box spans the form group, inside a 390 px screen; translated in Spanish
      // :focus needs a focused page, which a headless tab is not unless emulated
      await send('Emulation.setFocusEmulationEnabled', { enabled: true });
      const TAP = `(() => { const t = document.querySelector('.form-label .hint-tip'); window.__tipBefore = getComputedStyle(t, '::after').visibility; t.click(); })()`;
      const TIP = `(() => { const t = document.querySelector('.form-label .hint-tip');
        const g = t.closest('.form-label').getBoundingClientRect();
        return { n: document.querySelectorAll('.hint-tip').length, before: window.__tipBefore, after: getComputedStyle(t, '::after').visibility,
          focused: document.activeElement === t, inside: g.left >= 0 && g.right <= innerWidth,
          text: getComputedStyle(t, '::after').content, aria: t.getAttribute('aria-label') }; })()`;
      for (const [pg, w] of [['decay.html?id=Lu-177', 390], ['dose.html?id=Lu-177', 390], ['effluent.html', 390], ['caregiver.html', 1280]]) {
        await open(pg, w);
        await ev(TAP); await sleep(300);
        const r = await ev(TIP);
        check(`${pg} @${w}: ⓘ help hidden until tapped, then shown with focus kept on the icon, inside the screen`,
          r.n > 0 && r.before === 'hidden' && r.after === 'visible' && r.focused && r.inside && r.text.length > 10, JSON.stringify(r));
        await shot(`hint_tip_${pg.split('.')[0]}_${w}`, '.card');
      }
      await open('effluent.html', 390);
      await ev(`document.getElementById('langToggle').click()`); await sleep(400);
      await ev(TAP); await sleep(300);
      const es = await ev(TIP);
      check('effluent ES: the ⓘ help text and its accessible name are in Spanish', /^"?Volúmenes anuales genéricos/.test(es.text) && /^Volúmenes anuales genéricos/.test(es.aria), JSON.stringify(es));
      await ev(`document.getElementById('langToggle').click()`); await sleep(300);
    });
    await guard('Caregiver default case and A18', async () => {
      // Caregiver default case (acceptance A16) and the impossible common restriction (A18)
      await open('caregiver.html', 1280);
      {
        const VALS = `['perCycle','treatment','maxRate','floor','minRestriction','adopted','selfCheckStatus'].map(i => document.getElementById(i).textContent.trim())`;
        // v1.17.1: the restriction days start empty; the inverse calculation already proposes them
        const v0 = await ev(VALS);
        const st0 = await ev(`({ days: [document.getElementById('day_days').value, document.getElementById('sleep_days').value], status: document.getElementById('statusBox').textContent,
          btn: document.getElementById('btnApplyAdopted').className, chart: !document.getElementById('curveChart').parentElement.classList.contains('hidden') })`);
        check('caregiver on load: days empty, warning status, no table dose or maximum rate; floor 0.898, 2.92 → 3 d, curve drawn, button highlighted',
          JSON.stringify(v0) === JSON.stringify(['—', '—', '—', '0.898', '2.92', '3', 'OK']) && st0.days.join() === ',' &&
          /Restriction days not entered/.test(st0.status) && /btn-primary/.test(st0.btn) && st0.chart, JSON.stringify({ v0, st0 }));
        // v1.18.0: bounds of the daily-average occupancy, here of the dose with the adopted restriction
        const occ0 = await text('#occupancyValue');
        check('caregiver on load: occupancy bounds of the dose with the adopted restriction (2.32 to 3.69 mSv, ×0.79 to ×1.26)',
          occ0 === 'Daily-average occupancy bounds of the treatment dose: 2.32 to 3.69 mSv (×0.79 to ×1.26), with the adopted restriction.', occ0);
        await pageChecks('caregiver no days');
        await shot('caregiver_no_days', '#resultsCard');
        await ev(`document.getElementById('btnApplyAdopted').click()`); await sleep(300);
        const v = await ev(VALS);
        check('caregiver A16 (adopted restriction applied): 0.488 / 2.93 mSv, 15.4 µSv/h, floor 0.898, 2.92 → 3 d, self-check OK',
          JSON.stringify(v) === JSON.stringify(['0.488', '2.93', '15.4', '0.898', '2.92', '3', 'OK']) && /btn-secondary/.test(await ev(`document.getElementById('btnApplyAdopted').className`)), JSON.stringify(v));
        const occ1 = await text('#occupancyValue');
        check('caregiver A16: occupancy bounds of the table dose shown, informative line visible',
          occ1 === 'Daily-average occupancy bounds of the treatment dose: 2.32 to 3.69 mSv (×0.79 to ×1.26).' &&
          !(await ev(`document.getElementById('occupancyBox').classList.contains('hidden')`)), occ1);
        // A-06 (audit 2026-10-22): a restriction that changes the contact and ends inside a day → no bounds
        await ev(`(() => { const e = document.getElementById('sleep_days'); e.value = '1.5'; e.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(200);
        const occ2 = await text('#occupancyValue');
        check('caregiver A-06: 1.5 d in the row whose contact changes → bounds not available, reason shown, dose still given',
          /^Not available: a restriction that changes the contact does not end at a whole number of days/.test(occ2) && (await text('#treatment')) !== '—', occ2);
        await ev(`(() => { const e = document.getElementById('sleep_days'); e.value = '3'; e.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(200);
        // A-01 (audit 2026-10-22): an input error must clear the row doses, which sit outside the result block
        const rowDoses = `[document.getElementById('day_dose').textContent, document.getElementById('sleep_dose').textContent, !document.getElementById('calcError').classList.contains('hidden')]`;
        await ev(`(() => { const e = document.getElementById('rate_1m_uSv_h'); e.value = 'oops'; e.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(200);
        const bad = await ev(rowDoses);
        await ev(`(() => { const e = document.getElementById('rate_1m_uSv_h'); e.value = '15'; e.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(200);
        const good = await ev(rowDoses);
        check('caregiver A-01: an invalid rate clears the row doses (—) with the error shown; correcting it restores 0.150 / 0.339 mSv',
          bad.join('|') === '—|—|true' && good.join('|') === '0.150|0.339|false', JSON.stringify({ bad, good }));
        // A-03: empty days and a 28 h/d «during» schedule still give the valid 0-day answer
        await open('caregiver.html', 1280);
        await ev(`(() => { const s = (i, v) => { const e = document.getElementById(i); e.value = v; e.dispatchEvent(new Event('change')); };
          s('rate_1m_uSv_h', 2); s('day_h_during', 20); s('day_d_during', 1); s('day_h_after', 0); s('day_d_after', '');
          s('sleep_h_during', 8); s('sleep_d_during', 1); s('sleep_h_after', 8); s('sleep_d_after', 0.1); })()`);
        await sleep(300);
        const z = await ev(`['minRestriction','adopted','selfCheckStatus'].map(i => document.getElementById(i).textContent.trim())`);
        check('caregiver A-03: empty days with 20 + 8 h/d during the restriction: minimum 0.00 d, adopted 0 d, self-check OK',
          z.join('|') === '0.00|0|OK', JSON.stringify(z));
        await ev(`(() => { const s = (i, v) => { const e = document.getElementById(i); e.value = v; e.dispatchEvent(new Event('change')); };
          s('rate_1m_uSv_h', 10); s('day_days', 0); s('day_h_during', 20); s('day_d_during', 1); s('day_h_after', 0); s('day_d_after', '');
          s('sleep_days', 3); s('sleep_h_during', 8); s('sleep_d_during', 1); s('sleep_h_after', 8); s('sleep_d_after', 0.1); })()`);
        await sleep(300);
        check('caregiver A18: common restriction over 24 h/d reported as not applicable, curve hidden',
          /Not applicable/.test(await text('#minRestriction')) && await ev(`document.getElementById('curveChart').parentElement.classList.contains('hidden')`));
        await pageChecks('caregiver A18');
      }
    });
    await guard('Properties: β endpoint card and half-life source', async () => {
      // Properties: β endpoint card and half-life source
      for (const [nid, re] of [['Lu-177', /0\.4978/], ['Tc-99m', /minor β branch/], ['Ra-223', /progeny in the decay chain/]]) {
        await open('index.html?id=' + nid, 1280);
        const card = await ev(`([...document.querySelectorAll('.prop-item')].find(x => /β E/.test(x.textContent)) || {}).textContent || ''`);
        check(`properties ${nid}: β endpoint card`, re.test(card), card.replace(/\s+/g, ' ').trim());
      }
      await open('index.html?id=Lu-177', 1280);
      check('properties Lu-177: half-life source shown (DDEP)', /DDEP \(LNHB\)/.test(await ev(`document.getElementById('detailProps').textContent`)));
    });
    await guard('Properties: photon-spectrum chart', async () => {
      // Linear energy axis, log y, every point inside the axes (generic audit),
      // and the dose-share view: Lu-177 208 keV ≈ 62.7 %, shares add up to 100 %
      await open('index.html?id=Lu-177', 1280);
      const charts = await pageChecks('properties Lu-177 spectrum');
      const s = await ev(`(() => { const c = Chart.getChart('spectrumChart'); return c ? { x: c.scales.x.type, y: c.scales.y.type } : null; })()`);
      check('properties: spectrum chart on a linear energy axis and a logarithmic y axis',
        !!s && s.x === 'linear' && s.y === 'logarithmic' && charts.some(c => c.id === 'spectrumChart'), JSON.stringify(s));
      await ev(`document.querySelector('[data-spectrum-view="dose"]').click()`); await sleep(200);
      const d = await ev(`(() => { const pts = Chart.getChart('spectrumChart').data.datasets.flatMap(ds => ds.data);
        return { sum: pts.reduce((a, p) => a + p.y, 0), l208: (pts.find(p => Math.abs(p.x - 208.4) < 0.2) || {}).y }; })()`);
      check('properties: dose-share view adds up to 100 % and gives Lu-177 208 keV ≈ 62.7 %',
        Math.abs(d.sum - 100) < 1e-6 && Math.abs(d.l208 - 62.70) < 0.01, JSON.stringify(d));
      await pageChecks('properties Lu-177 dose share');
      // Linear y on request: same data, axis from zero, every bar inside;
      // kept for the next nuclide, back to log on a reload
      const before = await ev(`JSON.stringify(Chart.getChart('spectrumChart').data.datasets.map(d => d.data))`);
      await ev(`document.querySelector('[data-spectrum-scale="linear"]').click()`); await sleep(200);
      const lin = await ev(`(() => { const c = Chart.getChart('spectrumChart'); const pts = c.data.datasets.flatMap(d => d.data);
        return { type: c.scales.y.type, min: c.scales.y.min, max: c.scales.y.max, top: Math.max(...pts.map(p => p.y)),
          data: JSON.stringify(c.data.datasets.map(d => d.data)) }; })()`);
      check('properties: linear y scale — same data, axis from 0, tallest bar inside, share axis ≤ 100 %',
        lin.type === 'linear' && lin.min === 0 && lin.max >= lin.top && lin.max <= 100 && lin.data === before,
        JSON.stringify({ type: lin.type, min: lin.min, max: lin.max, top: lin.top }));
      await pageChecks('properties Lu-177 linear y');
      await ev(`document.querySelector('[data-spectrum-view="yield"]').click()`); await sleep(200);
      const linY = await ev(`({ type: Chart.getChart('spectrumChart').scales.y.type, hint: document.getElementById('spectrumHint').textContent })`);
      check('properties: linear yield view warns that weak lines are not visible', linY.type === 'linear' && /linear scale/.test(linY.hint), JSON.stringify(linY));
      await ev(`document.querySelector('#nuclideTable tr[data-id="I-131"]').click()`); await sleep(300);
      check('properties: the linear scale is kept when another nuclide is opened',
        await ev(`Chart.getChart('spectrumChart').scales.y.type === 'linear' && document.querySelector('[data-spectrum-scale="linear"]').getAttribute('aria-pressed') === 'true'`));
      await open('index.html?id=I-131', 1280);
      check('properties: a reload starts again on the logarithmic scale',
        await ev(`Chart.getChart('spectrumChart').scales.y.type === 'logarithmic'`));
      await open('index.html?id=Y-90', 1280);
      check('properties Y-90: no spectrum chart and no errors', realErrors().length === 0 &&
        await ev(`!document.getElementById('spectrumChart')`));
    });
    await guard('Review v1.11 (R-01, R-02, R-06)', async () => {
      // R-01: an extended generator parent gets its progeny's dose by default
      await open('dose.html?id=Ge-68', 1280);
      const info = await text('#nuclideInfo');
      check('dose Ge-68: Γ includes Ga-68 in equilibrium (158) and says so', /incl\. Ga-68 in equilibrium/.test(info) && /= 158\b/.test(info), info.slice(0, 160));
      await ev(`(() => { const s = document.getElementById('progenyMode'); s.value = 'parent'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await sleep(400);
      check('dose Ge-68 parent only: no photon estimate, and the excluded progeny is stated',
        /Its short-lived progeny is excluded/.test(await text('#resultsBody')));
      await pageChecks('dose Ge-68');
      // R-02: a total above the criterion is not shown as neutral
      await open('effluent.html', 1280);
      check('effluent: Scenario 2 above the criterion is flagged (danger box, "EXCEEDS IT")',
        await ev(`document.getElementById('s2Box').classList.contains('danger')`) && /EXCEEDS IT/.test(await text('#s2Pct')));
      // R-06: tick labels with a decimal point whatever the browser locale
      await open('decay.html?id=Lu-177', 1280);
      const ticks = await ev(`Chart.getChart(document.querySelector('canvas')).scales.x.ticks.map(t => t.label).join(' ')`);
      check('decay chart: x tick labels use a decimal point', !/\d,\d/.test(ticks), ticks);
      // en-US still groups thousands ("1,000"), which reads as a decimal comma in Spain
      await open('index.html?id=Na-24', 1280);
      const sp = await ev(`(() => { const c = Chart.getChart('spectrumChart');
        return { x: c.scales.x.ticks.map(t => t.label).join(' '), y: c.scales.y.ticks.map(t => t.label).join(' '), max: c.scales.y.max }; })()`);
      check('properties Na-24 spectrum: no comma in tick labels (1000, not 1,000) and the y axis ends below 1000 %',
        !/,/.test(sp.x + sp.y) && /\b1000\b/.test(sp.x) && sp.max < 1000, JSON.stringify(sp));
    });
    await guard('Distribution audit 2026-10-15 (F-02, F-06)', async () => {
      // F-02: the Dose report states the progeny of an extended nuclide
      await open('dose.html?id=Ge-68', 1280);
      await ev(`document.getElementById('btnPrintDose').click()`); await sleep(100);
      const rep = await ev(`(document.getElementById('printReport') || {}).innerText || ''`);
      check('dose Ge-68 report: progeny row names Ga-68, no Cornejo source, header names the ICRP 107 index',
        /Progeny in the constants\s*included in equilibrium[^\n]*Ga-68/.test(rep) && !/Cornejo/.test(rep) && /ICRP 107 extended index/.test(rep), rep.slice(0, 200));
      // F-06: the cohabitation table fits a phone as stacked cards
      await open('caregiver.html', 390);
      const t = await ev(`(() => { const tb = document.getElementById('rowsTable'), w = tb.parentElement;
        return { head: getComputedStyle(tb.querySelector('thead')).display, sw: w.scrollWidth, cw: w.clientWidth,
          label: getComputedStyle(document.querySelector('#rowsBody td[data-label]'), '::before').content }; })()`);
      check('caregiver 390 px: cohabitation table stacked (no hidden columns, labels shown)',
        t.head === 'none' && t.sw <= t.cw + 1 && /Restriction/.test(t.label), JSON.stringify(t));
      await pageChecks('caregiver 390 px');
    });
    await guard('Caregiver: cohabitation scenarios of the Forum (Table 3.B 1) and preset spread', async () => {
      const setC = (id, v, type = 'change') => ev(`(() => { const e = document.getElementById('${id}'); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('${type}', { bubbles: true })); })()`);
      const rowState = `(() => { const g = id => document.getElementById(id); return { sc: g('scenario').value, cat: g('category').value,
        v: ['day_h_during','day_d_during','day_h_after','day_d_after','sleep_h_during','sleep_d_during','sleep_h_after','sleep_d_after'].map(i => g(i).value).join('|'),
        l1: g('day_label_text').textContent, l1hidden: g('day_label_text').classList.contains('hidden'), in1: !g('day_label').classList.contains('hidden'), ph1: g('day_label').placeholder,
        err: !g('calcError').classList.contains('hidden'), warn: g('warningList').innerText, days: g('day_days').value }; })()`;
      await open('caregiver.html', 1280);
      let st = await ev(rowState);
      check('caregiver: default scenario is the partner of Table 3.B 1, rows keep their names',
        st.sc === 'partner' && st.l1 === 'Day-time cohabitation' && !st.in1, JSON.stringify(st));
      await setC('scenario', 'child_2_5');
      st = await ev(rowState);
      check('caregiver: «Child 2 to 5 years» fills hours and distances, names the rows and proposes the public category; days untouched',
        st.v === '0||2|0.1|5|1.5|5|1' && st.cat === 'public' && st.l1 === 'Contact' && !st.err && st.days === '' && !/not the one adopted/.test(st.warn), JSON.stringify(st));
      await setC('category', 'carer_le60');
      st = await ev(rowState);
      check('caregiver: a category the application does not adopt for the scenario gives a warning, not an error', /not the one adopted in this application/.test(st.warn) && !st.err, JSON.stringify(st));
      await shot('caregiver_scenario_warning', '#rowsTable'); await shot('caregiver_scenario_b', '.card:has(#rowsTable)');
      await setC('day_h_after', '3', 'input');
      st = await ev(rowState);
      check('caregiver: a manual edit switches to the free scenario, with the row names kept as placeholders and no category warning',
        st.sc === 'free' && st.in1 && st.l1hidden && st.ph1 === 'Contact' && !/not the one adopted/.test(st.warn), JSON.stringify(st));
      await setC('day_label', 'Grandchild on the lap', 'input');
      await shot('caregiver_scenario_free', '.card:has(#rowsTable)');
      await ev(`document.getElementById('btnPrint').click()`); await sleep(300);
      const rep = await ev(`(document.getElementById('printReport') || {}).innerText || ''`);
      check('caregiver report: free scenario named, the typed row name and the preset spread are printed',
        /Free scenario \(not in the Forum\)/.test(rep) && /Grandchild on the lap/.test(rep) && /Spread in the source[\s\S]*15\.8 h/.test(rep), rep.slice(0, 200));
      await open('caregiver.html', 1280);
      await setC('preset', 'dotatate_gayol'); await setC('scenario', 'child_lt1');
      st = await ev(rowState);
      const status = await text('#statusBox');
      check('caregiver: a scenario distance missing from the profile (1.5 m, DOTATATE measured) is flagged in the hint and the status',
        /does not list 1\.5 m/.test(await text('#scenarioMissing')) && /Proximity: distance without a valid factor/.test(status) && st.sc === 'child_lt1', status);
      await setC('profile', 'lu177_approx');
      st = await ev(rowState);
      check('caregiver: an approximate profile restores the scenario distances', st.sc === 'child_lt1' && st.v === '0||3|0.1|3|1.5|3|0.5' && !st.err && (await text('#scenarioMissing')) === '', JSON.stringify(st));
      await ev(`document.querySelectorAll('details').forEach(d => d.open = true)`);
      const m = await ev(`({ rows: document.querySelectorAll('#cohabBody tr').length, spread: document.getElementById('presetList').innerText })`);
      check('caregiver Method: Table 3.B 1 lists 8 scenarios × 2 rows; every preset shows its spread (Kurth SD 15.8 h, Monserrat quartiles)',
        m.rows === 16 && (m.spread.match(/Spread in the source/g) || []).length === 7 && /40\.5 ± 15\.8 h/.test(m.spread) && /25 \(12, 21, 36, 92\) h/.test(m.spread), JSON.stringify({ rows: m.rows }));
      await pageChecks('caregiver scenarios + Method open');
      await shot('caregiver_method_light', '#cohabitationDetails'); await shot('caregiver_presets', '#presetList');
      await ev(`document.getElementById('darkToggle') && document.getElementById('darkToggle').click()`); await sleep(200);
      await pageChecks('caregiver scenarios dark');
      await shot('caregiver_method_dark', '#cohabitationDetails');
      await ev(`document.getElementById('darkToggle') && document.getElementById('darkToggle').click()`);
      // Spanish row names of a child scenario: «Contacto» and «Proximidad» (user review 2026-10-22)
      await open('caregiver.html', 1280);
      await setC('scenario', 'child_2_5');
      await ev(`document.getElementById('langToggle').click()`); await sleep(400);
      const esRows = await ev(`[document.getElementById('day_label_text').textContent, document.getElementById('sleep_label_text').textContent]`);
      check('caregiver ES: the rows of a child scenario read «Contacto» and «Proximidad»', esRows.join('|') === 'Contacto|Proximidad', JSON.stringify(esRows));
      const esOcc = await ev(`document.getElementById('occupancyBox').textContent.replace(/\\s+/g, ' ').trim()`);
      check('caregiver ES: the occupancy bounds and their note are in Spanish', /^Cotas de la dosis del tratamiento por la ocupación promediada diaria: de \S+ a \S+ mSv \(×\S+ a ×\S+\)/.test(esOcc) &&
        /Informativas \(Método\): nunca cambian la dosis/.test(esOcc) && !/Daily-average|Informative/.test(esOcc), esOcc);
      await shot('caregiver_scenario_es', '.card:has(#rowsTable)');
      await ev(`document.getElementById('langToggle').click()`); await sleep(300);
    });
    await guard('Report: the print path builds the report without errors', async () => {
      // Report: the print path builds the report without errors
      await open('caregiver.html', 1280);
      await ev(`document.getElementById('btnPrint').click()`); await sleep(300);
      check('caregiver report is built without errors', realErrors().length === 0 && await ev('!!window.__printed'), realErrors().join(' | '));
    });
    await guard('Presentation review 2026-10-15', async () => {
      const setVal = (id, v, type = 'input') => ev(`(() => { const e = document.getElementById('${id}'); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('${type}', { bubbles: true })); })()`);
      // Main menu: a Guide entry on every page
      for (const pg of ['index.html', 'decay.html', 'dose.html', 'effluent.html', 'caregiver.html', 'about.html']) {
        await open(pg, 1280);
        check(`${pg}: main menu links the guide`, await ev(`!!document.querySelector('.site-nav a[href="about.html"]')`));
      }
      // Properties: labels keep the case of symbols and units (β, μ, keV)
      await open('index.html?id=Lu-177', 1280);
      const pk = await ev(`(() => { const k = [...document.querySelectorAll('#detailProps .prop-key')].find(e => /E\s*max/i.test(e.textContent));
        return k ? { tt: getComputedStyle(k).textTransform, txt: k.innerText } : null; })()`);
      check('properties: "β Emax" label is not upper-cased (it read "B EMAX")', pk && pk.tt === 'none' && /^β E/.test(pk.txt), JSON.stringify(pk));
      const lines = await ev(`[...document.querySelectorAll('.spectrum-lines tbody tr td:first-child')].map(td => td.textContent)`);
      check('properties: photon-line energies with one decimal (65.0, not 65), in a collapsible block without inner scroll',
        lines.length > 0 && lines.every(t => /^\d+\.\d$/.test(t)) &&
        await ev(`(() => { const d = document.querySelector('.spectrum-lines'); return !!d && d.tagName === 'DETAILS' && getComputedStyle(d.querySelector('.overflow-x-auto')).maxHeight === 'none'; })()`),
        lines.slice(0, 6).join(' '));
      // Properties: the table grows with the page on wide screens, header sticky under the site header
      for (const w of [1280, 1240]) {
        await open('index.html', w);
        const t = await ev(`(() => { const w = document.getElementById('nuclideTableWrap'), th = document.querySelector('#nuclideTable th');
          return { oy: getComputedStyle(w).overflowY, top: getComputedStyle(th).top, rows: document.querySelectorAll('#nuclideBody tr').length }; })()`);
        check(`properties @${w}: no inner scroll box, sticky header at 58 px, all 40 rows`, t.oy === 'visible' && t.top === '58px' && t.rows === 40, JSON.stringify(t));
        await setVal('searchInput', 'Ge-68'); await sleep(300);
        await pageChecks(`properties @${w} extended search Ge-68`);
      }
      // Below 1240 px the table keeps its own (viewport-high) scroll box: no page overflow
      await open('index.html', 1150);
      await setVal('searchInput', 'Ge-68'); await sleep(300);
      await pageChecks('properties @1150 extended search Ge-68 (inner scroll fallback)');
      // Decay: no Calculate button; without a time the t = 0 values are announced as such
      await open('decay.html?id=Lu-177', 1280);
      check('decay: no Calculate button; no time entered → the "values at t = 0" note',
        await ev(`!document.getElementById('btnCalc') && !document.getElementById('noTimeNote').classList.contains('hidden')`));
      await setVal('elapsed', '6.6443'); await setVal('elapsedUnit', 'd', 'change'); await sleep(400);
      check('decay live: 1 T½ entered → 500 MBq without pressing anything', /^500(\.0)?$/.test((await text('#resultGrid .result-value')).trim()), await text('#resultGrid .result-value'));
      await setVal('A0', ''); await sleep(400);
      const bad = await ev(`({ err: !document.getElementById('calcError').classList.contains('hidden') && document.getElementById('calcError').textContent,
        hidden: document.getElementById('resultsCard').classList.contains('hidden'), inv: document.getElementById('A0').getAttribute('aria-invalid') })`);
      check('decay: an invalid activity shows an inline error, marks the field and hides the results', /Activity/.test(bad.err) && bad.hidden && bad.inv === 'true', JSON.stringify(bad));
      await setVal('A0', '1000'); await sleep(400);
      check('decay: correcting the field restores the results and clears the mark',
        await ev(`!document.getElementById('resultsCard').classList.contains('hidden') && document.getElementById('calcError').classList.contains('hidden') && !document.getElementById('A0').hasAttribute('aria-invalid')`));
      // Dose: one patient-transmission field; 50 % halves the rate; the report carries the limit screening
      await open('dose.html?id=Lu-177', 1280);
      await setVal('patientTx', '50'); await sleep(400);
      check('dose: patient transmission 50 % halves the Lu-177 rate (69.8 → 34.9 µSv/h)', /34\.9/.test(await text('#resultsBody')), (await text('#resultsBody')).slice(0, 120));
      await setVal('patientTx', ''); await sleep(400);
      await ev(`document.getElementById('btnPrintDose').click()`); await sleep(100);
      const drep = await ev(`(document.getElementById('printReport') || {}).innerText || ''`);
      check('dose report: contains the indicative limit screening and the distance once ("0.3 m")',
        /Annual dose limit comparison/.test(drep) && /of 20 mSv\/y/.test(drep) && /Distance\s*0\.3 m\s*Shielding/.test(drep) && !/0\.3 m \(0\.3 m\)/.test(drep), drep.slice(0, 200));
      // Dose: an ICRP 107 nuclide calculates without a confirm() dialog and keeps a visible warning
      await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.confirm=()=>{window.__confirmed=true;return true;};' });
      await open('dose.html?id=Ge-68', 1280);
      check('dose Ge-68: no confirm() dialog; the not-validated warning is in the results',
        !(await ev('!!window.__confirmed')) && /NOT been manually validated/.test(await text('#nuclideInfo')));
      // Effluent: the offending field is marked
      await open('effluent.html', 1280);
      await setVal('s1_t_external_h_y', ''); await sleep(200);
      const eff = await ev(`({ inv: document.querySelector('#s1_t_external_h_y') && document.querySelector('#s1_t_external_h_y').getAttribute('aria-invalid'), err: document.getElementById('calcError').textContent })`);
      check('effluent: an empty field is marked aria-invalid and named in the error box', eff.inv === 'true' && eff.err.length > 0, JSON.stringify(eff));
      // Icons are drawn (CSS masks), not emoji
      check('icons: card-title icons are CSS-mask SVGs', await ev(`(() => { const i = document.querySelector('.card-title .ico'); const st = i && getComputedStyle(i); return !!st && (st.maskImage || st.webkitMaskImage || '').startsWith('url('); })()`));
      // Phone: header scrolls away, logo and theme button share a row; Dose results stacked
      await open('dose.html?id=Lu-177', 390);
      const hd = await ev(`(() => { const h = document.querySelector('.site-header'), l = document.querySelector('.site-logo').getBoundingClientRect(), b = document.getElementById('darkToggle').getBoundingClientRect();
        return { pos: getComputedStyle(h).position, h: h.getBoundingClientRect().height, sameRow: Math.abs((l.top + l.bottom) / 2 - (b.top + b.bottom) / 2) < 12,
          stacked: getComputedStyle(document.querySelector('#resultsTable thead')).display === 'none' }; })()`);
      check('390 px: header not sticky, ≤ 100 px, logo and theme button on one row; Dose results stacked', hd.pos === 'static' && hd.h <= 100 && hd.sameRow && hd.stacked, JSON.stringify(hd));
      await pageChecks('dose Lu-177 @390 stacked');
    });
    await guard('Decimal point or comma (2026-10-15)', async () => {
      const typeInto = async (id, text) => {
        await ev(`(() => { const e = document.getElementById('${id}'); e.focus(); e.select(); })()`);
        await send('Input.insertText', { text });
        await sleep(400);
      };
      const rate = () => text('#resultsBody');
      // quantity NAMES keep the point of the English text: H'(0.07), 0.07 mm
      const quantityNamesOut = t => t.replace(/H'\(0\.07\)|Hp\(0\.07\)|0\.07 mm/g, '');
      // Input: a comma and a point give the same result, whatever the browser language
      // (a type="number" field read "0,3" as 3 in an English browser)
      for (const [locale, typed] of [['en-US', '0,3'], ['en-US', '0.3'], ['es-ES', '0,3'], ['es-ES', '0.3']]) {
        await send('Emulation.setLocaleOverride', { locale });
        await open('dose.html?id=Lu-177', 1280);
        await typeInto('distance', typed);
        check(`dose: distance typed "${typed}" in a ${locale} browser → 69.8 µSv/h (0.3 m)`, /69\.8/.test(await rate()), (await rate()).slice(0, 80));
      }
      await send('Emulation.setLocaleOverride', {});
      await open('dose.html?id=Lu-177', 1280);
      await typeInto('distance', '1.000,5');
      const grp = await ev(`({ err: document.getElementById('calcError').textContent, hidden: document.getElementById('resultsCard').classList.contains('hidden') })`);
      check('dose: "1.000,5" is rejected with an inline error (never read as 1.0005)', /Distance/.test(grp.err) && grp.hidden, JSON.stringify(grp));
      // "1.500" is accepted as 1.5 with a note under the field
      await open('decay.html?id=Tc-99m', 1280);
      await typeInto('A0', '1.500');
      check('decay: "1.500" → a note says it was read as 1.5 and how to write 1500',
        /Read as 1\.5 \(decimal separator\)\. For 1500, type 1500/.test(await text('#A0-numhint')), await text('#A0-numhint'));
      // Switching to the comma in the header: fields, results, charts and report follow; the CSV keeps the point
      await open('dose.html?id=Lu-177', 1280);
      await ev(`document.getElementById('decimalToggle').click()`); await sleep(400);
      const c = await ev(`(() => { const ch = Chart.getChart('distChart');
        return { btn: document.getElementById('decimalToggle').textContent, dist: document.getElementById('distance').value,
          body: document.getElementById('resultsBody').innerText, limits: document.getElementById('limitComparison').innerText,
          ticks: Object.values(ch.scales).flatMap(s => s.ticks.map(t => String(t.label))).join(' '),
          legend: ch.data.datasets.map(d => d.label).join(' | '), stored: localStorage.getItem('nm_decimal') }; })()`);
      check('comma: button "1,5", field "0,30", results "69,8 µSv/h", limits and chart without a decimal point; choice stored',
        c.btn === '1,5' && c.dist === '0,30' && /69,8 μSv\/h/.test(c.body) && !/\d\.\d/.test(quantityNamesOut(c.body)) &&
        !/\d\.\d/.test(quantityNamesOut(c.limits)) && !/\d\.\d/.test(c.ticks + quantityNamesOut(c.legend)) && c.stored === 'comma', JSON.stringify(c).slice(0, 300));
      await ev(`document.getElementById('btnPrintDose').click()`); await sleep(100);
      const rep = await text('#printReport');
      check('comma: the report gives 69,8 µSv/h and 0,3 m', /69,8 μSv\/h/.test(rep) && /Distance\s*0,3 m/.test(rep), rep.slice(0, 120));
      await ev(`window.__csvBlob = null; document.getElementById('btnExportDoseCsv').click()`); await sleep(100);
      const csv = await ev(`window.__csvBlob ? window.__csvBlob.text() : ''`);
      check('comma: the CSV keeps the decimal point (machine-readable)', /"69\.\d+"/.test(csv) && !/"\d+,\d+"/.test(csv), csv.slice(0, 160));
      await pageChecks('dose Lu-177 comma');
      // Every calculator page in comma mode: result values without a decimal point, no errors
      const VALUES = `(() => [...document.querySelectorAll('.result-value, td.num, .prop-val, #s1Total, #s2Total')]
        .filter(e => e.offsetParent !== null).map(e => e.innerText).filter(t => /\\d\\.\\d/.test(t)))()`;
      // (switched with the button: the smoke pins "point" at every load)
      for (const pg of ['index.html?id=Lu-177', 'decay.html?id=Lu-177', 'dose.html?id=Pd-103', 'effluent.html', 'caregiver.html']) {
        await open(pg, 1280);
        await ev(`document.getElementById('decimalToggle').click()`); await sleep(500);
        const left = await ev(VALUES);
        check(`${pg} comma: no displayed value with a decimal point after the switch`, left.length === 0, left.slice(0, 5).join(' | '));
        await pageChecks(`${pg} comma`);
      }
      // Default without a stored choice: the browser language
      for (const [locale, want] of [['es-ES', '1,5'], ['de-DE', '1,5'], ['en-US', '1.5'], ['en-GB', '1.5']]) {
        await send('Emulation.setLocaleOverride', { locale });
        // a distinct query per locale: a hash-only change does not reload the page
        await open(`decay.html?id=Tc-99m&l=${locale}#auto-decimal`, 1280);
        check(`no stored choice, browser ${locale} → separator button "${want}"`, (await text('#decimalToggle')) === want, await text('#decimalToggle'));
      }
      await send('Emulation.setLocaleOverride', {});
    });
    await guard('Decimal review of v1.15.0 (D-01..D-03, material selector)', async () => {
      const typeInto = async (id, t) => {
        await ev(`(() => { const e = document.getElementById('${id}'); e.focus(); e.select(); })()`);
        await send('Input.insertText', { text: t });
        await sleep(300);
      };
      const hintOf = id => ev(`(document.getElementById('${id}-numhint') || {}).textContent || ''`);
      // D-01: Defaults restores 7.4 and the note about "1.500" disappears
      await open('effluent.html', 1280);
      await typeInto('st_0_activity_per_cycle_GBq', '1.500');
      const before = await hintOf('st_0_activity_per_cycle_GBq');
      await ev(`document.getElementById('btnReset').click()`); await sleep(300);
      const after = { value: await ev(`document.getElementById('st_0_activity_per_cycle_GBq').value`), hint: await hintOf('st_0_activity_per_cycle_GBq') };
      check('D-01: Effluent "1.500" note shown, then gone after Defaults (field back to 7.4)', /Read as 1\.5/.test(before) && after.value === '7.4' && after.hint === '', JSON.stringify({ before, after }));
      // D-01: a separator switch rewrites the note with the new separator
      await open('decay.html?id=Tc-99m', 1280);
      await typeInto('A0', '1.500');
      await ev(`document.getElementById('decimalToggle').click()`); await sleep(300);
      const sw = { value: await ev(`document.getElementById('A0').value`), hint: await hintOf('A0') };
      check('D-01: after the switch to comma the field reads "1,500" and the note "Read as 1,5"', sw.value === '1,500' && /^Read as 1,5 /.test(sw.hint), JSON.stringify(sw));
      // D-02: the CSV of a case with range warnings keeps the point in comma mode
      await open('dose.html?id=Pd-103', 1280);
      await ev(`(() => { const s = (i, v) => { document.getElementById(i).value = v; }; s('distance', '0.35'); s('shieldMaterial', 'Pb'); s('shieldThickness', '10.5');
        document.getElementById('shieldMaterial').dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await sleep(400);
      await ev(`document.getElementById('decimalToggle').click()`); await sleep(400);
      const warnScreen = await text('#shieldRangeWarn');
      await ev(`window.__csvBlob = null; document.getElementById('btnExportDoseCsv').click()`); await sleep(100);
      const csv = await ev(`window.__csvBlob ? window.__csvBlob.text() : ''`);
      check('D-02: range warning with comma on screen (99,9 %), with point in the CSV (99.9 %, no "d,d")',
        /99,9%/.test(warnScreen) && /OUT OF VALIDATED RANGE — 99\.9%/.test(csv) && !/\d,\d/.test(csv), (warnScreen.slice(0, 80) + ' | ' + (csv.match(/OUT OF[^"]{0,80}/) || [''])[0]));
      // D-03 and material densities: no option keeps the other separator
      for (const pg of ['decay.html?id=Lu-177', 'dose.html?id=Lu-177', 'effluent.html', 'caregiver.html']) {
        await open(pg, 1280);
        await ev(`document.getElementById('decimalToggle').click()`); await sleep(300);
        const commaOpts = await ev(`[...document.querySelectorAll('main option')].map(o => o.text).filter(t => /\\d\\.\\d/.test(t))`);
        await ev(`document.getElementById('decimalToggle').click()`); await sleep(300);
        const pointOpts = await ev(`[...document.querySelectorAll('main option')].map(o => o.text).filter(t => /\\d,\\d/.test(t))`);
        check(`${pg}: selector options follow the separator both ways`, commaOpts.length === 0 && pointOpts.length === 0, JSON.stringify({ commaOpts, pointOpts }));
      }
    });
    await guard('Spanish display overlay: nothing but the displayed text changes', async () => {
      // Values, chart data and CSV of the same case in EN and ES must be identical;
      // switching back to EN restores the exact initial text.
      const SNAP = `(async () => {
        const vals = [...document.querySelectorAll('main input, main select')].map(e => e.id + '=' + e.value + (e.checked ? '*' : ''));
        const opts = [...document.querySelectorAll('main option')].map(o => o.value);
        const charts = [...document.querySelectorAll('canvas')].map(c => Chart.getChart(c)).filter(Boolean).map(c => c.data.datasets.map(d => d.data));
        const btn = document.getElementById('btnExportDoseCsv') || document.getElementById('btnCsv') || document.getElementById('btnExportCsv');
        window.__csvBlob = null; if (btn) btn.click();
        const csv = window.__csvBlob ? (await window.__csvBlob.text()).replace(/\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{3}Z/g, 'T') : '';
        return JSON.stringify({ vals, opts, charts, csv });
      })()`;
      for (const pg of ['index.html?id=Lu-177', 'decay.html?id=Lu-177', 'dose.html?id=Pd-103', 'effluent.html', 'caregiver.html', 'about.html']) {
        await open(pg, 1280);
        const textEn = await ev('document.body.innerText');
        const en = pg === 'about.html' ? '' : await ev(SNAP);
        await ev(`document.getElementById('langToggle').click()`); await sleep(400);
        const es = pg === 'about.html' ? '' : await ev(SNAP);
        const state = await ev(`({ lang: document.documentElement.lang, nav: document.querySelector('.site-nav').innerText, btn: document.getElementById('langToggle').textContent, stored: localStorage.getItem('nm_lang') })`);
        check(`${pg}: ES — html lang "es", menu in Spanish, button "ES", choice stored`,
          state.lang === 'es' && /Propiedades/.test(state.nav) && /Acompañantes/.test(state.nav) && state.btn === 'ES' && state.stored === 'es', JSON.stringify(state));
        check(`${pg}: ES — field and option values, chart data and CSV identical to EN`, en === es, en === es ? '' : 'snapshots differ');
        await pageChecks(`${pg} in ES @1280`);   // longer Spanish texts must not overflow
        await ev(`document.getElementById('langToggle').click()`); await sleep(400);
        check(`${pg}: back to EN — page text identical to the initial load`, (await ev('document.body.innerText')) === textEn);
        await pageChecks(`${pg} EN/ES`);
      }
      // About: the Spanish guide is its own article; the page index follows it
      await open('about.html', 1280);
      await ev(`document.getElementById('langToggle').click()`); await sleep(300);
      const ab = await ev(`({ en: document.getElementById('user-guide').hidden, es: document.getElementById('user-guide-es').hidden,
        h: document.querySelector('#user-guide-es h2').innerText,
        toc: [...document.querySelectorAll('.about-toc a')].map(a => !!document.getElementById(a.getAttribute('href').slice(1)) && a.getAttribute('href')) })`);
      check('about.html: ES shows the Spanish guide (English one hidden) and every index link reaches its anchor',
        ab.en === true && ab.es === false && /Guía de uso/.test(ab.h) && ab.toc.every(Boolean) && ab.toc[0] === '#user-guide-es', JSON.stringify(ab));
      await ev(`document.getElementById('langToggle').click()`); await sleep(300);
      const ab2 = await ev(`({ en: document.getElementById('user-guide').hidden, es: document.getElementById('user-guide-es').hidden, first: document.querySelector('.about-toc a').getAttribute('href') })`);
      check('about.html: back to EN shows the English guide and its anchors', ab2.en === false && ab2.es === true && ab2.first === '#user-guide', JSON.stringify(ab2));
      for (const [pg, w] of [['index.html', 1240], ['index.html?id=Ra-223', 390], ['decay.html?id=Lu-177', 390], ['dose.html?id=Pd-103', 390], ['effluent.html', 390], ['caregiver.html', 390], ['about.html', 390]]) {
        await open(pg, w);
        await ev(`document.getElementById('langToggle').click()`); await sleep(400);
        await pageChecks(`${pg} in ES @${w}`);
      }
      // Live recalculation in ES: results follow the inputs, the menu stays in Spanish
      await open('dose.html?id=Lu-177', 1280);
      await ev(`document.getElementById('langToggle').click()`); await sleep(300);
      const t0 = Date.now();
      for (let i = 0; i < 20; i++) {
        await ev(`(() => { const d = document.getElementById('distance'); d.value = '${(0.3 + i * 0.01).toFixed(2)}'; d.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      }
      await sleep(300);
      const ms = Date.now() - t0;
      const live = await ev(`({ body: document.getElementById('resultsBody').innerText, nav: document.querySelector('.site-nav').innerText })`);
      check(`ES live recalculation: 20 changes in ${ms} ms, results updated (d = 0.49 m), menu still in Spanish`,
        /at 0\.49 m|0\.49/.test(await text('#doseRate0Header')) && /Propiedades/.test(live.nav) && ms < 8000, `${ms} ms`);
      await pageChecks('dose ES live');
      await ev(`document.getElementById('langToggle').click()`);
    });
    await guard('Theme follows the system preference without a stored choice', async () => {
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
      await open('decay.html?id=Tc-99m', 1280);
      check('system dark preference → dark theme, no stored choice needed', await ev(`document.documentElement.dataset.theme === 'dark' && document.getElementById('darkIcon').classList.contains('ico-sun')`));
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
      await open('decay.html?id=Tc-99m', 1280);
      check('system light preference → light theme', await ev(`document.documentElement.dataset.theme !== 'dark'`));
      await send('Emulation.setEmulatedMedia', { features: [] });
    });
  } finally {
    try { if (ws) ws.close(); } catch (e) { /* ignore */ }
    chrome.kill();
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* Chrome may still hold files */ }
  }

  console.log(`\n=== BROWSER SMOKE ===\nTotal: ${passed} passed, ${failed} failed`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch(err => { console.error('✗', err.message); process.exitCode = 1; });
