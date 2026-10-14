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
      'try{localStorage.removeItem("nm_dark_mode")}catch(e){}' });

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
    async function shot(name) {
      if (!SHOTS) return;
      fs.mkdirSync(SHOTS, { recursive: true });
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
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
        document.getElementById('btnCalc').click(); })()`);
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
        await ev(`(() => { document.getElementById('distance').value = '${dist}'; document.getElementById('btnCalc').click(); })()`);
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
      }
    });
    await guard('Caregiver default case and A18', async () => {
      // Caregiver default case (acceptance A16) and the impossible common restriction (A18)
      await open('caregiver.html', 1280);
      {
        const v = await ev(`['perCycle','treatment','maxRate','floor','minRestriction','adopted','selfCheckStatus'].map(i => document.getElementById(i).textContent.trim())`);
        check('caregiver default: 0.488 / 2.93 mSv, 15.4 µSv/h, floor 0.898, 2.92 → 3 d, self-check OK',
          JSON.stringify(v) === JSON.stringify(['0.488', '2.93', '15.4', '0.898', '2.92', '3', 'OK']), JSON.stringify(v));
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
      await open('index.html?id=Y-90', 1280);
      check('properties Y-90: no spectrum chart and no errors', realErrors().length === 0 &&
        await ev(`!document.getElementById('spectrumChart')`));
    });
    await guard('Review v1.11 (R-01, R-02, R-06)', async () => {
      // R-01: an extended generator parent gets its progeny's dose by default
      await open('dose.html?id=Ge-68', 1280);
      await ev(`document.getElementById('btnCalc').click()`); await sleep(400);
      const info = await text('#nuclideInfo');
      check('dose Ge-68: Γ includes Ga-68 in equilibrium (158) and says so', /incl\. Ga-68 in equilibrium/.test(info) && /= 158\b/.test(info), info.slice(0, 160));
      await ev(`(() => { const s = document.getElementById('progenyMode'); s.value = 'parent'; s.dispatchEvent(new Event('change')); document.getElementById('btnCalc').click(); })()`);
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
    await guard('Report: the print path builds the report without errors', async () => {
      // Report: the print path builds the report without errors
      await open('caregiver.html', 1280);
      await ev(`document.getElementById('btnPrint').click()`); await sleep(300);
      check('caregiver report is built without errors', realErrors().length === 0 && await ev('!!window.__printed'), realErrors().join(' | '));
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
