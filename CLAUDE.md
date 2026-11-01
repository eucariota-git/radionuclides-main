# CLAUDE.md — NM Radionuclide Planner

## Project Overview

This project is a nuclear medicine radionuclide reference web app (Properties) with four calculators: Decay (with single-nuclide clearance/exemption), Dose (dose rate and shielding), Effluent (sewer and STP workers) and Caregiver (dose after discharge). The stack is plain HTML/CSS/JavaScript with no build tools.

## What This Project Is

A static web application for medical physicists and radiation protection specialists. It provides radionuclide properties, decay calculations, external dose estimation, liquid-effluent and caregiver screening, and indicative regulatory screening against Spanish regulations (RD 1029/2022, RD 1217/2024, IS-28; Directive 2013/59/Euratom) — never a compliance determination.

## Tech Stack

- **Pure vanilla JavaScript** — no frameworks, no build step, no package.json
- **Chart.js v4.4.0** bundled locally (`js/chart.umd.min.js`, no CDN) for offline support
- **Static site** — distributable as a self-contained local folder or through any static host; works offline (`file://`) and on Android (`content://`)

## Project Structure

```
index.html        Radionuclide properties database (curated table, ICRP 107 extended search, detail panel with photon-spectrum chart)
decay.html        Decay calculator
dose.html         External dose estimator
effluent.html     Liquid effluent screening — NUREG/CR-5814 Scenarios 1 (sewer inspector) and 2 (STP sludge operator)
caregiver.html    Caregiver dose after discharge — port of references/Dosis_acompanantes_simple_v2.1.xlsx
about.html        About, user guide (generated from docs/USER_GUIDE.md and docs/USER_GUIDE.es.md by tools/build-about-guide.js), licences and third-party notices

css/style.css     Shared styles (CSS variables, responsive grid)

js/data.js        PHYSICS module — ICRP 74 Table A.21 conversion coefficients, attenuation tables
js/physics.js     CALC module — decay, dose, Archer/spectrum/narrow-beam shielding algorithms
js/db.js          DB module — nuclide database, search/filter
js/report.js      REPORT module — printable calculation reports with traceability
js/effluent.js    EFFLUENT module — Scenario 1/2 data loading, unit conversion, cross-checks (no DOM)
js/regulatory.js  REGULATORY module — RD 1217/2024 A1/B, RD 783/2001 e(g), IS-28 levels (no DOM)
js/caregiver.js   CAREGIVER module — two-phase kinetics, cohabitation dose, inverse calcs, self-check (no DOM)
js/icrp107-loader.js  ICRP107 module — extended index search, Γ, progeny in equilibrium, index identity
js/utils.js       UTILS — APP_VERSION/APP_BUILD, fmt/fmtRatio/fmtSig/toSci, csvSafe, escapeHtml
js/ui.js          UI — dark mode, print, keyboard, stale-result notice, chart theme (also sets Chart.js locale), field help ⓘ, input errors
js/i18n.js        Optional Spanish screens: display overlay engine (exact, scoped and pattern catalogs)
js/i18n-es.js     Spanish catalog (terminology from docs/I18N_GLOSSARY_ES.md)
js/nuclide-id.js  NUCLIDE_ID — shared name normalization (177Lu, Lu177 → Lu-177)
js/chart.umd.min.js  Chart.js 4.4.0, bundled locally (MIT)

data/nuclides.json        Main radionuclide database (40 entries — source of truth)
data/nuclides-data.js     Auto-generated from nuclides.json for file:// compatibility
data/effluent-scenarios.json / -data.js  Effluent Scenario 1 and 2 parameters and coefficients (+ generated twin)
data/regulatory.json / -data.js  RD 1217/2024 Annex IV A1/B + adult public e(g) (built by tools/build-regulatory-data.js)
data/caregiver.json / -data.js   Caregiver profiles, criteria per category, references, workbook v6 reference cases

data/icrp107-index.json / -data.js     ICRP 107 extended index (1252 nuclides; built by tools/parse-icrp107.js from data/sources/, local only)

manifest.json / sw.js                 PWA manifest and cache-first service worker
assets/icons/                         Favicon, Apple Touch and install icons
                  (bump CACHE_VERSION in sw.js when data or app logic changes)

test/             Four Node suites (validate-math, -data, -constants, -app); see test/README.md
tools/            Data regeneration, packaging and browser-smoke.js (development only, not shipped)
docs/             USER_GUIDE (source of the About guide), CHANGELOG, DEVELOPMENT (maintenance and release routine),
                  ACCEPTANCE_TEST (clean template; ACCEPTANCE_TEST.local.md and AUDIT_*.md are local, gitignored)
references/       Source documents (most gitignored: copyrighted); dist/ — built packages (gitignored)
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
- **Data constants** (regulatory values in `data/regulatory.json`, dose-rate constants in `data/nuclides.json`, effluent and caregiver parameters in their JSON files) are stored in external data files, not inline in HTML. When adding new constants, follow this pattern.

## Physics Notes

- Dose rate constant: Γ [μSv·h⁻¹·GBq⁻¹·m²] = K × Σ(nᵢ × h(Eᵢ)), K = 28.648
- After any UI, chart or data change run `node tools/browser-smoke.js` as well as the four suites (it renders the pages; the suites do not).
- Formatting: reference data with `UTILS.fmtSig` (no false decimals, ×10ⁿ), results with `UTILS.fmt`, values read against a limit with `UTILS.fmtRatio`. CSV cells through `UTILS.csvSafe` (never turns a negative number into text). Chart.js tick labels: en-US, no thousands separator (set in `js/ui.js`)
- Chart colours only from `UI.getChartTheme()` (CSS tokens, light and dark) and re-coloured on `nm-theme-change`; validate new categorical palettes with the dataviz script (red vs orange and blue vs purple failed).
- Charts: use `type: 'linear'` axes with `{x, y}` points. On a category axis Chart.js reads `min`/`max` as INDICES (the Decay curve showed 7 of 33 d until 2026-10-14) and markers snap to grid nodes
- Y-90 container bremsstrahlung constants (`PHYSICS.Y90_CONTAINERS`) have no primary source and no documented derivation: always present them as HYPOTHETICAL values (screen, report, CSV, docs), never as estimates computed by a documented method; replace them only with measured or documented values (e.g. an own PHITS derivation).
- Dose quantities: H*(10) and H'(0.07) are AREA-monitoring operational quantities and are always shown side by side — never reintroduce the old automatic "d < 25 cm → extremities/H'(0.07)" rule (no normative basis; removed 2026-07 per audit finding 2). Personal dosimetry quantities are Hp(10)/Hp(0.07)/Hp(3); the limit comparison in dose.html is labeled indicative screening only. H*(10) is NOT always ≥ H'(0.07) (e.g. Pd-103 −40%)

## Calculation Logic

When editing calculator logic (decay, dose, clearance), always verify that cumulative/aggregate calculations account for all input parameters (e.g., number of administrations, weight, attenuation factors). Test edge cases after changes.

## Domain Knowledge

Regulatory references use RD 1029/2022 (not RD 783/2001). Dose limits: effective dose 20 mSv/year, lens of eye — both conditions must be satisfied: 50 mSv/y max annual AND 100 mSv over any consecutive 5-year period (current regime since 22 Jun 2024), skin 500 mSv/year.

RD 1217/2024 Annex IV: Table A1 (clearance; exemption of unlimited quantities) and Table B (exemption ≤ 1000 kg: column 2 concentration, column 3 total activity) are DIFFERENT criteria (Annex II A.1 a/b/c) — never fill one with the other, never treat B's columns as simultaneous conditions. Look values up through REGULATORY for any nuclide (curated or extended); a missing row is "not tabulated" (A1 → Annex III.1.b, RP 122 Part 1; B → Annex II A.3.a, CSN values), never "exempt". CSN values under A.3.a (Resolution of 16 June 2025: Y-88, Ba-133) live in their own block `csn_exemption`, status `csn`, labelled «CSN value» — never as Table B; add any later CSN resolution there. Public dose coefficients: cite RD 783/2001 Annex III tables a)/b), kept in force by RD 1029/2022 DT 3ª and the CSN Resolution of 3 April 2024; ICRP 119 F.1/G.1 is only their numerical transcription.

IS-28 Anexo II II.A.4 (liquid discharges to public sewer) has THREE numeric conditions. The app implements only the per-nuclide concentration level (1 mSv / e(g))/600 L. It does not evaluate the mixture sum of fractions Σ(Cᵢ/Lᵢ) ≤ 1 or the annual activity limits (≤ 10 GBq H-3, ≤ 1 GBq C-14, strictly < 1 GBq the sum of the rest). RD 1217/2024 clearance is implemented only for a single nuclide; mixture clearance must be evaluated separately. Always present single-nuclide values as "individual level", not as a complete discharge/clearance assessment.

## Scoped rules (`.claude/rules/`)

Area invariants load automatically when a matching file is read or edited: `physics-data.md` (Archer, spectrum shielding, build-up, ICRP 74 A.21, photon filter, half-life sources, beta endpoints, progeny, `nuclides.json` versioning), `effluent.md`, `caregiver.md`. When a task reaches those areas only through other files (`js/i18n-es.js`, `docs/USER_GUIDE*.md`, tests, CHANGELOG), read the matching rule first.

## UI / Styling Guidelines

Dark mode is supported. When adding or modifying UI elements (tables, tooltips, graphs, markers), always check both light and dark mode contrast and visibility. Tooltips must not be clipped by overflow containers.

Calculators recalculate live (Decay/Dose through `UI.onInputs`, Effluent/Caregiver through their `render()`); there is no Calculate button. Input errors go to the page's `#calcError` box through `UI.inputErrors` (field marked `aria-invalid`) and hide the results and the snapshot — never `alert()`/`confirm()`. Decimal separator: the interface is English for everyone; numeric fields are `type="text"` `.num-input` read ONLY with `UTILS.parseNumber` (point or comma; never `parseFloat` or `type="number"`, which read «0,3» as 3 in an English browser); displayed values use `UTILS.fmt/fmtSig/fmtRatio/toSci/num/dec` (user's separator), fields are written with `UTILS.inputValue`, every CSV builder runs inside `UTILS.withPoint` — and any text stored at calculation time that goes into a CSV must be built inside `withPoint` too (a stored string cannot be re-formatted: Dose `shieldWarningsPoint`). Selector texts with values: `option[data-num-label]` or rebuilt on `nm-decimal-change`. `dec()` only on value strings, never on prose or identifiers (ANS-6.4.3, §5.2.1, H'(0.07)). Pages redraw on `nm-decimal-change`. Optional Spanish screens: a display overlay (`js/i18n.js` + catalog `js/i18n-es.js`) over the English app — never translate in the calculation path, never write values from it, never make app logic read rendered text. When you change an English UI text, update its Spanish entry (Test 23 fails on orphaned keys); terminology from `docs/I18N_GLOSSARY_ES.md`; references and identifiers go in `translate="no"` elements. Fixed explanations of a field go in an ⓘ next to its label (`UI.hintTip(text)` or the static `.hint-tip` span, same text in `data-tooltip` and `aria-label`); warnings, changing values, input rules and links stay visible under the field. Author: José Ramón Sendón del Río (application, data compilation, PHITS coefficients) — keep `UTILS.APP_AUTHOR`, the licence line, the footers and the data `author` fields in step. Icons are the project's own SVGs as CSS masks (`.ico .ico-<name>` in style.css), not emoji. No `text-transform: uppercase` on labels that can contain symbols or units (it turned β into a Latin-looking B).

## Data

- Edit `data/nuclides.json` to add/modify nuclides, then regenerate `data/nuclides-data.js` to keep offline support in sync
- Nuclide ID format: `"C-11"`, `"Tc-99m"`, `"I-131"`, etc.

## Workflow and release

- Commits go directly on `main` (no branches). Push and package only when the user asks.
- Version numbers: 1.x until the first release distributable to third parties (ICRP permission obtained and acceptance test completed on that version) → 2.0 (user decision 2026-10-30). The footer shows the version from `UTILS.APP_VERSION` through `UI.initVersion()` (empty `.app-version` span, `translate="no"`) — never write the number in the HTML.
- Release routine (details in `docs/DEVELOPMENT.md` § Release routine): bump `APP_VERSION`/`APP_BUILD` (`js/utils.js`) and `CACHE_VERSION` (`sw.js`, same value) and the expected build in `test/validate-app.js`; CHANGELOG entry; a numbered «Test N» block in `test/validate-app.js` per review and, for rendered behaviour, a case in `tools/browser-smoke.js`; four suites + browser-smoke; commit; `node tools/build-package.js` (clean tree required; re-runs the suites from the staged copy — checks that read `tools/` or `.gitignore` must be skipped when absent).
- The service worker installs with `cache: 'reload'` (an update otherwise kept the old files) and precaches the small JSON sources; after an update the second load serves the new version.
- Headless Chrome checks on Windows: SHORT `--user-data-dir` (long paths break Cache Storage), override `alert`/`confirm`/`print`, kill only your own Chrome. Never close the user's browser.
- Audit reports are local only (`docs/AUDIT_*.md`, gitignored). When the user asks for an audit without file changes, deliver it in the chat.
- Bash heredocs with backslashes or nested quotes break: write helper scripts to the scratchpad and run them, or use the Edit tool.

## Status and pending (as of 2026-11-01, v1.23.0)

- v1.23.0 is the current version (last numbered block: Test 36): list indentation, Spanish «Coefficients used» notes, Effluent catchment 100 % and no workbook references; committed, not pushed or packaged. v1.22.0 pushed and packaged: `dist/nm-radionuclide-planner-v1.22.0.zip` (hash in its `.sha256`, commit 288d1cd). v1.20.3, v1.21.0 and v1.22.0: file://, HTTP, PWA install and offline reload checked headless on 2026-10-30. Every earlier version is pushed and packaged. Details per version in `docs/CHANGELOG.md`.
- User decisions (v1.21.0): the decimal button keeps «1.5 / 1,5»; commit author e-mail left as is.
- Spanish screens (v1.16.0+): English stays the default. Pending the author's review of the Spanish texts added in v1.16 (`docs/I18N_GLOSSARY_ES.md` items marked D or P, acceptance row B15) and in v1.18.0–v1.20.3; the v1.17 Caregiver texts were accepted (2026-10-22).
- Pending decisions: saving and reopening a case (`UI.saveHistory`/`loadHistory` exist but are unused); a results summary near the top of Effluent.
- Deferred by the user (2026-10-30): RP 122 Part 1 clearance values for nuclides not in Table A1 — assessment and plan in the project memory (`rp122-clearance-plan.md`).
- **External distribution blocked by data rights**: permission requested from ICRP (permissions@icrp.org, 2026-10-15) for ICRP 74 Table A.21 (50 values), ICRP 119 Table G.1 (5 inhalation coefficients) and the Table F.1 chemical-form labels. When the reply arrives, update «Status / permissions» in `THIRD_PARTY_NOTICES.md` and its copy in `about.html`. DDEP/LNHB: no restriction, citation requested (done). Cornejo et al. 2015 (SEPR): courtesy request deferred until ICRP answers.
- Professional use: the acceptance sheet (`docs/ACCEPTANCE_TEST.md`) has not been completed for the current version (the local copy is v1.2); PHITS coefficients of Effluent need an external technical review.
- Open by the user's decision: T13 (clinical uses without reference), Cs-137/Sm-153/Tm-170/Ac-225 half-lives kept on ICRP 107. Demir et al. 2016: local copy is a proof — compare Table 1 with the published version when available.
- Not implemented: IS-28 mixture sum and annual limits, RD 1217 mixture clearance, Effluent scenario 4 (A11/A12, PRTR). IS-28 rev. 1 is in CSN prior public consultation — check before relying on the II.A.4 level.

## Licensing

- Original project code and documentation are licensed under EUPL-1.2 only; `LICENSING.md` defines the precise scope.
- Do not describe the whole repository as EUPL or MIT. Chart.js and @kurkle/color retain their upstream MIT licences, while ICRP and other third-party data retain the terms in `LICENSE.TXT` and `THIRD_PARTY_NOTICES.md`.
- Keep the licence text and scope summary embedded in `about.html` synchronized with `LICENSE`, `LICENSING.md`, `LICENSE.TXT` and `THIRD_PARTY_NOTICES.md`. `docs/USER_GUIDE.md`, not `README.md`, remains the canonical source for the in-app guide: the `<article id="user-guide">` of `about.html` is generated with `node tools/build-about-guide.js` (never edit it by hand; a test checks it is up to date). The Spanish guide `docs/USER_GUIDE.es.md` is a parallel kept by hand (same section outline, tested) and generated into `<article id="user-guide-es" hidden>`; the English guide prevails. Licence texts and third-party notices stay in English (`translate="no"`).

## Key References

- Cornejo 2015 — dose rate constant methodology
- Oumano et al. 2025 — Archer broad-beam shielding parameters
- ICRP Publication 74 (1996) Table A.21 — fluence-to-dose conversion coefficients
- ICRP Publication 107 (2008) — nuclear decay data; DDEP (LNHB/CEA) — recommended half-lives
