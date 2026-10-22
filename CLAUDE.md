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
js/ui.js          UI — dark mode, print, keyboard, stale-result notice, chart theme (also sets Chart.js locale)
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
- **Data constants** (e.g., CLEARANCE_A1, dose rate constants) should be stored in external data files (JSON), not inline in HTML. When adding new constants, follow this pattern.

## Physics Notes

- Dose rate constant: Γ [μSv·h⁻¹·GBq⁻¹·m²] = K × Σ(nᵢ × h(Eᵢ)), K = 28.648
- **Archer equation** (broad-beam, Monte Carlo; Oumano et al. 2025 fit the transmission of dose at 1 cm depth in tissue — NOT H*(10); the app applies it to both operational quantities as an approximation and must say so) used for Tc-99m, F-18, I-131, Lu-177 with Pb or concrete only (Fe has no fit) — its parameters already fit the FULL photon spectrum, never combine with spectral weighting
- **Spectrum-weighted narrow beam with build-up** T(x) = Σ wᵢ·min(1, B(Eᵢ, μᵢx)·e^(−μᵢx)) for all other curated nuclides (`shielding_spectrum` field, regenerated with `tools/add-shielding-spectra.js`) and for ICRP-107 extended nuclides (spectrum built at selection time with `PHYSICS.buildShieldingSpectrum` — never shield them with the single representative line: >10× error for 153 multi-line nuclides); single-line narrow beam (also with build-up) is the internal fallback for any nuclide without a stored spectrum
- **Buildup B(E, mfp)**: ANSI/ANS-6.4.3 EXPOSURE response (absorption in air — NOT the report's "energy absorption" tables, which are dose in the shield medium). `PHYSICS.getBuildup`, Pb/Fe/concrete tables from NUREG/CR-5740 Table 3; Pb K-edge must not be interpolated across; validity 0–40 mfp. `Fe` means elemental iron (ρ = 7.874 g/cm³), not generic steel
- Conversion table (`PHYSICS.ICRU57`): ICRP 74 (1996) Table A.21, h*(10) and h'(0.07,0°) per unit fluence, the 25 printed energies only (no 1.25 MeV node; 1.5 MeV keeps the printed 6.90 despite the 7.04 column product). It is the ONLY copy: tools load it from js/data.js. Regenerate curated Γ with `tools/recalc-gamma.js` (dry run by default; chain-aware; never touches cornejo_validation), then `add-shielding-spectra.js` and `generate-data.js`
- Photon filter: G/X rays only, E ≥ 20 keV, yield ≥ 0.01% (boundary INCLUDED — Cornejo states > 0.01 %; documented project choice)
- Half-lives stored in seconds internally; display format handled separately. Every curated half-life carries `half_life_source` (ICRP 107 (2008) or DDEP/LNHB, set by `tools/set-half-life-sources.js`); a new or edited value must name its source and match it — never an unsourced number
- Beta endpoint `e_max_beta_MeV` = LAST energy of each ICRP 107 BET block (the row with N = 0 — never drop it; the old `N > 0` filter kept the previous grid node, Lu-177 0.45 instead of 0.4978 MeV). `beta_yield_per_decay` = integral of the block; it flags negligible branches (Tc-99m 3.7e-5). Curated values are copied from the index with `tools/sync-beta-emax.js` (Ra-223/Ac-225: chain maximum, `e_max_beta_chain`)
- After any UI, chart or data change run `node tools/browser-smoke.js` as well as the four suites (it renders the pages; the suites do not).
- **Extended ICRP 107 nuclides include their short-lived progeny in equilibrium by default** (`ICRP107.progeny`: descendants with T½ ≤ 1/10 of the chain parent's and ≤ 30 d — an app criterion, not regulatory — at the Bateman ratio). Dose has an include / parent-only selector and must state the choice in the result line, report and CSV. Curated chains (`chain_members`: Ra-223, Ac-225, Pd-103 + Rh-103m) include their progeny in Γ AND in the shielding spectra (same ratios). The ICRP 107 parser must keep metastable daughters (`[mn]?` in the daughter regex)
- `nuclides.json`: one version = one content. Any content change → bump `version`, update `notes.content_sha256` and the pinned pair in `test/validate-data.js` (`DB_CONTENT_SHA256`). Curated half-lives equal their declared source exactly (`tools/set-half-life-sources.js`)
- Formatting: reference data with `UTILS.fmtSig` (no false decimals, ×10ⁿ), results with `UTILS.fmt`, values read against a limit with `UTILS.fmtRatio`. CSV cells through `UTILS.csvSafe` (never turns a negative number into text). Chart.js tick labels: en-US, no thousands separator (set in `js/ui.js`)
- Chart colours only from `UI.getChartTheme()` (CSS tokens, light and dark) and re-coloured on `nm-theme-change`; validate new categorical palettes with the dataviz script (red vs orange and blue vs purple failed). Caregiver chart: curve green, criterion red dashed, indefinite restriction blue dotted, adopted restriction neutral, table case as a marker
- Charts: use `type: 'linear'` axes with `{x, y}` points. On a category axis Chart.js reads `min`/`max` as INDICES (the Decay curve showed 7 of 33 d until 2026-10-14) and markers snap to grid nodes
- Dose quantities: H*(10) and H'(0.07) are AREA-monitoring operational quantities and are always shown side by side — never reintroduce the old automatic "d < 25 cm → extremities/H'(0.07)" rule (no normative basis; removed 2026-07 per audit finding 2). Personal dosimetry quantities are Hp(10)/Hp(0.07)/Hp(3); the limit comparison in dose.html is labeled indicative screening only. H*(10) is NOT always ≥ H'(0.07) (e.g. Pd-103 −40%)

## Calculation Logic

When editing calculator logic (decay, dose, clearance), always verify that cumulative/aggregate calculations account for all input parameters (e.g., number of administrations, weight, attenuation factors). Test edge cases after changes.

## Domain Knowledge

Regulatory references use RD 1029/2022 (not RD 783/2001). Dose limits: effective dose 20 mSv/year, lens of eye — both conditions must be satisfied: 50 mSv/y max annual AND 100 mSv over any consecutive 5-year period (current regime since 22 Jun 2024), skin 500 mSv/year.

RD 1217/2024 Annex IV: Table A1 (clearance; exemption of unlimited quantities) and Table B (exemption ≤ 1000 kg: column 2 concentration, column 3 total activity) are DIFFERENT criteria (Annex II A.1 a/b/c) — never fill one with the other, never treat B's columns as simultaneous conditions. Look values up through REGULATORY for any nuclide (curated or extended); a missing row is "not tabulated" (A1 → Annex III.1.b, RP 122 Part 1; B → Annex II A.3.a, CSN values), never "exempt". Public dose coefficients: cite RD 783/2001 Annex III tables a)/b), kept in force by RD 1029/2022 DT 3ª and the CSN Resolution of 3 April 2024; ICRP 119 F.1/G.1 is only their numerical transcription.

IS-28 Anexo II II.A.4 (liquid discharges to public sewer) has THREE numeric conditions. The app implements only the per-nuclide concentration level (1 mSv / e(g))/600 L. It does not evaluate the mixture sum of fractions Σ(Cᵢ/Lᵢ) ≤ 1 or the annual activity limits (≤ 10 GBq H-3, ≤ 1 GBq C-14, strictly < 1 GBq the sum of the rest). RD 1217/2024 clearance is implemented only for a single nuclide; mixture clearance must be evaluated separately. Always present single-nuclide values as "individual level", not as a complete discharge/clearance assessment.

Effluent page (`effluent.html`): Scenarios 1 (sewer inspector) and 2 (STP sludge operator) are DIFFERENT receptors — never add their doses. Source term: A_adm = patients × cycles × administered activity (all excreted); the in-hospital fraction leaves through the facility (for nuclides in decay tanks only their proportional share of the annual tank discharge, default 1 GBq/y for the sum, no decay credit); the rest is excreted at home. Scenario 1 gets only what leaves the hospital, diluted in the facility's annual water volume; Scenario 2 gets that plus the home part × catchment fraction; its PHITS k (600 × 200 × 50 cm water slab, receptor at 1 m) is photon-only, bremsstrahlung not bounded. A nuclide without a Scenario 2 external coefficient (F-18) keeps its inhalation; its external pathway is null (never zero) and the scenario total is flagged as a PARTIAL sum (`complete: false`, `missing`) everywhere. Solids fraction, 5090 t/y and the 1 GBq/y tank default are site hypotheses / boundary values, not regulatory values. Scenario 2: screening model, all discharged activity retained in one year of sludge (C = Q/S, SRS-19 §4.9 b), decay only during transit to the press. External coefficients k are own PHITS effective-dose-rate values (ICRP 116 ROT) for 10 × 10 × 3 m and 45 × 45 × 3 m sludge masses, receptor at 2 m — never replace them with point-source Γ, and never claim they cover the infinite slab NUREG prescribes (Lu-177 L45 captures 73–75 % of it). Inhalation uses ICRP 119 G.1 adult PUBLIC coefficients (Lu-177/Lu-177m/Tc-99m/F-18 type M, I-131 type F). The dose criterion is user-defined; do not attribute a regulatory basis to it. The workbook's I-131 shortcut (NUREG B.7 factor rescaled by dry mass only) is replaced by the explicit model and kept only as an indicative cross-check.

Caregiver inverse: with more weighted contact during the restriction than after it (fr > fn) restricting INCREASES the dose — the answer is 0 d if the 0-day dose meets the criterion, else «restriction increases», and the indefinite-restriction value is an upper asymptote, not a floor (deliberate deviation from the workbook; the usual case fr < fn still reproduces the workbook and the 324 cells of Gayol Vilorio et al. 2025, whose 6 h tables round to the nearest day although the text says «por defecto»).

Caregiver page (`caregiver.html`): faithful port of the workbook v2.1 (sheets Dosis, Curva, Comprobación) — keep it numerically identical to the workbook (test reproduces its preloaded case and curve to 1e-9; that case = page defaults + 3 d, `wbInput()` in the tests). Since v1.17.1 the restriction days start EMPTY (the workbook's 3 d looked like a recommendation): the inverse results, the curve and the self-check work without them (`out.tableReady`); table dose, margin and maximum rate need them (`out.ready`). Do not default the days to an SmPC or Forum number. Two CONSECUTIVE exponentials (the slow phase starts from the rate reached at the end of the fast phase; never a simultaneous sum of components), each cycle integrated to infinity. The measured operational quantity is used as an estimator of external exposure, not as effective or fetal dose. Distances come only from the profile list (no interpolation); contact 0.1 m takes the 0.4 m factor (1/0.4)² in the approximate profiles. The criteria per category (3/5/1/0.3 mSv) are department evaluation criteria, not regulatory values for this treatment (RD 601/2019 requires carer constraints but sets no number): 3 mSv ≤ 60 y and 0.3 mSv third persons from EC RP 97 / Foro 2011; 5 mSv > 60 y from ICRP 103 para. 351 / ICRP 94 / IAEA SSG-46 para. 2.49 (international 5 mSv per episode), applied to the whole treatment. Do not add the 15 mSv of RP 97 just because it is published. The criterion never changes the calculated dose.

Caregiver cohabitation scenarios (`cohabitation_scenarios`, v1.17.0): Foro 2011 Table 3.B 1 + its co-worker paragraph, as printed. They fill hours/distances of both rows and propose the category; never the restriction days; a category the Forum does not assign is a warning, not a block; any manual edit → free scenario (user names the rows). With Table 3.B 1 the app reproduces Tables 3.B 3/3.B 4 for partner < 60 (2 mSv), children < 1, 2–5, 5–11 (1 mSv) and general work (0.3 mSv); NOT > 11 y (2 cells), 1–2 y (8) and work with children (1) — the tables cite «Rivas 2002»; do not «fix» Table 3.B 1 by fitting (too many free parameters). Preset `spread`: only the statistic the source publishes (Kurth 2018 slow T½ SD = 15.8 h from Table 3; the abstract's 9.6 h is the 72 h column), never an SD derived from ranges or quartiles.

## UI / Styling Guidelines

Dark mode is supported. When adding or modifying UI elements (tables, tooltips, graphs, markers), always check both light and dark mode contrast and visibility. Tooltips must not be clipped by overflow containers.

Calculators recalculate live (Decay/Dose through `UI.onInputs`, Effluent/Caregiver through their `render()`); there is no Calculate button. Input errors go to the page's `#calcError` box through `UI.inputErrors` (field marked `aria-invalid`) and hide the results and the snapshot — never `alert()`/`confirm()`. Decimal separator: the interface is English for everyone; numeric fields are `type="text"` `.num-input` read ONLY with `UTILS.parseNumber` (point or comma; never `parseFloat` or `type="number"`, which read «0,3» as 3 in an English browser); displayed values use `UTILS.fmt/fmtSig/fmtRatio/toSci/num/dec` (user's separator), fields are written with `UTILS.inputValue`, every CSV builder runs inside `UTILS.withPoint` — and any text stored at calculation time that goes into a CSV must be built inside `withPoint` too (a stored string cannot be re-formatted: Dose `shieldWarningsPoint`). Selector texts with values: `option[data-num-label]` or rebuilt on `nm-decimal-change`. `dec()` only on value strings, never on prose or identifiers (ANS-6.4.3, §5.2.1, H'(0.07)). Pages redraw on `nm-decimal-change`. Optional Spanish screens: a display overlay (`js/i18n.js` + catalog `js/i18n-es.js`) over the English app — never translate in the calculation path, never write values from it, never make app logic read rendered text. When you change an English UI text, update its Spanish entry (Test 23 fails on orphaned keys); terminology from `docs/I18N_GLOSSARY_ES.md`; references and identifiers go in `translate="no"` elements. Icons are the project's own SVGs as CSS masks (`.ico .ico-<name>` in style.css), not emoji. No `text-transform: uppercase` on labels that can contain symbols or units (it turned β into a Latin-looking B).

## Data

- Edit `data/nuclides.json` to add/modify nuclides, then regenerate `data/nuclides-data.js` to keep offline support in sync
- Nuclide ID format: `"C-11"`, `"Tc-99m"`, `"I-131"`, etc.

## Workflow and release

- Commits go directly on `main` (no branches). Push and package only when the user asks.
- Release routine (details in `docs/DEVELOPMENT.md` § Release routine): bump `APP_VERSION`/`APP_BUILD` (`js/utils.js`) and `CACHE_VERSION` (`sw.js`, same value) and the expected build in `test/validate-app.js`; CHANGELOG entry; a numbered «Test N» block in `test/validate-app.js` per review and, for rendered behaviour, a case in `tools/browser-smoke.js`; four suites + browser-smoke; commit; `node tools/build-package.js` (clean tree required; re-runs the suites from the staged copy — checks that read `tools/` or `.gitignore` must be skipped when absent).
- The service worker installs with `cache: 'reload'` (an update otherwise kept the old files) and precaches the small JSON sources; after an update the second load serves the new version.
- Headless Chrome checks on Windows: SHORT `--user-data-dir` (long paths break Cache Storage), override `alert`/`confirm`/`print`, kill only your own Chrome. Never close the user's browser.
- Audit reports are local only (`docs/AUDIT_*.md`, gitignored). When the user asks for an audit without file changes, deliver it in the chat.
- Bash heredocs with backslashes or nested quotes break: write helper scripts to the scratchpad and run them, or use the Edit tool.

## Status and pending (as of 2026-10-22, v1.17.1)

- v1.17.0 (Caregiver: preset spread + Foro Table 3.B 1 cohabitation scenarios) and v1.17.1 (restriction days empty by default, build v61): committed, not pushed, not packaged; pending the author's review of the new Spanish texts and of the category proposed for children > 11 y (3 mSv per Forum Table 2 vs 1 mSv).
- Last package built: `dist/nm-radionuclide-planner-v1.16.1.zip` (SHA-256 5546a896…, commit e2858ed, pushed); manual checks of DEVELOPMENT § Verify (file://, HTTP(S), PWA, offline) not yet done for it.
- v1.14.0 (usability and presentation review), v1.15.0 (decimal point or comma) and v1.15.1 (fixes D-01…D-03 of an independent review) pushed (03cc8d0), not packaged. v1.16.0 (optional Spanish screens: engine, glossary, catalogs of the five pages, reports, data notes and Spanish guide) pushed (7009fb8), not packaged; pending the author's review of the Spanish texts (`docs/I18N_GLOSSARY_ES.md` items marked D or P) and acceptance row B15. English stays the default. Pending decision: saving and reopening a case (`UI.saveHistory`/`loadHistory` exist but are unused); a results summary near the top of Effluent.
- **External distribution blocked by data rights**: permission requested from ICRP (permissions@icrp.org, 2026-10-15, personal capacity) for ICRP 74 Table A.21 (50 values), ICRP 119 Table G.1 (5 inhalation coefficients) and the Table F.1 chemical-form labels. When the reply arrives, update «Status / permissions» in `THIRD_PARTY_NOTICES.md` and its copy in `about.html`. DDEP/LNHB: no restriction, citation requested (done). Cornejo et al. 2015 (SEPR): courtesy request deferred until ICRP answers.
- Professional use: the acceptance sheet (`docs/ACCEPTANCE_TEST.md`) has not been completed for the current version (the local copy is v1.2); PHITS coefficients of Effluent need an external technical review.
- Open by the user's decision: T06 (I-131 0.8 GBq «at discharge» in Effluent), T13 (clinical uses without reference), Cs-137/Sm-153/Tm-170/Ac-225 half-lives kept on ICRP 107. Demir et al. 2016: local copy is a proof — compare Table 1 with the published version when available.
- Not implemented: IS-28 mixture sum and annual limits, RD 1217 mixture clearance, Effluent scenario 4 (A11/A12, PRTR). IS-28 rev. 1 is in CSN public consultation — check before relying on the II.A.4 level.

## Licensing

- Original project code and documentation are licensed under EUPL-1.2 only; `LICENSING.md` defines the precise scope.
- Do not describe the whole repository as EUPL or MIT. Chart.js and @kurkle/color retain their upstream MIT licences, while ICRP and other third-party data retain the terms in `LICENSE.TXT` and `THIRD_PARTY_NOTICES.md`.
- Keep the licence text and scope summary embedded in `about.html` synchronized with `LICENSE`, `LICENSING.md`, `LICENSE.TXT` and `THIRD_PARTY_NOTICES.md`. `docs/USER_GUIDE.md`, not `README.md`, remains the canonical source for the in-app guide: the `<article id="user-guide">` of `about.html` is generated with `node tools/build-about-guide.js` (never edit it by hand; a test checks it is up to date). The Spanish guide `docs/USER_GUIDE.es.md` is a parallel kept by hand (same section outline, tested) and generated into `<article id="user-guide-es" hidden>`; the English guide prevails. Licence texts and third-party notices stay in English (`translate="no"`).

## Key References

- Cornejo 2015 — dose rate constant methodology
- Oumano et al. 2025 — shielding validation
- ICRU Report 57, ICRP Publication 74
