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
  const reportJs = read('js/report.js');
  const icrpLoaderJs = read('js/icrp107-loader.js');

  console.log('Test 1: operational-quantity wiring');
  check('dose table H\'(0.07) uses sp007',
    /const Hdot_Ext\s*=\s*CALC\.doseRate\([^\n]+ap, sp007\)/.test(doseHtml));
  check('dose chart H\'(0.07) uses sp007',
    /const doseExt\s*=\s*distances\.map\([^\n]+ap, sp007\)/.test(doseHtml));
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

  console.log('Test 4: input-state and validation wiring');
  check('patient transmission starts disabled when attenuation is No',
    /id="patientTx"[^>]+disabled/.test(doseHtml));
  check('patient attenuation toggle controls disabled state',
    /txInput\.disabled = false/.test(doseHtml) && /txInput\.disabled = true/.test(doseHtml));
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
  const offlineData = await dispatchFetch({ method: 'GET', mode: 'cors', url: 'https://example.test/data/nuclides.json' });
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
    /<option value="Fe">Iron \(Fe\).*7\.874 g\/cm/.test(doseHtml));
  check('curve legends use line segments and event markers use circles',
    /pointStyle: 'line'/.test(decayHtml) && /pointStyle: 'circle'/.test(decayHtml) &&
    /usePointStyle: true/.test(decayHtml) && /pointStyle: 'line'/.test(doseHtml) &&
    /pointStyle: 'circle'/.test(doseHtml) && /usePointStyle: true/.test(doseHtml));
  check('all public footers use the shared estimation disclaimer',
    [indexHtml, decayHtml, doseHtml, effluentHtml, aboutHtml].every(html =>
      /For radiation protection estimation purposes\.\s*\n\s*Verify against primary sources for regulatory submissions\./.test(html)) &&
    !/Dose rate constants: Cornejo/.test(`${decayHtml}\n${doseHtml}`));
  check('all public footers identify the original author and keep third-party scope separate',
    [indexHtml, decayHtml, doseHtml, effluentHtml, aboutHtml].every(html =>
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
  for (const [name, html] of [['index.html', indexHtml], ['decay.html', decayHtml], ['dose.html', doseHtml], ['effluent.html', effluentHtml]]) {
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
    swVersion === 'nm-planner-v35');
  check('report build id (UTILS.APP_BUILD) matches the service-worker cache version',
    Boolean(appBuild) && appBuild === swVersion);
  check('icons exist only in their organized asset directory',
    iconPaths.every(rel => fs.existsSync(path.join(ROOT, rel))) &&
    ['favicon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png']
      .every(rel => !fs.existsSync(path.join(ROOT, rel))));
  check('all public pages reference the organized favicon and Apple Touch icon',
    [indexHtml, decayHtml, doseHtml, effluentHtml, aboutHtml].every(html =>
      /href="assets\/icons\/favicon\.svg"/.test(html) &&
      /href="assets\/icons\/icon-180\.png"/.test(html)));
  const manifest = JSON.parse(read('manifest.json'));
  check('manifest and service worker reference the organized icon assets',
    manifest.icons.every(icon => icon.src.startsWith('assets/icons/')) &&
    iconPaths.every(rel => swJs.includes(`./${rel}`)));
  check('development docs describe absolute tolerance and warned results',
    /absolute tolerance of 0\.1/.test(developmentMd) && /3 warned/.test(developmentMd) && !/< 5% deviation/.test(developmentMd));
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
    !/d_m\.toFixed\(2\)/.test(doseHtml) && /\$\{r\.distRaw\} \$\{r\.distUnit\}/.test(doseHtml) &&
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
    check('decay and dose flag edited inputs as stale and export only the calculated snapshot (T19)',
      /function watchStaleResults\(cardId\)/.test(uiJs) && /Inputs changed — recalculate to update results/.test(uiJs) &&
      /staleWatch\.fresh\(\)/.test(decayHtml) && (doseHtml.match(/staleWatch\.fresh\(\)/g) || []).length === 2 &&
      !/btnExportCsv[\s\S]{0,900}getElementById\('(refDateTime|targetDateTime)'\)/.test(decayHtml));
    check('dose: quantities are dose equivalents (no D\', no "whole body", no "worst case") (T20, T22)',
      !/D'\(0\)|D'\(t\)|D\(annual\)|whole body|worst case/.test(doseHtml) &&
      /Annual integrated H/.test(doseHtml) && /H\*\(10\), ambient/.test(doseHtml) &&
      /Integrate physical decay during exposure\?/.test(doseHtml));
    check('dose: no absolute claim that compliance is shown by personal dosimetry (T21; RD 1029/2022 art. 34)',
      [doseHtml, aboutHtml, read('docs/USER_GUIDE.md')].every(t =>
        !/[Cc]ompliance (with dose limits )?is (assessed|demonstrated) with personal dosimetry/.test(t)) &&
      (doseHtml.match(/do not establish compliance/g) || []).length >= 3);
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
  check('decay names the denominator as mass of material, never "vial weight" (copy audit T04)',
    /Mass of material being assessed/.test(decayHtml) && !/Vial \/ container weight|Vial_weight/.test(decayHtml) &&
    /identify whether the container is included/.test(decayHtml));
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
    /UTILS\.APP_VERSION, UTILS\.APP_BUILD, dbMeta\.version/.test(decayHtml) &&
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
    [indexHtml, decayHtml, doseHtml, aboutHtml].every(html =>
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
    /volInput\.value = presets\[facSel\.value\]\.water_volume_m3_y/.test(effluentHtml) &&
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

  console.log(`\n=== SUMMARY ===\nTotal: ${passed} passed, ${failed} failed`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
