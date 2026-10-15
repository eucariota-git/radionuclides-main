# Changelog — NM Radionuclide Planner

History of changes, newest first. **This file is a record, not a description of the current behaviour**: older entries describe methods that were later replaced — in particular the reconstructed h'(0.07) column (replaced by ICRP 74 Table A.21 in v1.7.0) and the automatic selection of H'(0.07) below 25 cm (removed in 2026-07; both quantities are always shown). For what the application does now, read `README.md` and `docs/USER_GUIDE.md`.

## 2026-10

### v1.13.3 — DDEP reuse terms checked
- The LNHB nuclear-data page sets no reuse conditions and asks that the DDEP evaluations be cited (*Metrologia* articles, BIPM-5 monograph *Table of Radionuclides*), checked 2026-10-15: the third-party notices, their copy in About and the references now say so and cite the BIPM-5 monograph. The Cornejo et al. (2015) constants remain «attribution only, terms not checked».

### v1.13.2 — presentation of Properties and of the Caregiver chart
- Properties: the «Γ source» column keeps a minimum width, so between ~700 and ~1100 px the rows no longer grow to ~160 px (one word per line); β E<sub>max</sub> note starts with its unit (MeV), like the other cards; the reference notes separate clearance (Table A1, not tabulated → RP 122 Part 1) from the exemption of moderate quantities (Table B: column 3 for sources, column 2 for materials, separate criteria; not tabulated → Annex II A.3.a, CSN values).
- Caregiver chart: the case of the cohabitation table is marked on the curve (restriction → treatment dose; a horizontal line when the two rows have different restrictions); colours validated for colour-vision deficiency in light and dark — curve green, criterion red dashed, indefinite restriction (floor or upper asymptote) blue dotted and drawn on top of the curve, adopted restriction a neutral vertical line — with the values in the legend.

### v1.13.1 — second-opinion review of v1.13.0
- **Caregiver inverse with more contact during the restriction than after it** (fr > fn): the app answered "The restriction does not reduce the dose" even when no restriction already met the criterion, and called the dose with an indefinite restriction a "floor" although the curve rises towards it. Now: minimum and adopted restriction 0 d when the 0-day dose meets the criterion, otherwise "Unattainable: … any restriction increases the dose"; the value is named an upper asymptote in the table, chart, report and CSV; a warning flags the table; and a product-information minimum that pushes the dose above the criterion is stated in the adopted-restriction note. Unchanged for the usual case fr < fn (workbook parity and the 324 cells of Gayol Vilorio et al. 2025 still reproduced).
- **CSV of Dose and Decay**: for an extended nuclide `Database_version` names the ICRP 107 index (generation date, NDX SHA-256) instead of the curated nuclides.json.
- **PWA update**: the service worker now fills its cache with `cache: 'reload'`. An update test (v1.13.0 installed, then v1.13.1 served on the same origin) showed the new cache v51 filled with the OLD files from the browser's HTTP cache, so the app kept running 1.13.0; it now runs 1.13.1 from the second load, also offline.
- `validate-constants`: the three unsourced Γ references (I-123, Co-60, In-111 — old app values) are removed; their published values are checked against Cornejo in `validate-data`.

### v1.13.0 — distribution audit of v1.12.2 (F-01…F-08); database nuclides.json v1.4
- **Database version** (F-01): `nuclides.json` changed in v1.12.0 but kept "v1.3", so two different contents carried the same label in reports and CSVs. It is now **v1.4**, with `notes.content_sha256`; `test/validate-data.js` pins each version to its content hash.
- **Progeny in the Dose report and CSV** (F-02): a new report row and CSV column *Progeny* state whether Γ includes the short-lived progeny (included / EXCLUDED, with the Bq/Bq ratios) or the curated chain. Extended nuclides no longer cite Cornejo et al. (2015) among the report sources, and the report header names the ICRP 107 index instead of the curated database.
- **CSV exports** (F-03): the formula-injection guard no longer turns negative numbers into text (Caregiver margin "'-2.86" → -2.86); shared `UTILS.csvSafe` for the five exports.
- **Third-party notices** (F-04): DDEP (LNHB/CEA) half-lives and Cornejo et al. (2015) constants added to `THIRD_PARTY_NOTICES.md`, its copy in About and `LICENSING.md`.
- **IS-28** (F-05): the reference cites the correction of 11 November 2010 and the CSN consultation on a revision 1.
- **Phones** (F-06): the Caregiver cohabitation table is stacked as one card per row with the column names.
- **Repository** (F-07): the Caregiver source PDFs and workbook are git-ignored like the other local references. **Offline** (F-08): `caregiver.json` and `effluent-scenarios.json` are precached (no 503 in the console).
- Shielding spectra of chain entries use their `chain_members` ratios, the same as Γ (Pd-103: Rh-103m 1.001 Bq/Bq; weights change by ≤ 1·10⁻⁵).

### v1.12.2 — collapsible Method sections
- Effluent and Caregiver: the *Method* card is collapsed by default and opens from its title, like the reference notes of Properties; titles name what they contain. Collapsible card titles now show a ▸/▾ marker (the Properties one had none) with keyboard focus outline. Links pointing inside ("Model and sources under Method", "see Method › Criteria per category") open the section before scrolling.

### v1.12.1 — no thousands separator on chart axes
- Chart.js's en-US formatter printed "1,000" keV on the photon-spectrum axis, which a Spanish reader takes for a decimal comma. Default tick labels of linear and logarithmic axes no longer group thousands (all pages).
- Photon spectrum: the yield axis ends a factor 2 above the tallest line instead of at the next decade (a 100 % line put the top at 1000 %).

### v1.12.0 — review of v1.11.0 (R-01…R-11)
- **Extended entries with short-lived progeny** (R-01): Γ came from the parent's lines only, so Ge-68 and Sr-82 showed no photon dose and Sn-113 a third of it. The ICRP 107 parser dropped metastable daughters (`[mn]?` missing in the daughter regex: Mo-99 listed only Tc-99, Cs-137 and Sn-113 none); fixed and the index regenerated (114 decay records, no other field changed). `ICRP107.progeny()` adds the descendants with T½ ≤ 1/10 of the parent's and ≤ 30 d at their Bateman equilibrium ratio; Dose includes them by default with a *Short-lived progeny* selector (parent only for a fresh source), Properties shows both Γ and the spectrum with the emitter of each line.
- **Pd-103 includes Rh-103m** (56 min, always in equilibrium): Γ^H*(10) 20.51 → 22.7 and Γ^H'(0.07) 34.42 → 38.09 µSv·h⁻¹·GBq⁻¹·m², now 1.7 % and 0.2 % from Cornejo et al. (2015) (23.1 / 38.0) instead of −11 %.
- **Effluent** (R-02): a scenario total above the criterion turns the box red ("EXCEEDS IT"; amber above 50 %).
- **Γ^H'(0.07) of Cs-137 and Mo-99+Tc-99m** (R-03) calculated (92.27, 44.15) instead of copying H*(10) and attributing it to Cornejo, who publishes none for them. Ga-68 Γ^K-air reproduced (128.75 → 129) and documented (R-04).
- **Half-lives** (R-05): every curated value now equals its source exactly (18 entries were within 0.015 % but not equal; I-125 shows 59.39 d).
- **Formatting** (R-06…R-11): reference values at their significant figures (3880 Bq/L, not "3880.0"; 69400, not "6.9×10⁴"; Γ at 3 figures); ×10ⁿ notation throughout; chart ticks with a decimal point whatever the browser locale and in plain numbers; decay modes β-/β+/α instead of B-/A/ECB+; no duplicate t = 0 lines in Decay; short-distance warning in the Dose result; "Representative energy" explained; the Properties table hides the Γ-source column on phones.

### v1.11.0 — photon-spectrum chart in Properties
- The detail panel shows the photon spectrum as a chart above the table: energy on a linear axis, yield per 100 decays on a logarithmic axis, one colour per photon type (G, X, AQ; palette validated for colour-vision deficiency in light and dark), and a second view with each line's share of Γ^H*(10) (n·h*(10)(E), the same calculation that gives Γ; Lu-177 208 keV = 62.7 %). For Ra-223 and Ac-225 the share refers to the parent's lines only.
- One renderer for curated and extended entries replaces the two duplicated tables; the table header is now readable in dark mode.

### v1.10.6 — user guide rewritten
- The guide (and its copy in About) now gives, per page, the purpose, the use, the key limits and an example, and points to each page's *Method* and notes for formulas and sources instead of repeating them: 6742 → 3261 words. The developer-oriented "ICRP 107 data integrity" section is removed; the verified examples, references and transparency notice are kept.

### v1.10.5 — copy review 2026-10-14
- Errors fixed: wheelchair symbol on the Decay clearance heading; the Effluent coefficient sources no longer show the author's local folders (report file name and SHA-256 only, also in `effluent-scenarios.json` v2.3.0); one wording for the legal basis of e(inh); Caregiver references numbered consistently (`caregiver.json` v1.1); precise air-kerma tooltip; the user guide no longer points to an unshipped file, no longer lists ICRU as a data source, lists every source now used (DDEP, Caregiver articles and guidance) and every nuclide without a published comparison.
- Repetition removed: the regulatory chain and the IS-28 conditions are stated once in Properties (one-line tooltips); Dose states the "does not establish compliance" warning next to the limit comparison and merges the limits note; Effluent has a one-sentence subtitle, one statement of the tank boundary and shared coefficient sources stated once; Caregiver has a short subtitle, a one-line category hint and 9 assumptions instead of 14.

### v1.10.4 — database version
- `nuclides.json` is now **v1.3**. It had kept v1.2 since the first release although its content changed several times (ICRP 74 A.21 recalculation in v1.7.0, beta endpoints and half-life sources in v1.10.1–v1.10.2), so reports printed the same database version for different data. Rule added to the development guide: bump it whenever its content changes.

### v1.10.3 — caregiver criteria documented
- Caregiver: the basis of each criterion per category names its international source — 5 mSv per episode for carers in ICRP 103 (2007) para. 351, ICRP 94 (2004) and IAEA SSG-46 (2018) para. 2.49; 3 mSv up to 60 years and 0.3 mSv for third persons in EC RP 97 (1998) and the Forum (2011) — and states the scope: one person, the whole treatment (the ICRP "episode" read as the complete treatment). Values unchanged.

### Tooling — browser smoke test (audit 2026-10-14, M-07; no application change)
- `tools/browser-smoke.js` renders the six pages in headless Chrome/Edge and fails on console errors, horizontal overflow (1280 and 390 px), Chart.js category axes or points outside the axes, wrong key values (acceptance cases) and a dark-mode toggle that does not recolour the charts. Against v1.10.0 it reports the N-01, N-02, N-06 and N-08 defects; v1.10.2 passes 62/62.

### v1.10.2 — half-life provenance and presentation (audit 2026-10-14, N-03, N-06)
- Every curated half-life now names its source (`half_life_source`, shown in Properties and in the reports). Checked against ICRP 107 (2008) and the DDEP recommended values (LNHB/CEA, consulted 2026-10-14): 23 match ICRP 107 and 12 match DDEP within 0.015 %. Five matched neither and were replaced: Lu-177 6.6443 d, Y-90 2.6684 d, O-15 122.266 s and Mo-99 2.7479 d (DDEP), K-42 (ICRP 107). Lu-177 changes by +0.03 %: the Scenario 2 effluent results rise by 0.01 %.
- Properties: modality tags use the filter labels (Therapy, Other…).
- Caregiver: 3 significant figures on screen and in the report (the CSV keeps 6).
- Effluent: the E (mSv/y) column comes right after the nuclide in both result tables.
- Decay: the concentration chart uses a logarithmic axis, so the crossing with the Table A1 level is visible.

### v1.10.1 — audit 2026-10-14 (N-01, N-02, N-04, N-05, N-07, N-08, N-09)
- Decay: the curve now covers its whole time range. Its category axis read the time `max` as an index, so Lu-177 (33 d) was cut at 7.1 d and Tc-99m (30 h) at 6 h since the first release; the elapsed-time and Table A1 marks now sit at their exact time.
- Dose: the "d = X m" mark sits at the exact distance (it snapped to the nearest 0.05 m node) and the curve extends past 5 m when the requested distance does.
- Properties: β E<sub>max</sub> is the true endpoint. The ICRP 107 parser dropped the last BET row (the endpoint, N = 0) and kept the previous grid node in 954 of 955 spectra (Lu-177 0.45 → 0.4978 MeV, K-42 3.2 → 3.525 MeV). The beta yield per decay is now stored and shown; minor branches (Tc-99m) and chain progeny (Ra-223, Ac-225) are labelled. Y-90 and Cs-137 gain the value. New `tools/sync-beta-emax.js`.
- Caregiver: a 0-day solution is no longer rejected when the common "during" schedule would exceed 24 h/day (regression of v1.9.1); that check applies only to a positive common restriction.
- Effluent and Caregiver register the service worker, so a direct first visit also installs the offline cache.
- Notices and About: attribution of the Caregiver sources (Monserrat Fuertes 2023 and Kurth 2018, CC BY 4.0; Demir 2016; Gayol Vilorio 2025; Foro 2011). Acceptance sheet: cases A16–A19 and checks B12–B13; test README, development guide and manifest updated.

### v1.10.0 — caregiver kinetics presets
- Caregiver: kinetics presets for Lu-177-PSMA-617 (Demir 2016 / Kurth 2018 — the workbook default — and Gayol Vilorio 2025), Lu-177-DOTATATE (Gayol Vilorio 2025, Monserrat Fuertes 2023) and I-131 NaI (Foro CSN-SEPR-SEFM 2011: ablation, metastases, hyperthyroidism). They fill the kinetics, cycles and profile only; the measured rate, discharge time, category and cohabitation stay as entered.
- The Forum's «vida media efectiva» (3 / 5 / 7.2 d) is the mean life 1/λ of its equations: converted to half-lives (× ln 2), checked by reproducing its Tables 3.B 3 and 3.B 4.

### v1.9.1 — caregiver review fixes
- Inverse calculations and the dose-vs-restriction curve are withheld when applying the same restriction to both rows would put more than 24 h/day in the restriction period (the source workbook does not check it and could recommend an impossible schedule).
- The minimum restriction of the product information must be empty or ≥ 0; negative values are rejected by the engine, not only by the form.
- With rejected inputs there is no curve, and the self-check reports "current case not checked" instead of OK on the reference cases alone.
- The caregiver CSV carries the warnings, the adopted-restriction note and the self-check state on every row.

### v1.9.0 — caregiver dose page
- New **Caregiver** page (`caregiver.html`, `js/caregiver.js`, `data/caregiver.json`): port of the workbook *Dosis_acompanantes_simple_v2.1.xlsx* — external dose to one caregiver or family member after discharge, two consecutive effective half-lives, day-time and sleeping cohabitation during and after a restriction, equal cycles, criteria per category, inverse calculations (maximum discharge rate, minimum and adopted restriction, floor), dose-vs-restriction curve, self-check, report and CSV. Reproduces the workbook to within 1e-9 (relative) on its preloaded case and its curve.
- Reports: the *Database* row and the ICRP 107 common source are printed only when the report uses them.

### v1.8.1 — audit 2026-10-04 (A01–A07)
- Decay: the target activity is validated before any result is shown; negative or non-numeric entries are rejected, and a target of zero is reported as never reached in finite time, on screen and in the report.
- Decay, Dose and Effluent: values that overflow after unit conversion or in the products are rejected instead of producing results.
- Documentation: the Archer fit is described consistently as transmission of dose at 1 cm depth in tissue; this history moved out of the README; acceptance sheet counts 15 cases and labels Y-90 as an experimental scenario.
- Notices: the Oumano article and the BOE texts are stated to be in the source repository, not in the package; the status of the ICRP 74 / ICRP 119 reuse permission is stated (not requested as of 2026-10-04).
- Data: `generated_at` and `last_modified_at` of `data/nuclides.json` are stamped consistently by the generators.

### v1.8.0 — copy audit 2026-10-03 (texts and labels, T01–T38)
- Dose: photon-less nuclides no longer imply that bremsstrahlung is the only external hazard; the Archer fit is described by its real quantity (dose at 1 cm depth in tissue); Y-90 and Archer results export a specific validity state instead of "within range".
- Decay: the concentration denominator is "Mass of material being assessed" (CSV columns `Material_mass_input` / `Material_mass_unit`, formerly `Vial_weight_*`).
- Guide: the shielded Tc-99m example and its "Safe" verdict were wrong and are replaced by a reproducible unshielded case; steps rewritten to the real controls. The in-app copy is generated from `docs/USER_GUIDE.md` (`tools/build-about-guide.js`).
- Decay and Dose: target-activity states, "inputs changed" notice, exports from the calculated snapshot, dose-equivalent wording, first HVL/TVL.
- Properties: provenance of the constants per quantity (`gamma_Kair_source`), reasons instead of dashes, corrected application texts.
- Effluent: receptor, geometries and retained fraction described as modelled; short input hints with the provenance in collapsible blocks.

### v1.7.0 — conversion table and audit 2026-10-03
- **Conversion coefficients now ICRP 74 (1996) Table A.21** for both h\*(10) and h'(0.07,0°): the former h\*(10) values above 1 MeV (untraced since the first commit) were 3–20 % low, and h'(0.07) was a reconstruction. Curated Γ and shielding spectra regenerated; 30 of 37 recalculated entries change (Na-24 +2.5 %, I-131 Γ^H'(0.07) +2.9 %).
- `tools/recalc-gamma.js` rewritten: uses the app's own table, keeps chain progeny (Ra-223, Ac-225), never overwrites `cornejo_validation`, dry run by default.
- Integrated dose uses −expm1(−λt)/λ (no cancellation for very long-lived nuclides).

## 2026-06

### Round 3 (v1.2) — buildup factors
- **Exposure build-up added to all narrow-beam shielding** (spectral and single-line): T = Σ wᵢ·min(1, B·e^(−μx)) with ANSI/ANS-6.4.3 point-isotropic exposure buildup factors (NUREG/CR-5740 Table 3; NRC/ORNL report released for unlimited distribution — the underlying ANSI/ANS-6.4.3 standard is © ANS — values transcribed programmatically and verified visually against the scan). Closes the last documented non-conservative gap — without B, transmitted dose behind thick shields was underestimated (concrete: factor 2–10+). HVL/TVL and required-thickness now solved numerically. Cross-validated against the Archer fits (ratios 0.5–2.1 at 2–10 HVL). Archer nuclides unchanged. This round added 18 tests; subsequent work has expanded the math suite further.

### Round 2 (data v1.1)
- **Spectrum-weighted narrow-beam shielding:** single-energy attenuation underestimated transmitted dose for multi-line emitters (Ga-67 behind 5 mm Pb: ×10¹² error; I-123: ×430). All non-Archer nuclides now use T(x) = Σ wᵢ·e^(−μ(Eᵢ)x) over their dose-weighted ICRP 107 lines (`shielding_spectrum`, 39 nuclides incl. the Mo-99+Tc-99m and Cs-137+Ba-137m equilibria and the Ra-223/Ac-225 chains). Archer nuclides are unaffected (their parameters already fit the full spectrum). HVL/TVL and required-thickness solve the spectral equation numerically.
- **Chain max photon energy fixed:** Ra-223 632 → 1196.3 keV, Ac-225 526.1 → 1567.1 keV (progeny lines — Pb-211 832 keV, Tl-209 1567 keV — were missed by the original generation).
- **Printable calculation reports** (`js/report.js`): Dose and Decay calculators generate a formal report (timestamp, database version, nuclide validation status, inputs, results, method, sources, disclaimer, sign-off line) via the 📄 Report / PDF button.
- **PWA:** `manifest.json`, the icons in `assets/icons/` and a cache-first service worker (`sw.js`) — installable on Android/desktop, fully offline once visited.
- **Clearance verification completed:** Lu-177 = 100 kBq/kg (plus Sm-153, Ho-166, Tm-170, Yb-175) visually confirmed against the official RD 1217/2024 PDF (p. 96).
- Decay calculator shows a secular-equilibrium note for chain entries (Ra-223, Ac-225).

### Critical
- **ICRP 107 RAD parser fix:** the block-header regex did not accept half-lives in scientific notation ("2.00E+5y"), so the photon blocks of **77 nuclides** were silently absorbed into the previous nuclide (e.g. Re-186 absorbed Re-186m, inflating its Γ by +101%; Ho-166 absorbed Ho-166m; the Ra-223/Ac-225 chain daughters had no photons at all). All 1252 RAD blocks now match their declared emission counts; Re-186 Γ^H*(10) = 3.86 matches the published Cornejo value exactly.
- **h'(0.07) column rebuilt:** the previous fluence-to-H'(0.07) column failed a kerma-ratio consistency test (implied H'(0.07)/Ka up to 3.7 — physically impossible). Rebuilt as (Ka/Φ)·hK'(0.07,0°) from ICRP 74 / PTB-Dos-34 (≤100 keV exact) plus anchors derived from Cornejo's published per-line contributions; ≥500 keV uses the kerma approximation h'(0.07)≈h*(10). Reproduces the four published Cornejo Γ^H'(0.07) values within −9.4% … +4.0% (Pd-103 −9.42%, In-111 +0.37%, I-125 +3.96%, Xe-133 +3.27%; the Pd-103 gap reflects updated ICRP-107 data). The **Dose** calculator always shows the real Γ^H'(0.07) constant in the H'(0.07) row (it exists for every photon emitter).
- **Clearance levels verified** against RD 1217/2024 Anexo IV Tabla A.1 (BOE-A-2024-25205 consolidated HTML): 28 non-null values confirmed; Ga-67 and Yb-169 are NOT listed in Tabla A.1 and now carry null.

### New
- **6 therapy/imaging nuclides added** (34 → 40): Zr-89, Cu-67, Tb-161, Ho-166, Ra-223+daughters, Ac-225+daughters. Chain constants include progeny in secular equilibrium; Ra-223+progeny agrees within 6% with the published conservative constant (~50 μSv·h⁻¹·GBq⁻¹·m²). Generated by `tools/add-therapy-nuclides.js`.
- **Ingestion e(g) and liquid effluent limits** for the 6 new nuclides taken from ICRP Publication 119 Annex F, Table F.1 (adult), via `tools/add-ingestion-coeffs.js`. The same run cross-checked the 30 pre-existing adult e(g) values against Table F.1 — all match exactly; a new test guards them.

## 2026-05

### Critical Fixes
- **Y-90 time unit conversion:** Fixed calculation of exposure time — now correctly applies unit conversion (min/h/d) in dose estimation
- **Y-90 H'(0.07) selection:** Y-90 bremsstrahlung now correctly applies H'(0.07) for extremities (d < 25 cm) in PMMA, Pb, and W containers
- **Lens of eye limits (RD 1029/2022):** Updated regulatory compliance to reflect current limits (50 mSv/y max annual, 100 mSv/5-year cycle since 2024-06-22)

### Medium Priority
- **Y-90 data consolidation:** Zanzonico bremsstrahlung table now sourced from `PHYSICS.Y90_CONTAINERS` (single source of truth in `js/data.js`)
- **Chart.js offline support:** v4.4.0 bundled locally (`js/chart.umd.min.js`); no CDN dependency for offline compatibility
- **CSS variables:** Defined missing variables (`--border`, `--bg-elevated`, `--text-muted`, `--warning-100`, `--success`) for consistent styling

### Low Priority
- **Validation expansion:** Extended ICRP 107 compliance testing from 7 to 20 reference nuclides (Phases 1–3)
