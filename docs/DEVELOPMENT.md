# Development Guide — NM Radionuclide Planner

For developers and maintainers extending or modifying the application.

---

## Setup

### Prerequisites
- Node.js (v14+) for running build/data tools
- Python 3 (for HTTP server during development)
- Text editor or IDE (VS Code recommended)

### Running Locally

```bash
# Start HTTP server (from repo root)
python -m http.server 8000

# Open in browser
http://localhost:8000
```

Works offline after first load. Also works with `file://` protocol.

---

## Core Modules

Each module (PHYSICS, CALC, DB, ICRP107, UI) is an IIFE returning public API. No framework dependencies.

### `PHYSICS` (`js/data.js`)
- ICRU 57 / ICRP 74 conversion coefficient tables
- Attenuation data (NIST XCOM)
- Method: `calcGammaConstants(photons)` — calculates Γ from photon array

### `CALC` (`js/physics.js`)
- **Decay**: `activityAtTime(A0, T_half, t)`
- **Dose**: `doseRate(gamma, A, d, thick, E, mat, archer_params, spectrum)`
- **Shielding**: `getTransmission(x, E, mat, archer_params, spectrum)` — precedence: Archer (full-spectrum MC fit) → spectrum-weighted narrow beam (`shielding_spectrum`) → single-line narrow beam
- **Cumulative**: `cumulativeDose(...)` — integrates decay
- HVL/TVL and `thicknessForAttenuation` solve the spectral equation numerically (bisection)

### `DB` (`js/db.js`)
- `getById(id)`, `getAll()`, `search(query)`, `filter(...)` — curated 40 nuclides

### `ICRP107` (`js/icrp107-loader.js`)
- `search(query)`, `get(id)` — 1252 extended nuclides
- `calcConstants(id)` — calculate Γ + max photon energy
- Lazy-loads on first use

### `UI` (`js/ui.js`)
- Dark mode, print, keyboard shortcuts

### `REPORT` (`js/report.js`)
- `print(spec)` — builds a print-only calculation report (timestamp, DB version, inputs, results, method, sources, disclaimer, sign-off) and opens the print dialog

### PWA (`manifest.json`, `sw.js`, `assets/icons/`)
- Cache-first service worker; registered on HTTP(S) only (`file://` unaffected)
- **Bump `CACHE_VERSION` in `sw.js`** whenever data files or app logic change

---

## Data Files

**`data/nuclides.json`** — source of truth (40 curated nuclides, version field shown in reports)
- Includes metadata: generation timestamp, SHA256 hash of source ICRP files
- Stores Cornejo published values in `cornejo_validation` for traceability

**Auto-generated:**
- `nuclides-data.js` — JavaScript wrapper for file:// compatibility
- `icrp107-index.json` — 1252 nuclides with photon emissions
- `icrp107-data.js` — Embedded for offline use

**Documentation data:**
- The Y-90 container bremsstrahlung estimates live in `PHYSICS.Y90_CONTAINERS` (`js/data.js`), with the Zanzonico 1999 methodology documented in the surrounding comment
- `data/sources/icrp107/` — ICRP 107 raw files (NDX/RAD/BET/ACK/NSF) used by the parser — **local only, gitignored** (© ICRP); see `references/icrp107/README.md` for download/verification instructions

### Regenerating Data

```bash
# Wrap nuclides.json as JS
node tools/generate-data.js

# Parse ICRP 107 (generates icrp107-index.json + icrp107-data.js)
node tools/parse-icrp107.js

# Recalculate gamma constants (CAUTION: overwrites data)
# Backup nuclides.json first!
node tools/recalc-gamma.js --force

# Regenerate dose-weighted shielding spectra (after photon-data changes)
node tools/add-shielding-spectra.js && node tools/generate-data.js
```

One-shot migration tools kept for provenance (already applied, do not re-run blindly):
`add-therapy-nuclides.js`, `add-ingestion-coeffs.js`, `add-max-energy.js`, `restore-cornejo-published.js`.

---

## Physics Implementation

### Dose Rate Constant
Γ [μSv·h⁻¹·GBq⁻¹·m²] = 28.648 · Σᵢ (yᵢ · h(Eᵢ))

where h(E) comes from ICRU 57 tables, and photons are filtered (E≥20keV, yield≥0.01%).

### Shielding Models
- **Archer broad-beam** (Monte Carlo): Tc-99m, F-18, I-131, Lu-177 — parameters fit the FULL spectrum (buildup inherently included); never combine with spectral weighting or `getBuildup`
- **Spectrum-weighted narrow beam + build-up**: T(x) = Σ wᵢ·min(1, B(Eᵢ, μᵢx)·e^(−μᵢx)) over dose-weighted ICRP 107 lines (`shielding_spectrum`, 39 nuclides) — beam hardening + scatter build-up
- **Single-line narrow beam + build-up**: internal fallback for any nuclide without a stored spectrum
- **`PHYSICS.getBuildup(E_MeV, mfp, material)`**: ANS-6.4.3 exposure buildup (NUREG/CR-5740 Table 3; Pb with K-edge split, elemental Fe, and one concrete table for both concrete densities; 0–40 mfp, clamped). HVL/TVL/thickness solved numerically by bisection (`_spectrumThickness_cm`)

### Dose with Decay
D = ∫₀ᵗ Γ · A(τ) / r² dτ, where A(τ) = A₀ · e^(−λτ)

---

## ICRP 107 Integration

### Parser v2.0
- **NDX file**: FORTRAN fixed-width columns (226 bytes/record), not space-splitting
- **RAD file**: Photon emissions (E, yield, type)
- **BET file**: Beta spectrum data
- **Output**: JSON with SHA256 hashes for audit trail

### Validation
`node test/validate-constants.js` cross-checks the ICRP 107 dose constants against
the published Cornejo (2015) reference values:
- Z extraction, half-life parsing, photon filtering, dose constant calculation
- Current result: 1279 passed, 0 failed and 3 warned. The warnings are known
  ICRP-107 vs Cornejo differences and are not counted as passes.
- The gamma-constant comparison uses an absolute tolerance of 0.1 in the stored
  units, not a blanket relative tolerance of 5%.

---

## Linting (`.hintrc`)

The repo carries a webhint config for the editor. It suppresses exactly one rule,
and the reason matters:

**`compat-api/html` → ignore `meta[name=theme-color]`.** The warning is factually
correct — MDN lists theme-color as "limited availability", Firefox and Opera do
not implement it. It is suppressed anyway because the tag is a *progressive
enhancement*: a browser that does not recognise a `<meta name>` ignores it, so
there is no failure mode to fix. It colours the browser UI on Chrome for Android
and Safari on iOS, which is a platform this project explicitly targets (see the
PWA notes below), and `manifest.json` only covers the *installed* app — the meta
tag is what themes the *browser tab* before install. Deleting it to silence the
linter would trade a real feature for a cosmetic clean-up.

Do NOT add blanket suppressions here. If a new warning appears, fix the code; a
warning is only silenced when the code is right and the rule does not apply.

---

## Testing Checklist

```
□ node test/validate-math.js, validate-data.js, validate-constants.js and validate-app.js — all exit 0
□ Dose at selected distance (not 1m hardcoded)
□ Y-90 container selector + Pb warning
□ Crystal lens: 50 mSv/y max annual + 100 mSv/5-year cycle
□ Dark mode, print, offline file://
□ Data integrity: JSON valid, hashes match
```

---

## Deployment

### Distribution purpose

This package is distributed for **non-commercial purposes** (education,
research and non-profit professional use): the bundled ICRP-07 nuclear decay
data are licensed by ICRP for those uses only (`LICENSE.TXT`). The original
application code remains EUPL-1.2, which itself permits commercial use, but
any commercial redistribution of the complete package would additionally
require permission from ICRP and a review of the NIST SRD terms — neither of
which is on file.

### Local or static hosting
No build step. Serve the distribution folder with any local or remote static
web server, or open it directly via `file://`.

### Building a distribution folder or archive (allowlist)

Do **NOT** copy or zip the working directory. It contains restricted
third-party source material (`data/sources/` — original ICRP-07 data files —
and local PDFs of publications) and personal tooling (`.claude/`, local audit
reports, editor metadata) that must never be redistributed. `.gitignore` does
not protect a folder copy or a ZIP.

Build the package with `node tools/build-package.js`: it stages the allowlist
below into `dist/`, requires a clean tracked tree for the staged files,
verifies the final inventory, writes `SHA256SUMS` and `PACKAGE-INFO.txt`,
re-runs the four test suites from the staged copy, and zips the result. The
allowlist (duplicated in that script — keep both in sync) is:

- `index.html`, `decay.html`, `dose.html`, `about.html`
- `css/`
- `js/` (includes the locally bundled `chart.umd.min.js`)
- `data/nuclides.json`, `data/nuclides-data.js`
- `data/icrp107-index.json`, `data/icrp107-data.js`
- `assets/icons/`
- `manifest.json`, `sw.js`
- `README.md`, `docs/USER_GUIDE.md`
- `docs/ACCEPTANCE_TEST.md` — a clean template, never a partially filled
  working copy
- `test/` and `docs/DEVELOPMENT.md` — the acceptance sheet (case B1) requires
  the validator to run the four suites from the package, and
  `test/validate-app.js` reads this document; the suites read nothing outside
  this allowlist, so the package verifies itself without development material
- `LICENSE`, `LICENSE.TXT`, `LICENSING.md`, `THIRD_PARTY_NOTICES.md`
  (all four are mandatory and travel together)
- Generated at build time: `SHA256SUMS` (sorted manifest) and
  `PACKAGE-INFO.txt` (version, build id, commit, date, non-commercial purpose)

Version-controlled files that must NOT ship (development-only): `tools/`
(data-regeneration scripts — they overwrite `data/`), `references/` (external
documents already linked from about.html), `docs/PLAN_AUDIT_*.md`, `CLAUDE.md`,
`.claude/`, `.hintrc`, `.gitignore`.

### Verify the built package (from the extracted copy, not the working tree)

Steps 1–4 are automated by `tools/build-package.js` and fail the build when
violated; step 5 remains manual.

1. Inventory matches the allowlist exactly — nothing extra, nothing missing.
2. None of these are present: `.git/`, `.claude/`, `CLAUDE.md`, `tools/`,
   `references/`, `data/sources/`, `docs/AUDIT_*`, `docs/PLAN_AUDIT_*`,
   `*.local.md`, `*.pdf`, `server.log`, `server.pid`, caches or editor/OS
   metadata.
3. Generate a sorted `SHA256SUMS` manifest of every file and record the
   SHA-256 of the final archive.
4. Re-run the four test suites from the extracted folder (`node test/…`).
5. Open via `file://` and via HTTP(S); check PWA install and offline reload of
   all four pages, with and without `?id=` query parameters.

---

See also `docs/ACCEPTANCE_TEST.md` (independent validation sheet).

**Document version:** 2.3 — this guide only; the application and database are
versioned separately (`nuclides.json` v1.2, `UTILS.APP_VERSION` in
`js/utils.js`, `CACHE_VERSION` in `sw.js`)  
**Last updated:** 2026-07-16
