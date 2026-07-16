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
    /Clearance level reached after[^\n]+UTILS\.fmt\(t_clear_h\)/.test(decayHtml));
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
  const scenario = { cached: null, navigationFallback: null, fetchResponse: null, fetchError: null, fetchCalls: 0 };
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
      // Query-sensitive like the real Cache API: a request URL carrying a query
      // string only matches the precache when the SW passes ignoreSearch (H-04).
      match: async (request, opts) => {
        if (request === './index.html') return scenario.navigationFallback;
        const url = typeof request === 'string' ? request : request.url;
        if (url.includes('?') && !(opts && opts.ignoreSearch)) return undefined;
        return scenario.cached;
      },
      open: async () => ({ addAll: async () => {} }),
      keys: async () => [],
      delete: async () => true,
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
    tooltipTags.length === 8 && tooltipTags.every(tag => /tabindex="0"/.test(tag)));
  check('every tooltip trigger exposes an accessible name',
    tooltipTags.length === 8 && tooltipTags.every(tag => /aria-label="[^"]+"/.test(tag)));
  check('properties distinguishes dose-rate provenance from regulatory sources',
    />&#915; source<\/th>/.test(indexHtml) && /clearance_a1_source/.test(indexHtml));
  check('dose exposes elemental iron with an explicit density',
    /<option value="Fe">Iron \(Fe\).*7\.874 g\/cm/.test(doseHtml));
  check('curve legends use line segments and event markers use circles',
    /pointStyle: 'line'/.test(decayHtml) && /pointStyle: 'circle'/.test(decayHtml) &&
    /usePointStyle: true/.test(decayHtml) && /pointStyle: 'line'/.test(doseHtml) &&
    /pointStyle: 'circle'/.test(doseHtml) && /usePointStyle: true/.test(doseHtml));
  check('all public footers use the shared estimation disclaimer',
    [indexHtml, decayHtml, doseHtml, aboutHtml].every(html =>
      /For radiation protection estimation purposes\.\s*\n\s*Verify against primary sources for regulatory submissions\./.test(html)) &&
    !/Dose rate constants: Cornejo/.test(`${decayHtml}\n${doseHtml}`));
  check('all public footers identify the original author and keep third-party scope separate',
    [indexHtml, decayHtml, doseHtml, aboutHtml].every(html =>
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
  for (const [name, html] of [['index.html', indexHtml], ['decay.html', decayHtml], ['dose.html', doseHtml]]) {
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
    swVersion === 'nm-planner-v27');
  check('report build id (UTILS.APP_BUILD) matches the service-worker cache version',
    Boolean(appBuild) && appBuild === swVersion);
  check('icons exist only in their organized asset directory',
    iconPaths.every(rel => fs.existsSync(path.join(ROOT, rel))) &&
    ['favicon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png']
      .every(rel => !fs.existsSync(path.join(ROOT, rel))));
  check('all public pages reference the organized favicon and Apple Touch icon',
    [indexHtml, decayHtml, doseHtml, aboutHtml].every(html =>
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
  console.log();

  console.log('Test 10: scientific-message and traceability regressions (audit 2026-07-16)');
  check('no user-facing text claims infinite-medium build-up is conservative for finite barriers',
    ![doseHtml, aboutHtml, guideMd].some(text => /conservative for finite|slightly conservative/i.test(text)) &&
    /not universally conservative/.test(doseHtml));
  check('dose page derives the photon-less label from real decay modes and discloses sub-0.01% branches',
    /decay_modes: icrpN\.decay_modes/.test(doseHtml) &&
    /isPureBetaMinus/.test(doseHtml) &&
    /m\.branching >= 1e-4/.test(doseHtml) &&
    /essentially a pure &beta;/.test(doseHtml) &&
    /minorModes/.test(doseHtml) &&
    !doseHtml.includes('is a pure &beta;&#8315; emitter.</strong>'));
  check('Y-90 report keeps its scenario snapshot and cites only scenario sources (no auto ICRU 57/Cornejo)',
    /containerName: container\.name/.test(doseHtml) &&
    /patientTx: patientTx,\s*\n\s*withDecay: withDecay/.test(doseHtml) &&
    doseHtml.includes("['Assumptions', '', '', '', '', ''") &&
    !/ICRU Report 57/.test(reportJs) &&
    /if \(r\.isY90\) \{/.test(doseHtml));
  check('printed reports identify the application build',
    /<tr><td>Application<\/td>/.test(reportJs) && /APP_BUILD/.test(reportJs));
  check('decay validates the vial weight before any result is rendered',
    decayHtml.indexOf('Vial / container weight must be a positive number') > 0 &&
    decayHtml.indexOf('Vial / container weight must be a positive number') <
    decayHtml.indexOf("card.classList.remove('hidden')"));
  check('deployment docs build distributions from an allowlist, never the working folder',
    /allowlist/i.test(developmentMd) && /data\/sources\//.test(developmentMd) &&
    !/Distribute the complete project folder/.test(developmentMd));

  console.log(`\n=== SUMMARY ===\nTotal: ${passed} passed, ${failed} failed`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
