# CLAUDE.md — NM Radionuclide Planner

## Project Overview

This project is a nuclear medicine radionuclide reference web app with calculators (decay, dose rate, clearance). The stack is plain HTML/CSS/JavaScript with no build tools. Key files: decay.html, dose.html, and associated JS/CSS files.

## What This Project Is

A static web application for medical physicists and radiation protection specialists. It provides radionuclide properties, decay calculations, external dose estimation, and regulatory compliance checks (EU RD 1029/2022 / EURATOM 2013/59).

## Tech Stack

- **Pure vanilla JavaScript** — no frameworks, no build step, no package.json
- **Chart.js v4.4.0** bundled locally (`js/chart.umd.min.js`, no CDN) for offline support
- **Static site** — distributable as a self-contained local folder or through any static host; works offline (`file://`) and on Android (`content://`)

## Project Structure

```
index.html        Radionuclide properties database
decay.html        Decay calculator
dose.html         External dose estimator
effluent.html     Liquid effluent screening — NUREG/CR-5814 Scenarios 1 (sewer inspector) and 2 (STP sludge operator)

css/style.css     Shared styles (CSS variables, responsive grid)

js/data.js        PHYSICS module — ICRU 57/ICRP 74 conversion coefficients, attenuation tables
js/physics.js     CALC module — decay, dose, Archer/spectrum/narrow-beam shielding algorithms
js/db.js          DB module — nuclide database, search/filter
js/report.js      REPORT module — printable calculation reports with traceability
js/effluent.js    EFFLUENT module — Scenario 1/2 data loading, unit conversion, cross-checks (no DOM)

data/nuclides.json        Main radionuclide database (40 entries — source of truth)
data/nuclides-data.js     Auto-generated from nuclides.json for file:// compatibility
data/effluent-scenarios.json / -data.js  Effluent Scenario 1 and 2 parameters and coefficients (+ generated twin)

manifest.json / sw.js                 PWA manifest and cache-first service worker
assets/icons/                         Favicon, Apple Touch and install icons
                  (bump CACHE_VERSION in sw.js when data or app logic changes)
```

## Running Locally

No build step needed. Serve with any HTTP server:

```bash
python -m http.server 8000
```

Or open directly via `file://` — the app handles both protocols.

## Architecture Conventions

- **Module pattern**: IIFE with returned public API (e.g., `const PHYSICS = (function(){ ... return { ... }; })();`)
- **Physics is pure**: `js/physics.js` contains only calculations, no DOM manipulation
- **Dual data loading**: tries `fetch()` for JSON first, falls back to embedded `NUCLIDE_DATA` (in `nuclides-data.js`) for offline support
- **Data constants** (e.g., CLEARANCE_A1, dose rate constants) should be stored in external data files (JSON), not inline in HTML. When adding new constants, follow this pattern.

## Physics Notes

- Dose rate constant: Γ [μSv·h⁻¹·GBq⁻¹·m²] = K × Σ(nᵢ × h(Eᵢ)), K = 28.648
- **Archer equation** (broad-beam, Monte Carlo) used for Tc-99m, F-18, I-131, Lu-177 — its parameters already fit the FULL photon spectrum, never combine with spectral weighting
- **Spectrum-weighted narrow beam with build-up** T(x) = Σ wᵢ·min(1, B(Eᵢ, μᵢx)·e^(−μᵢx)) for all other curated nuclides (`shielding_spectrum` field, regenerated with `tools/add-shielding-spectra.js`) and for ICRP-107 extended nuclides (spectrum built at selection time with `PHYSICS.buildShieldingSpectrum` — never shield them with the single representative line: >10× error for 153 multi-line nuclides); single-line narrow beam (also with build-up) is the internal fallback for any nuclide without a stored spectrum
- **Buildup B(E, mfp)**: ANSI/ANS-6.4.3 EXPOSURE response (absorption in air — NOT the report's "energy absorption" tables, which are dose in the shield medium). `PHYSICS.getBuildup`, Pb/Fe/concrete tables from NUREG/CR-5740 Table 3; Pb K-edge must not be interpolated across; validity 0–40 mfp. `Fe` means elemental iron (ρ = 7.874 g/cm³), not generic steel
- Photon filter: G/X rays only, E ≥ 20 keV, yield ≥ 0.01%
- Half-lives stored in seconds internally; display format handled separately
- Dose quantities: H*(10) and H'(0.07) are AREA-monitoring operational quantities and are always shown side by side — never reintroduce the old automatic "d < 25 cm → extremities/H'(0.07)" rule (no normative basis; removed 2026-07 per audit finding 2). Personal dosimetry quantities are Hp(10)/Hp(0.07)/Hp(3); the limit comparison in dose.html is labeled indicative screening only. H*(10) is NOT always ≥ H'(0.07) (e.g. Pd-103 −40%)

## Calculation Logic

When editing calculator logic (decay, dose, clearance), always verify that cumulative/aggregate calculations account for all input parameters (e.g., number of administrations, weight, attenuation factors). Test edge cases after changes.

## Domain Knowledge

Regulatory references use RD 1029/2022 (not RD 783/2001). Dose limits: effective dose 20 mSv/year, lens of eye — both conditions must be satisfied: 50 mSv/y max annual AND 100 mSv over any consecutive 5-year period (current regime since 22 Jun 2024), skin 500 mSv/year.

IS-28 Anexo II II.A.4 (liquid discharges to public sewer) has THREE numeric conditions. The app implements only the per-nuclide concentration level (1 mSv / e(g))/600 L. It does not evaluate the mixture sum of fractions Σ(Cᵢ/Lᵢ) ≤ 1 or the annual activity limits (≤ 10 GBq H-3, ≤ 1 GBq C-14, strictly < 1 GBq the sum of the rest). RD 1217/2024 clearance is implemented only for a single nuclide; mixture clearance must be evaluated separately. Always present single-nuclide values as "individual level", not as a complete discharge/clearance assessment.

Effluent page (`effluent.html`): Scenarios 1 (sewer inspector) and 2 (STP sludge operator) are DIFFERENT receptors — never add their doses. Source term: A_adm = patients × cycles × administered activity (all excreted); the in-hospital fraction leaves through the facility (for nuclides in decay tanks only their proportional share of the annual tank discharge, default 1 GBq/y for the sum, no decay credit); the rest is excreted at home. Scenario 1 gets only what leaves the hospital, diluted in the facility's annual water volume; Scenario 2 gets that plus the home part × catchment fraction; its PHITS k (600 × 200 × 50 cm water slab, receptor at 1 m) is photon-only, bremsstrahlung not bounded. A nuclide without a Scenario 2 coefficient (F-18) is "not evaluated", never zero. Scenario 2: screening model, all discharged activity retained in one year of sludge (C = Q/S, SRS-19 §4.9 b), decay only during transit to the press. External coefficients k are own PHITS effective-dose-rate values (ICRP 116 ROT) for 10 × 10 × 3 m and 45 × 45 × 3 m sludge masses, receptor at 2 m — never replace them with point-source Γ, and never claim they cover the infinite slab NUREG prescribes (Lu-177 L45 captures 73–75 % of it). Inhalation uses ICRP 119 G.1 adult PUBLIC coefficients (Lu-177/Lu-177m/Tc-99m/F-18 type M, I-131 type F). The dose criterion is user-defined; do not attribute a regulatory basis to it. The workbook's I-131 shortcut (NUREG B.7 factor rescaled by dry mass only) is replaced by the explicit model and kept only as an indicative cross-check.

## UI / Styling Guidelines

Dark mode is supported. When adding or modifying UI elements (tables, tooltips, graphs, markers), always check both light and dark mode contrast and visibility. Tooltips must not be clipped by overflow containers.

## Data

- Edit `data/nuclides.json` to add/modify nuclides, then regenerate `data/nuclides-data.js` to keep offline support in sync
- Nuclide ID format: `"C-11"`, `"Tc-99m"`, `"I-131"`, etc.

## Licensing

- Original project code and documentation are licensed under EUPL-1.2 only; `LICENSING.md` defines the precise scope.
- Do not describe the whole repository as EUPL or MIT. Chart.js and @kurkle/color retain their upstream MIT licences, while ICRP and other third-party data retain the terms in `LICENSE.TXT` and `THIRD_PARTY_NOTICES.md`.
- Keep the licence text and scope summary embedded in `about.html` synchronized with `LICENSE`, `LICENSING.md`, `LICENSE.TXT` and `THIRD_PARTY_NOTICES.md`. `docs/USER_GUIDE.md`, not `README.md`, remains the canonical source for the in-app guide.

## Key References

- Cornejo 2015 — dose rate constant methodology
- Oumano et al. 2025 — shielding validation
- ICRU Report 57, ICRP Publication 74
