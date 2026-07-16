#!/usr/bin/env node
/**
 * build-package.js — Build the non-commercial distribution package.
 *
 * Development-only tool: it never ships in the package it builds. Stages the
 * allowlist below into dist/<name>/, then gates the result:
 *
 *   1. requires a clean tracked tree for every staged file (a dirty working
 *      copy must never be a package input — audit 2026-07-16);
 *   2. verifies the staged inventory matches the allowlist exactly and that
 *      no forbidden name (restricted ICRP sources, personal tooling, local
 *      working copies) slipped in;
 *   3. writes PACKAGE-INFO.txt (version, build, commit, date, non-commercial
 *      purpose) and a sorted SHA256SUMS manifest;
 *   4. re-runs the four test suites FROM THE STAGED COPY, proving the package
 *      is self-verifiable;
 *   5. zips the staging folder and prints the archive's SHA-256.
 *
 * The allowlist is duplicated in docs/DEVELOPMENT.md § Deployment — keep both
 * in sync. Manual step 5 of that section (file://, HTTP(S), PWA install,
 * offline reload with and without ?id=) remains the operator's.
 *
 * Usage: node tools/build-package.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// Allowlist — exact tracked files, or whole directories (trailing slash).
// Keep in sync with docs/DEVELOPMENT.md § Deployment.
const ALLOWLIST = [
  'index.html', 'decay.html', 'dose.html', 'about.html',
  'css/',
  'js/',
  'data/nuclides.json', 'data/nuclides-data.js',
  'data/icrp107-index.json', 'data/icrp107-data.js',
  'assets/icons/',
  'manifest.json', 'sw.js',
  'README.md',
  'docs/USER_GUIDE.md', 'docs/DEVELOPMENT.md', 'docs/ACCEPTANCE_TEST.md',
  'test/',
  'LICENSE', 'LICENSE.TXT', 'LICENSING.md', 'THIRD_PARTY_NOTICES.md',
];

// Belt-and-braces: names that must never appear in a package even if the
// allowlist ever grows a bug. Checked against the final staged inventory.
const FORBIDDEN_PATTERNS = [
  /(^|\/)\.git(\/|$)/, /(^|\/)\.claude(\/|$)/, /(^|\/)CLAUDE\.md$/,
  /(^|\/)\.hintrc$/, /(^|\/)\.gitignore$/,
  /^tools\//, /^references\//, /^data\/sources\//,
  /^docs\/AUDIT_/, /^docs\/PLAN_AUDIT_/,
  /\.local\.md$/, /\.pdf$/i, /server\.(log|pid)$/, /__pycache__/,
];

function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function git(args) {
  return execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8' });
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, base, out);
    else out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
  return out;
}

// ---- 1. Identity ----------------------------------------------------------

const utilsJs = fs.readFileSync(path.join(ROOT, 'js/utils.js'), 'utf8');
const APP_VERSION = (utilsJs.match(/APP_VERSION = '([^']+)'/) || [])[1];
const APP_BUILD = (utilsJs.match(/APP_BUILD = '([^']+)'/) || [])[1];
if (!APP_VERSION || !APP_BUILD) fail('APP_VERSION / APP_BUILD not found in js/utils.js');
const dbVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/nuclides.json'), 'utf8')).version || '?';
const commit = git('rev-parse --short HEAD').trim();

const pkgName = `nm-radionuclide-planner-v${APP_VERSION}`;
const distDir = path.join(ROOT, 'dist');
const stageDir = path.join(distDir, pkgName);

console.log(`Building ${pkgName} (build ${APP_BUILD}, commit ${commit})`);

// ---- 2. Select tracked files from the allowlist ---------------------------

const tracked = git('ls-files -z').split('\0').filter(Boolean);
const matchesEntry = (file, entry) => entry.endsWith('/') ? file.startsWith(entry) : file === entry;

for (const entry of ALLOWLIST) {
  if (!tracked.some(f => matchesEntry(f, entry))) {
    fail(`allowlist entry matches no tracked file (typo or rename?): ${entry}`);
  }
}
const files = tracked.filter(f => ALLOWLIST.some(e => matchesEntry(f, e))).sort();

// ---- 3. Clean-tree gate for every staged file -----------------------------

const dirty = git('status --porcelain').split('\n').filter(Boolean)
  .map(line => line.slice(3).replace(/^"|"$/g, ''))
  .filter(p => files.includes(p));
if (dirty.length) {
  fail(`tracked files staged for the package have uncommitted changes:\n  ${dirty.join('\n  ')}\nCommit (or stash) them first — a dirty tree must never be a package input.`);
}

// ---- 4. Stage --------------------------------------------------------------

fs.rmSync(stageDir, { recursive: true, force: true });
for (const f of files) {
  const dest = path.join(stageDir, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(ROOT, f), dest);
}
console.log(`✓ staged ${files.length} tracked files into dist/${pkgName}/`);

// ---- 5. PACKAGE-INFO.txt ---------------------------------------------------

const info = [
  'NM Radionuclide Planner — distribution package',
  '',
  `Application version : v${APP_VERSION}`,
  `Build id            : ${APP_BUILD} (equals CACHE_VERSION in sw.js; printed in every calculation report)`,
  `Database            : nuclides.json v${dbVersion}`,
  `Source commit       : ${commit}`,
  `Built               : ${new Date().toISOString()}`,
  '',
  'Purpose: non-commercial distribution (education, research and non-profit',
  'professional use), per the ICRP-07 data terms in LICENSE.TXT. See',
  'docs/DEVELOPMENT.md ("Distribution purpose") and LICENSING.md for the full',
  'licence map: original code EUPL-1.2; Chart.js and @kurkle/color MIT; ICRP',
  'and other third-party data under their own terms.',
  '',
  'Verify this package:',
  '  sha256sum -c SHA256SUMS',
  '  node test/validate-math.js && node test/validate-data.js && \\',
  '  node test/validate-constants.js && node test/validate-app.js',
  '',
  'Professional adoption requires the independent validation described in',
  'docs/ACCEPTANCE_TEST.md.',
  '',
].join('\n');
fs.writeFileSync(path.join(stageDir, 'PACKAGE-INFO.txt'), info);

// ---- 6. Inventory and forbidden-name gates ---------------------------------

const expected = new Set([...files, 'PACKAGE-INFO.txt']);
const staged = walk(stageDir);
const extra = staged.filter(f => !expected.has(f));
const missing = [...expected].filter(f => !staged.includes(f));
if (extra.length || missing.length) {
  fail(`staged inventory does not match the allowlist.\n  extra: ${extra.join(', ') || '—'}\n  missing: ${missing.join(', ') || '—'}`);
}
const forbidden = staged.filter(f => FORBIDDEN_PATTERNS.some(re => re.test(f)));
if (forbidden.length) fail(`forbidden names in the package: ${forbidden.join(', ')}`);
console.log(`✓ inventory matches the allowlist (${staged.length} files); no forbidden names`);

// ---- 7. SHA256SUMS ----------------------------------------------------------

const manifest = walk(stageDir).sort()
  .map(f => `${sha256(path.join(stageDir, f))}  ${f}`)
  .join('\n') + '\n';
fs.writeFileSync(path.join(stageDir, 'SHA256SUMS'), manifest);
console.log('✓ SHA256SUMS written');

// ---- 8. Test suites from the staged copy ------------------------------------

for (const suite of ['validate-math', 'validate-data', 'validate-constants', 'validate-app']) {
  const run = spawnSync(process.execPath, [`test/${suite}.js`], { cwd: stageDir, encoding: 'utf8' });
  if (run.status !== 0) {
    console.error(run.stdout || '');
    console.error(run.stderr || '');
    fail(`test/${suite}.js failed when run FROM THE STAGED PACKAGE (exit ${run.status})`);
  }
  console.log(`✓ test/${suite}.js passes from the staged copy`);
}

// ---- 9. Zip ------------------------------------------------------------------

const zipPath = path.join(distDir, `${pkgName}.zip`);
fs.rmSync(zipPath, { force: true });
try {
  // Windows ships bsdtar (System32), which writes zip via -a and is immune to
  // GNU tar's "C: is a remote host" path parsing; relative paths + cwd keep
  // any tar variant off drive-letter syntax.
  const tarBin = process.platform === 'win32'
    ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
    : 'tar';
  execSync(`"${tarBin}" -a -cf "${pkgName}.zip" "${pkgName}"`, { cwd: distDir });
  console.log(`\n✓ package ready: dist/${pkgName}.zip`);
  console.log(`  SHA-256: ${sha256(zipPath)}`);
} catch (err) {
  console.warn(`\n⚠ could not create the zip with tar (${err.message.split('\n')[0]}).`);
  console.warn(`  The verified staging folder is ready at dist/${pkgName}/ — zip it manually.`);
}
console.log(`  Manual step remaining (docs/DEVELOPMENT.md § Verify): file://, HTTP(S), PWA install, offline reload with and without ?id=.`);
