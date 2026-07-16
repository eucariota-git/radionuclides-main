#!/usr/bin/env node
/**
 * build-package.js — Build the non-commercial distribution package.
 *
 * Development-only tool: it never ships in the package it builds. Stages the
 * allowlist below into dist/<name>/, then gates the result:
 *
 *   1. requires a clean tracked tree for every staged file and for this build
 *      tool (a dirty working copy must never be a package input — audit
 *      2026-07-16);
 *   2. verifies the staged inventory matches the allowlist exactly and that
 *      no forbidden name (restricted ICRP sources, personal tooling, local
 *      working copies) slipped in;
 *   3. writes PACKAGE-INFO.txt (version, build, commit, date, non-commercial
 *      purpose) and a sorted SHA256SUMS manifest;
 *   4. re-runs the four test suites FROM THE STAGED COPY, proving the package
 *      is self-verifiable;
 *   5. writes a deterministic zip — pure Node, no external zipper — whose
 *      bytes depend on the source commit, SOURCE_DATE_EPOCH and Node/zlib
 *      toolchain. Identical inputs produce identical archives; the toolchain
 *      is recorded for traceability (re-audit 2026-07-16, R-05). Its SHA-256
 *      is written to a .zip.sha256 sidecar.
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
const zlib = require('zlib');
const { execFileSync, spawnSync } = require('child_process');

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
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

/** Return the exact committed bytes, independent of checkout EOL settings. */
function gitBlob(ref, file) {
  return execFileSync('git', ['show', `${ref}:${file}`], {
    cwd: ROOT,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });
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

// ---- Deterministic zip writer ----------------------------------------------
// Pure Node (built-in zlib): entry order, timestamps and header fields are
// fully determined by the file list and the build epoch. The same committed
// blobs, epoch and Node/zlib toolchain produce byte-identical archives
// (re-audit 2026-07-16, R-05).
// External zippers (bsdtar & co.) embed filesystem mtimes/birthtimes in extra
// fields and are not reproducible.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** MS-DOS date/time pair (2 s resolution, UTC) used by both zip headers. */
function dosDateTime(date) {
  return {
    time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | (date.getUTCSeconds() >> 1),
    day:  (Math.max(0, date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate(),
  };
}

/**
 * Write baseDir's relPaths (sorted, forward-slash) to zipPath, each entry
 * named `prefix/relPath`, deflated at level 9, stamped with `date`, no extra
 * fields. Plain zip (no zip64): fine below 4 GB / 65535 entries.
 */
function writeZip(zipPath, baseDir, relPaths, prefix, date) {
  const { time, day } = dosDateTime(date);
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const rel of relPaths) {
    const name = Buffer.from(`${prefix}/${rel}`, 'utf8');
    const data = fs.readFileSync(path.join(baseDir, rel));
    const crc = crc32(data);
    const deflated = zlib.deflateRawSync(data, { level: 9 });

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034B50, 0);       // local file header signature
    local.writeUInt16LE(20, 4);               // version needed: 2.0 (deflate)
    local.writeUInt16LE(8, 8);                // method: deflate (flags at 6 stay 0)
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);     // extra length at 28 stays 0
    chunks.push(local, name, deflated);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014B50, 0);         // central directory signature
    cen.writeUInt16LE(20, 4);                 // version made by: 2.0, MS-DOS attrs
    cen.writeUInt16LE(20, 6);                 // version needed
    cen.writeUInt16LE(8, 10);                 // method: deflate
    cen.writeUInt16LE(time, 12);
    cen.writeUInt16LE(day, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(deflated.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(name.length, 28);       // extra/comment/disk/attrs stay 0
    cen.writeUInt32LE(offset, 42);            // local header offset
    central.push(cen, name);
    offset += 30 + name.length + deflated.length;
  }
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054B50, 0);          // end of central directory
  eocd.writeUInt16LE(relPaths.length, 8);     // entries on this disk
  eocd.writeUInt16LE(relPaths.length, 10);    // entries total
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);             // central directory offset
  fs.writeFileSync(zipPath, Buffer.concat([...chunks, centralBuf, eocd]));
}

// ---- 1. Identity ----------------------------------------------------------

const commit = git(['rev-parse', 'HEAD']).trim();
const commitShort = commit.slice(0, 7);
const utilsJs = gitBlob(commit, 'js/utils.js').toString('utf8');
const APP_VERSION = (utilsJs.match(/APP_VERSION = '([^']+)'/) || [])[1];
const APP_BUILD = (utilsJs.match(/APP_BUILD = '([^']+)'/) || [])[1];
if (!APP_VERSION || !APP_BUILD) fail('APP_VERSION / APP_BUILD not found in js/utils.js');
const dbVersion = JSON.parse(gitBlob(commit, 'data/nuclides.json').toString('utf8')).version || '?';
const toolchain = `Node v${process.versions.node}; zlib ${process.versions.zlib || '?'}`;

// Reproducibility (re-audit 2026-07-16, R-05): every timestamp in the package
// and in the zip derives from SOURCE_DATE_EPOCH — defaulting to the source
// commit date — never from the wall clock. The package records the compression
// toolchain because compressed bytes are only guaranteed identical when that
// toolchain, the source commit and the epoch are all identical.
const envEpoch = parseInt(process.env.SOURCE_DATE_EPOCH, 10);
const epochSec = Number.isFinite(envEpoch) ? envEpoch : parseInt(git(['log', '-1', '--format=%ct']).trim(), 10);
if (!Number.isFinite(epochSec)) fail('could not determine SOURCE_DATE_EPOCH or the commit date');
const buildDate = new Date(epochSec * 1000);

const pkgName = `nm-radionuclide-planner-v${APP_VERSION}`;
const distDir = path.join(ROOT, 'dist');
const stageDir = path.join(distDir, pkgName);

console.log(`Building ${pkgName} (build ${APP_BUILD}, commit ${commitShort}, epoch ${buildDate.toISOString()})`);

// ---- 2. Select tracked files from the allowlist ---------------------------

const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean);
const matchesEntry = (file, entry) => entry.endsWith('/') ? file.startsWith(entry) : file === entry;

for (const entry of ALLOWLIST) {
  if (!tracked.some(f => matchesEntry(f, entry))) {
    fail(`allowlist entry matches no tracked file (typo or rename?): ${entry}`);
  }
}
const files = tracked.filter(f => ALLOWLIST.some(e => matchesEntry(f, e))).sort();

// ---- 3. Clean-tree gate for package inputs --------------------------------

const buildInputs = new Set([...files, 'tools/build-package.js']);
const dirty = git(['status', '--porcelain']).split('\n').filter(Boolean)
  .map(line => line.slice(3).replace(/^"|"$/g, ''))
  .filter(p => buildInputs.has(p));
if (dirty.length) {
  fail(`package inputs have uncommitted changes:\n  ${dirty.join('\n  ')}\nCommit (or stash) them first — a dirty tree must never be a package input.`);
}

// ---- 4. Stage --------------------------------------------------------------

fs.rmSync(stageDir, { recursive: true, force: true });
for (const f of files) {
  const dest = path.join(stageDir, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, gitBlob(commit, f));
}
console.log(`✓ staged ${files.length} canonical Git blobs into dist/${pkgName}/`);

// ---- 5. PACKAGE-INFO.txt ---------------------------------------------------

const info = [
  'NM Radionuclide Planner — distribution package',
  '',
  `Application version : v${APP_VERSION}`,
  `Build id            : ${APP_BUILD} (equals CACHE_VERSION in sw.js; printed in every calculation report)`,
  `Database            : nuclides.json v${dbVersion}`,
  `Source commit       : ${commit} (${commitShort})`,
  `Build toolchain     : ${toolchain}`,
  `Built               : ${buildDate.toISOString()} (SOURCE_DATE_EPOCH; defaults to source commit date)`,
  '',
  'Purpose: non-commercial distribution (education, research and non-profit',
  'professional use), per the ICRP-07 data terms in LICENSE.TXT. See',
  'docs/DEVELOPMENT.md ("Distribution purpose") and LICENSING.md for the full',
  'licence map: original code EUPL-1.2; Chart.js and @kurkle/color MIT; ICRP',
  'and other third-party data under their own terms.',
  '',
  'This package contains the runtime application, its data, the test suites',
  'and the user/licensing documentation. Development and maintenance tools',
  '(the repository\'s tools/ and references/ directories) do not ship with it;',
  'they are distributed with the project source repository, available from',
  'the maintainer.',
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

// ---- 9. Deterministic zip + sidecar hash -------------------------------------

const zipPath = path.join(distDir, `${pkgName}.zip`);
fs.rmSync(zipPath, { force: true });
writeZip(zipPath, stageDir, walk(stageDir).sort(), pkgName, buildDate);
const zipHash = sha256(zipPath);
// sha256sum -c compatible sidecar — the archive hash must live in a file, not
// only on a console that scrolls away (re-audit 2026-07-16, R-05).
fs.writeFileSync(`${zipPath}.sha256`, `${zipHash}  ${pkgName}.zip\n`);
console.log(`\n✓ package ready: dist/${pkgName}.zip (deterministic; entry timestamps ${buildDate.toISOString()})`);
console.log(`  SHA-256: ${zipHash}`);
console.log(`  recorded in dist/${pkgName}.zip.sha256`);
console.log(`  Manual step remaining (docs/DEVELOPMENT.md § Verify): file://, HTTP(S), PWA install, offline reload with and without ?id=.`);
