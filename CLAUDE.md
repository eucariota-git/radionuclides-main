# CLAUDE.md — NM Radionuclide Planner

## Project Overview

This project is a nuclear medicine radionuclide reference web app with calculators (decay, dose rate, clearance). The stack is plain HTML/CSS/JavaScript with no build tools. Key files: decay.html, dose.html, and associated JS/CSS files.

## What This Project Is

A static web application for medical physicists and radiation protection specialists. It provides radionuclide properties, decay calculations, external dose estimation, and regulatory compliance checks (EU RD 1029/2022 / EURATOM 2013/59).

## Tech Stack

- **Pure vanilla JavaScript** — no frameworks, no build step, no package.json
- **Chart.js v4.4.0** via CDN (decay visualization)
- **Static site** — deployable to GitHub Pages, works offline (file://) and on Android (content://)

## Project Structure

```
index.html        Radionuclide properties database
decay.html        Decay calculator
dose.html         External dose estimator
custom.html       Custom nuclide CSV uploader (IAEA LiveChart format)

css/style.css     Shared styles (CSS variables, responsive grid)

js/data.js        PHYSICS module — ICRU 57/ICRP 74 conversion coefficients, attenuation tables
js/physics.js     CALC module — decay, dose, Archer/narrow-beam shielding algorithms
js/db.js          DB module — nuclide database, search/filter, sessionStorage for custom nuclides
js/csv-parser.js  CSV_PARSER module — IAEA LiveChart CSV parser

data/nuclides.json        Main radionuclide database (34 entries — source of truth)
data/nuclides-data.js     Auto-generated from nuclides.json for file:// compatibility
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
- **sessionStorage** for custom nuclides — persists within a browser session only
- **Data constants** (e.g., CLEARANCE_A1, dose rate constants) should be stored in external data files (JSON), not inline in HTML. When adding new constants, follow this pattern.

## Physics Notes

- Dose rate constant: Γ [μSv·h⁻¹·GBq⁻¹·m²] = K × Σ(nᵢ × h(Eᵢ)), K = 28.648
- **Archer equation** (broad-beam, Monte Carlo) used for Tc-99m, F-18, I-131, Lu-177
- **Narrow-beam** (exponential + NIST XCOM) used for all other nuclides
- Photon filter: G/X rays only, E ≥ 20 keV, yield ≥ 0.01%
- Half-lives stored in seconds internally; display format handled separately
- Dose types: H*(10) for d ≥ 25 cm (whole body), H'(0.07) for d < 25 cm (extremities)

## Calculation Logic

When editing calculator logic (decay, dose, clearance), always verify that cumulative/aggregate calculations account for all input parameters (e.g., number of administrations, weight, attenuation factors). Test edge cases after changes.

## Domain Knowledge

Regulatory references use RD 1029/2022 (not RD 783/2001). Dose limits: effective dose 20 mSv/year, lens of eye 20 mSv/year, skin 500 mSv/year.

## UI / Styling Guidelines

Dark mode is supported. When adding or modifying UI elements (tables, tooltips, graphs, markers), always check both light and dark mode contrast and visibility. Tooltips must not be clipped by overflow containers.

## Data

- Edit `data/nuclides.json` to add/modify nuclides, then regenerate `data/nuclides-data.js` to keep offline support in sync
- Nuclide ID format: `"C-11"`, `"Tc-99m"`, `"I-131"`, etc.

## Key References

- Cornejo 2006 — dose rate constant methodology
- Oumano et al. 2025 — shielding validation
- ICRU Report 57, ICRP Publication 74
