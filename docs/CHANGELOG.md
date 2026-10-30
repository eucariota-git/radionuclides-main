# Changelog — NM Radionuclide Planner

History of changes, newest first. **This file is a record, not a description of the current behaviour**: older entries describe methods that were later replaced — in particular the reconstructed h'(0.07) column (replaced by ICRP 74 Table A.21 in v1.7.0) and the automatic selection of H'(0.07) below 25 cm (removed in 2026-07; both quantities are always shown). For what the application does now, read `README.md` and `docs/USER_GUIDE.md`.

## 2026-10

### v1.22.0 — review of another AI's analysis (16 points, each checked against the sources)
- **Dose** (1, 2): the lens limits read «exposed workers» (art. 11.2.a) and the guide separates workers (art. 11) from members of the public (art. 15: 1 mSv/y, lens 15 mSv/y, skin 50 mSv/y). The accessible names of the Γ columns read the unit as «square metre per hour per GBq».
- **Effluent** (3, 4): the inhalation coefficients state AMAD 1 µm (ICRP 119), not applicable to gases or vapours (Method, report, data). **I-131 has no default administered activity** and is not included by default: the workbook's 0.8 GBq was the activity at discharge, so the source term was not represented; the field asks for the facility's value, notes for reference that patients usually leave hospital with less than 0.8 GBq, and an empty field is an error only when I-131 is included (closes T06). `effluent-scenarios.json` 2.6.0. The default example is now Lu-177 only (0.01718 / 2.376 mSv/y); with I-131 and 0.8 GBq entered the former 0.0199 / 2.74 mSv/y.
- **Y-90** (5, 10): the container bremsstrahlung constants are labelled **hypothetical values** — no documented derivation (geometry, wall thickness) or measurement — on screen, report, CSV, README and guides; the numbers are unchanged. «No photon line passes the app's filter» instead of «no photon line».
- **Γ provenance** (6, 7): the Γ^H*(10) of Cs-137 and Mo-99+Tc-99m keep the published value; 24 of the 32 lie within ±2 % of Cornejo (the guides said 23); «due to updated nuclear data» removed (cause not established). `references/icrp107/README.md` updated (no published Ga-68 value, BET parsed, automatic search, published-value check vs regression); `validate-constants.js` declared a regression check.
- **Caregiver** (8, 9, 15): the category warning refers to the category adopted in this application (children: public criterion at every age), not to the Forum; Demir's ± presumed mean ± SD; Spanish button label in the Spanish guide; RD 601/2019 (arts. 6.2 and 7.2) in the references; full title of Gayol Vilorio et al. (2025) (`caregiver.json` 1.13).
- **Licences and development** (11, 12, 13): distribution to third parties waits for the ICRP permission (DEVELOPMENT, README); LICENSE.TXT keeps its name, its place at the root is a packaging choice, and the case-insensitivity claim is removed (notices and About); the package smoke test runs from the repository with `--base` pointing at the extracted copy.
- **Data** (14): Cr-51 modality «other» (non-imaging tracer), `nuclides.json` v1.6.
- **Updates** (16): the guides say a reload serves the update once it has been downloaded and installed, and to check the footer version.
- Test 35; browser-smoke cases (Effluent defaults and I-131, Dose limits, Y-90).

### v1.21.0 — version shown in the footer
- The footer of every page ends with the application version (`· v1.21.0`), written from `UTILS.APP_VERSION` by `UI.initVersion()` into an empty `.app-version` span (`translate="no"`), so it always matches the code that is running, also when the service worker serves a cached copy; after an update the second load shows the new number.
- Version numbering: 1.x until the first release distributable to third parties (ICRP permission obtained and acceptance test completed on that version), which becomes 2.0 (`docs/DEVELOPMENT.md` § Release routine).
- Guides (EN/ES): the version is in the footer. Test 34; browser-smoke case.

### v1.20.3 — second full audit 2026-10-30: findings A-1…A-8
- **A-1, Spanish screens.** Translated: the Table B note pieces in Decay (each piece is now its own element: note, «Progeny: …», «⚠ As printed in the BOE: …», with the four BOE inconsistencies in Spanish), the «Γ recalculated … differs … from the published Cornejo et al. value» warning, the composite Mo-99+Tc-99m notes, the H'(0.07) source line and the Cs-137 Γ source.
- **A-2.** The source texts of Cs-137 and Mo-99+Tc-99m (H'(0.07)) and of Ga-68 (K-air) no longer cite internal audits; values unchanged (`nuclides.json` v1.5, new content hash).
- **A-3.** `THIRD_PARTY_NOTICES.md` and its About copy cite the CSN Resolution of 16 June 2025 (`csn_exemption`, art. 13 LPI).
- **A-4, Decay report.** Regulatory values with `fmtSig` (no false decimals: 1×10⁶ Bq, 100 kBq/kg); the «at t» rows and parts only when a time was entered; the exemption note and the sources name the CSN resolution for Y-88 / Ba-133; the A1 mixture note only when the nuclide has an A1 level.
- **A-5, Caregiver.** `CAREGIVER.invalidFields` lists the out-of-range fields (same ranges as the status checks) and the page marks them (`aria-invalid`); an invalid criterion or number of cycles is no longer echoed in the summary or the report as if applied.
- **A-6.** The Decay and Dose charts have `role="img"` and an `aria-label`.
- **A-7, Dose.** The limit comparison adds the public limits of RD 1029/2022 art. 15.2 — lens 15 mSv/y and skin 50 mSv/y — on screen and in the report.
- **A-8.** CLAUDE.md: the photon filter includes annihilation photons (AQ), as the code and the guide say.
- Test 33; browser-smoke case.

### v1.20.2 — full audit 2026-10-30: observations O-1…O-3
- **O-1, CSN exemption values for Y-88 and Ba-133.** RD 1217/2024 Annex II A.3.a refers nuclides not in Table B to the values set by the CSN; the CSN Resolution of 16 June 2025 (Plenary of 11 June 2025, published on the CSN website, not in the BOE) sets Y-88 10 kBq/kg · 1 × 10⁶ Bq and Ba-133 100 kBq/kg · 1 × 10⁶ Bq. `data/regulatory.json` v1.1.0 keeps them in their own block `csn_exemption` (never mixed with Annex IV; the build aborts if a nuclide is in both); `REGULATORY.exemptionB` returns them with status `csn`. Properties and Decay show them as «CSN value» with the resolution as source (screen, report and CSV); the A1 «not tabulated» state does not change (the resolution sets no clearance level). The «not tabulated» text of Table B now says which CSN values the app includes.
- `tools/build-regulatory-data.js`: the hand-added A1 progeny Es-254m → Fm-254 is now read from the library CSV (corrected there on 2026-10-18) and checked. Annex IV, Table B and F.1 contents unchanged (only the library CSV hashes, whose headers were updated).
- **O-2.** The Properties e(g) note reads «RD 783/2001 Annex III table a), kept in force».
- **O-3.** The F.1 `f1` field is renamed `f1_over_1y` (it is the «> 1 y» column; for 58 rows the source notes another adult f1) and labelled «f1 (> 1 y)»; the I-131 Effluent ⓘ reads «Activity per treatment at hospital discharge (default of the reference workbook), NOT the administered activity» (`effluent-scenarios.json` 2.5.1).
- Guides (EN/ES) and README: Y-88 / Ba-133. Test 32; browser-smoke case.

### v1.20.1 — second screen-text review (author's comments)
- **Dose**: «Point-source approximation (1/d²)» under Distance only as the short-distance warning (< 0.25 m); the limits are cited once, in the first line of the comparison box (RD 1029/2022 arts. 11 and 15), without the footer.
- **Effluent**: top warning reduced to «Screening estimate, not a complete discharge assessment»; «the two scenarios … are never added together» moved next to the totals, and the IS-28 II.A.4 / mixture-clearance sentence to Method. Source term: the notes under the activity field are an ⓘ next to each nuclide (amber for I-131); the A_adm note leaves the screen (the full model is in «Sources and assumptions»), and the I-131 and F-18 warnings head that collapsible list.
- **Caregiver**: the top warning keeps the scope and the criteria wording; «not the individual effective or fetal dose; internal contamination and the dose before discharge are not included» moved to Method › Assumptions (`caregiver.json` v1.12, also in the report). Category basis and profile distances in ⓘ (`UI.setHintTip`), with the Method link still visible; the fast half-life note only when the field is off; the cohabitation-table rules in an ⓘ on «During (h/d)». The port note stays at the end of Method (traceability, collapsed).
- Guides (EN/ES): Effluent step 1. Test 31; Test 28 and browser-smoke cases updated.

### v1.20.0 — authorship, ⓘ field help and documentation coherence
- **Authorship**: José Ramón Sendón del Río is named as author of the application, the data compilation and the PHITS coefficients of the Effluent page — copyright line of `LICENSE`, `LICENSING.md`, notices, README, page footers («Application, code and data compilation»), a new «Author» row in every report header (`UTILS.APP_AUTHOR`), an «Author» section in the guides (EN/ES) and the source of every PHITS coefficient («PHITS calculation by …; available from the author on request»). Data files carry it: `notes.author` (nuclides.json; content hash unchanged, version kept), `meta.author` (regulatory.json, caregiver.json v1.11, effluent-scenarios.json 2.5.0) and `notes.compiled_by` (ICRP 107 index); the regulatory builder and the ICRP 107 parser write it too.
- **ⓘ field help**: fixed explanations of a field moved from under the field to an ⓘ next to its label (hover, keyboard focus or tap; the box opens under the label and stays inside a 390 px screen; translated by the Spanish overlay). Decay: elapsed time, mass. Dose: patient transmission, decay integration. Effluent: every parameter, facility type; column headers with the Properties tooltip instead of `title`. Caregiver: kinetics preset, radiopharmaceutical, end of the fast phase, product-information minimum, «Restriction» header. Warnings, values that change and input rules stay visible.
- **Documentation**: README aligned with the app (all five pages in the introduction, Decay mass and kBq, Report / PDF in the four calculators, Scenario 1 wording, workbooks «adapted», floor or upper asymptote, occupancy bounds, intermediate values, photon spectrum panel, module list). Guides mention the ⓘ help.
- Properties: the «ICRP 107 not loaded» message is shown in the table instead of a blocking dialog.
- Test 30 and browser-smoke cases (ⓘ hidden, shown when tapped, inside the screen, Spanish).

### v1.19.1 — neutral texts for any professional
- Caregiver: the criteria per category are «evaluation criteria adopted in this application» («Other criterion» sets your own) instead of «adopted by the department»; the children's criterion is «a choice of this application». Same wording in the report, the data notes (`caregiver.json` v1.10), the guides, the README and the notices.
- Effluent: the Scenario 2 reference workbook is no longer named by its case-file style name; the PHITS coefficients cite the author's report by nuclide and date («available on request»), without internal report codes, deviation codes or «approved». The exact report version (first 12 characters of its SHA-256) moves from the screen to the report and to a new CSV column `k_report_SHA256_12`. Geometry note: «found in published data for Spanish plants». `effluent-scenarios.json` 2.4.0.
- Notices: ICRP permission status updated (requested 2026-10-15, pending); «distributed to third parties» instead of «outside the author's organisation».
- Test 29 checks that no distributable file contains institutional or internal-document wording.

### v1.19.0 — screen texts: repeated information removed, warnings kept once
Review of the text shown on each page against the Guide, the page's own collapsible notes and the field labels. A regulatory warning stays visible once, where the result is read; repetitions go to the collapsible blocks or are removed. Reports and CSV files are unchanged.
- **Properties**: the table footer is a link that opens the reference notes; the «Rep. energy» tooltip is one sentence; the detail panel no longer repeats the generic Γ source text, the Table B criteria (already in the panel and the notes) or the IS-28 caveat (already under the value). The ingestion note appears only when several chemical forms are tabulated.
- **Decay**: «Results update as you type» and the target-activity hint removed; the Table B exemption note is one line (separate criteria, Σ Aᵢ/limitᵢ ≤ 1 for several sources, single nuclide, justified practice).
- **Dose**: one-line subtitle; shorter hints for patient transmission and decay integration; no Notes column (the Γ values were already in the summary line, which now also says that without an H'(0.07) constant the skin dose of low-energy emitters may be underestimated); «Shielding methods available» moved from the results warning into Shielding details (shown only with a shield); the limit comparison no longer repeats the limit values in its footer.
- **Effluent**: shorter top warning and source-term note (the full model is under «Sources and assumptions of the default source term»); hints that only repeat their label are not shown (the data file, the parameter sources and the report keep them); PRTR-España moved to the sludge-production hint; the size comparison of each geometry moved to the parameter sources; the Scenario 1 photon-only limitation is one sentence, with the full note in Method. The source-term warnings are shown only for included nuclides (the F-18 note appeared with F-18 excluded), and the tank status only when a nuclide is in tanks. The intermediate result columns (DF, concentrations, FD) are hidden by default: **Show intermediate values**.
- **Caregiver**: shorter top warning; the presets note no longer repeats the Preset hint (`caregiver.json` v1.9); fast-phase hint «0 = no fast phase»; no hint under the disabled manual criterion; the occupancy-bounds note, the inverse note (meaning of «Unattainable») and the curve paragraph shortened, details in Method; the adopted-restriction note is not repeated when the status already says the days are missing.
- Guides (EN/ES): Effluent steps 2 and 4. Spanish texts for every new English text. Test 28 and browser-smoke cases (F-18 note, intermediate columns).

### v1.18.1 — fixes of the audit of v1.18.0 (2026-10-22, A-06, A-07)
- **A-06** Caregiver occupancy bounds: with a restriction ending inside a 24 h interval (e.g. 1.5 d) the split day was prorated (h/24 × fraction), so a timetable with the full daily hours in that half day (audit case: 8 h at 0–8 h and 24–32 h, 0.187 mSv) exceeded the upper bound (0.160 mSv). That timetable has 16 h of contact where the daily-average dose counts 12 h: the daily-average dose does not represent it either. The bounds are now given only when every restriction that changes the contact ends at a whole number of days from discharge (the adopted restriction always does); otherwise «Not available» with the reason, on screen, in the report and in the CSV. Texts say «the declared hours in every 24 h interval from discharge».
- **A-07** The bounds walked one 24 h interval per day: restrictions of 10¹² d blocked the page. Runs of whole intervals with one occupancy and one exponential are now summed as geometric series; the cost depends on the number of changes, not on the days.
- No dose, inverse result or self-check changes. `caregiver.json` v1.8; Test 27 now checks explicit block timetables independent of h/24 (start, end, random), the A-06 case and the A-07 timing; browser-smoke case for A-06.

### v1.18.0 — Caregiver: bounds of the daily-average occupancy
- The dose uses occupancy averaged over the day (h/24), as the source workbook, the Foro CSN-SEPR-SEFM (2011) and Gayol Vilorio et al. (2025) do. The page now bounds that approximation for any timetable with the declared hours of each period: the rate falls, so in each 24 h interval from discharge it lies between its values at the end and at the start. Lower and upper bound, and their ratio to the daily-average dose, are shown under the results, in the report and in the CSV (rows `occupancy`). With the days empty they refer to the dose with the adopted restriction.
- For one exponential the ratios are x·e^−x/(1 − e^−x) and x/(1 − e^−x), x = λ·24 h (Lu-177 physical half-life ×1.053; 85.7 h ×1.100). The fast phase widens them: defaults without restriction ×0.75 to ×1.35; with the adopted 3 d, 2.32 to 3.69 mSv (×0.79 to ×1.26) for 2.93 mSv.
- Informative only: no dose, inverse result or self-check changes (workbook port still to 1e-9), and no criterion is attached to the upper bound. Assumption on h/24 rewritten (sign of the error; the Forum's Annex 3.A, eqs. 4 and 7, takes the start-of-day rate for the period without restrictions). Method formula, guides (EN/ES) and Spanish texts.
- `caregiver.json` v1.7; Test 27 and browser-smoke cases.

### v1.17.4 — fixes of an external audit (2026-10-22, A-01…A-05)
- **A-01** Caregiver: after an invalid entry the row doses of the cohabitation table (outside the result block) kept the previous case's values; they are now cleared with the rest of the results and come back when the entry is corrected.
- **A-02** Caregiver self-check: with the days empty it could say «OK» having checked nothing of the current case (a 0-day answer, or a missing criterion). Every answer of the inverse calculation now has its own independent check with the hour model — positive minimum, 0 d, not dependent, unattainable (both kinds), restriction increases — and a case with nothing to check is «current case not checked (no current result to verify)», never OK. A missing criterion with the days empty is named in the status. Introduced in v1.17.1.
- **A-03** Caregiver: with the days empty, a «during» schedule over 24 h/d rejected the whole case although a 0-day restriction never applies it and already met the criterion (audit case: 2 µSv/h, 0.998 mSv). Without days only the schedule after the restriction is checked against 24 h/d; a positive common restriction is still «not applicable» as before. Introduced in v1.17.1.
- **A-04** The category warning of the cohabitation scenarios spoke of the category «the Forum assigns»; for children it is the department's choice (1 mSv at any age; the Forum's Table 2 gives 3 mSv over 10 years). It now says «adopted in this application».
- **A-05** Acceptance sheet: A14.d and A15.b described the old Calculate/recalculate behaviour; the B denominator was 13 for 15 checks. Updated, with a new case A20 for A-01…A-03.
- Wording of the sources, also from the audit: Kurth 2018 — «discrepancy between abstract and table» instead of «erratum» (no published correction located); Monserrat 2023 — the normality test refers to the half-lives, not to the discharge rate.
- `caregiver.json` v1.6; Test 26 and browser-smoke cases (A-01, A-03); test/README baseline.

### v1.17.3 — Caregiver: cohabitation table header and note
- The first column of the cohabitation table is «Row» («Fila»): «Contact» repeated the name of the first row of the child scenarios.
- Under the table, a one-line hint with the input rules only (hours of the two rows mutually exclusive; 0 h = no contact, distance may be left empty; 0.1 m = contact). The old note spoke of «Sleeping in the same room», which only fits the partner scenario.
- Its calculation statements moved to Method › Assumptions (and the report notes): «Restriction days are counted from discharge. The criterion covers only the administrations entered; it does not by itself demonstrate annual compliance.» Integration of each cycle to infinity was already there.
- `caregiver.json` v1.5; Test 25 check.

### v1.17.2 — Caregiver: children always 1 mSv; rows «Contact» / «Proximity»
- Children of any age take the public criterion (1 mSv), a department decision: the scenario «Child over 11 years» now proposes and accepts only the public category (it proposed «Carer ≤ 60», 3 mSv, from Table 2 of the Forum). «Work with children» still proposes the Forum's 0.3 mSv and accepts the public criterion without a warning.
- Row names of the child and work scenarios: «Contact» and «Proximity» (Spanish «Contacto» / «Proximidad»), and «Contact at work», instead of «Close contact» / «Nearby», which read too alike.
- `caregiver.json` v1.4; Test 24 and browser-smoke (Spanish row names) updated.

### v1.17.1 — Caregiver: restriction days empty by default
- The cohabitation table no longer opens with 3 d in both rows. That value was the reference case of the source workbook v6, not a value from the product information or the Forum, but on screen it looked recommended. The days now start empty and must be entered or taken from the inverse calculation.
- Without days the page still gives everything that does not depend on them: dose with an indefinite restriction, minimum and adopted restriction, dose with the adopted restriction, the curve and the self-check of the inverse calculation. The dose of the table, the margin and the maximum rate need the days. The status says so, and the button «Use the adopted restriction in the table» is highlighted. Days in only one row remain an error of the other row.
- With days entered every result is unchanged (workbook port to 1e-9). Acceptance case A16 and the guide example now apply the adopted restriction (3 d) after opening. The product-information minimum stays a separate optional field; the Forum tables are not used as a fixed default, because their days depend on the rate and the person.
- `caregiver.json` v1.3. Test 25 and browser-smoke cases (state on opening, button → A16).

### v1.17.0 — Caregiver: spread of the presets and cohabitation scenarios of the Forum
- **Spread in the source** under each kinetics preset: the dispersion the source publishes, with its statistic named. Lu-177-PSMA workbook preset: dose rate at 1 m 15 ± 4 µSv/h at 6 h and 7 ± 2 µSv/h at 24 h (Demir 2016, Table 1); slow half-life 40.5 ± 15.8 h, 21.7–85.7 h (Kurth 2018, Table 3, 48 h) — the abstract's «± 9.6 h» is the SD of the 72 h column, an erratum of the source; the fast half-life has no published dispersion (mean + 2 SD of Demir gives 16.9 h, the workbook «high» case). Monserrat 2023: medians with (minimum, Q1, Q3, maximum), not SD. Gayol Vilorio 2025: only medians, with the spread of the literature values of its Table 2. Forum I-131: fixed values. No SD is derived from ranges or quartiles. Values checked on the page images of the sources. Also in the report.
- **Cohabitation scenario** selector in B: Foro CSN-SEPR-SEFM (2011), Table 3.B 1 and its paragraph on co-workers (partner, five child age groups, co-worker, work with children) fill the hours and distances of both rows, name the rows and propose the category; a category the Forum does not assign gives a warning, never a block, and the dose does not change. The restriction days are never touched. Any manual edit switches to the **free scenario**, which keeps the table and lets the user name the rows (report and CSV use those names). A scenario distance the proximity profile does not list (1.5 m in «DOTATATE measured») is flagged.
- **Method › Cohabitation conditions**: Table 3.B 1, the co-worker paragraph (8 h at 1 m; pregnant co-worker assessed individually; work with children 3 h at 1 m + 3 h at 0.1 m; contact taken at 0.4 m; 0.3 mSv from section 4.6) and a reproduction check: with the conditions as printed, the app reproduces the 16 cells of Tables 3.B 3 and 3.B 4 for the partner < 60 (2 mSv), children < 1, 2–5 and 5–11 years (1 mSv) and general work (0.3 mSv); it does not reproduce the columns > 11 years (2 cells), 1–2 years (8 cells) and work with children (1 cell). The tables cite «condiciones en Rivas 2002»; no other set of conditions can be identified conclusively, so Table 3.B 1 is used as printed.
- Child over 11 years: category proposed from Table 2 of the Forum (3 mSv, «children over 10 and adults up to 60»), with a note that the public criterion (1 mSv) is the more conservative choice.
- `caregiver.json` v1.2. Spanish catalog and guides updated. Test 24 and browser-smoke cases (scenario fill, category warning, free scenario and its row names in the report, missing distance, Method table, dark mode).

### v1.16.1 — linear or logarithmic spectrum axis
- Properties, photon spectrum: a **Log / Linear** button pair chooses the scale of the y axis, in the yield and in the Γ H*(10) share views. Logarithmic stays the default (yields span about four decades and the weak lines matter behind a shield); the linear scale starts at zero and reads the dose shares directly, and its note says that lines below about 1 % of the tallest are not visible (the table lists them all). The choice is kept while other nuclides are opened. Same data in both scales (browser-smoke case).

### v1.16.0 — optional Spanish screens
- **EN / ES button** in the header. English stays the default; the choice is stored. «ES» applies a display overlay (`js/i18n.js`) that rewrites only the text already rendered — text nodes, `title`/`placeholder`/`aria-label`/`data-tooltip`/`data-label`, option texts and chart labels — from a catalog (`js/i18n-es.js`). It never writes a field or option value, and no calculation module, data file, report builder or CSV builder refers to it.
- **Exact-match catalog**: an entry applies only to the exact English text it was written for, so a corrected English sentence shows in English (never a stale translation) until its entry is updated; a test fails on any orphaned entry. Context-dependent entries (CSS selector) and anchored patterns for texts with values (captures copied unchanged).
- **Terminology**: `docs/I18N_GLOSSARY_ES.md`, each term with its source (RD 1029/2022, RD 1217/2024, IS-28, CSN/SEPR/SEFM documents) or marked as a decision of the author (e.g. «haz amplio», «solo cribado orientativo»); quantity names with a decimal comma in Spanish (H'(0,07), Hp(0,07)), «a» as the year symbol (mSv/a).
- **Translated**: the five pages, their messages and errors, chart legends and axes, the printed reports, and the notes of the data files (regulatory, effluent and caregiver data, example applications). References, citations, source identifiers, coefficient sources and CSV files stay as published (`translate="no"`). Reports print in the language of the screen.
- **Spanish guide**: `docs/USER_GUIDE.es.md`, a parallel of the English guide (which prevails), generated into About and shown when the screens are in Spanish; the page index follows it. Licence texts and third-party notices stay in English, with a link to the official Spanish text of the EUPL.
- The About guide showed the tags of `E<sub>max</sub>` as text: the guide generator now accepts `<sub>`/`<sup>`.
- Tools: `tools/i18n-coverage.js` lists, page by page and state by state, the texts left in English and the entries never used.
- Checked: for the same case in EN and ES the field and option values, chart data and CSV are identical on every page; switching back restores the initial text exactly; live recalculation in ES (20 changes ≈ 0.5 s); Spanish pages without horizontal overflow at 1280 and 390 px. Test 23 fails on a catalog entry whose English text no longer exists and on Spanish and English guides with different outlines.
- On phones the menu wraps to a second row instead of scrolling (the Spanish names are longer). About now loads `utils.js`: its decimal button did nothing in v1.15.

### v1.15.1 — review of the decimal change (D-01…D-03)
- **CSV with a point in every case** (D-02): the Dose range warnings («99.9 % of the dose weight…», «1.0×10⁴ mfp», «30.0 keV») were stored already formatted with the display separator, so the `Shielding_validity` column of a CSV exported in comma mode carried commas. They are now also built inside `UTILS.withPoint`, and the CSV uses that version; screen and report keep the user's separator.
- **«Read as …» note** (D-01): it stayed after a value written by the page (Effluent and Caregiver «Defaults», kinetics presets, adopted restriction) and kept the old separator after a switch. It is now refreshed on every render of those pages and after a switch (`UI.refreshNumberHints`).
- **Selectors** (D-03): the Caregiver category list («Co-worker — 0.3 mSv») is rebuilt on a separator switch, keeping the selection; the Dose material densities (ρ = 11.35, 7.874, 2.30, 1.60 g/cm³) follow the separator (`option[data-num-label]`).
- Found by an independent review of v1.15.0, which found no change in any computed value; its own scripts now give identical CSVs in point and comma mode. Test 22 and browser-smoke cases for each finding.

### v1.15.0 — decimal point or comma
- **Input**: every numeric field accepts a decimal point or a decimal comma, the same in every browser (`UTILS.parseNumber`). The fields were `type="number"`, which left the interpretation to the browser: with the browser set to English, «0,3» was read as **3** without any error, and «1.000,5» as 1.0005 in any language. Now a value with two separators or a thousands group is rejected with the inline error, and a single separator followed by exactly three digits («1.500») is accepted as a decimal with a note under the field saying how it was read. The fields are text with a decimal keyboard on phones (full keyboard where the default is in exponent notation, e.g. 1e-7); they no longer have spinner arrows.
- **Display**: the interface stays in English for every user; the decimal separator of results, tables, charts (ticks, legends, tooltips) and reports follows a header button **1.5 / 1,5** — by default the browser's number locale, the choice stored. Switching redraws the page without losing the inputs. Quantity names (H'(0.07)), identifiers and references (ANS-6.4.3, §5.2.1, versions) and explanatory text keep the point.
- **CSV** exports always use the decimal point (machine-readable and reproducible), whatever the display setting.
- Tests: Test 21 (parser, formatters in both modes, CSV point) and browser-smoke cases (comma and point typed in English and Spanish browsers, `1.000,5` rejected, `1.500` note, switch to comma on the five pages with no displayed value left with a point, report with comma, CSV with point, default by browser language).

### v1.14.0 — usability and presentation review
- **Defects**: the property cards of Properties (and the shielding cards of Dose) upper-cased their labels, which turned «β E<sub>max</sub>» into «Β EMAX» (a capital beta reads as a Latin B), «μ» into «Μ» and «keV» into «KEV»; labels now keep their case. The Dose report announced «the limit screening in this report» but did not contain it: it now carries the same indicative comparison with the RD 1029/2022 annual limits as the screen (none for Y-90), and prints the distance once when it was entered in metres («0.3 m», not «0.3 m (0.3 m)»).
- **Live calculation in Decay and Dose**, as in Effluent and Caregiver: no Calculate button and no «inputs changed — recalculate» notice (copy audit T19). An invalid entry is named in a box under the form, the field is outlined (`aria-invalid`) and the results are hidden until it is corrected, so the report and the CSV always describe the inputs on screen. No `alert()` or `confirm()` remains in the calculators; for extended ICRP 107 nuclides the «NOT manually validated» confirmation is replaced by a permanent warning in the results. Effluent and Caregiver also mark the offending field.
- **Decay** without elapsed time or target date shows A₀ and says that the values are at t = 0 (it used to fill four boxes with A₀, 100 %, 0 h and 0); the report says «none entered».
- **Dose**: patient transmission is one optional field (empty = no patient attenuation; still no default value), instead of a Yes/No selector plus a disabled field. On phones the results table is stacked, one card per quantity.
- **Properties**: on screens ≥ 1240 px the table grows with the page and its header sticks under the site header (it was a 420 px box showing 7 of 40 nuclides); narrower, the box is as tall as the viewport allows. The provenance column wraps instead of widening the table. The photon-line table is a collapsible block without its own scroll box, and energies are printed to 0.1 keV, the resolution of the ICRP 107 index («65.0» next to «65.1», not «65»).
- **Navigation and look**: a «Guide» entry in the main menu of every page; own SVG icons (CSS masks, theme-aware) instead of emoji in card titles, buttons and the theme toggle; the theme follows the device's light/dark setting until the user chooses one (the choice is stored and wins). On phones the header is no longer pinned and takes two rows (logo and theme button, then the menu) instead of three.

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
