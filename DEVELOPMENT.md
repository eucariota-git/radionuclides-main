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
- `getById(id)`, `getAll()`, `search(query)` — curated 40 nuclides
- Manages sessionStorage for custom nuclides

### `ICRP107` (`js/icrp107-loader.js`)
- `search(query)`, `get(id)` — 1252 extended nuclides
- `calcConstants(id)` — calculate Γ + max photon energy
- Lazy-loads on first use

### `UI` (`js/ui.js`)
- Dark mode, print, keyboard shortcuts

### `REPORT` (`js/report.js`)
- `print(spec)` — builds a print-only calculation report (timestamp, DB version, inputs, results, method, sources, disclaimer, sign-off) and opens the print dialog

### PWA (`manifest.json`, `sw.js`, `favicon.svg`, `icon-*.png`)
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
- `y90-bremsstrahlung.json` — provenance/notes for the Y-90 container estimates; the operational copy is `PHYSICS.Y90_CONTAINERS` in `js/data.js` — keep both in sync
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
- **Archer broad-beam** (Monte Carlo): Tc-99m, F-18, I-131, Lu-177 — parameters fit the FULL spectrum; never combine with spectral weighting
- **Spectrum-weighted narrow beam**: T(x) = Σ wᵢ·e^(−μ(Eᵢ)x) over dose-weighted ICRP 107 lines (`shielding_spectrum`, 39 nuclides) — captures beam hardening; no build-up factor
- **Single-line narrow beam**: fallback for custom nuclides without a stored spectrum

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
`validate-icrp107.html` tests 20 reference nuclides:
- Z extraction, half-life parsing, photon filtering, dose constant calculation
- All currently pass (< 5% deviation from published)

---

## Testing Checklist

```
□ node test/validate-math.js && node test/validate-data.js && node test/validate-constants.js — all green
□ validate-icrp107.html: all 26 nuclides show ✓ Pass
□ Dose at selected distance (not 1m hardcoded)
□ Y-90 container selector + Pb warning
□ Crystal lens: 50 mSv/y max annual + 100 mSv/5-year cycle
□ Dark mode, print, offline file://, CSV upload
□ Data integrity: JSON valid, hashes match
```

---

## Deployment

### GitHub Pages
No build step. Push to repository; auto-deploys from root.

### Files
- Static: `*.html`, `css/style.css`, `js/*.js`
- Embedded data: `data/*.json`, `data/*.js`

---

See also `docs/ACCEPTANCE_TEST.md` (independent validation sheet) and `docs/archive/` (historical audit reports).

**Version:** 2.1  
**Last updated:** 2026-06-11
