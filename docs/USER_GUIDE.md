# NM Radionuclide Planner — User Guide

A web application for nuclear medicine radionuclide properties, decay calculations, external dose estimation, liquid-effluent screening (sewer and STP workers) and caregiver dose after the discharge of a therapy patient.

**Local distribution:** Keep the supplied folder intact and open `index.html` in a modern web browser.

---

## Quick Start

No installation or authentication is needed:

- **Direct from disk**: open `index.html`; the address will start with `file://`.
- **Local web server (optional)**: serve the folder with any static server and open its `localhost` address, for example `http://localhost:8000/`.
- **Browsers**: current Firefox, Chrome, Safari or Edge, on desktop or mobile.
- **Offline**: Calculators work offline with the complete local copy (opened from `file://`, or from the local cache of a copy first loaded over HTTP(S)); external references need a connection.
- **Install as app (PWA)**: served through `localhost` or HTTPS, a compatible browser offers "Install" / "Add to Home screen"; the app then runs standalone and fully offline.
- **Reports and CSV**: Decay, Dose, Effluent and Caregiver have a **Report / PDF** button (inputs, results, method, sources, disclaimer and sign-off line; use the browser's "Save as PDF") and a CSV export in which every row repeats the application version, build, data version, export time (UTC) and the inputs needed to reproduce the result.
- **Decimal point or comma**: every numeric field accepts either (`0.3` or `0,3`; also `1e-7`). A number with two separators or a thousands group (`1.000,5`, `1 000`) is rejected; a single separator followed by exactly three digits (`1.500`) is read as a decimal, and a note under the field says how it was read. The **1.5 / 1,5** button in the header chooses the separator of the displayed results, charts and reports — by default the one of your browser's language. CSV files always use the decimal point. Quantity names and references keep their usual form (H'(0.07), ANS-6.4.3).
- **EN / ES** in the header shows the screens in Spanish (English by default). It changes only the displayed text: values, calculations, CSV files and the decimal setting do not change.
- **Results update as you type** on the four calculators. An invalid entry is named in a red box under the form, the field is outlined, and the results are hidden until it is corrected — the report and the CSV always describe the inputs on screen.
- Each page explains its method, sources and limits in its own *Method* and notes blocks (collapsed: click the title marked ▸ to open them); this guide — **Guide** in the menu — gives the purpose, the use and the key limits.

---

## Main Pages

### 1. Properties (`index.html`)

**Purpose**: half-lives, decay modes, dose-rate constants and Spanish regulatory values of radionuclides.

**How to use**:
1. **Search** by nuclide (`Tc-99m`, `99mTc`), element name in English or Spanish ("technetium", "tecnecio") or application. The modality buttons filter the 40 curated entries. With no curated match, the ICRP 107 extended results (1,252 nuclides) and the identifiers that exist only in the regulatory tables appear automatically.
2. **Read the table**: half-life, decay, the constants **Γ^K-air** (μGy·h⁻¹·GBq⁻¹·m²), **Γ^H\*(10)** and **Γ^H'(0.07)** (μSv·h⁻¹·GBq⁻¹·m²), representative photon energy, the individual discharge concentration level (IS-28) and the RD 1217/2024 Table A1 value. A cell without a value says why (*Not tabulated*, *Not calculated*, *Not applicable*).
3. **Open a nuclide** for the detail panel: half-life and its source (ICRP 107 or DDEP), β E<sub>max</sub> (highest endpoint over all β branches, with β per decay; minor branches and chain progeny are labelled), photon spectrum (E ≥ 20 keV, yield ≥ 0.01 %) as a chart and a table — the chart shows the yield of each line, or its share of Γ^H\*(10), which tells which lines carry the dose rate, on a logarithmic scale (weak lines visible) or a linear one (**Log / Linear**) —, RD 1217/2024 Tables A1 and B, and the adult ingestion coefficient behind the discharge level.
4. **Export** the table as CSV, with the provenance of each constant.

**Key limits**: the discharge level is only one of the IS-28 II.A.4 conditions (the mixture sum and annual limits are not evaluated); RD 1217/2024 values are for a single nuclide; extended ICRP 107 constants are computed, not manually validated; example applications are illustrative, not an indication of authorisation or availability in Spain.

**Example** (result of the app's model, not a validated reference value): "Am-241" — T½ = 432.2 y, α decay; 21 selected photon lines (X and γ); calculated Γ^H\*(10) ≈ 7.0 μSv·h⁻¹·GBq⁻¹·m².

---

### 2. Decay Calculator (`decay.html`)

**Purpose**: activity of an isolated nuclide after a time, the time to reach a target activity, and the single-nuclide clearance and exemption checks of RD 1217/2024.

**How to use**:
1. Select a nuclide (curated or extended) and enter the **initial activity** (MBq, GBq, mCi, Ci, kBq).
2. Give the time either as **reference and target date/time** (local time of the device) or as an **elapsed time**, which takes precedence when filled.
3. Optional **target activity**: the time to reach it (a target ≥ A₀ is reported as already reached or unreachable; zero as never reached in finite time).
4. Optional **mass of material being assessed**, the mass that contains the activity (state whether the container is included). It enables the Table A1 clearance check and the Table B exemption criteria, which Annex II A.1 sets *separately*: a) total activity of a source vs column 3; b) moderate quantity (≤ 1000 kg) vs column 2.
5. **Results** (updated as you type): A(t), fraction remaining, the decay curve and a table of values. With no elapsed time and no target date the values are those at t = 0, and a note says so.

**Key limits**: one nuclide; mixtures and sums over sources are not evaluated; reaching the Table A1 level is not by itself a clearance (Annex III applies).

**Example** (stored half-life 6.007 h): 1000 MBq Tc-99m → after 6 hours ≈ 500 MBq; time to reach 100 MBq ≈ 20.0 hours.

---

### 3. Dose Estimator (`dose.html`)

**Purpose**: dose-equivalent rate and integrated dose equivalent at a distance from a point source, with optional shielding.

**How to use**:
1. Select the nuclide and **activity** (A₀ is the activity at the start of each exposure). For an extended ICRP 107 nuclide with short-lived progeny (Ge-68 → Ga-68, Sn-113 → In-113m, Mo-99 → Tc-99m…), **Short-lived progeny** chooses between the progeny in equilibrium (default, as for the curated chains) and the parent alone (freshly separated source).
2. **Distance** in m or cm (below 0.25 m the result carries a warning: the point-source model depends on the real source size there).
3. Optional **shielding** — lead, elemental iron (ρ = 7.874 g/cm³, not a generic steel) or normal / light-weight concrete — and optional **patient transmission** in % (empty = no patient attenuation; no default value: it depends on energy, anatomy and geometry). *Shielding details* names the method used: the Archer broad-beam fit of Oumano et al. (2025) for Tc-99m, F-18, I-131 and Lu-177 behind lead or concrete, otherwise spectrum-weighted narrow-beam attenuation with build-up; it gives the first HVL/TVL and warns when part of the spectrum falls outside the tabulated range.
4. **Exposure** time per administration and administrations per year; choose whether physical decay is integrated during each exposure.
5. **Results** (updated as you type): rate at t = 0 and after decay, reference rate at 1 m, annual integrated dose for **H\*(10)** (estimator of effective dose) and **H'(0.07)** (skin/extremity indicator), and the rate against distance.
6. **Annual limit screening** (indicative): percentages of the limits of the Spanish Royal Decree 1029/2022 — 20 mSv/y effective (workers), 1 mSv/y (public), 500 mSv/y skin and extremities, lens of the eye 100 mSv in 5 consecutive years with at most 50 mSv in one year. No "safe" verdict is issued. The report includes the same screening.

**Key limits**: point source; room scatter and source distribution are not modelled. H\*(10) and H'(0.07) are area-monitoring quantities: these estimates do not establish compliance (personal quantities are Hp(10), Hp(0.07), Hp(3); RD 1029/2022 art. 34 allows estimating category B doses from workplace monitoring). Decay between administrations is not modelled. **Y-90** has no photon line: Dose offers only an experimental container-dependent bremsstrahlung scenario, with direct beta dose excluded and no regulatory verdict. For other nuclides without photon lines no estimate is made — which is not evidence that there is no external hazard.

**Example**: 100 MBq Tc-99m, point source at 50 cm, no shielding, 10 min per administration, 200 administrations per year, decay integrated:
- Ḣ\*(10) = Γ·A/r² = 21.72 × 0.100 / 0.50² ≈ 8.7 μSv/h
- Annual integrated H\*(10) ≈ 0.29 mSv/y (200 × ≈ 1.43 μSv)
- Results of the app's point-source model for these inputs, not a measured dose nor a statement of safety or compliance.

---

### 4. Liquid Effluent — Sewer and STP Workers (`effluent.html`)

**Purpose**: screening annual effective dose from Lu-177, I-131, Lu-177m, Tc-99m and F-18 excreted by nuclear-medicine patients, for two receptors adapted from NUREG/CR-5814 (1992), both members of the public with respect to the licensee: **Scenario 1**, a sewer system inspector (wastewater and aerosol), and **Scenario 2**, an STP / EDAR sludge operator (dewatered sludge and resuspended dust). The two are different receptors and are never added together.

**How to use**:
1. **Source term**: tick the nuclides; patients/year × cycles × administered activity per cycle, all assumed excreted; the fraction excreted in hospital; *Tanks* for nuclides held in decay tanks (then only their share of the annual tank discharge leaves). Scenario 1 receives what leaves the hospital; Scenario 2 also the activity excreted at home in the STP catchment.
2. **Scenario 1** and **Scenario 2** parameters: each input has a short explanation and its default source in *Sources and assumptions*. Plant data (water volume, sludge production from PRTR-España) are site-specific.
3. **Common**: breathing rate, annual tank discharge and a **user-defined** dose criterion (no regulatory basis is attributed to it).
4. Results update as you type: dose per nuclide and per scenario, with the coefficients used and an indicative cross-check against NUREG/CR-5814 and IAEA SRS-19 factors.

**Key limits**: screening model (annual discharge over annual water volume or sludge production, transit decay only); the external coefficients are own PHITS calculations valid only for their model geometries, photon-only in Scenario 1, and none covers the infinite slab of NUREG/CR-5814; F-18 has no Scenario 2 external coefficient, so that total is a partial sum (≥); the I-131 default of 0.8 GBq is the workbook's activity at discharge, not the administered activity — replace it. **Not a complete discharge assessment**: the IS-28 II.A.4 conditions and mixture clearance are evaluated separately.

**Example** (defaults, Lu-177 and I-131 included, no decay tanks, 45 × 45 × 3 m geometry):
- Scenario 1: Lu-177 1498.5 GBq/y → 0.0172 mSv/y; I-131 20 GBq/y → 0.0027 mSv/y; total 0.0199 mSv/y
- Scenario 2 (40 % catchment): Lu-177 2231.1 GBq/y → 2.38 mSv/y; I-131 28 GBq/y → 0.367 mSv/y; total 2.74 mSv/y
- With both nuclides in decay tanks (1 GBq/y in total), Scenario 2 falls to 0.886 mSv/y

---

### 5. Caregiver Dose after Discharge (`caregiver.html`)

**Purpose**: external dose to one caregiver, relative or third party from a Lu-177 or I-131 therapy patient after discharge, with the maximum discharge rate and the minimum restriction period that meet a criterion. Port of the author's workbook *Dosis_acompanantes_simple_v2.1.xlsx*.

**How to use**:
1. Optional **kinetics preset** (Lu-177-PSMA-617, Lu-177-DOTATATE or I-131 NaI by indication, from the literature listed on the page): it fills the radiopharmaceutical, the fast phase, the effective half-lives, the cycles and the profile, never the measured rate or the cohabitation. Under «Kinetics presets and their sources», each preset shows the **spread its source publishes** — mean ± SD (Demir 2016, Kurth 2018), median with quartiles and range (Monserrat 2023) or the spread of the literature values (Gayol Vilorio 2025) — so that the extreme values you try are defensible; the Forum's I-131 values are fixed and have none.
2. **Case data**: dose rate measured at 1 m at discharge, discharge time and end of the fast phase (both from administration), effective half-lives, cycles, category of the exposed person, optional minimum restriction of the product information, and the **proximity profile** (measured DOTATATE factors, the I-131 / Lu-177 approximations with contact taken at 0.4 m, or own measurements). Distances are chosen from the profile list; there is no interpolation.
3. **Cohabitation**: two rows, each with restriction days from discharge and hours/day and distance during and after the restriction. The **cohabitation scenario** selector loads the conditions of Table 3.B 1 of the Foro CSN-SEPR-SEFM (2011) and its paragraph on co-workers — partner, children under 1, 1–2, 2–5, 5–11 and over 11 years, co-worker, work with children — into the hours and distances of both rows, names the rows and proposes the category (a warning appears if you then choose one the Forum does not assign). It never changes the restriction days, which start **empty**: the minimum and adopted restriction do not depend on them and are shown from the start, so you either enter the days you decide or press **Use the adopted restriction in the table**; the dose of the table and the maximum rate appear once the days are entered. Any manual edit, or the **free scenario**, leaves the table to you and lets you name the rows (a pregnant co-worker, other timetables or people). Method › Cohabitation conditions shows the table, the co-worker paragraph and which Forum columns the app reproduces.
4. Results update as you type: dose per administration and per treatment against the criterion, the inverse calculations (maximum rate, minimum and adopted restriction, dose with an indefinite restriction — a floor, or an upper asymptote when there is more contact during the restriction than after it, in which case restricting only increases the dose), the dose-versus-restriction curve and a self-check.

**Criteria per category** (per treatment, all cycles together; department criteria, not values fixed by regulation for this treatment — RD 601/2019 requires carer constraints but sets no value): carer ≤ 60 years 3 mSv (EC RP 97, Foro 2011); carer > 60 years 5 mSv (ICRP 103 para. 351, ICRP 94, IAEA SSG-46); public 1 mSv (RD 1029/2022 art. 15); co-worker 0.3 mSv (RP 97, Foro). The criterion never changes the calculated dose.

**Key limits**: one person and equal cycles; the integral of the measured operational quantity estimates external exposure, not the individual effective or fetal dose; internal contamination and the dose before discharge are not included; occupancy is a daily average (h/24). Under the results the page bounds the dose for any timetable with the declared hours of each period: in each 24 h interval from discharge the rate is taken at its start (upper bound) or at its end (lower bound). Close contact early in the day makes the average underestimate the dose; the bounds are widest in the fast phase and with an early discharge (defaults without restriction: ×0.75 to ×1.35). They are informative and never change the dose.

**Example** (defaults: Lu-177-PSMA-617, 15 µSv/h at 1 m at 6 h, carer ≤ 60 years; day-time 6 h/d at 1 m; sleeping apart during the restriction, then 8 h/d in contact): on opening, minimum restriction 2.92 d → adopted 3 d. With **Use the adopted restriction in the table** (3 d in both rows): dose per administration 0.488 mSv; treatment 2.93 mSv against 3 mSv; maximum discharge rate 15.4 µSv/h; daily-average occupancy bounds 2.32 to 3.69 mSv (×0.79 to ×1.26).

---

## Dark Mode

Without a saved choice the app follows the light or dark setting of the device. The **moon / sun button** in the top-right corner switches it; that choice is saved in the browser and then takes precedence.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Properties: focus the search bar |
| `Escape` | Properties: clear the search and close the detail panel. Decay and Dose: close the nuclide list |
| `↑` `↓` `Enter` | Decay and Dose: move through the nuclide list and select |
| `Alt+D` | Toggle dark mode (all pages) |

---

## Data Quality & Limitations

- **Curated database (40 nuclides)**: 32 with published comparison values in Cornejo et al. (2015), whose Γ^K-air is the value shown; Γ^H\*(10) and Γ^H'(0.07) are recalculated from ICRP 107 (2008) photon data and ICRP 74 (1996) Table A.21 (23 of the 32 within ±2 % of the published values; differences are reported, not reconciled). Ga-68, Zr-89, Cu-67, Tb-161, Ho-166, Ra-223 and Ac-225 have no published comparison (the alpha chains assume all progeny retained and in equilibrium); Pd-103 includes Rh-103m and Cs-137 and Mo-99+Tc-99m their daughters, also in equilibrium (the Γ^H'(0.07) of these two is calculated: Cornejo publishes none for them); Y-90 has no photon constants.
- **Half-lives**: each one names its source — ICRP 107 (2008) or the DDEP recommended value (LNHB/CEA).
- **Conversion coefficients and photon filter**: ICRP 74 Table A.21, 25 printed energies, log-log interpolated (the printed 6.90 pSv·cm² at 1.5 MeV is kept although the table's own columns give 7.04); photon lines with E ≥ 20 keV and yield ≥ 0.01 % (a yield exactly 0.01 % is kept).
- **Extended database (1,252 nuclides, ICRP 107)**: constants computed with the same method, not manually validated; short-lived progeny (T½ ≤ 1/10 of the parent's and ≤ 30 d, an app criterion) is included in equilibrium by default and marked "+"; continuous beta spectra and bremsstrahlung are not included. Reference and estimation only — not validated for clinical use.
- **Shielding**: infinite-medium point-isotropic build-up factors (ANSI/ANS-6.4.3) applied to finite barriers — the deviation is not universally conservative; not a substitute for structural shielding design.
- **H'(0.07)**: area-monitoring indicator for skin and extremities, photons only; direct beta/electron dose is not calculated.
- **Use**: radiation protection estimation; verify against primary sources for regulatory submissions.

---

## Troubleshooting

**Search returns no results** — check the spelling ("Tc-99m"), or search by element name (English or Spanish) or application; the ICRP 107 database is searched automatically.

**ICRP 107 data doesn't load** — the database is bundled locally and needs no connection. Check the browser console (F12) for a missing `data/icrp107-data.js`. For an installed PWA, clear this app's site data or unregister its service worker and reload once online. For `file://`, keep the complete folder together.

**Calculated dose seems too high or low** — verify the activity unit (MBq vs GBq), check that the entered distance matches the selected unit (m or cm), and remember that extended ICRP 107 constants are computed, not validated.

**Can I use ICRP 107 values for regulatory submissions?** — Not without independent verification; prefer published, peer-reviewed values where they exist.

---

## References

- **Cornejo Díaz N., Brosed Serreta A., Ruiz Manzano P.** (2015). "Constantes de tasa de kerma en aire y de tasa de equivalente de dosis ambiental de algunos radionucleidos utilizados en aplicaciones médicas." *Radioprotección* (SEPR), Nº 83, 39–42.
- **ICRP Publication 74** (1996). "Conversion Coefficients for Use in Radiological Protection against External Radiation."
- **ICRP Publication 107** (2008). "Nuclear Decay Data for Dosimetric Calculations." Endo & Eckerman.
- **DDEP — Decay Data Evaluation Project**. LNHB/CEA *Table de Radionucléides*, recommended half-lives (consulted 14 October 2026); Mougeot X. et al., *Metrologia* 62 (2025) 029001/029002 and 63 (2026) 019001 for the recent evaluations; *Table of Radionuclides*, Monographie BIPM-5 (Bureau International des Poids et Mesures), the compiled DDEP evaluations.
- **ICRP Publication 116** (2010). "Conversion Coefficients for Radiological Protection Quantities for External Radiation Exposures." With the corrigenda in ICRP Publication 129 (2015).
- **ICRP Publication 119** (2012). "Compendium of Dose Coefficients based on ICRP Publication 60." Numerical transcription of RD 783/2001 Annex III tables a) and b).
- **Real Decreto 783/2001**, Anexo III, tablas a) y b) (public dose coefficients). Repealed by RD 1029/2022, whose third transitional provision — and the CSN Resolution of 3 April 2024 — keep these coefficients in force for members of the public.
- **[Real Decreto 1029/2022](https://www.boe.es/buscar/act.php?id=BOE-A-2022-21682)**, de 20 de diciembre, Reglamento sobre protección de la salud contra los riesgos derivados de la exposición a las radiaciones ionizantes. BOE-A-2022-21682.
- **[Real Decreto 1217/2024](https://www.boe.es/buscar/act.php?id=BOE-A-2024-25205)**, de 3 de diciembre, Reglamento sobre instalaciones nucleares y radiactivas, y otras actividades relacionadas con la exposición a las radiaciones ionizantes. BOE-A-2024-25205.
- **Instrucción IS-28** (CSN, 22 September 2010). BOE nº 246, 11 October 2010 (BOE-A-2010-15594); errors corrected by the CSN Resolution of 11 November 2010. The CSN has opened a prior public consultation on a revision 1: check the version in force on the CSN list of instructions before relying on the II.A.4 level.
- **NIST XCOM / XAAMDI**. Photon mass attenuation coefficients for lead, elemental iron and ordinary concrete.
- **Trubey D.K.** (1991). *New Gamma-Ray Buildup Factor Data for Point Kernel Calculations: ANS-6.4.3 Standard Reference Data*. NUREG/CR-5740 / ORNL/RSIC-49/R1, Table 3.
- **Oumano M. et al.** (2025). "Shielding resources for four common radiopharmaceuticals utilized for imaging and therapy: Tc-99m, F-18, I-131, and Lu-177." *J Appl Clin Med Phys* 26(5):e70084. DOI 10.1002/acm2.70084 (CC BY 4.0).
- **Zanzonico P.B. et al.** (1999). "Bremsstrahlung radiation exposure from pure beta-ray emitters." *J Nucl Med* 40(6):1024–1028. Methodological background only; the container constants are not tabulated in the article.
- **Kennedy W.E. Jr. et al.** (1992). *Evaluation of Exposure Pathways to Man From Disposal of Radioactive Materials Into Sanitary Sewer Systems*. NUREG/CR-5814 / PNL-7892, U.S. NRC.
- **IAEA Safety Reports Series No. 19** (2001). "Generic Models for Use in Assessing the Impact of Discharges of Radioactive Substances to the Environment."
- **Monserrat Fuertes et al.** (2023). "Individualisation of radiation protection recommendations for patients treated with [177Lu]Lu-DOTA-TATE." *EJNMMI Physics* 10:50. DOI 10.1186/s40658-023-00570-7 (CC BY 4.0).
- **Gayol Vilorio et al.** (2025). "Periodo de restricciones tras el alta en terapia con 177Lu-DOTATATE y 177Lu-PSMA-617." *Rev. Fís. Méd.* 26(2):27–36.
- **Kurth J. et al.** (2018). "External radiation exposure, excretion and effective half-life in 177Lu-PSMA-targeted therapies." *EJNMMI Research* 8:32 (CC BY 4.0).
- **Demir M. et al.** (2016). "Evaluation of radiation safety in 177Lu-PSMA therapy and outpatient treatment protocol." *J. Radiol. Prot.* 36(2):269. DOI 10.1088/0952-4746/36/2/269.
- **Foro CSN-SEPR-SEFM** (2011). *Criterios de alta de pacientes y medidas para la protección radiológica del público después de tratamientos metabólicos con 131I*.
- **European Commission, Radiation Protection 97** (1998). *Radiation protection following iodine-131 therapy (exposures due to out-patients or discharged in-patients)*.
- **ICRP Publication 94** (2004). "Release of patients after therapy with unsealed radionuclides." **ICRP Publication 103** (2007), para. 351.
- **IAEA SSG-46** (2018), para. 2.49, and **IAEA Safety Reports Series No. 63** (2009), "Release of patients after radionuclide therapy."

---

## Support & Feedback

For issues, questions or feature requests, contact the person or organisation that supplied your copy of the application.

## Development tooling

This application was developed with the assistance of AI coding tools — Anthropic **Claude Code** and OpenAI **Codex** — operated, reviewed and directed by the author, who remains the sole author and licensor of the original code. These tools hold no authorship, copyright or licence interest in the application; this statement is a voluntary transparency notice, not a licence obligation.

Correctness does not rest on how the code was written: numerical data are taken from the cited sources (ICRP, NIST, NUREG/ANS, DDEP, BOE and the cited articles) — transcribed where the source tabulates them, computed from them where indicated (e.g. the operational Γ constants, the dose-weighted shielding spectra, the explicitly experimental Y-90 container estimates), with the status labelled per value — the calculation paths are checked by the automated test suites against external anchors, and adoption for professional use requires the independent human validation described in the acceptance sheet.

---

## License

The original application code is licensed under the **European Union Public Licence, version 1.2 only (EUPL-1.2)**. It may be used in educational, research, regulatory, commercial and healthcare settings, subject to the licence terms, including its copyleft and source-availability requirements.

This application is supplied directly in machine-readable source-code form. The corresponding HTML, CSS and JavaScript files, together with the licence and attribution files, accompany each local copy; no external source-code service is required.

Bundled third-party software and data are not relicensed by the EUPL. In particular, the ICRP-07 decay data retains the educational, research and not-for-profit terms in `LICENSE.TXT`; other sources retain the terms stated in `THIRD_PARTY_NOTICES.md`. See **About, guide & licences** in the application for the complete texts and scope map.

For regulatory use, verify against primary sources and consult local radiation protection authorities.
