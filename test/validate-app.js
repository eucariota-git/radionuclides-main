/**
 * Application integration/structure regressions.
 *
 * These checks cover wiring that the numerical suites cannot see: HTML call
 * sites, URL aliases, report formatting and module precedence.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  console.log('=== APPLICATION INTEGRATION / STRUCTURE VALIDATION ===\n');

  const doseHtml = read('dose.html');
  const decayHtml = read('decay.html');
  const aboutHtml = read('about.html');
  const effluentHtml = read('effluent.html');
  const caregiverHtml = read('caregiver.html');
  const reportJs = read('js/report.js');
  const icrpLoaderJs = read('js/icrp107-loader.js');

  console.log('Test 1: operational-quantity wiring');
  check('dose table H\'(0.07) uses sp007',
    /const Hdot_Ext\s*=\s*CALC\.doseRate\([^\n]+ap, sp007\)/.test(doseHtml));
  check('dose chart H\'(0.07) uses sp007',
    /const rateExt\s*=\s*d => CALC\.doseRate\([^\n]+ap, sp007\)/.test(doseHtml) &&
    /const doseExt\s*=\s*distances\.map\(d => \(\{ x: d, y: rateExt\(d\) \}\)\)/.test(doseHtml));
  console.log();

  console.log('Test 2: shared nuclide-ID normalization and curated lookup');
  const ctx = vm.createContext({
    console,
    fetch: async () => { throw new Error('offline test'); },
    NUCLIDE_DATA: require(path.join(ROOT, 'data/nuclides.json')),
  });
  vm.runInContext(read('js/nuclide-id.js') + ';this.__NUCLIDE_ID = NUCLIDE_ID;', ctx);
  ctx.NUCLIDE_ID = ctx.__NUCLIDE_ID;
  vm.runInContext(read('js/db.js') + ';this.__DB = DB;', ctx);
  const db = ctx.__DB;
  await db.load();

  const aliases = {
    '177Lu': 'Lu-177', Lu177: 'Lu-177', ' lu-177 ': 'Lu-177',
    '99mTc': 'Tc-99m', Tc99m: 'Tc-99m', '90Y': 'Y-90', Y90: 'Y-90',
    '18F': 'F-18', '131I': 'I-131',
  };
  for (const [alias, expected] of Object.entries(aliases)) {
    check(`${alias} resolves to curated ${expected}`, db.getById(alias)?.id === expected);
  }
  const masses = db.getAll().map(n => n.A);
  check('curated database is presented in nondecreasing mass-number order',
    masses.every((mass, i) => i === 0 || mass >= masses[i - 1]));
  check('ICRP107 delegates normalization to the shared helper',
    /return NUCLIDE_ID\.normalize\(name\)/.test(icrpLoaderJs));
  check('Y-90 validation status precedes generic _icrp107 status',
    reportJs.indexOf("if (n.id === 'Y-90')") < reportJs.indexOf('if (n._icrp107)'));
  console.log();

  console.log('Test 3: threshold-safe report formatting');
  const utilsCtx = vm.createContext({ document: { createElement: () => ({}) } });
  vm.runInContext(read('js/utils.js') + ';this.__UTILS = UTILS;', utilsCtx);
  check('fmtRatio preserves 1.04 above threshold', utilsCtx.__UTILS.fmtRatio(1.04) === '1.04');
  check('fmtRatio preserves 0.999 below threshold', utilsCtx.__UTILS.fmtRatio(0.999) === '0.999');
  const ratioCalls = decayHtml.match(/UTILS\.fmtRatio\((?:specA0|specAt) \/ clearLevel\)/g) || [];
  check('both printable clearance ratios use fmtRatio', ratioCalls.length === 2,
    `found ${ratioCalls.length}`);
  check('clearance time remains formatted as a time',
    /Time to reach the Table A1 concentration level[^\n]+UTILS\.fmt\(t_clear_h\)/.test(decayHtml));
  console.log();

  const noComments = src => src.replace(/^\s*\/\/.*$/gm, '');
  console.log('Test 4: input-state and validation wiring');
  // One optional field since the presentation review of 2026-10-15 (the Yes/No
  // selector duplicated it): empty = no patient attenuation, no default value.
  check('patient transmission is one optional field with no default value',
    /id="patientTx"[^>]+value=""/.test(doseHtml) && !/id="patientAtten"/.test(doseHtml) &&
    /const parsed = UTILS\.parseNumber\(txInput\.value\);\s*const patientAttenEnabled = parsed !== null;/.test(doseHtml));
  check('patient transmission is exactly 1 when attenuation is No',
    /const patientTx = patientAttenEnabled \? parsed \/ 100 : 1/.test(doseHtml));
  check('shield thickness no longer coerces NaN to zero',
    !/parseFloat\(document\.getElementById\('shieldThickness'\)\.value\) \|\| 0/.test(doseHtml));
  check('target date without reference date is rejected',
    /if \(target && !ref\)/.test(decayHtml));
  check('an entered vial weight must be positive',
    /vialWeightText !== '' && \(!Number\.isFinite\(vialWeightRaw\) \|\| vialWeightRaw <= 0\)/.test(decayHtml));
  check('both calculators surface DB initialization failures',
    (doseHtml.match(/UI\.showFatalError/g) || []).length === 1 &&
    (decayHtml.match(/UI\.showFatalError/g) || []).length === 1);
  console.log();

  console.log('Test 5: database integrity and fallback behavior');
  const jsonData = require(path.join(ROOT, 'data/nuclides.json'));
  const y90 = jsonData.nuclides.find(n => n.id === 'Y-90');
  check('Y-90 photon dose-rate constants are null, not numeric zero',
    y90.gamma_Kair === null && y90.gamma_H10 === null && y90.gamma_H007 === null);
  const embeddedCtx = vm.createContext({});
  vm.runInContext(read('data/nuclides-data.js') + ';this.__DATA = NUCLIDE_DATA;', embeddedCtx);
  check('nuclides.json and nuclides-data.js are deeply identical',
    JSON.stringify(jsonData) === JSON.stringify(embeddedCtx.__DATA));

  async function loadDbWith(embeddedData, fetchedData, fetchFails = false) {
    const quietConsole = { log() {}, warn() {}, error() {} };
    const globals = {
      console: quietConsole,
      fetch: async () => {
        if (fetchFails) throw new Error('offline');
        return { ok: true, json: async () => fetchedData };
      },
    };
    if (embeddedData !== undefined) globals.NUCLIDE_DATA = embeddedData;
    const dbCtx = vm.createContext(globals);
    vm.runInContext(read('js/nuclide-id.js') + ';this.NUCLIDE_ID = NUCLIDE_ID;', dbCtx);
    vm.runInContext(read('js/db.js') + ';this.__DB = DB;', dbCtx);
    return dbCtx.__DB.load();
  }

  const emptyFallback = await loadDbWith(jsonData, {});
  check('empty fetched JSON falls back to the embedded database', emptyFallback.length === 40);
  const partial = { ...jsonData, nuclides: jsonData.nuclides.slice(0, 1) };
  const partialFallback = await loadDbWith(jsonData, partial);
  check('valid-looking partial JSON falls back to the embedded database', partialFallback.length === 40);
  const offlineFallback = await loadDbWith(jsonData, null, true);
  check('offline fetch falls back to the embedded database', offlineFallback.length === 40);
  let invalidRejected = false;
  try {
    await loadDbWith({}, {});
  } catch (err) {
    invalidRejected = /No valid nuclide data source/.test(err.message);
  }
  check('two invalid data sources produce an explicit error', invalidRejected);
  console.log();

  console.log('Test 6: service-worker cache and offline behavior');
  const swJs = read('sw.js');
  const handlers = {};
  const scenario = { cached: null, navigationFallback: null, fetchResponse: null, fetchError: null, fetchCalls: 0,
    openedCaches: [], cacheKeys: [], deleted: [] };
  const swCtx = vm.createContext({
    URL,
    Response,
    self: {
      location: { origin: 'https://example.test' },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
      addEventListener: (type, handler) => { handlers[type] = handler; },
    },
    caches: {
      // Origin-wide lookup: must NOT be used by the SW (H-10) — it returns a
      // foreign response so that any use shows up in the checks below.
      match: async () => new Response('FOREIGN cache entry', { status: 200 }),
      // Per-cache lookup, query-sensitive like the real Cache API: a request URL
      // carrying a query string only matches when the SW passes ignoreSearch (H-04).
      open: async (name) => ({
        addAll: async () => {},
        match: async (request, opts) => {
          scenario.openedCaches.push(name);
          if (request === './index.html') return scenario.navigationFallback;
          const url = typeof request === 'string' ? request : request.url;
          if (url.includes('?') && !(opts && opts.ignoreSearch)) return undefined;
          return scenario.cached;
        },
      }),
      keys: async () => scenario.cacheKeys,
      delete: async (k) => { scenario.deleted.push(k); return true; },
    },
    fetch: async () => {
      scenario.fetchCalls++;
      if (scenario.fetchError) throw scenario.fetchError;
      return scenario.fetchResponse;
    },
  });
  vm.runInContext(swJs, swCtx);

  async function dispatchFetch(request) {
    let responsePromise;
    handlers.fetch({ request, respondWith: promise => { responsePromise = promise; } });
    return responsePromise;
  }

  scenario.cached = new Response('cached asset', { status: 200 });
  scenario.fetchCalls = 0;
  const cacheHit = await dispatchFetch({ method: 'GET', mode: 'same-origin', url: 'https://example.test/js/data.js' });
  check('a precached asset is returned without network revalidation',
    (await cacheHit.text()) === 'cached asset' && scenario.fetchCalls === 0);

  scenario.cached = null;
  scenario.fetchError = new Error('offline');
  const offlineData = await dispatchFetch({ method: 'GET', mode: 'cors', url: 'https://example.test/data/icrp107-index.json' });
  check('an uncached offline resource returns an explicit 503 response', offlineData.status === 503);

  scenario.navigationFallback = new Response('app shell', { status: 200 });
  const offlineNavigation = await dispatchFetch({ method: 'GET', mode: 'navigate', url: 'https://example.test/not-cached' });
  check('an uncached offline navigation returns the precached app shell',
    (await offlineNavigation.text()) === 'app shell');

  // Pages are linked with query parameters (Properties emits dose.html?id=Y-90);
  // offline they must reload as themselves, not as the app shell (H-04).
  scenario.cached = new Response('precached dose page', { status: 200 });
  scenario.fetchCalls = 0;
  const queryNavigation = await dispatchFetch({ method: 'GET', mode: 'navigate', url: 'https://example.test/dose.html?id=Y-90' });
  check('an offline navigation with a query string returns its own precached page',
    (await queryNavigation.text()) === 'precached dose page' && scenario.fetchCalls === 0);
  check('service worker matches the precache ignoring query strings',
    /ignoreSearch:\s*true/.test(swJs));
  // H-10: activation deletes only this app's old caches; lookups use only the current cache
  const swVersionNow = (swJs.match(/CACHE_VERSION = '([^']+)'/) || [])[1];
  scenario.cacheKeys = ['nm-planner-v1', 'nm-planner-v33', swVersionNow, 'otra-app-v1', 'workbox-precache'];
  scenario.deleted = [];
  let activatePromise;
  handlers.activate({ waitUntil: p => { activatePromise = p; } });
  await activatePromise;
  check("activation deletes only this app's old caches; other apps on the origin keep theirs (H-10)",
    scenario.deleted.sort().join() === 'nm-planner-v1,nm-planner-v33');
  check("fetch looks up only the current version's cache, never the whole origin (H-10)",
    scenario.openedCaches.length > 0 && scenario.openedCaches.every(n => n === swVersionNow));
  check('service worker no longer writes piecemeal runtime updates into the versioned cache',
    !/cache\.put\(/.test(swJs) && !/stale-while-revalidate/.test(swJs));
  console.log();

  console.log('Test 7: accessible tooltips and dynamic chart themes');
  const indexHtml = read('index.html');
  const styleCss = read('css/style.css');
  const uiJs = read('js/ui.js');
  const tooltipTags = [...`${indexHtml}\n${doseHtml}`.matchAll(/<[^>]+class="[^"]*has-tooltip[^"]*"[^>]*>/g)]
    .map(match => match[0]);
  check('every tooltip trigger is keyboard focusable',
    tooltipTags.length >= 8 && tooltipTags.every(tag => /tabindex="0"/.test(tag)));
  check('every tooltip trigger exposes an accessible name',
    tooltipTags.length >= 8 && tooltipTags.every(tag => /aria-label="[^"]+"/.test(tag)));
  check('properties distinguishes dose-rate provenance from regulatory sources',
    />&#915; source<\/th>/.test(indexHtml) && /clearance_a1_source/.test(indexHtml));
  check('dose exposes elemental iron with an explicit density',
    /<option value="Fe" data-num-label>Iron \(Fe\).*7\.874 g\/cm/.test(doseHtml));
  check('curve legends use line segments and event markers use circles',
    /pointStyle: 'line'/.test(decayHtml) && /pointStyle: 'circle'/.test(decayHtml) &&
    /usePointStyle: true/.test(decayHtml) && /pointStyle: 'line'/.test(doseHtml) &&
    /pointStyle: 'circle'/.test(doseHtml) && /usePointStyle: true/.test(doseHtml));
  check('all public footers use the shared estimation disclaimer',
    [indexHtml, decayHtml, doseHtml, effluentHtml, caregiverHtml, aboutHtml].every(html =>
      /For radiation protection estimation purposes\.\s*\n\s*Verify against primary sources for regulatory submissions\./.test(html)) &&
    !/Dose rate constants: Cornejo/.test(`${decayHtml}\n${doseHtml}`));
  check('all public footers identify the original author and keep third-party scope separate',
    [indexHtml, decayHtml, doseHtml, effluentHtml, caregiverHtml, aboutHtml].every(html =>
      /Original application and code: &copy; 2026 Ramon Sendon &middot; EUPL-1\.2 &middot; Third-party data: separate terms/.test(html)));
  check('overflow-table tooltips no longer open upward outside the scrollport',
    !/tooltip-up/.test(indexHtml) && !/\.has-tooltip\.tooltip-up/.test(styleCss));
  check('tooltips use dedicated stable color tokens',
    /--tooltip-bg:\s*#343a40/.test(styleCss) &&
    /background:\s*var\(--tooltip-bg\)/.test(styleCss) &&
    /color:\s*var\(--tooltip-text\)/.test(styleCss));
  check('theme toggle emits an application theme-change event',
    /new CustomEvent\('nm-theme-change'/.test(uiJs));
  check('shared chart theme reads the active CSS tokens',
    /function getChartTheme\(\)/.test(uiJs) && /token\('--green-700'\)/.test(uiJs));
  check('both charts subscribe to live theme changes',
    /addEventListener\('nm-theme-change', applyDistChartTheme\)/.test(doseHtml) &&
    /addEventListener\('nm-theme-change', applyDecayChartTheme\)/.test(decayHtml));
  check('chart datasets no longer hardcode the light-theme green',
    !/borderColor:\s*'#2d6a4f'/.test(doseHtml) && !/borderColor:\s*'#2d6a4f'/.test(decayHtml));

  function luminance(hex) {
    const rgb = hex.match(/[0-9a-f]{2}/gi).map(part => parseInt(part, 16) / 255)
      .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  check('tooltip text/background contrast meets WCAG AA for normal text',
    contrast('ffffff', '343a40') >= 4.5);
  console.log();

  console.log('Test 8: inline application scripts parse');
  for (const [name, html] of [['index.html', indexHtml], ['decay.html', decayHtml], ['dose.html', doseHtml], ['effluent.html', effluentHtml], ['caregiver.html', caregiverHtml]]) {
    const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
      .map(match => match[1]).filter(source => source.trim());
    let syntaxOk = true;
    try {
      for (const source of inlineScripts) new vm.Script(source, { filename: name });
    } catch (err) {
      syntaxOk = false;
      console.log(`    ${err.message}`);
    }
    check(`${name} inline scripts have valid JavaScript syntax`, syntaxOk);
  }
  console.log();

  console.log('Test 9: audit-sensitive documentation and notices');
  const developmentMd = read('docs/DEVELOPMENT.md');
  const acceptanceMd = read('docs/ACCEPTANCE_TEST.md');
  const readmeMd = read('README.md');
  const guideMd = read('docs/USER_GUIDE.md');
  const noticesMd = read('THIRD_PARTY_NOTICES.md');
  const iconPaths = [
    'assets/icons/favicon.svg',
    'assets/icons/icon-180.png',
    'assets/icons/icon-192.png',
    'assets/icons/icon-512.png',
  ];
  const swVersion = (swJs.match(/CACHE_VERSION = '([^']+)'/) || [])[1];
  const appBuild = (read('js/utils.js').match(/APP_BUILD = '([^']+)'/) || [])[1];
  check('service-worker cache version was bumped for this change',
    swVersion === 'nm-planner-v56');
  check('report build id (UTILS.APP_BUILD) matches the service-worker cache version',
    Boolean(appBuild) && appBuild === swVersion);
  check('icons exist only in their organized asset directory',
    iconPaths.every(rel => fs.existsSync(path.join(ROOT, rel))) &&
    ['favicon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png']
      .every(rel => !fs.existsSync(path.join(ROOT, rel))));
  check('all public pages reference the organized favicon and Apple Touch icon',
    [indexHtml, decayHtml, doseHtml, effluentHtml, caregiverHtml, aboutHtml].every(html =>
      /href="assets\/icons\/favicon\.svg"/.test(html) &&
      /href="assets\/icons\/icon-180\.png"/.test(html)));
  const manifest = JSON.parse(read('manifest.json'));
  check('manifest and service worker reference the organized icon assets',
    manifest.icons.every(icon => icon.src.startsWith('assets/icons/')) &&
    iconPaths.every(rel => swJs.includes(`./${rel}`)));
  check('development docs describe absolute tolerance and warned results',
    /absolute tolerance of 0\.1/.test(developmentMd) && /0 warned/.test(developmentMd) && !/< 5% deviation/.test(developmentMd));
  check('README no longer advertises removed custom uploads and lists current modules',
    !/user-uploaded nuclides/.test(readmeMd) && /about\.html/.test(readmeMd) &&
    /js\/report\.js/.test(readmeMd) && /js\/utils\.js/.test(readmeMd) && /test\//.test(readmeMd));
  {
    // Guide examples must be what the engine returns (copy audit 2026-10-03, T05)
    const ectx = vm.createContext({ console });
    for (const f of ['js/data.js', 'js/physics.js']) vm.runInContext(read(f), ectx);
    ectx.tc = require(path.join(ROOT, 'data/nuclides.json')).nuclides.find(n => n.id === 'Tc-99m');
    const ex = vm.runInContext(`({
      rate: CALC.doseRate(tc.gamma_H10, 0.1, 0.5, 0, 0.14, 'none', null),
      annual: 200 * CALC.cumulativeDose(tc.gamma_H10, 0.1, 0.5, 1 / 6, tc.half_life_s / 3600, 0, 0.14, 'none', null),
    })`, ectx);
    check('guide dose example is the engine result (8.7 uSv/h; 0.29 mSv/y) and carries no shielded figure or "Safe" verdict',
      Math.abs(ex.rate - 8.7) < 0.05 && Math.abs(ex.annual / 1000 - 0.29) < 0.005 &&
      [guideMd, aboutHtml].every(t => /≈ 8\.7 μSv\/h/.test(t) && /≈ 0\.29 mSv\/y/.test(t) &&
        !/~0\.9 μSv\/h/.test(t) && !/\(Safe\)/.test(t)),
      `rate ${ex.rate}, annual ${ex.annual}`);
  }
  check('guide and in-app copy both explain local ICRP data and PWA site-data reset',
    /bundled locally/.test(guideMd) && /site data/.test(guideMd) &&
    /bundled locally/.test(aboutHtml) && /site data/.test(aboutHtml));
  check('guide and in-app references include both current Spanish regulations',
    /BOE-A-2022-21682/.test(guideMd) && /BOE-A-2024-25205/.test(guideMd) &&
    /BOE-A-2022-21682/.test(aboutHtml) && /BOE-A-2024-25205/.test(aboutHtml));
  check('AI development tooling disclosure present in guide and in-app, outside the licence map',
    /Claude Code/.test(guideMd) && /Codex/.test(guideMd) &&
    /Claude Code/.test(aboutHtml) && /voluntary transparency notice/.test(aboutHtml) &&
    /Claude Code/.test(readmeMd) && /voluntary transparency notice/.test(readmeMd) &&
    !/Claude Code|Codex/.test(read('LICENSING.md')) && !/Claude Code|Codex/.test(noticesMd));
  check('@kurkle/color notice matches the distributed v0.3.2 banner',
    /@kurkle\/color v0\.3\.2/.test(noticesMd) && /Copyright \(c\) 2023 Jukka Kurkela/.test(noticesMd) &&
    /@kurkle\/color v0\.3\.2/.test(aboutHtml) && /Copyright \(c\) 2023 Jukka Kurkela/.test(aboutHtml) &&
    !/2018-2024 Jukka Kurkela/.test(`${noticesMd}\n${aboutHtml}`));
  check('acceptance sheet takes candidate identity from PACKAGE-INFO instead of hardcoding an app release',
    /copiar literalmente de `PACKAGE-INFO\.txt`/.test(acceptanceMd) &&
    /Aplicación: v_+/.test(acceptanceMd) && /Build: _+/.test(acceptanceMd) &&
    /Commit fuente completo: _+/.test(acceptanceMd) && /SHA-256 del ZIP: _+/.test(acceptanceMd) &&
    !/\*\*Versión de la aplicación:\*\*\s*v1\.2/.test(acceptanceMd));
  console.log();

  console.log('Test 10: scientific-message and traceability regressions (audit 2026-07-16)');
  check('no user-facing text claims infinite-medium build-up is conservative for finite barriers',
    ![doseHtml, aboutHtml, guideMd].some(text => /conservative for finite|slightly conservative/i.test(text)) &&
    /not universally conservative/.test(doseHtml));
  check('dose page derives the photon-less label from real decay modes and discloses sub-0.01% branches',
    /decay_modes: icrpN\.decay_modes/.test(doseHtml) &&
    /isPureBetaMinus/.test(doseHtml) &&
    /m\.branching >= 1e-4/.test(doseHtml) &&
    /minorModes/.test(doseHtml) &&
    !/is a pure &beta;|essentially a pure &beta;|Pure &beta;&#8315; emitter/.test(doseHtml));
  check('dose: a photon-less nuclide never implies that bremsstrahlung is the only external hazard (copy audit T01)',
    /Direct beta\/electron dose \(skin, extremities\) and bremsstrahlung are not calculated here/.test(doseHtml) &&
    /No photon dose estimate with the selected filter/.test(doseHtml) &&
    !/Any external hazard would come from bremsstrahlung/.test(doseHtml) &&
    !/No photon dose component/.test(doseHtml) &&
    /direct beta dose is excluded/.test(doseHtml));
  check('dose: the Archer fit is described by its real quantity, dose at 1 cm depth in tissue (copy audit T02)',
    /based on dose at 1 cm depth in tissue/.test(doseHtml) && !/fitted to H\*\(10\)/.test(doseHtml) &&
    !/fits to H\*\(10\)/.test(doseHtml));
  check('dose: one validity state feeds report and CSV; Y-90 and Archer never export "within range" (copy audit T03)',
    /function shieldingValidity\(r\)/.test(doseHtml) &&
    (doseHtml.match(/lastCalcResult\.validity = shieldingValidity\(lastCalcResult\)/g) || []).length === 2 &&
    /Experimental container estimates; validity not established; no regulatory assessment/.test(doseHtml) &&
    /Published fit; applicability range not checked by the app/.test(doseHtml) &&
    !/'within range'/.test(doseHtml) && !/its own published validity range/.test(doseHtml));
  {
    // The function itself, run on the three cases the audit named
    const src = doseHtml.match(/function shieldingValidity\(r\) \{[\s\S]*?\r?\n  \}/)[0];
    const f = new Function(src + '; return shieldingValidity;')();
    check('dose: shieldingValidity() returns the specific state for Y-90, Archer, warnings and unshielded',
      /^Experimental container/.test(f({ isY90: true, shieldWarnings: [] })) &&
      /^Published fit/.test(f({ method: 'archer', shieldWarnings: [] })) &&
      /^OUT OF VALIDATED RANGE/.test(f({ method: 'narrow_beam_spectrum', shieldWarnings: ['x'] })) &&
      f({ method: 'unshielded' }) === 'No shielding' &&
      /^Within the tabulated/.test(f({ method: 'narrow_beam', shieldWarnings: [] })));
  }
  check('Y-90 report keeps its scenario snapshot and cites only scenario sources (no auto ICRU 57/Cornejo)',
    /containerName: container\.name/.test(doseHtml) &&
    /patientTx: patientTx,\s*\n\s*withDecay: withDecay/.test(doseHtml) &&
    /'Shielding', 'Shielding_method', 'Shielding_validity', 'Patient_transmission'/.test(doseHtml) &&
    !/ICRU Report 57/.test(reportJs) &&
    /if \(r\.isY90\) \{/.test(doseHtml));
  check('Y-90 report does not create an empty assumptions list item when no method text exists',
    /const notes = methodText \? \[methodText\] : \[\];/.test(doseHtml));
  check('dose: shielding out-of-range warnings are kept in the result and exported (audit 2026-10-03, H-07)',
    /shieldWarnings = msgs\.map/.test(doseHtml) && /shieldWarnings: shieldWarnings\.slice\(\)/.test(doseHtml) &&
    /'Model validity'/.test(doseHtml) && /'Shielding_validity'/.test(doseHtml));
  check('dose: the exported distance keeps the entered value and unit, never toFixed(2) metres (H-08)',
    !/d_m\.toFixed\(2\)/.test(doseHtml) && /\$\{UTILS\.num\(r\.distRaw\)\} \$\{r\.distUnit\}/.test(doseHtml) &&
    /'Distance_input', 'Distance_unit', 'Distance_m'/.test(doseHtml));
  check('dose CSV is rectangular and self-describing: versions, nuclide and activity on every row (H-09)',
    /'App_version', 'App_build', 'Database_version', 'Exported_UTC', 'Nuclide',/.test(doseHtml) &&
    /'Activity_input', 'Activity_unit', 'Activity_GBq'/.test(doseHtml));
  check('printed reports identify the application build',
    /<tr><td>Application<\/td>/.test(reportJs) && /APP_BUILD/.test(reportJs));
  {
    // Copy audit 2026-10-03, phase 2 (T16-T24, T34, T36)
    const src = decayHtml.match(/function targetState\(A0_MBq, Atgt_MBq\) \{[\s\S]*?\r?\n  \}/)[0];
    const ts = new Function(src + '; return targetState;')();
    check('decay: a target equal to A0 is "already reached", a higher one "cannot be reached"; never a 0 h time (T16)',
      ts(1000, 1000) === 'equal' && ts(1000, 2000) === 'above' && ts(1000, 100) === 'below' &&
      /Target already reached at t = 0/.test(decayHtml) && /Target exceeds A₀ and cannot be reached by decay/.test(decayHtml) &&
      !/no decay needed/.test(decayHtml) && (decayHtml.match(/targetState\(/g) || []).length === 3);
    check('decay: a single Table A1 level is not announced as clearance, and equality is "at or below" (T17)',
      !/Clearance reached|Below clearance|Above clearance|\? 'BELOW'/.test(decayHtml) &&
      /At or below the individual level/.test(decayHtml) && /AT OR BELOW/.test(decayHtml));
    check('decay: examples carry no unit, dates are labelled local, a manual elapsed time is recorded as such (T18)',
      !/e\.g\. 24 \(hours\)|e\.g\. 100 \(MBq\)/.test(decayHtml) && /Elapsed time entered manually; target date not used/.test(decayHtml) &&
      /'Elapsed_time_source'/.test(decayHtml) && /Fraction remaining \(%\)/.test(decayHtml));
    // T19 contract since the presentation review of 2026-10-15: live calculation,
    // and an invalid input hides the results (no stale snapshot can be exported).
    check('decay and dose recalculate live; an invalid input hides the results and the snapshot (T19)',
      /function onInputs\(fn/.test(uiJs) && /function inputErrors\(boxId\)/.test(uiJs) &&
      [decayHtml, doseHtml].every(h => /UI\.onInputs\(calculate, \{ exclude: '#nuclideCombobox, #resultsCard' \}\)/.test(h) &&
        /function fail\(message, fieldId\) \{\s*errors\.show\(message, fieldId\);\s*document\.getElementById\('resultsCard'\)\.classList\.add\('hidden'\);/.test(h) &&
        !/id="btnCalc"/.test(h) && !/\balert\(|\bconfirm\(/.test(noComments(h))) &&
      !/btnExportCsv[\s\S]{0,900}getElementById\('(refDateTime|targetDateTime)'\)/.test(decayHtml));
    check('dose: quantities are dose equivalents (no D\', no "whole body", no "worst case") (T20, T22)',
      !/D'\(0\)|D'\(t\)|D\(annual\)|whole body|worst case/.test(doseHtml) &&
      /Annual integrated H/.test(doseHtml) && /H\*\(10\), ambient/.test(doseHtml) &&
      /Integrate physical decay during exposure\?/.test(doseHtml));
    check('dose: no absolute claim that compliance is shown by personal dosimetry (T21; RD 1029/2022 art. 34)',
      [doseHtml, aboutHtml, read('docs/USER_GUIDE.md')].every(t =>
        !/[Cc]ompliance (with dose limits )?is (assessed|demonstrated) with personal dosimetry/.test(t)) &&
      // stated where the limits are compared and in the report (not repeated in the subtitle)
      /Indicative screening only<\/strong>[^`]*do not establish compliance/.test(doseHtml) &&
      /notes\.push\('H\*\(10\) and H\\'\(0\.07\) are area-monitoring quantities\. These operational-quantity estimates do not establish compliance/.test(doseHtml));
    check('dose: Archer is promised only where a fit exists; HVL/TVL are first layers (T23, T24)',
      /only where a fit exists for the nuclide and material/.test(doseHtml) &&
      !/Geometry, scatter, and source distribution effects are not modelled/.test(doseHtml) &&
      /full photon spectrum \(published fit\)/.test(doseHtml) &&
      /First HVL for/.test(doseHtml) && /Thickness \/ first HVL/.test(doseHtml) && !/n HVLs/.test(doseHtml));
    check('reports: decay header shows the half-life source, not the Γ status; timestamps name UTC and local (T34, T36)',
      /spec\.kind === 'decay'/.test(reportJs) && /Half-life source/.test(reportJs) && /kind: 'decay'/.test(decayHtml) &&
      /Z \(UTC\); local: /.test(reportJs) && /no published comparison is recorded in this app/.test(reportJs) &&
      /difference not reconciled/.test(reportJs) && !/reflects updated ICRP 107 decay data/.test(reportJs));
  }
  {
    // Copy audit 2026-10-03, phase 3 (T07-T15, T26-T30)
    const nuc = require(path.join(ROOT, 'data/nuclides.json')).nuclides;
    const eff = require(path.join(ROOT, 'data/effluent-scenarios.json'));
    const indexHtml3 = read('index.html');
    check('every curated K-air constant states its own source, and "Cornejo" only where it equals the published value (T07)',
      nuc.every(n => (n.gamma_Kair == null) === (n.gamma_Kair_source == null)) &&
      nuc.filter(n => /^Cornejo/.test(n.gamma_Kair_source || '')).length === 32 &&
      nuc.filter(n => /^Cornejo/.test(n.gamma_Kair_source || '')).every(n => n.cornejo_validation.gamma_Kair_Cornejo === n.gamma_Kair) &&
      /function gammaSourceLabel\(n\)/.test(indexHtml3) && /'gamma_Kair_source', 'record_origin'/.test(indexHtml3));
    check('properties: levels, photon lines and constants carry their real names and units (T08-T10)',
      !/Liquid effluent limit|Liquid effluent level|Extremity dose constant|G\/X ray|No significant G\/X\/AQ|Representative &#947; energy/.test(indexHtml3) &&
      /Individual discharge concentration level/.test(indexHtml3) && /Representative photon energy/.test(indexHtml3) &&
      /Parent-only photon spectrum; dose constants include the stated progeny/.test(indexHtml3) &&
      /G: gamma; X: X-ray; AQ: annihilation photons/.test(indexHtml3));
    check('properties: no unsupported claims in the notes; no invitation to edit the JSON; uses are "example applications" (T11-T13, T15)',
      !/more recent ICRP 107|equilibrium within hours|published conservative constant|can be edited directly|pure β⁻ emitter/.test(indexHtml3) &&
      /Example applications/.test(indexHtml3) && /do not indicate marketing authorisation/.test(indexHtml3) &&
      !/^SPECT: red cell/.test(nuc.find(n => n.id === 'Cr-51').clinical_use) &&
      !/MIBG therapy$/.test(nuc.find(n => n.id === 'I-131').clinical_use));
    check('properties: an empty cell states why (not tabulated / not calculated / see details) (T14)',
      /cellStatus\('Not tabulated'\)/.test(indexHtml3) && /cellStatus\('Not calculated'\)/.test(indexHtml3) &&
      /Extended results have no modality classification/.test(indexHtml3) &&
      !/<td class="num text-muted">—<\/td>\s*<td class="num">\$\{fmtGamma\(n\.gamma_H10\)\}/.test(indexHtml3));
    const params = Object.values(eff.parameters).flatMap(g => Object.values(g));
    check('effluent: every parameter has a short hint; provenance is listed apart (T30)',
      params.length === 22 && params.every(q => typeof q.hint === 'string' && q.hint.length > 10 && !/cell [A-Z]\d/.test(q.hint)) &&
      /p\.hint \|\| p\.source/.test(effluentHtml) && /id="paramSources"/.test(effluentHtml) && /id="sourceWarnings"/.test(effluentHtml));
    check('effluent: receptor, geometries and retained fraction are described as modelled (T26-T28)',
      !/external immersion/.test(effluentHtml + JSON.stringify(eff)) && !/[Uu]p to \d+ m²|Covers real Spanish/.test(JSON.stringify(eff.geometries)) &&
      /^Model geometry: 10 × 10 × 3 m/.test(eff.geometries.L10.label) && /^Model geometry: 45 × 45 × 3 m/.test(eff.geometries.L45.label) &&
      /retained fraction as entered \(default: 100%\)/i.test(effluentHtml) &&
      !/reproduce the reference workbooks|so annual-average concentrations\s+are steady-state/.test(effluentHtml) &&
      !/Always one treatment/.test(JSON.stringify(eff)));
    check('effluent: STP activity is not called "to sewer", a small DF is never 0.0000, k is not also a coverage factor (T29)',
      !/To sewer/.test(effluentHtml) && /Activity reaching STP/.test(effluentHtml) && !/DF\.toFixed\(4\)/.test(effluentHtml) &&
      /const fmtDF = v => UTILS\.dec\(v >= 0\.001 \? v\.toFixed\(4\) : v\.toExponential\(2\)\)/.test(effluentHtml) &&
      !/k = 1/.test(effluentHtml + JSON.stringify(eff)) && /coverage factor 1/.test(effluentHtml));
  }
  {
    // Copy audit 2026-10-03, phase 4 (T31-T33, T35, T37, T38)
    const guide4 = read('docs/USER_GUIDE.md');
    const about4 = read('about.html');
    const hasGuideTool = fs.existsSync(path.join(ROOT, 'tools/build-about-guide.js'));
    check('the in-app guide is generated from docs/USER_GUIDE.md and is up to date (skipped inside a package without tools/)',
      !hasGuideTool || require(path.join(ROOT, 'tools/build-about-guide.js')).build() === about4);
    const gctx = vm.createContext({ console });
    for (const f of ['js/data.js', 'js/physics.js']) vm.runInContext(read(f), gctx);
    gctx.am = require(path.join(ROOT, 'data/icrp107-index.json')).nuclides.find(n => n.id === 'Am-241');
    gctx.tc = require(path.join(ROOT, 'data/nuclides.json')).nuclides.find(n => n.id === 'Tc-99m');
    const g = vm.runInContext(`({ lines: am.photons.length, gamma: PHYSICS.calcGammaConstants(am.photons).gammaH10,
      a6: CALC.activityAtTime(1000, tc.half_life_s / 3600, 6), t100: CALC.timeToActivity(1000, 100, tc.half_life_s / 3600) })`, gctx);
    check('guide examples are engine results: Am-241 (21 lines, 7.0), Tc-99m (500 MBq at 6 h, 20.0 h to 100 MBq) (T31)',
      g.lines === 21 && Math.abs(g.gamma - 7.0) < 0.05 && Math.abs(g.a6 - 500) < 1 && Math.abs(g.t100 - 20.0) < 0.05 &&
      [guide4, about4].every(t => /21 selected photon lines/.test(t) && /≈ 7\.0 μSv/.test(t) && /≈ 500 MBq/.test(t) && /≈ 20\.0 hours/.test(t) &&
        !/~50 X-ray|0\.48 μSv|20\.6 hours|~501 MBq/.test(t)),
      JSON.stringify(g));
    check('guide describes the real controls: no slider, no years, no 0–300 mm, no transmission curve, no Safe/Caution, no "EU RD" (T32)',
      [guide4, about4].every(t => !/slider|Converts to seconds|0–300 mm|Transmission curve|Safe \||⚠ Caution|EU RD 1029|cm, not m|Click \*\*"Search in ICRP 107"|is calculated instantly/.test(t) &&
        /Spanish Royal Decree 1029\/2022/.test(t) && /matches the selected unit \(m or cm\)/.test(t) &&
        /Calculators work offline with the complete local copy/.test(t)));
    check('ICRP permission notice makes no commercial-only exception (T33)',
      [read('THIRD_PARTY_NOTICES.md'), about4].every(t => !/relevant only if use\s+becomes commercial/.test(t) &&
        /ICRP publications retain\s+copyright; verify permission for the intended reuse/.test(t)));
    check('keyboard hint lists only the shortcuts of the page (T35)',
      /getElementById\('searchInput'\)\) \{\s*parts\.push\('<kbd>\/<\/kbd> search'/.test(uiJs) &&
      /getElementById\('nuclideSearch'\)/.test(uiJs) && !/<kbd>Esc<\/kbd> clear &nbsp;/.test(uiJs));
    check('About has in-page navigation to guide, methods, references and licences (T38)',
      /<nav class="about-toc" aria-label="On this page">/.test(about4) &&
      ['#user-guide', '#guide-data-quality-and-limitations', '#guide-references', '#licences', '#third-party-notices']
        .every(h => about4.includes(`href="${h}"`) && about4.includes(`id="${h.slice(1)}"`)));
    check('user-facing strings carry no audit history, and long method notes are collapsible (T37)',
      !/audit 20\d\d/.test(JSON.stringify(require(path.join(ROOT, 'data/effluent-scenarios.json')))) &&
      /<summary>Shielding method<\/summary>/.test(doseHtml) && /<summary class="card-title"[^>]*>Reference &amp; data notes/.test(read('index.html')));
  }
  check('decay names the denominator as mass of material, never "vial weight" (copy audit T04)',
    /Mass of material being assessed/.test(decayHtml) && !/Vial \/ container weight|Vial_weight/.test(decayHtml) &&
    /state whether it includes the container/.test(decayHtml));
  {
    // Audit 2026-10-04, A01/A07
    const iRender = decayHtml.indexOf("card.classList.remove('hidden')");
    const iTarget = decayHtml.indexOf('Target activity must be a non-negative number');
    check('decay validates the target activity before any result is rendered; non-numeric text is rejected (A01)',
      iTarget > 0 && iTarget < iRender && /const AtgtRaw   = AtgtEmpty \? NaN : UTILS\.parseNumber\(AtgtText\);/.test(decayHtml) &&
      !/parseFloat\(document\.getElementById\('Atarget'\)/.test(decayHtml));
    check('a zero target is a state shared by the screen and the report, never hidden (A01)',
      /if \(Atgt_MBq === 0\) return 'zero'/.test(decayHtml) &&
      /zero:\s+'A target of zero is never reached in finite time/.test(decayHtml) &&
      /\$\{TARGET_TEXT\.zero\}/.test(decayHtml) &&
      (decayHtml.match(/if \(Number\.isFinite\((r\.)?AtgtRaw\)\)/g) || []).length === 2 &&
      !/AtgtRaw > 0/.test(decayHtml));
    const finiteAfter = (html, v) => new RegExp(
      `const ${v}\\s*= CALC\\.convertActivity\\(A0raw, A0unit, '[MG]Bq'\\);[^]{0,250}?if \\(!Number\\.isFinite\\(${v}\\)\\)`).test(html);
    check('decay, dose and effluent reject overflow after unit conversion and products (A07)',
      finiteAfter(decayHtml, 'A0_MBq') && finiteAfter(doseHtml, 'A0_GBq') &&
      /Number\.isFinite\(1e6 \* A0_GBq \* t_h \* nAdmin \/ \(d_m \* d_m\)\)/.test(doseHtml) &&
      /\[out\.s1\.total_mSv_y, out\.s2\.total_mSv_y\]\.every\(Number\.isFinite\)/.test(effluentHtml));
  }
  {
    // Audit 2026-10-04, A02-A06: documents and notices
    const notices = read('THIRD_PARTY_NOTICES.md');
    const about5 = read('about.html');
    const readme5 = read('README.md');
    const acceptance5 = read('docs/ACCEPTANCE_TEST.md');
    check('README describes the Archer fit by its real quantity and keeps no change history (A02)',
      !/published fits are H\\\*\(10\) broad-beam/.test(readme5) && !/Recent Improvements/.test(readme5) &&
      /docs\/CHANGELOG\.md/.test(readme5) && /not a description of the current behaviour/.test(read('docs/CHANGELOG.md')));
    check('acceptance sheet counts its A cases and treats Y-90 as an experimental scenario (A03)',
      (() => {
        const nA = (acceptance5.match(/^\| A\d+ \|/gm) || []).length;
        return acceptance5.includes(`____ / ${nA} `) && /A10 \(Y-90\) es un \*\*escenario experimental\*\*/.test(acceptance5) &&
          !/sin dispersión ni distribución de fuente/.test(acceptance5);
      })());
    check('notices state the ICRP 74 / ICRP 119 permission status apart from the ICRP-07 licence (A04)',
      [notices, about5].every(t => /No permission on file\./.test(t) &&
        /no reuse permission has been requested from ICRP/.test(t) && /That licence covers the decay data package only/.test(t)));
    check('notices do not claim that references/ travels in the distribution package (A05)',
      [notices, about5].every(t => !/article itself is\s+redistributed unmodified/.test(t) &&
        /distribution\s+package contains only the transcribed parameters/.test(t) &&
        /distribution package does not include/.test(t)));
  }
  check('decay validates the material mass before any result is rendered',
    decayHtml.indexOf('Mass of material must be a positive number') > 0 &&
    decayHtml.indexOf('Mass of material must be a positive number') <
    decayHtml.indexOf("card.classList.remove('hidden')"));
  check('decay CSV is rectangular and repeats self-describing version and scenario metadata',
    [
      'App_version', 'App_build', 'Database_version', 'Exported_UTC',
      'Nuclide', 'Half_life_h', 'Initial_activity_input',
      'Initial_activity_unit', 'Initial_activity_MBq', 'Reference_datetime',
      'Target_datetime', 'Material_mass_input', 'Material_mass_unit',
      'Clearance_level_kBq_per_kg',
    ].every(field => decayHtml.includes(`'${field}'`)) &&
    /UTILS\.APP_VERSION, UTILS\.APP_BUILD,[\s\S]{0,300}?\(dbMeta\.version \|\| ''\)/.test(decayHtml) &&
    /const csv = \[headers, \.\.\.rows\]/.test(decayHtml));
  check('deployment docs build distributions from an allowlist, never the working folder',
    /allowlist/i.test(developmentMd) && /data\/sources\//.test(developmentMd) &&
    !/Distribute the complete project folder/.test(developmentMd));
  check('deployment docs scope reproducibility to canonical Git blobs, epoch and Node/zlib toolchain',
    /canonical blobs of `HEAD`/.test(developmentMd) && /same commit,\s*\nepoch and Node\/zlib toolchain/.test(developmentMd) &&
    /compressed bytes are not promised to match/.test(developmentMd));

  console.log();

  console.log('Test 11: effluent page (NUREG/CR-5814 Scenarios 1 and 2) wiring');
  const effluentJs = read('js/effluent.js');
  // tools/ is not shipped: inside a built package the allowlist check is
  // replaced by the presence of the files it must have copied.
  const hasTools = fs.existsSync(path.join(ROOT, 'tools/build-package.js'));
  const buildPackageJs = hasTools ? read('tools/build-package.js') : '';
  const effluentCtx = vm.createContext({});
  vm.runInContext(read('data/effluent-scenarios-data.js') + ';this.__E = EFFLUENT_DATA;', effluentCtx);
  check('effluent-scenarios-data.js is the exact twin of effluent-scenarios.json',
    JSON.stringify(effluentCtx.__E) === JSON.stringify(JSON.parse(read('data/effluent-scenarios.json'))));
  check('every page links the effluent page in its navigation',
    [indexHtml, decayHtml, doseHtml, caregiverHtml, aboutHtml].every(html =>
      /<nav class="site-nav"[\s\S]*?href="effluent\.html"[\s\S]*?<\/nav>/.test(html)) &&
    /href="effluent\.html" class="active"/.test(effluentHtml));
  check('service worker precaches the effluent page, module and embedded data',
    ['./effluent.html', './js/effluent.js', './data/effluent-scenarios-data.js'].every(a => swJs.includes(`'${a}'`)));
  check(hasTools ? 'package allowlist includes the effluent page and data'
                 : 'packaged copy contains the effluent page and data',
    hasTools
      ? /'effluent\.html'/.test(buildPackageJs) &&
        /'data\/effluent-scenarios\.json', 'data\/effluent-scenarios-data\.js'/.test(buildPackageJs)
      : ['effluent.html', 'js/effluent.js', 'data/effluent-scenarios.json', 'data/effluent-scenarios-data.js']
          .every(rel => fs.existsSync(path.join(ROOT, rel))));
  check('no stale reference to the old effluent-scenario2 data file remains',
    ![effluentHtml, effluentJs, swJs, buildPackageJs].some(t => /effluent-scenario2|EFFLUENT_S2_DATA/.test(t)));
  check('effluent page loads its embedded data before the module, and the module uses both pure physics functions',
    effluentHtml.indexOf('data/effluent-scenarios-data.js') < effluentHtml.indexOf('js/effluent.js') &&
    /CALC\.sewerInspectorScenario1/.test(effluentJs) && /CALC\.sludgeOperatorScenario2/.test(effluentJs) &&
    !/document\./.test(effluentJs));
  check('effluent page reads every data-file parameter of all groups, both coefficients and locks I-131 cycles',
    /for \(const key of Object\.keys\(PG\[s\]\)\) \{\s*input\[s\]\[key\] = readNumber/.test(effluentHtml) &&
    /PG\[s\]\[key\]\.positive && !\(input\[s\]\[key\] > 0\)/.test(effluentHtml) &&
    /const SCEN = \['common', 's1', 's2'\]/.test(effluentHtml) &&
    /k1_nSv_h_per_Bq_m3: nd\.k_ext\.s1\.value/.test(effluentHtml) &&
    /k2_nSv_h_per_Bq_m3: nd\.k_ext\.s2 \? nd\.k_ext\.s2\[geometry\]\.value : null/.test(effluentHtml) &&
    /cycles_locked \? 1 :/.test(effluentHtml));
  check('source term reads the in-hospital fraction and the decay-tank flag of every nuclide',
    /fraction_in_hospital: readNumber\(document\.getElementById\(`st_\$\{i\}_fraction_in_hospital`\)\)/.test(effluentHtml) &&
    /controlled: document\.getElementById\(`st_\$\{i\}_controlled`\)\.checked/.test(effluentHtml) &&
    !/fraction_to_sewer/.test(effluentHtml + effluentJs) &&
    /tank_limit_GBq_y/.test(effluentJs));
  check('facility selector fills the Scenario 1 water volume and a manual edit switches it to Custom',
    /volInput\.value = UTILS\.inputValue\(presets\[facSel\.value\]\.water_volume_m3_y\)/.test(effluentHtml) &&
    /facSel\.value = match \|\| 'custom'/.test(effluentHtml));
  check('the two scenarios are reported separately and never added together',
    /never added together/.test(effluentHtml) && /not added together/.test(effluentHtml) &&
    !/s1\.total_mSv_y\s*\+\s*[^;]*s2\.total_mSv_y/.test(effluentHtml + effluentJs));
  check('a nuclide without a Scenario 2 coefficient keeps its inhalation, shows external n/a (not zero) and makes the total partial',
    /partial: noK2/.test(effluentJs) && /complete: missing2\.length === 0/.test(effluentJs) &&
    /not zero/.test(effluentHtml) && /PARTIAL SUM/.test(effluentHtml));
  check('effluent CSV is rectangular and self-describing (versions, completeness on every row)',
    /'App_version', 'App_build', 'Database_version', 'Effluent_data_version', 'Exported_UTC'/.test(effluentHtml) &&
    /'Scenario_complete', 'Missing_pathways'/.test(effluentHtml));
  check('effluent report overrides the point-source disclaimer and nuclide header',
    /disclaimer: 'Generic screening estimate/.test(effluentHtml) && /headerRows:/.test(effluentHtml) &&
    /spec\.disclaimer \|\| DISCLAIMER/.test(reportJs) && /spec\.headerRows/.test(reportJs));
  check('effluent page states it is not a complete discharge assessment and uses public inhalation coefficients',
    /not a complete discharge assessment/.test(effluentHtml) && /members of the public/.test(effluentHtml));

  console.log();

  console.log('Test 12: regulatory values wiring (audit 2026-10-03)');
  const regulatoryJs = read('js/regulatory.js');
  const indexHtml2 = read('index.html');
  const regCtx = vm.createContext({});
  vm.runInContext(read('data/regulatory-data.js') + ';this.__R = REGULATORY_DATA;', regCtx);
  check('regulatory-data.js is the exact twin of regulatory.json',
    JSON.stringify(regCtx.__R) === JSON.stringify(JSON.parse(read('data/regulatory.json'))));
  check('decay.html resolves Table A1 through REGULATORY for curated and extended entries',
    /REGULATORY\.clearanceA1\(n\.id\)/.test(decayHtml) && !/n\.clearance_a1_kBq_per_kg/.test(decayHtml) &&
    !/not in RD 1217\/2024 Table A\.1/.test(decayHtml) && !/Table A\.1/.test(decayHtml));
  check('decay.html evaluates the Table B exemption criteria a) and b) separately, b) only up to 1000 kg',
    /REGULATORY\.exemptionB\(n\.id\)/.test(decayHtml) && /weight_kg > 1000/.test(decayHtml) &&
    /a\) Total activity/.test(decayHtml) && /b\) Moderate quantity/.test(decayHtml));
  check('index.html shows A1, B and e(g) from REGULATORY and no longer labels e(g) as ICRP 107',
    /REGULATORY\.clearanceA1\(id\)/.test(indexHtml2) && /REGULATORY\.exemptionB\(id\)/.test(indexHtml2) &&
    /REGULATORY\.dischargeLevel\(id\)/.test(indexHtml2) && !/Sv\/Bq, ICRP 107/.test(indexHtml2) &&
    !/calcEffluentLimit/.test(indexHtml2 + read('js/icrp107-loader.js')));
  check('regulatory module has no DOM access and keeps the not-tabulated texts in the data file',
    !/document\./.test(regulatoryJs) && /not_tabulated_a1/.test(regulatoryJs));
  check('service worker precaches the regulatory module and data; package allowlist includes the data',
    ["./js/regulatory.js", "./data/regulatory-data.js"].every(a => swJs.includes(`'${a}'`)) &&
    (!hasTools || /'data\/regulatory\.json', 'data\/regulatory-data\.js'/.test(buildPackageJs)));
  check('Properties reaches identifiers that exist only in the regulatory tables (Nb-98), calculators disabled (H-11)',
    /function allIds\(\)/.test(regulatoryJs) && /function regulatoryOnlyMatches\(query\)/.test(indexHtml2) &&
    /function showRegulatoryOnly\(id\)/.test(indexHtml2) && /btnDecay'\)\.parentElement\.classList\.add\('hidden'\)/.test(indexHtml2) &&
    /_regOnly: true/.test(indexHtml2));
  check('no user-facing page cites ICRP 119 Annex F for the discharge levels',
    ![indexHtml2, decayHtml, effluentHtml, aboutHtml].some(t => /ICRP 119 Annex F/.test(t)));

  console.log();

  console.log('Test 13: caregiver page (port of Dosis_acompanantes_simple_v2.1.xlsx)');
  const caregiverJs = read('js/caregiver.js');
  const cgData = JSON.parse(read('data/caregiver.json'));
  const cgCtx = vm.createContext({ console });
  vm.runInContext(read('data/caregiver-data.js') + ';this.__CD = CAREGIVER_DATA;', cgCtx);
  check('caregiver-data.js is the exact twin of caregiver.json',
    JSON.stringify(cgCtx.__CD) === JSON.stringify(cgData));
  vm.runInContext(caregiverJs + ';this.__CG = CAREGIVER;', cgCtx);
  const CG = cgCtx.__CG;
  CG.setData(cgData);
  const relEq = (a, b, tol = 1e-9) => Number.isFinite(a) && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
  const base = CG.defaultInput();
  const o = CG.evaluate(base);
  // Values of the workbook's preloaded case (sheet Dosis D5–D41, as calculated by Excel)
  check('default case reproduces the workbook: dose per cycle and per treatment, margin',
    relEq(o.perCycle_mSv, 0.488270752476576) && relEq(o.treatment_mSv, 2.92962451485945) &&
    relEq(o.margin_mSv, 0.0703754851405458) && o.status === 'Within the applied criterion' && o.warnings.length === 0,
    `${o.perCycle_mSv} / ${o.treatment_mSv} / ${o.status}`);
  check('default case reproduces the workbook: fr, fn, rows and maximum hours',
    relEq(o.fr, 0.25) && relEq(o.fn, 2.33333333333333) && o.maxHours === 14 &&
    relEq(o.rows.day.dose_mSv, 0.149654748272833) && relEq(o.rows.sleep.dose_mSv, 0.338616004203743) &&
    relEq(o.kinetics.Iinf, 0.000598618993091333) && relEq(o.kinetics.Itail, 0.000409564254266483));
  check('default case reproduces the workbook: inverse calculations',
    relEq(o.inverse.maxRate_uSv_h, 15.3603302306333) && relEq(o.inverse.floor_mSv, 0.897928489636999) &&
    relEq(o.inverse.minRestriction_d, 2.91709788110968) && o.inverse.adopted_d === 3 &&
    relEq(o.inverse.doseAtAdopted_mSv, 2.92962451485945) &&
    o.inverse.adoptedNote === 'The cohabitation table covers the adopted restriction');
  const curveRef = { 0: 8.38066590327866, 1: 5.51785451986307, 2: 3.96163300418015, 5: 1.79140356086076,
    10: 1.01251716839319, 20: 0.899813267863821, 30: 0.897959490858087, 60: 0.897928489774953 };
  const cv = CG.curve(base).points;
  check('curve reproduces sheet Curva (29 points, sampled values)',
    cv.length === 29 && Object.entries(curveRef).every(([d, v]) => relEq(cv.find(p => p.days === Number(d)).dose_mSv, v)));
  const sc = CG.selfCheck(base);
  check('self-check: independent formulation and the 9 workbook v6 reference cases pass',
    sc.ok && sc.items.filter(i => i.reference).length === 9);
  const mod = f => { const x = CG.defaultInput(); f(x); return CG.evaluate(x); };
  check('discharge after the fast phase: slow half-life only, fast half-life not required, warning shown',
    (() => { const r = mod(x => { x.discharge_h = 24; x.rate_1m_uSv_h = 7; x.T_fast_h = null; });
      return r.ready && relEq(r.treatment_mSv, 2.10449073719245) && r.warnings.some(w => /slow phase/.test(w)); })());
  check('validation messages: fast > slow half-life, hours over 24, distance without factor, missing criterion',
    /0 < T fast ≤ T slow/.test(mod(x => { x.T_fast_h = 50; }).status) &&
    /exceeds 24 hours/.test(mod(x => { x.rows.day.h_after = 20; }).status) &&
    /distance without a valid factor/.test(mod(x => { x.rows.day.d_during = 0.25; }).status) &&
    /positive dose criterion is missing/.test(mod(x => { x.category = 'other'; }).status));
  check('inverse branches: unattainable, not dependent on the restriction, restriction does not reduce the dose',
    mod(x => { x.rows.day.d_during = 0.1; }).inverse.minRestrictionCode === 'unattainable_reduce' &&
    mod(x => { x.rows.sleep.h_after = 0; x.rows.sleep.d_after = null; }).inverse.minRestrictionCode === 'not_dependent' &&
    // fr > fn (more contact during than after): 0 d if that meets the criterion, else "restriction increases"
    mod(x => { x.rows.day.d_during = 0.5; x.rows.sleep.h_after = 0; }).inverse.minRestriction_d === 0 &&
    mod(x => { x.rows.day.d_during = 0.5; x.rows.sleep.h_after = 0; x.rate_1m_uSv_h = 300; }).inverse.minRestrictionCode === 'restriction_increases');
  check('profile warnings: DOTATATE profile on PSMA, Lu-177 profile on I-131; SmPC minimum raises the adopted restriction',
    mod(x => { x.profile = 'dotatate_measured'; }).warnings.some(w => /DOTATATE/.test(w)) &&
    mod(x => { x.radiopharmaceutical = 'I-131'; }).warnings.some(w => /Lu-177 profile/.test(w)) &&
    (() => { const r = mod(x => { x.spc_min_restriction_d = 7; }); return r.inverse.adopted_d === 7 && r.warnings.some(w => /SmPC/.test(w)) &&
      r.inverse.adoptedNote === 'The cohabitation table uses fewer days than the adopted restriction'; })());
  check('own measurements: factor = rate / rate at 1 m; repeated distances give no factor',
    (() => { const r = mod(x => { x.profile = 'own'; x.own_measurements[0] = { distance_m: 0.1, rate_uSv_h: 90 }; });
      const dup = mod(x => { x.profile = 'own'; x.own_measurements[0] = { distance_m: 0.1, rate_uSv_h: 90 }; x.own_measurements[1] = { distance_m: 0.1, rate_uSv_h: 80 }; });
      return r.ready && r.rows.sleep.fAfter === 6 && !dup.ready && /no factor|without a valid factor/.test(dup.status); })());
  check('caregiver module has no DOM access; page loads data before the module and uses its API',
    !/document\./.test(caregiverJs) &&
    caregiverHtml.indexOf('data/caregiver-data.js') < caregiverHtml.indexOf('js/caregiver.js') &&
    /CAREGIVER\.evaluate\(input, data\)/.test(caregiverHtml) && /CAREGIVER\.curve\(input, data\)/.test(caregiverHtml) &&
    /CAREGIVER\.selfCheck\(input, data\)/.test(caregiverHtml));
  check('service worker precaches the caregiver page, module and data; package allowlist includes them',
    ['./caregiver.html', './js/caregiver.js', './data/caregiver-data.js'].every(a => swJs.includes(`'${a}'`)) &&
    (hasTools
      ? /'caregiver\.html'/.test(buildPackageJs) && /'data\/caregiver\.json', 'data\/caregiver-data\.js'/.test(buildPackageJs)
      : ['caregiver.html', 'js/caregiver.js', 'data/caregiver.json', 'data/caregiver-data.js'].every(rel => fs.existsSync(path.join(ROOT, rel)))));
  check('every page links the caregiver page; criteria are not presented as regulatory values',
    [indexHtml, decayHtml, doseHtml, effluentHtml, aboutHtml].every(html =>
      /<nav class="site-nav"[\s\S]*?href="caregiver\.html"[\s\S]*?<\/nav>/.test(html)) &&
    /href="caregiver\.html" class="active"/.test(caregiverHtml) &&
    /not values fixed by regulation for this treatment/.test(caregiverHtml) && /not values fixed by regulation/.test(cgData.criteria_note));
  check('review fix 1: no inverse result or curve when the common restriction would exceed 24 h/d',
    (() => { const x = CG.defaultInput(); x.rate_1m_uSv_h = 10;
      x.rows.day = { days: 0, h_during: 20, d_during: 1, h_after: 0, d_after: null };
      x.rows.sleep = { days: 3, h_during: 8, d_during: 1, h_after: 8, d_after: 0.1 };
      const r = CG.evaluate(x);
      return r.ready && r.inverse.minRestrictionCode === 'infeasible_common' && r.inverse.adopted_d === null &&
        r.inverse.floor_mSv === null && Number.isFinite(r.inverse.maxRate_uSv_h) && CG.curve(x).points.length === 0; })());
  check('review fix 2: a negative product-information minimum is rejected',
    /Invalid minimum restriction/.test(mod(x => { x.rows.sleep.h_after = 0; x.spc_min_restriction_d = -3; }).status) &&
    mod(x => { x.rows.sleep.h_after = 0; x.spc_min_restriction_d = -3; }).inverse.adopted_d === null);
  check('review fix 3: rejected inputs give no curve and a self-check that is not OK',
    (() => { const x = CG.defaultInput(); x.rows.day.h_after = 20; const s = CG.selfCheck(x);
      return CG.curve(x).points.length === 0 && s.ok === false && s.currentOk === null && s.referencesOk === true; })());
  check('review fix 4: the caregiver CSV carries warnings, adopted note and self-check state',
    /'Status', 'Warnings', 'Adopted_restriction_note', 'Self_check'/.test(caregiverHtml) && /out\.warnings\.join\(' \| '\)/.test(caregiverHtml));
  check('kinetics presets: every preset is complete, its profile exists and it gives a ready result with the default case',
    cgData.kinetic_presets.length === 7 && cgData.kinetic_presets.every(p => {
      const x = CG.defaultInput();
      for (const f of ['radiopharmaceutical', 'fast_end_h', 'T_fast_h', 'T_slow_h', 'cycles', 'profile']) x[f] = p[f];
      x.rows.day.d_during = x.rows.day.d_after = 1;
      const r = CG.evaluate(x);
      return cgData.profiles[p.profile] && r.ready && r.warnings.length === 0 && p.source.length > 40; }));
  check('the default preset is the workbook kinetics (default case unchanged)',
    (() => { const p = cgData.kinetic_presets.find(q => q.key === cgData.defaults.preset);
      return ['radiopharmaceutical', 'fast_end_h', 'T_fast_h', 'T_slow_h', 'cycles', 'profile'].every(f => p[f] === cgData.defaults[f]); })());
  // Foro CSN-SEPR-SEFM (2011) Tables 3.B 3 (ablation, Tef 3 d) and 3.B 4 (metastases, 5 d), partner < 60 years:
  // RD 2 mSv; normal 6 h at 1 m + 8 h at 0.1 m (= 0.4 m); restriction: sleeping apart. Its «Tef» is 1/λ,
  // so the presets store Tef·ln 2 as half-life; restriction days rounded to the nearest day as printed.
  const foro = { i131_ablation: [0, 0, 1, 2, 3, 3, 4, 5], i131_metastases: [0, 2, 4, 6, 8, 10, 11, 13] };
  check('I-131 presets reproduce the Foro restriction tables (partner < 60 years), confirming Tef = mean life',
    Object.entries(foro).every(([key, days]) => {
      const p = cgData.kinetic_presets.find(q => q.key === key);
      return [5, 10, 15, 20, 25, 30, 35, 40].every((rate, i) => {
        const x = CG.defaultInput();
        Object.assign(x, { rate_1m_uSv_h: rate, fast_end_h: 0, T_fast_h: null, T_slow_h: p.T_slow_h, cycles: 1,
          profile: 'i131_approx', radiopharmaceutical: 'I-131', category: 'other', manual_criterion_mSv: 2 });
        const inv = CG.evaluate(x).inverse;
        return Math.round(inv.minRestriction_d) === days[i];
      });
    }));
  check('caregiver page applies presets to the kinetics fields only and switches to Custom on manual edits',
    /const PRESET_FIELDS = \['radiopharmaceutical', 'fast_end_h', 'T_fast_h', 'T_slow_h', 'cycles', 'profile'\]/.test(caregiverHtml) &&
    /\$\('preset'\)\.value = match \? match\.key : 'custom'/.test(caregiverHtml));
  check('caregiver chart follows the live theme; report and CSV are self-describing',
    /addEventListener\('nm-theme-change', applyCurveChartTheme\)/.test(caregiverHtml) &&
    /'App_version', 'App_build', 'Caregiver_data_version', 'Exported_UTC'/.test(caregiverHtml) &&
    /omitCommonSources: true/.test(caregiverHtml) && /spec\.omitCommonSources/.test(reportJs));

  console.log();

  console.log('Test 14: audit 2026-10-14 regressions (N-01, N-02, N-03, N-06, N-07, N-08, N-09)');
  // N-01: Decay chart on a LINEAR time axis with {x, y} points. A category axis
  // with `max` in time units is read as an index by Chart.js (Lu-177 cut at 7.1 of 33 d).
  check('N-01: decay chart uses a linear time axis with {x, y} data, no category labels',
    /x: \{\s*type: 'linear',\s*min: 0,\s*max: tMax_h \* unitFactor/.test(decayHtml) &&
    /vals = pts\.map\(\(p, i\) => \(\{ x: xs\[i\], y: valueAt\(p\.A\) \}\)\)/.test(decayHtml) &&
    !/data: \{\s*labels,/.test(decayHtml) && !/closestIdx/.test(decayHtml));
  check('N-01: elapsed-time and Table A1 marks sit at their exact time',
    /const orangeLineData = \[\{ x: t_h \* unitFactor, y: valueAt\(CALC\.activityAtTime\(A0_MBq, T_half_h, t_h\)\) \}\]/.test(decayHtml) &&
    /data: \[\{ x: t_cross_h \* unitFactor, y: clearLevel \}\]/.test(decayHtml));
  // N-08: Dose mark at the exact requested distance, grid extended past 5 m when needed
  check('N-08: dose chart uses a linear distance axis and marks the exact distance',
    /x: \{\s*type: 'linear',\s*min: 0\.10,\s*max: dMax/.test(doseHtml) &&
    /const dMax = Math\.max\(5, d_m \* 1\.2\)/.test(doseHtml) &&
    /const orangeMarkWB = d_m >= 0\.10 \? \[\{ x: d_m, y: rateWB\(d_m\) \}\] : \[\]/.test(doseHtml) &&
    !/closestDistIdx/.test(doseHtml));

  // N-02: beta endpoint = last row of each BET block (N = 0), plus beta yield per decay
  const idx107 = JSON.parse(read('data/icrp107-index.json'));
  const i107 = new Map(idx107.nuclides.map(n => [n.id, n]));
  // Endpoints read from the last row of the ICRP-07.BET blocks (checked by hand)
  const BET_ENDPOINTS = { 'Lu-177': 0.4978, 'K-42': 3.52545, 'Tc-99m': 0.43618, 'Y-90': 2.2801, 'Co-60': 1.49139, 'O-15': 1.732 };
  check('N-02: ICRP 107 index stores the BET endpoint, not the previous grid node',
    Object.entries(BET_ENDPOINTS).every(([id, e]) => i107.get(id) && i107.get(id).e_max_beta_MeV === e));
  check('N-02: beta yield per decay = integral of the BET spectrum (Lu-177 ≈ 1, Tc-99m minor branch 3.7e-5, Ga-68 0.89)',
    Math.abs(i107.get('Lu-177').beta_yield_per_decay - 1) < 0.01 &&
    Math.abs(i107.get('Tc-99m').beta_yield_per_decay - 3.705e-5) < 1e-7 &&
    Math.abs(i107.get('Ga-68').beta_yield_per_decay - 0.8901) < 1e-3);
  const curated = JSON.parse(read('data/nuclides.json')).nuclides;
  check('N-02: curated beta endpoints and yields are in sync with the index; chains flagged',
    curated.filter(n => !n.e_max_beta_chain && n.e_max_beta_MeV != null).every(n =>
      i107.get(n.id) && n.e_max_beta_MeV === i107.get(n.id).e_max_beta_MeV && n.beta_yield_per_decay === i107.get(n.id).beta_yield_per_decay) &&
    ['Ra-223', 'Ac-225'].every(id => { const n = curated.find(x => x.id === id); return n.e_max_beta_chain === true && Math.abs(n.beta_yield_per_decay - 2) < 0.01; }) &&
    curated.find(n => n.id === 'Y-90').e_max_beta_MeV === 2.2801);
  check('N-02: Properties labels the value as the highest endpoint and flags minor branches and chain progeny',
    /function betaEnergyItem\(n\)/.test(indexHtml) && /MeV — highest endpoint over all β branches/.test(indexHtml) &&
    /minor β branch/.test(indexHtml) && /from progeny in the decay chain/.test(indexHtml) &&
    !/Endpoint energy \(MeV\)/.test(indexHtml));

  // N-07: a 0-day solution never uses the "during" hours and must not be rejected
  check('N-07: caregiver keeps the 0-day solution when the common "during" schedule exceeds 24 h/d',
    (() => {
      const x = CG.defaultInput(); x.rate_1m_uSv_h = 2;
      x.rows.day = { days: 0, h_during: 20, d_during: 1, h_after: 0, d_after: null };
      x.rows.sleep = { days: 3, h_during: 8, d_during: 1, h_after: 8, d_after: 0.1 };
      const r = CG.evaluate(x);
      return r.inverse.adopted_d === 0 && r.inverse.minRestriction_d === 0 && r.inverse.minRestrictionCode === null &&
        r.inverse.floor_mSv === null && Math.abs(r.inverse.doseAtAdopted_mSv - 0.997698321818888) < 1e-9;
    })());

  // N-03: every curated half-life names its source and matches it
  const ddepRef = { 'Lu-177': 6.6443 * 86400, 'Y-90': 2.6684 * 86400, 'O-15': 122.266, 'Mo-99+Tc-99m': 2.7479 * 86400, 'Tc-99m': 6.0067 * 3600, 'I-131': 8.0233 * 86400 };
  check('N-03: every curated half-life has a half_life_source (ICRP 107 or DDEP)',
    curated.every(n => /^(ICRP Publication 107 \(2008\)|DDEP — LNHB\/CEA Table de Radionucléides)/.test(n.half_life_source || '')));
  check('N-03: values attributed to ICRP 107 match the index within 0.015 %',
    curated.filter(n => n.half_life_source === 'ICRP Publication 107 (2008)').every(n => {
      const t = i107.get(n.id === 'Mo-99+Tc-99m' ? 'Mo-99' : n.id).half_life_s; return Math.abs(n.half_life_s / t - 1) <= 1.5e-4; }));
  check('N-03: replaced values equal the DDEP recommended value (Lu-177 6.6443 d, Y-90 2.6684 d, O-15 122.266 s, Mo-99 2.7479 d); K-42 = ICRP 107',
    Object.entries(ddepRef).every(([id, t]) => Math.abs(curated.find(n => n.id === id).half_life_s / t - 1) <= 1.5e-4) &&
    curated.find(n => n.id === 'K-42').half_life_s === i107.get('K-42').half_life_s &&
    curated.find(n => n.id === 'Y-90').half_life_display === '64.04 h');
  check('N-03: reports and Properties show the half-life source',
    /function halfLifeSource\(n\)/.test(reportJs) && /<td>Half-life source<\/td><td>\$\{esc\(halfLifeSource\(n\)\)\}/.test(reportJs) &&
    /n\.half_life_source\.startsWith\('DDEP'\)/.test(indexHtml) && !/no per-nuclide half-life reference/.test(reportJs));

  // N-06: presentation
  check('N-06: Properties modality tags use the filter labels (Therapy, Other…)',
    /label = \{ PET:'PET', SPECT:'SPECT', therapy:'Therapy', brachytherapy:'Brachytherapy', other:'Other' \}/.test(indexHtml));
  check('N-06: caregiver shows 3 significant figures; the CSV keeps 6',
    /v\.toPrecision\(3\)\)\) : '—'\);/.test(caregiverHtml) && /toPrecision\(6\)/.test(caregiverHtml));
  check('N-06: effluent tables put E (mSv/y) right after the nuclide',
    (effluentHtml.match(/<th>Nuclide<\/th>\s*<th class="text-right">E \(mSv\/y\)<\/th>/g) || []).length === 2);
  check('N-06: decay concentration chart uses a logarithmic y axis',
    /y: showConcentration \? \{\s*type: 'logarithmic'/.test(decayHtml));

  // N-09: every page registers the service worker
  check('N-09: every page registers the service worker (direct entry also installs the offline cache)',
    [indexHtml, decayHtml, doseHtml, effluentHtml, caregiverHtml, aboutHtml].every(h =>
      /navigator\.serviceWorker\.register\('sw\.js'\)/.test(h)));

  console.log();

  console.log('Test 15: photon-spectrum chart in the Properties detail panel');
  const indexHtml15 = read('index.html');
  check('Properties loads the local Chart.js and has one spectrum renderer for curated and extended entries',
    /<script src="js\/chart\.umd\.min\.js"><\/script>/.test(indexHtml15) &&
    (indexHtml15.match(/function renderSpectrum\(/g) || []).length === 1 &&
    (indexHtml15.match(/<tbody>\$\{rows\}<\/tbody>/g) || []).length === 1 &&
    !/Photon spectrum \(filtered\)/.test(indexHtml15) &&
    /renderSpectrum\(n\.photons, \{ id: n\.id \}\)/.test(indexHtml15) &&
    /renderSpectrum\(icrpNuclide\.photons, \{ id: n\.id, chain: !!n\.chain_members \}\)/.test(indexHtml15));
  check('spectrum chart: linear energy axis, logarithmic y axis, bars as {x, y} points',
    /type: 'linear', min: 0, grace: '3%'/.test(indexHtml15) && /type: 'logarithmic', min: yMin, max: yMax/.test(indexHtml15) &&
    /type: 'bar'/.test(indexHtml15) && /x: c\.energy_keV,/.test(indexHtml15));
  check('dose-share view uses the Γ calculation itself (PHYSICS.calcGammaConstants) and states the chain caveat',
    /const calc = PHYSICS\.calcGammaConstants\(photons\)/.test(indexHtml15) &&
    /100 \* c\.contrib_H10 \/ calc\.gammaH10/.test(indexHtml15) &&
    /Share of the parent's lines only; the stored Γ includes the progeny/.test(indexHtml15));
  check('spectrum colours come from theme tokens (light and dark) and follow the live theme',
    /--spectrum-g:\s*#2e8b57/.test(styleCss) && /--spectrum-g:\s*#3fa874/.test(styleCss) &&
    /spectrum: \{ G: token\('--spectrum-g'\)/.test(uiJs) &&
    /addEventListener\('nm-theme-change', drawSpectrum\)/.test(indexHtml15));

  console.log();
  console.log('Test 16: review of v1.11.0 (2026-10-14) — R-01..R-11');
  const pctx = vm.createContext({ console, ICRP107_DATA: require(path.join(ROOT, 'data/icrp107-index.json')) });
  for (const f of ['js/nuclide-id.js', 'js/data.js', 'js/icrp107-loader.js']) {
    vm.runInContext(read(f).replace(/^const (PHYSICS|ICRP107|NUCLIDE_ID) =/m, 'var $1 ='), pctx);
  }
  await vm.runInContext('ICRP107._ensureLoaded()', pctx);
  const I = vm.runInContext('ICRP107', pctx);
  const g10 = (id, progeny) => { const c = I.calcConstants(id, { progeny }); return c ? c.gammaH10 : null; };
  const modesOf = id => (I.get(id).decay_modes || []).map(d => d.daughter);
  check('R-01: the ICRP 107 index keeps metastable daughters (Mo-99 → Tc-99m, Cs-137 → Ba-137m, Sn-113 → In-113m)',
    modesOf('Mo-99').includes('Tc-99m') && modesOf('Cs-137').includes('Ba-137m') && modesOf('Sn-113').includes('In-113m') &&
    // tools/ is not shipped in the distribution package: check the parser only in the repository
    (!fs.existsSync(path.join(ROOT, 'tools/parse-icrp107.js')) ||
      /dName\.match\(\/\^\[A-Z\]\[a-z\]\?-\\d\+\[mn\]\?\$\/\)/.test(read('tools/parse-icrp107.js'))));
  const tc = I.progeny('Mo-99').find(m => m.id === 'Tc-99m');
  check('R-01: equilibrium activity ratio is the Bateman one (Mo-99 → Tc-99m 0.965, as the curated entry)',
    tc && Math.abs(tc.fraction - 0.9654) < 5e-4);
  check('R-01: Γ with progeny — Ge-68 158 (Ga-68), Sn-113 70.1 (×3.5 the parent), Mo-99 44.9 = curated Mo-99+Tc-99m within 0.5 %',
    g10('Ge-68', false) === null && Math.abs(g10('Ge-68', true) - 157.9) < 0.2 &&
    Math.abs(g10('Sn-113', true) / g10('Sn-113', false) - 3.49) < 0.02 &&
    Math.abs(g10('Mo-99', true) / 45 - 1) < 0.005);
  check('R-01: progeny limited to T½ ≤ parent/10 and ≤ 30 d (Th-230 does not take in Ra-226; Ra-226 stops before Pb-210)',
    I.progeny('Th-230').length === 0 && I.progeny('Ra-226').some(m => m.id === 'Bi-214') && !I.progeny('Ra-226').some(m => m.id === 'Pb-210'));
  check('R-01: Dose offers include/parent-only, defaults to include and labels the result; Properties shows both Γ',
    /id="progenyMode"[\s\S]{0,200}<option value="include" selected>/.test(doseHtml) &&
    /ICRP107\.calcConstants\(id, \{ progeny: withProgeny \}\)/.test(doseHtml) && /progenyTag/.test(doseHtml) &&
    /with progeny in equilibrium · parent only:/.test(indexHtml15) && /Short-lived progeny/.test(indexHtml15));
  check('R-02: Effluent total boxes turn warning/danger above 50 %/100 % of the criterion',
    /res\.fraction_of_criterion > 1 \? 'result-box danger'/.test(effluentHtml) && /id="s2Box"/.test(effluentHtml));
  const nuc = require(path.join(ROOT, 'data/nuclides.json')).nuclides;
  const byId = id => nuc.find(n => n.id === id);
  check("R-03: H'(0.07) of Cs-137 and Mo-99+Tc-99m is calculated (92.27, 44.15) and sourced, not a copy of H*(10)",
    byId('Cs-137').gamma_H007 === 92.27 && byId('Mo-99+Tc-99m').gamma_H007 === 44.15 &&
    /publish no H'\(0\.07\)/.test(byId('Cs-137').gamma_H007_source) && /K-air, H\*: Cornejo \(2015\); H′:/.test(indexHtml15));
  check('R-03b: Pd-103 includes Rh-103m in equilibrium (Γ 22.7 / 38.09, Cornejo 23.1 / 38.0)',
    byId('Pd-103').gamma_H10 === 22.7 && byId('Pd-103').gamma_H007 === 38.09 &&
    byId('Pd-103').chain_members.some(m => m.id === 'Rh-103m'));
  check('R-04: Ga-68 K-air has a calculation record', /^Calculated by this project/.test(byId('Ga-68').gamma_Kair_source));
  check('R-05: every curated half-life equals its source value (C-11 1221.66 s, Se-75 and Cs-137 = ICRP 107)',
    byId('C-11').half_life_s === 1221.66 &&
    ['Se-75', 'Cs-137'].every(id => Math.abs(byId(id).half_life_s / I.get(id).half_life_s - 1) < 1e-9));
  check('R-06: significant-figure formatter, Chart.js locale fixed, no raw Γ floats or 17-digit distances',
    /function fmtSig\(val, sig = 3\)/.test(read('js/utils.js')) && /Chart\.defaults\.locale = 'en-US'/.test(uiJs) &&
    /gamma_H10: sig4\(constants\.gammaH10\)/.test(doseHtml) && /d = \$\{UTILS\.num\(Number\(d_m\.toPrecision\(4\)\)\)\} m/.test(doseHtml) &&
    !/v\.toExponential\(2\)/.test(read('decay.html')));
  check('R-07: curated decay modes use β-/β+/α/EC notation, not ICRP codes',
    nuc.every(n => (n.decay_modes || []).every(m => !['B-', 'B+', 'A', 'ECB+'].includes(m.mode))));
  check('R-08/R-11: no duplicated t = 0 line in Decay; short-distance warning in the Dose result',
    /\$\{t_h > 0 \? `<br>t = \$\{UTILS\.fmt\(t_h\)\} h: \$\{status\(At_Bq/.test(read('decay.html')) &&
    /const distWarning = d_m < 0\.25/.test(doseHtml));
  check('v1.12.2: Effluent and Caregiver Method collapsible (details > summary.card-title), visible marker, links open them',
    /<details id="methodDetails">\s*<summary class="card-title"><span class="ico ico-book" aria-hidden="true"><\/span> Method/.test(effluentHtml) &&
    /<details id="methodDetails">\s*<summary class="card-title"><span class="ico ico-book" aria-hidden="true"><\/span> Method/.test(caregiverHtml) &&
    /summary\.card-title::before \{\s*content: '▶'/.test(styleCss) &&
    /data-open-details="methodDetails criteriaDetails"/.test(caregiverHtml) && /a\[data-open-details\]/.test(uiJs));

  console.log();
  console.log('Test 17: distribution audit of v1.12.2 (2026-10-15) — F-01..F-08');
  {
    const uctx = vm.createContext({ document: { createElement: () => ({}) } });
    vm.runInContext(read('js/utils.js').replace('const UTILS', 'var UTILS'), uctx);
    const U = vm.runInContext('UTILS', uctx);
    check('F-03: CSV guard keeps negative numbers numeric and still neutralises formulas',
      U.csvSafe('-2.85925') === '-2.85925' && U.csvSafe('-1e-5') === '-1e-5' && U.csvSafe('=1+1') === "'=1+1" &&
      U.csvSafe('-cmd') === "'-cmd" && U.csvSafe('\t1') === "'\t1" &&
      ['caregiver.html', 'decay.html', 'dose.html', 'effluent.html', 'index.html'].every(f => /const safe = UTILS\.csvSafe\(str\);/.test(read(f)) && !/const safe = \/\^\[=/.test(read(f))));
    check('F-02: Dose report and CSV state the progeny; Cornejo only for curated entries; report header for extended entries',
      /\['Progeny in the constants', progenyText\(r\.n\)\]/.test(doseHtml) && /'Note', 'Progeny'\]/.test(doseHtml) &&
      /if \(!r\.n\._icrp107\) sources\.push\('Cornejo/.test(doseHtml) && /ICRP 107 extended index \(the curated nuclides\.json/.test(reportJs));
    check('F-04: notices and About list DDEP and Cornejo et al. (2015); LICENSING names them',
      [read('THIRD_PARTY_NOTICES.md'), read('about.html')].every(t => /DDEP \(LNHB\/CEA\) — recommended half-lives/.test(t) && /Cornejo et al\. \(2015\) — published dose-rate constants/.test(t)) &&
      /DDEP \(LNHB\/CEA\), Cornejo et al\. \(2015\)/.test(read('LICENSING.md')));
    check('F-05/F-06/F-07/F-08: IS-28 correction cited; stacked cohabitation table; references ignored; JSON precached',
      /corrected by the CSN Resolution of 11 November 2010/.test(read('docs/USER_GUIDE.md')) &&
      /class="data-table stack-on-mobile" id="rowsTable"/.test(caregiverHtml) && /\.stack-on-mobile td\[data-label\]::before/.test(styleCss) &&
      // .gitignore and tools/ do not ship in the distribution package: checked in the repository only
      (!fs.existsSync(path.join(ROOT, '.gitignore')) || (/references\/Demir\*\.pdf/.test(read('.gitignore')) && /references\/Dosis_acompanantes\*\.xlsx/.test(read('.gitignore')))) &&
      /'\.\/data\/nuclides\.json',\s*'\.\/data\/regulatory\.json',\s*'\.\/data\/caregiver\.json',\s*'\.\/data\/effluent-scenarios\.json',/.test(swJs));
    const nucs = JSON.parse(read('data/nuclides.json'));
    const pd = nucs.nuclides.find(n => n.id === 'Pd-103');
    check('F-01: database v1.4 with content hash; Pd-103 shielding spectrum built with its chain_members ratio',
      nucs.version === '1.4' && /^[0-9a-f]{64}$/.test(nucs.notes.content_sha256) &&
      (!fs.existsSync(path.join(ROOT, 'tools/add-shielding-spectra.js')) || /Array\.isArray\(n\.chain_members\) && n\.chain_members\.length/.test(read('tools/add-shielding-spectra.js'))) &&
      pd.shielding_spectrum.length === 16);
  }

  console.log();
  console.log('Test 18: Caregiver inverse in the three regimes fr < fn, fr = fn, fr > fn (second opinion 2026-10-15)');
  {
    const cg = (crit, during, after, extra = () => {}) => {
      const x = CG.defaultInput(); x.category = 'other'; x.manual_criterion_mSv = crit;
      x.rows = { day: { days: 0, h_during: during, d_during: 1, h_after: after, d_after: 1 }, sleep: { days: 0, h_during: 0, d_during: null, h_after: 0, d_after: null } };
      extra(x); return CG.evaluate(x);
    };
    // the reviewer's case: 12 h/d during, 1 h/d after, 6 cycles, 15 µSv/h
    const a = cg(0.3, 12, 1);
    check('fr > fn, criterion above the 0-day dose: minimum and adopted restriction 0 d, value named an upper asymptote, warning',
      relEq(a.treatment_mSv, a.inverse.doseAtAdopted_mSv) && a.inverse.minRestriction_d === 0 && a.inverse.adopted_d === 0 &&
      a.inverse.indefiniteKind === 'ceiling' && a.inverse.floor_mSv > a.treatment_mSv && a.warnings.some(w => /restricting increases the dose/.test(w)));
    const b = cg(0.1, 12, 1);
    check('fr > fn, criterion below the 0-day dose: "restriction increases" (no days proposed), dose unchanged',
      b.inverse.minRestrictionCode === 'restriction_increases' && b.inverse.minRestriction_d === null && b.inverse.adopted_d === null &&
      relEq(b.treatment_mSv, a.treatment_mSv) && /any restriction increases the dose/.test(CG.INVERSE_TEXT.restriction_increases));
    const c = cg(0.3, 12, 1, x => { x.spc_min_restriction_d = 7; });
    check('fr > fn with a product-information minimum: adopted 7 d and the note says the dose then EXCEEDS the criterion',
      c.inverse.adopted_d === 7 && c.inverse.doseAtAdopted_mSv > 0.3 && /EXCEEDS the criterion/.test(c.inverse.adoptedNote));
    const d = cg(1, 6, 6), e = cg(1, 1, 12);
    check('fr = fn: not dependent on the restriction; fr < fn: value is a floor and a positive restriction is found',
      d.inverse.indefiniteKind === 'equal' && d.inverse.minRestrictionCode === 'not_dependent' &&
      e.inverse.indefiniteKind === 'floor' && e.inverse.minRestriction_d > 0 && e.inverse.floor_mSv < e.treatment_mSv);
    check('fr > fn: the curve rises with the restriction towards the asymptote',
      (() => { const x = CG.defaultInput(); x.category = 'other'; x.manual_criterion_mSv = 0.3;
        x.rows = { day: { days: 0, h_during: 12, d_during: 1, h_after: 1, d_after: 1 }, sleep: { days: 0, h_during: 0, d_during: null, h_after: 0, d_after: null } };
        const p = CG.curve(x).points; return p.length > 2 && p.every((q, i) => i === 0 || q.dose_mSv >= p[i - 1].dose_mSv) && p[p.length - 1].dose_mSv <= a.inverse.floor_mSv * (1 + 1e-9); })());
    check('CSV of Dose and Decay name the ICRP 107 index for an extended nuclide (finding 4)',
      /n\._icrp107 \? `\$\{ICRP107\.identity\(\)\}; curated nuclides\.json v/.test(doseHtml) &&
      /n\._icrp107 && typeof ICRP107 !== 'undefined' \? `\$\{ICRP107\.identity\(\)\}/.test(read('decay.html')) &&
      /function identity\(\)/.test(read('js/icrp107-loader.js')));
    check('service worker installs from the network, not the HTTP cache (an update kept the old files)',
      /cache\.addAll\(ASSETS\.map\(\(url\) => new Request\(url, \{ cache: 'reload' \}\)\)\)/.test(swJs));
    check('page labels follow the regime (table, chart legend, report, CSV)',
      /\$\('floorLabel'\)\.textContent = indefText\(inv\)/.test(caregiverHtml) && /Upper asymptote — indefinite restriction/.test(caregiverHtml) &&
      /\[indefText\(inv\), `\$\{f3\(inv\.floor_mSv\)\} mSv`\]/.test(caregiverHtml) && /add\('inverse', indefText\(inv\)/.test(caregiverHtml));
  }

  console.log();
  console.log('Test 19: presentation review 2026-10-15 (Properties table and notes, Caregiver chart)');
  check('Properties: «Γ source» column min-width; β Emax note starts with MeV; clearance and Table B notes separated with their not-tabulated routes',
    /#nuclideTable td:last-child \{\s*min-width: 16rem;/.test(styleCss) && /'MeV — highest endpoint over all β branches, ICRP 107'/.test(indexHtml) &&
    /<strong>Clearance — Table A1<\/strong>[\s\S]*Annex III\.1\.b[\s\S]*<strong>Exemption of moderate quantities — Table B<\/strong>[\s\S]*Annex II A\.3\.a/.test(indexHtml));
  check('Caregiver chart: table case marked (point on the curve or horizontal line), validated hues, indefinite line above the curve, legend in dataset order',
    /This table — \$\{UTILS\.num\(dDay\)\} d → /.test(caregiverHtml) && /This table \(restrictions/.test(caregiverHtml) &&
    /_themeRole: 'indef', borderColor: theme\.spectrum\.X/.test(caregiverHtml) && /order: 2 \}\);/.test(caregiverHtml) &&
    /sort: \(a, b\) => a\.datasetIndex - b\.datasetIndex/.test(caregiverHtml) && /surface: token\('--white'\)/.test(uiJs));

  console.log();
  console.log('Test 20: usability and presentation review 2026-10-15 (v1.14.0)');
  {
    const pages = { index: indexHtml, decay: decayHtml, dose: doseHtml, effluent: effluentHtml, caregiver: caregiverHtml, about: aboutHtml };
    check('property-card labels are not upper-cased (β Emax read "B EMAX", μ read "Μ", keV read "KEV")',
      !/text-transform:\s*uppercase/.test(styleCss));
    check('Dose report contains the indicative limit screening it announces (none for Y-90) and prints the distance once in metres',
      /\.\.\.\(r\.isY90 \? \[\] : \[limitScreeningSection\(r\)\]\)/.test(doseHtml) &&
      /function limitScreeningSection\(r\)[\s\S]{0,900}of 20 mSv\/y \(exposed workers\)[\s\S]{0,900}of 500 mSv\/y/.test(doseHtml) &&
      /r\.distUnit === 'm' \? `\$\{UTILS\.num\(r\.distRaw\)\} m`/.test(doseHtml));
    check('no modal dialogs in the calculators: errors go to the page box with the field marked',
      ['decay', 'dose', 'effluent', 'caregiver'].every(k => !/\balert\(|\bconfirm\(/.test(noComments(pages[k])) && /id="calcError"/.test(pages[k])) &&
      /inputErr\.show\(err\.message, err\.field\)/.test(effluentHtml) && /inputErr\.show\(err\.message, err\.field\)/.test(caregiverHtml) &&
      /el\.setAttribute\('aria-invalid', 'true'\)/.test(uiJs) && /\.form-input\.is-invalid/.test(styleCss));
    check('extended ICRP 107 entries keep a visible "NOT manually validated" warning in Decay and Dose (replaces the confirm dialog)',
      /n\._icrp107\s*\? '<div[^']*>&#9888; ICRP 107 extended entry: decay data have NOT been manually validated/.test(decayHtml) &&
      /n\._icrp107\s*\? '<div[^']*>&#9888; ICRP 107 extended entry: photon emissions and dose constants are computed automatically and have NOT been manually validated/.test(doseHtml));
    check('Decay without elapsed time or target date says the values are at t = 0 (screen and report)',
      /const timeGiven = elapsedManual \|\| !!\(refDt && targetDt\)/.test(decayHtml) && /id="noTimeNote"/.test(decayHtml) &&
      /r\.timeGiven === false \? 'none entered/.test(decayHtml));
    check('Properties: table grows on wide screens with the header under the site header; bounded provenance text; no nested scroll in the spectrum table',
      /@media \(min-width: 1240px\) \{\s*#nuclideTableWrap \{ overflow: visible; max-height: none; \}\s*#nuclideTable th \{ top: var\(--site-header-h\); \}/.test(styleCss) &&
      (indexHtml.match(/<div class="src-text">/g) || []).length === 4 &&
      /<details class="spectrum-lines mt-1"/.test(indexHtml) && !/max-height:200px/.test(indexHtml) &&
      /Number\(p\.energy_keV\)\.toFixed\(1\)/.test(indexHtml));
    check('main menu has a Guide entry on every page',
      Object.values(pages).every(h => /<nav class="site-nav"[\s\S]*?<a href="about\.html"( class="active")?>Guide<\/a>\s*<\/nav>/.test(h)));
    check('icons are own CSS-mask SVGs (no emoji in card titles, buttons or the theme toggle)',
      /\.ico \{[\s\S]*?mask: var\(--ico\)/.test(styleCss) && /\.ico-moon \{ --ico: url\("data:image\/svg\+xml,/.test(styleCss) &&
      Object.values(pages).every(h => !/<span id="darkIcon">/.test(h) && !/class="card-title">&#(9881|127959|8987|128202|128138|128679|127981|127968|128214);/.test(h) &&
        !/>(📄|⬇|↺|&#128196;|&#11123;) /.test(h)) && /icon\.className = 'ico ' \+ \(isDark \? 'ico-sun' : 'ico-moon'\)/.test(uiJs));
    check('theme follows prefers-color-scheme until the user chooses (stored choice wins)',
      /matchMedia\('\(prefers-color-scheme: dark\)'\)/.test(uiJs) && /if \(stored === '1' \|\| stored === '0'\) apply\(stored === '1'\);\s*else apply\(!!\(system && system\.matches\)\);/.test(uiJs));
    check('phones: header not sticky, logo and theme button on one row; Dose results stacked with inline values',
      /@media \(max-width: 700px\) \{\s*\.site-header \{ position: static; \}/.test(styleCss) &&
      /\.site-logo \{ order: 1; flex: 1 1 auto; \}/.test(styleCss) &&
      /class="data-table stack-on-mobile stack-inline" id="resultsTable"/.test(doseHtml) && /\.stack-on-mobile\.stack-inline td \{ display: block;/.test(styleCss));
  }

  console.log();
  console.log('Test 21: decimal point or comma (2026-10-15)');
  {
    const U = utilsCtx.__UTILS;
    const P = U.parseNumber;
    // A type="number" field read "0,3" as 3 in a browser set to English and
    // "1.000,5" as 1.0005, silently: input is now text read by parseNumber.
    check('parseNumber reads a point or a comma; empty → null',
      P('0.3') === 0.3 && P('0,3') === 0.3 && P(' 12 ') === 12 && P('.5') === 0.5 && P(',5') === 0.5 &&
      P('-1') === -1 && P('1e-7') === 1e-7 && P('1,2e3') === 1200 && P('1.') === 1 && P('') === null && P('   ') === null);
    check('parseNumber rejects grouping and trailing text (NaN), never guesses',
      ['1.000,5', '1,000.5', '1 000', '3 m', 'e3', '0x10', '1..2', '1,,2', '--1', 'Infinity'].every(t => Number.isNaN(P(t))));
    U.setDecimalMode('comma');
    const commaOut = [U.fmt(6.0067), U.fmt(0.123), U.fmt(15000), U.fmtSig(6, 3), U.fmtRatio(1.04), U.toSci(1.5e-7, 2), U.num(0.3), U.dec('6.64 d'), U.inputValue(0.45)];
    const pointInCsv = U.withPoint(() => [U.fmt(6.0067), U.fmtSig(6, 3), U.num(0.3), U.dec('6.64 d')]);
    const afterCsv = U.fmt(6.0067);
    U.setDecimalMode('point');
    check('comma mode: every formatter uses the comma (6,0 · 0,12 · 1,5×10⁴ · 6,00 · 1,04 · 1,50×10⁻⁷ · 0,3 · 6,64 d · 0,45)',
      JSON.stringify(commaOut) === JSON.stringify(['6,0', '0,12', '1,5×10⁴', '6,00', '1,04', '1,50×10⁻⁷', '0,3', '6,64 d', '0,45']), JSON.stringify(commaOut));
    check('withPoint forces the point (CSV) and restores the comma afterwards',
      JSON.stringify(pointInCsv) === JSON.stringify(['6.0', '6.00', '0.3', '6.64 d']) && afterCsv === '6,0');
    check('point mode unchanged (Node default)', U.fmt(6.0067) === '6.0' && U.fmtSig(6, 3) === '6.00');
    const calcPages = { decay: decayHtml, dose: doseHtml, effluent: effluentHtml, caregiver: caregiverHtml };
    check('no type="number" field left: numeric fields are text with a decimal keyboard (.num-input)',
      Object.values(calcPages).every(h => !/type="number"/.test(h) && /class="form-input num-input"/.test(h) && /inputmode="decimal"/.test(h)));
    check('no parseFloat/Number() on a form field: every numeric field goes through UTILS.parseNumber',
      // distOf reads <select> values, written by the app itself with a point
      Object.values(calcPages).map(h => h.replace(/const distOf = [^\n]*/, '')).every(h => !/parseFloat\((?:document\.getElementById\([^)]*\)|el|txInput|volInput)\.value\)/.test(h) && !/(?<!parse)Number\((?:vialWeightText|AtgtText)\)/.test(h)) &&
      /const readNum = el => UTILS\.parseNumber\(el\.value\);/.test(caregiverHtml) && /const v = UTILS\.parseNumber\(el\.value\);/.test(effluentHtml));
    check('every CSV export runs inside UTILS.withPoint (machine-readable point)',
      /getElementById\('btnExportCsv'\)\.addEventListener\('click', \(\) => UTILS\.withPoint\(/.test(indexHtml) &&
      /getElementById\('btnExportCsv'\)\.onclick = \(\) => UTILS\.withPoint\(/.test(decayHtml) &&
      /getElementById\('btnExportDoseCsv'\)\.onclick = \(\) => UTILS\.withPoint\(/.test(doseHtml) &&
      /getElementById\('btnCsv'\)\.addEventListener\('click', \(\) => UTILS\.withPoint\(/.test(effluentHtml) &&
      /\$\('btnCsv'\)\.addEventListener\('click', \(\) => UTILS\.withPoint\(/.test(caregiverHtml));
    const allPages = [indexHtml, decayHtml, doseHtml, effluentHtml, caregiverHtml, aboutHtml];
    check('header separator button on every page; default = stored choice, else the browser language; pages redraw on nm-decimal-change',
      allPages.every(h => /id="decimalToggle"/.test(h) && /UI\.initDecimal\(\);/.test(h)) &&
      /localStorage\.getItem\('nm_decimal'\)/.test(uiJs) && /new Intl\.NumberFormat\(\)\.format\(1\.5\)\.includes\(','\)/.test(uiJs) &&
      [indexHtml, decayHtml, doseHtml, effluentHtml, caregiverHtml].every(h => /addEventListener\('nm-decimal-change'/.test(h)));
    check('Chart.js default ticks follow the separator; "1.500" gets a note saying how it was read',
      /return typeof UTILS !== 'undefined' \? UTILS\.dec\(s\) : s;/.test(uiJs) && /function numberHint\(el\)/.test(uiJs) &&
      /Read as \$\{UTILS\.num\(v\)\} \(decimal separator\)/.test(uiJs));
  }

  console.log();
  console.log('Test 22: decimal review of v1.15.0 (D-01..D-03, material selector)');
  check('D-01: "Read as" notes refreshed after fields written by the page and after a separator switch',
    /function refreshNumberHints\(\)/.test(uiJs) && /o\.textContent = UTILS\.dec\(o\.dataset\.numLabel\);\s*\}\);\s*refreshNumberHints\(\);/.test(uiJs) &&
    [effluentHtml, caregiverHtml].every(h => /function render\(\) \{[\s\S]{0,300}UI\.refreshNumberHints\(\);/.test(h)));
  check('D-02: Dose range warnings also built with the point (withPoint) and the CSV validity uses that version',
    /shieldWarningsPoint = UTILS\.withPoint\(buildMsgs\)/.test(doseHtml) && /shieldWarningsPoint: shieldWarningsPoint\.slice\(\)/.test(doseHtml) &&
    /const validity = shieldingValidity\(\{ \.\.\.lastCalcResult, shieldWarnings: lastCalcResult\.shieldWarningsPoint/.test(doseHtml));
  check('D-03: Caregiver category options rebuilt on a separator switch, keeping the selection',
    /const buildCategoryOptions = \(\) => \{/.test(caregiverHtml) && /nm-decimal-change', \(\) => \{\s*buildCategoryOptions\(\);/.test(caregiverHtml));
  check('Dose material densities follow the separator (option[data-num-label]); the HTML text keeps the point as source',
    (doseHtml.match(/<option value="(Pb|Fe|concrete_NW|concrete_LW)" data-num-label>/g) || []).length === 4);

  console.log(`\n=== SUMMARY ===\nTotal: ${passed} passed, ${failed} failed`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
