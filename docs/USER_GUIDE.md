# NM Radionuclide Planner — User Guide

A web application for nuclear medicine radionuclide properties, decay calculations, external dose estimation and liquid-effluent screening (sewer and STP workers).

**Local distribution:** Keep the supplied folder intact and open `index.html` in a modern web browser.

---

## Quick Start

The application has no installation or authentication. It can be used in either of these local modes:

- **Direct from disk**: open `index.html`; the address will start with `file://`.
- **Local web server (optional)**: serve the application folder with any static server and open its `localhost` address, for example `http://localhost:8000/`.

- **Desktop**: Firefox, Chrome, Safari, Edge (recommended)
- **Mobile**: iOS Safari, Chrome mobile (with landscape mode for better experience)
- **Offline**: Calculators work offline with the complete local copy (opened from `file://`, or from the local cache of a copy first loaded over HTTP(S)); external references need a connection
- **Install as app (PWA)**: when served through `localhost` or HTTPS, a compatible browser can offer "Install" / "Add to Home screen" — the app then runs standalone with its own icon and a service worker keeps all assets cached for fully offline use
- **Reports**: the Decay, Dose and Effluent calculators include a **📄 Report / PDF** button that generates a printable calculation report (timestamp, database version, inputs, results, method, data sources, disclaimer and sign-off line) — use the browser's "Save as PDF" destination to archive it
- **CSV exports**: Decay, Dose and Effluent CSVs are rectangular and self-describing — every row repeats the application version and build, database version, export time (UTC), nuclide and the inputs needed to reproduce the result; the Effluent CSV also states whether each scenario total is complete or a partial sum

---

## Main Pages

### 1. Properties (`index.html`)

**Purpose**: Look up half-lives, decay modes, dose-rate constants and Spanish regulatory values of radionuclides.

**How to use**:
1. **Search** by nuclide (`Tc-99m`, `99mTc`), element name in English or Spanish ("technetium", "tecnecio") or application text
   - The modality buttons (PET, SPECT, Therapy, Brachytherapy, Other) filter the 40 curated entries
   - If no curated entry matches, the extended ICRP 107 results, and the identifiers that exist only in the regulatory tables, are shown automatically. Extended results have no modality classification, so the modality filter is not applied to them
2. **Read the table**:
   - Half-life and decay modes (α, β⁻, β⁺, EC, IT)
   - **Γ^K-air**: air-kerma rate constant — μGy·h⁻¹·GBq⁻¹·m²
   - **Γ^H\*(10)**: ambient dose-equivalent rate constant (area monitoring; effective-dose estimator) — μSv·h⁻¹·GBq⁻¹·m²
   - **Γ^H'(0.07)**: directional dose-equivalent rate constant (area monitoring; skin/extremity indicator) — μSv·h⁻¹·GBq⁻¹·m²
   - Representative photon energy (it can be an X-ray or the annihilation line, not only a γ line)
   - **Γ source** states the provenance per quantity. For 32 entries Γ^K-air is the value published by Cornejo et al. (2015), while Γ^H\*(10) and Γ^H'(0.07) are recalculated from ICRP 107 (2008) photon data with ICRP 74 (1996) Table A.21 coefficients
   - A cell without a value says why: *Not tabulated* (the regulatory table has no entry), *Not calculated* (the app does not compute it), *Not applicable*, or *See details*
3. **Individual discharge concentration level** (column "Liquid effluent"): (1 mSv / e(g)) / 600 L with the adult ingestion coefficient of RD 783/2001 Annex III table a), adult (> 17 y), kept in force by the CSN Resolution of 3 April 2024 (numerical transcription: ICRP 119 Table F.1); when several chemical forms are tabulated, the most restrictive governs. It is one of the IS-28 II.A.4 conditions for controlled sewer discharge; a complete assessment also requires the mixture sum of fractions, the annual activity limits, an express discharge authorisation and soluble or readily dispersible material. For nuclides outside the curated table the level is calculated in the same way from the same table
4. **RD 1217/2024 Annex IV**, for **every** nuclide in the detail panel (curated and ICRP 107 extended):
   - **Table A1** (257 entries) — activity-concentration value for exemption of practices or clearance of materials, any quantity and any type of solid material; entries marked (a) refer to the parent and already account for the listed progeny. Nuclides not in A1 are shown as *not tabulated*: Annex III.1.b refers to the European Commission's "Radiation Protection 122 Part 1" (not included); natural radionuclides fall under Table A2 (not implemented)
   - **Table B** (297 rows) — exemption of moderate quantities (≤ 1000 kg): column 2 concentration (kBq/kg) and column 3 total activity (Bq). Not tabulated: Annex II A.3.a refers to the CSN values
   - Four note/progeny inconsistencies of the BOE itself (A1 Ce-144, U-231; B Ag-108m, U-230) are shown as printed, with a warning
   - Identifiers that appear only in these regulatory tables and have no nuclear data in the app (e.g. Nb-98) can be searched and show their regulatory values only; Decay and Dose are disabled for them. They are not mapped to similar identifiers (Nb-98 ≠ Nb-98m ≠ the "Nb-98s" printed in ICRP 119)
5. **Example applications**: illustrative uses of the curated nuclides. They mix current, historical and research uses and do not indicate marketing authorisation, clinical status or availability in Spain
6. **Photon spectrum** in the detail panel: lines with E ≥ 20 keV and yield ≥ 0.01 %; type G = gamma, X = X-ray, AQ = annihilation photons; yield in photons per 100 decays. For the chain entries (Ra-223, Ac-225) the spectrum shown is the parent's, while the constants assume all progeny retained and in secular equilibrium
7. **Export**: download the table as CSV. The file states the provenance of the constants per quantity (`gamma_source`, `gamma_Kair_source`) and the origin of each record (`record_origin`)

**Main database**: 40 radionuclides — 32 with published comparison values in **Cornejo et al. (2015)**, **Ga-68**, the special case **Y-90** (predominantly a β⁻ emitter: no photon dose-rate constants, and direct beta dose is not calculated) and 6 therapy/imaging additions (**Zr-89, Cu-67, Tb-161, Ho-166, Ra-223+daughters, Ac-225+daughters**). Where the recalculated values differ from the published comparison values, the difference is reported with the nuclide and in the calculation reports; it has not been reconciled.

#### Extended Database — ICRP 107

The application includes an **extended database of 1,252 radionuclides** from ICRP Publication 107 (2008). When a search has no match in the main database, its results appear automatically, with:
- **Nuclide ID** (e.g. "Am-241"), **half-life** and **decay modes** as given in ICRP 107
- **Photon emissions** — the selected lines (energy in keV, yield in % per decay, type G / X / AQ)
- **Calculated constants**: Γ^H\*(10) and Γ^H'(0.07), computed from the selected photon lines with the method of Cornejo et al. (2015) and the ICRP 74 (1996) Table A.21 coefficients. Γ^K-air is not calculated for extended entries
- A warning that these constants have **not** been manually validated

**Use ICRP 107 for**:
- Quick reference on any radionuclide (half-life, decay modes, spectrum)
- Estimating dose constants for nuclides not in the curated database
- Exploring photon spectra for shielding calculations
- Educational purposes

**Do NOT use ICRP 107 for**:
- Clinical or regulatory submissions without independent verification
- High-precision dosimetry — use published, peer-reviewed constants
- Safety decisions without expert review

**Example** (result of the app's model, not a validated reference value): search for "Am-241":
- T½ = 432.2 y, α decay; 21 selected photon lines (X and γ)
- Calculated Γ^H\*(10) ≈ 7.0 μSv·h⁻¹·GBq⁻¹·m²

---

### 2. Decay Calculator (`decay.html`)

**Purpose**: Calculate the activity of an isolated nuclide after a time, or the time needed to reach a target activity.

**How to use**:
1. Select a nuclide in the search box (curated or ICRP 107 extended)
2. Enter the **initial activity** and its unit (MBq, GBq, mCi, Ci, kBq). The value is used in the unit chosen
3. Give the **elapsed time** in one of two ways:
   - **Reference and target date/time**: both are local times of the device
   - **Elapsed time** entered manually (s, min, h or d). When this field is filled it is used and the target date is ignored; the report and the CSV record it
4. Optional **target activity**: the time needed to reach it. A target equal to A₀ is reported as already reached at t = 0; a target above A₀ cannot be reached by decay; a target of zero is reported as never reached in finite time; a negative or non-numeric target is rejected before any result is shown
5. Optional **mass of material being assessed**: the mass that corresponds to the entered activity and to the material covered by the assessment. State whether the container is included — the app does not know
6. Press **Calculate**. Results: A(t), fraction remaining (%), elapsed time and activity lost; the **decay curve** A(t) = A₀ · e^(−λt) and a table of values
7. If an input is edited after calculating, a notice asks to recalculate. The report and the CSV always describe the last calculation, not the current form
8. **Clearance and exemption** (RD 1217/2024 Annex IV, single nuclide; mixtures and sums over sources are not evaluated):
   - **Table A1**: A/m is compared with the A1 value at t = 0 and at t ("at or below the individual level" / "above"), with the time to reach the Table A1 concentration level. Reaching that level is not by itself a clearance: the conditions of Annex III apply. Works for curated and extended entries; Mo-99 gives the same result from either entry
   - **Exemption, Table B** — Annex II A.1 sets *separate* criteria: a) a source — total activity vs column 3; b) material in moderate quantity (≤ 1000 kg) — A/m vs column 2. Above 1000 kg, c) applies: Table A1

**Example** (stored half-life 6.007 h):
- Initial: 1000 MBq Tc-99m
- After 6 hours: ≈ 500 MBq
- Time to reach 100 MBq: ≈ 20.0 hours

---

### 3. Dose Estimator (`dose.html`)

**Purpose**: Estimate the dose-equivalent rate and the integrated dose equivalent at a distance from a point source.

**How to use**:
1. **Select nuclide** and **activity** (MBq, GBq, mCi, Ci). A₀ is the activity at the start of each exposure
2. **Distance** from the source, in m or cm. Check that the entered value matches the selected unit
3. **Optional shielding**: material (lead, elemental iron, normal or light-weight concrete; iron is modelled as Fe at ρ = 7.874 g/cm³, not as a generic steel alloy) and thickness in cm or mm
   - Uses the **Archer broad-beam** fit of Oumano et al. (2025) for Tc-99m, F-18, I-131 and Lu-177 behind lead or concrete (iron has no fit and uses the spectral method). The published transmission is based on dose at 1 cm depth in tissue; the app applies it to both H\*(10) and H'(0.07) as an approximation, and does not check its applicability range
   - Otherwise uses **spectrum-weighted narrow-beam attenuation with build-up** (dose-weighted sum over the nuclide's ICRP 107 photon lines; NIST XCOM attenuation; ANSI/ANS-6.4.3 point-isotropic exposure build-up factors). ICRP 107 extended entries build the spectrum at selection time
   - "Shielding details" names the method used and gives the first half-value and tenth-value layers and the transmission for each quantity. Later layers are thicker as the beam hardens, so thickness / first HVL is not the number of halvings
   - A warning is shown, printed and exported when part of the dose weight falls outside the tabulated attenuation or build-up range (e.g. beyond 40 mean free paths, where the build-up factor is clamped)
4. **Optional patient attenuation**: a transmission > 0 % and ≤ 100 %. There is no default; it depends on photon energy, anatomy and geometry
5. **Exposure**: time per administration (h, min or d) and number of administrations per year
   - *Integrate physical decay during exposure?* affects only the integrated dose. The rate "after decay" is always calculated with decay
   - Annual integrated dose = dose of one administration × number of administrations. Each administration repeats the same A₀; decay between administrations is not modelled
6. Press **Calculate Dose**. For each quantity the table gives the dose-equivalent rate at t = 0 and after physical decay over the exposure time, the reference rate at 1 m and the annual integrated dose equivalent; a chart shows the rate against distance (0.1–5 m)
   - Both quantities are always shown: **H\*(10)** (ambient dose equivalent, effective-dose estimator) and **H'(0.07)** (directional dose equivalent, skin/extremity indicator — falls back to the H\*(10) value when no Γ^H'(0.07) constant exists)
   - These are **area-monitoring** quantities. These estimates do not establish compliance: apply the dose-assessment and monitoring methods required for the exposure situation (personal quantities are Hp(10), Hp(0.07), Hp(3); under RD 1029/2022 art. 34 the doses of category B workers may be estimated from workplace monitoring)
   - Ḣ = Γ × A × T / r², with T the transmission of the shield and of the patient
7. **Annual limit screening** (indicative only): the annual integrated values are shown as percentages of the limits of the Spanish Royal Decree 1029/2022 (transposing Directive 2013/59/Euratom):
   - **Effective dose**: 20 mSv/year (worker), 1 mSv/year (public)
   - **Skin / extremities**: 500 mSv/year
   - **Lens of eye**: <em>Both conditions must be satisfied:</em> 50 mSv/year max annual AND 100 mSv over any consecutive 5-year period (current regime since 2024-06-22)
   - The percentage is coloured above 50 % and above 100 %. The app issues no "safe" verdict
8. If an input is edited after calculating, a notice asks to recalculate; the report and the CSV describe the last calculation
9. **Special case — Y-90**:
   - No photon line passes the filter, so there are no photon dose-rate constants. Dose provides a separate experimental **bremsstrahlung** scenario; **direct beta dose is excluded**, so its H'(0.07) figure is not a complete skin/extremity assessment
   - Select an assumed container geometry: PMMA, Lead, Tungsten, or None
   - The displayed container-dependent values are estimates inspired by the Zanzonico et al. (1999) formalism; that publication does **not** tabulate these container constants
   - The scenario reports no regulatory verdict, and its report and CSV carry the state "experimental container estimates; validity not established". Do not use it for shielding design or regulatory submissions without a primary source or measurements for the actual geometry
10. For any other nuclide with no photon line passing the filter, the page says so and makes no estimate. That is not evidence that there is no external hazard: direct beta/electron dose and bremsstrahlung are not calculated

**Example**:
- Inputs: 100 MBq Tc-99m, point source at 50 cm, no shielding, no patient attenuation, 10 min per administration, 200 administrations per year, decay integrated during each exposure
- Dose rate at t = 0: Ḣ*(10) = Γ·A/r² = 21.72 × 0.100 / 0.50² ≈ 8.7 μSv/h (Γ = 21.72 μSv·h⁻¹·GBq⁻¹·m²)
- Annual integrated H*(10): ≈ 0.29 mSv/y (200 × ≈ 1.43 μSv)
- These are results of the app's point-source model for the stated inputs, not a measured dose and not a statement of safety or compliance

---

### 4. Liquid Effluent — Sewer and STP Workers (`effluent.html`)

**Purpose**: Screening estimate of the annual effective dose from Lu-177, I-131, Lu-177m, Tc-99m and F-18 excreted by nuclear-medicine patients, for two workers adapted from NUREG/CR-5814 (1992) who are members of the public with respect to the licensee:
- **Scenario 1 — sewer system inspector** (§5.2.1): external irradiation from the facility's wastewater (water slab; receptor 1 m above its surface) and inhalation of aerosol in the interceptor
- **Scenario 2 — STP / EDAR sludge process operator** (§5.2.2): external exposure to dewatered sludge and inhalation of resuspended dry sludge, with the screening philosophy of IAEA SRS-19 (2001) §4.9 and §6.6

The two scenarios concern **different receptors: each total is compared with the criterion on its own and they are never added together**.

**How to use**:
1. **Source term** (one row per nuclide; tick *Include* — only Lu-177 and I-131 are included by default): A_adm = patients/year × cycles/patient × administered activity per cycle, all of it assumed to be excreted; *fraction excreted in hospital*; *decay tanks* if the nuclide is controlled in hospital decay tanks
   - The fraction excreted in hospital leaves through the facility's sewer connection. For nuclides controlled in decay tanks only the annual tank discharge leaves (common parameter, default 1 GBq/y for the sum of controlled nuclides — the IS-28 Annex II II.A.4 annual limit), shared among them in proportion to the activity excreted into the tanks; when that activity is below the limit, all of it is assumed discharged (no decay credit)
   - The rest is excreted at home
   - **Scenario 1** receives only the activity leaving the hospital; **Scenario 2** receives the activity leaving the hospital plus the activity excreted at home by the patients living in the STP catchment
   - I-131: one treatment per patient is an assumption of this scenario, not a clinical rule; the default 0.8 GBq is the workbook's activity at hospital DISCHARGE, not the administered activity — replace it with the administered activity and a justified in-hospital fraction
   - Lu-177m: impurity of carrier-added Lu-177 (default 0.01 % of 7.4 GBq per cycle)
   - Tc-99m: no default in the reference workbooks — enter the facility's data
2. **Scenario 1**: facility type (hospital 20 000 m³/y, clinic 3650 m³/y, or the licensee's figure — consumption ≈ discharge), water density, aerosol loading, respirable fraction, exposure times, geometry factor and transit time (≈ 0.2 h)
3. **Scenario 2**: wet (dewatered) sludge production — plant-specific, from PRTR-España, waste code LER 19 08 05 —, solids fraction, wet density, fraction retained in sludge, transit time to the press (≈ 3 d), dust loading, respirable fraction, exposure times, geometry factor and the external-coefficient geometry (model geometries of 10 × 10 × 3 m or 45 × 45 × 3 m, receptor 2 m above the centre; the coefficient belongs to the model geometry and its use for a specific plant must be justified)
4. **Common**: breathing rate, annual discharge from decay tanks and a **user-defined** dose criterion (default 1 mSv/y; the app attributes no regulatory basis to it)

The short text under each input says what it means; the sources of the defaults (workbook cells, report sections) are in the collapsible *Sources and assumptions* blocks. Results update as you type: per scenario, decay factor, concentrations and dose factor per GBq discharged; annual external, inhalation and total dose per nuclide; per-scenario sum and percentage of the criterion. **📄 Report / PDF** and **⬇ Export CSV** record every input and coefficient.

**Model** (per nuclide, A = activity leaving the hospital (Scenario 1) or reaching the STP (Scenario 2) in one year, DF = exp(−λ·t_transit)):
- Scenario 1: C_water [Bq/m³] = A · DF / V; C_air = (C_water / ρ_water) · aerosol loading · f_resp; E_ext = C_water · k₁ · t_ext · g; E_inh = C_air · BR · t_inh · e(inh)
- Scenario 2: C_dry [Bq/kg] = A · f_sludge · DF / (M_wet · f_solids); C_wet [Bq/m³] = A · f_sludge · DF · ρ_wet / M_wet; C_air = C_dry · dust loading · f_resp; E_ext = C_wet · k₂ · t_ext · f_geom; E_inh = C_air · BR · t_inh · e(inh)

**Data**:
- **k₁, k₂** (external): effective-dose-rate coefficients (ICRP 116 (2010), rotational geometry) calculated with PHITS — Scenario 1 for a 600 × 200 × 50 cm water slab with the receptor at 1 m, Scenario 2 for a uniform 3 m deep sludge source with the receptor at 2 m. They are **not** point-source Γ constants and apply only to those geometries. F-18 has no Scenario 2 external coefficient: its external pathway is shown as *n/a* (not zero), its inhalation is still computed, and the Scenario 2 total is labelled a **partial sum** (≥) on screen, in the report and in the CSV
- **e(inh)**: RD 783/2001 Annex III table b), adult (> 17 y) member of the public, kept in force by the CSN Resolution of 3 April 2024 (numerical transcription: ICRP 119 (2012) Table G.1; lung absorption type F = fast, M = moderate) — Lu-177 M 1.1×10⁻⁹, Lu-177m M 1.3×10⁻⁸, I-131 F 7.4×10⁻⁹, Tc-99m M 1.9×10⁻¹¹, F-18 M 5.6×10⁻¹¹ Sv/Bq
- Half-lives from the app database; Lu-177m, which is not a curated entry, from ICRP 107 (160.4 d)

**Limitations**:
- Screening models: annual discharge divided by annual water volume or annual sludge production, with transit decay only and no decay during the exposure year. A continuous discharge does not by itself demonstrate mixing or steady state. The fraction retained in sludge is the value entered (default 100 %)
- Site hypotheses, not regulatory values: the 25 % solids fraction (reference workbook; no 20–25 % range found in the PEMAR it cites; NUREG uses 30 %; it only affects inhalation), the 5090 t/y sludge production (workbook value, not verified against the PRTR declaration) and the 1 GBq/y tank discharge (equal to the IS-28 boundary, which requires strictly less)
- Adaptations of NUREG/CR-5814, not reproductions. The PHITS coefficients carry the path and SHA-256 of their original reports
- Densities, volumes and masses must be greater than zero; with a criterion ≤ 0 the totals are not compared
- Scenario 1 coefficients are photon-only: bremsstrahlung from beta and positron emission is not included and has not been bounded for this geometry — the limitation is larger for F-18 and I-131
- NUREG/CR-5814 prescribes an infinite slab for Scenario 2, which neither coefficient covers. For Lu-177 the PHITS study measured that the 45 × 45 m coefficient captures 73–75 % of the infinite slab
- Inhalation uses public dose coefficients: neither worker is an exposed worker of the licensee
- **Not a complete discharge assessment.** The IS-28 Annex II II.A.4 sewer conditions (per-nuclide level, sum of fractions, annual activity limits) and mixture clearance are evaluated separately
- A collapsible panel compares the coefficients with the GENII-1990 factors of NUREG/CR-5814 Table A.21 (I-131, F-18, Tc-99m; the PHITS Scenario 1 coefficients are 2.7–3.6 times higher, a difference that has not been investigated) and the I-131 Scenario 2 result with NUREG/CR-5814 Table B.7 and IAEA SRS-19 Table I–IV. All are indicative only; SRS-19 Annex I uses an occupancy of 0.288 where 2000/8760 = 0.228

**Example** (default values, Lu-177 and I-131 included, no decay tanks, 45 × 45 × 3 m geometry):
- Lu-177: A_adm = 75 patients × 6 cycles × 7.4 GBq = 3330 GBq/y; 45 % excreted in hospital = 1498.5 GBq/y; at home 1831.5 GBq/y
- I-131: A_adm = 50 × 0.8 GBq = 40 GBq/y; 50 % excreted in hospital = 20 GBq/y; at home 20 GBq/y
- Scenario 1: Lu-177 1498.5 GBq/y → 0.0115 µSv/GBq → 0.0172 mSv/y; I-131 20 GBq/y → 0.135 µSv/GBq → 0.0027 mSv/y; total 0.0199 mSv/y
- Scenario 2 (home part × 40 % catchment): Lu-177 1498.5 + 732.6 = 2231.1 GBq/y → 1.065 µSv/GBq → 2.38 mSv/y; I-131 20 + 8 = 28 GBq/y → 13.10 µSv/GBq → 0.367 mSv/y; total 2.74 mSv/y
- With both nuclides in decay tanks, 1 GBq/y leaves the hospital in total (Lu-177 0.987, I-131 0.013 GBq/y) and Scenario 2 falls to 0.886 mSv/y

---

### 5. ICRP 107 data integrity

Constants for the extended ICRP 107 nuclides are computed from the parsed photon
emissions and cross-checked against the published Cornejo (2015) values by the
automated test suite (`node test/validate-constants.js`), not by an in-browser
page. Data integrity is backed by:
- SHA256 hashes of source files (NDX, RAD) stored in JSON metadata
- Timestamps showing when data was last regenerated
- Parser version (2.0 fixed-width columns) documented

---

## Dark Mode

Toggle dark/light mode using the **moon icon** (🌙) in the top-right corner. Preference is saved in browser.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Properties: focus the search bar |
| `Escape` | Properties: clear the search and close the detail panel. Decay and Dose: close the nuclide list |
| `↑` `↓` `Enter` | Decay and Dose: move through the nuclide list and select |
| `Alt+D` | Toggle dark mode (all pages) |

---

## Data Quality & Limitations

### Main Database (40 nuclides)
- **Published comparison**: Cornejo et al. (2015) for 32 nuclides (ΓKair matches the published table)
- **Additional nuclides**: Ga-68 (ICRP 107 / ICRP 74 A.21) and Y-90 (predominantly a β⁻ emitter; no applicable photon dose-rate constants in Properties, and direct beta dose is not calculated)
- **Note**: Operational Γ H*(10) / H'(0.07) values use ICRP 107 nuclear data; material differences from published Cornejo values are reported with the affected nuclide and in calculation reports
- **Use case**: Radiation protection estimation; verify against primary sources for regulatory submissions
- **Conversion coefficients and photon filter**: h*(10) and h'(0.07,0°) per unit fluence from ICRP 74 (1996) Table A.21 — the 25 printed energies, log-log interpolated, no 1.25 MeV node; the printed 6.90 pSv·cm² at 1.5 MeV is kept although the table's own columns give 7.04. Photon lines with E ≥ 20 keV and yield ≥ 0.01 % are used; lines with a yield exactly equal to 0.01 % are kept, whereas Cornejo et al. (2015) state yields above 0.01 %. Of the 32 Γ^H\*(10) values published by Cornejo et al. (2015), 23 are reproduced within ±2 %; the history of the conversion table is in `docs/GAMMA_A21_2026-10-03.md`

### Extended Database (1,252 nuclides from ICRP 107)
- **Source**: ICRP Publication 107 (2008) — official decay data compilation
- **Calculation**: Γ constants derived from photon spectrum using ICRP 74 Table A.21 conversion coefficients
- **Check**: the same method, applied to the 32 nuclides with a value published by Cornejo et al. (2015), agrees within ±2 % for 23 of them; 6 differ by more than 5 % (largest 11.2 %). These differences are reported, not reconciled. The extended entries themselves have no published comparison recorded in the app
- **Use case**: Reference and estimation only — NOT validated for clinical use
- **Limitations**:
  - Includes positron annihilation only when present in ICRP 107 as `AQ`
  - Excludes continuous beta spectrum contribution
  - Derived constants not peer-reviewed

### Dose Calculations
- **Ambient dose equivalent H\*(10)** assumes:
  - Photon field (gamma and X-rays)
  - Point source at specified distance
  - Scatter build-up included via infinite-medium point-isotropic factors (ANSI/ANS-6.4.3) applied to finite barriers — the deviation is not universally conservative (the finite-barrier and interface corrections of NUREG/CR-5740 are not applied); not a substitute for structural shielding design calculations

- **Directional dose equivalent H'(0.07)**:
  - 0.07 mm depth (70 μm); area-monitoring quantity, an indicator for skin and extremities, not a personal dose
  - Photons only: direct beta/electron dose is not calculated
  - ICRP 74 (1996) Table A.21 conversion coefficients

---

## Troubleshooting

**Q: Search returns no results**
- A: Check spelling (e.g., "Tc-99m" not "Tc99m")
- A: The extended ICRP 107 database is searched automatically when the main database has no match
- A: Try searching by element name (English or Spanish, e.g. "technetium", "tecnecio") or by clinical use

**Q: ICRP 107 data doesn't load**
- A: The ICRP 107 database is bundled locally; an internet connection is not required
- A: Check the browser console (F12) for a missing or blocked `data/icrp107-data.js` file
- A: For an installed PWA, clear this app's site data or unregister its service worker, then reload while online once; a normal browser-cache clear may leave the installed service worker active
- A: For `file://`, keep the complete folder structure together and reopen `index.html`

**Q: Calculated dose seems too high/low**
- A: Verify activity units (MBq vs GBq)
- A: Check that the entered distance matches the selected unit (m or cm)
- A: For ICRP 107 extended nuclides, verify the constants are computed, not manually validated

**Q: Can I use ICRP 107 for regulatory submissions?**
- A: No. ICRP 107 calculated constants are informational only.
- A: Use published peer-reviewed values (like Cornejo et al. when available)
- A: If no published value exists, verify ICRP 107 calculation independently before regulatory use

---

## References

- **Cornejo Díaz N., Brosed Serreta A., Ruiz Manzano P.** (2015). "Constantes de tasa de kerma en aire y de tasa de equivalente de dosis ambiental de algunos radionucleidos utilizados en aplicaciones médicas." *Radioprotección* (SEPR), Nº 83, 39–42.
- **ICRP Publication 74** (1996). "Conversion Coefficients for Use in Radiological Protection against External Radiation." International Commission on Radiological Protection.
- **ICRP Publication 107** (2008). "Nuclear Decay Data for Dosimetric Calculations." Endo & Eckerman.
- **ICRP Publication 119** (2012). "Compendium of Dose Coefficients based on ICRP Publication 60." Used as the numerical transcription of RD 783/2001 Annex III tables a) and b).
- **Real Decreto 783/2001**, Anexo III, tablas a) y b) (public dose coefficients). RD 783/2001 was repealed by RD 1029/2022, whose third transitional provision — and the CSN Resolution of 3 April 2024 — keep these coefficients in force for members of the public.
- **ICRP Publication 116** (2010). "Conversion Coefficients for Radiological Protection Quantities for External Radiation Exposures." With the corrigenda in ICRP Publication 129 (2015).
- **IAEA Safety Reports Series No. 19** (2001). "Generic Models for Use in Assessing the Impact of Discharges of Radioactive Substances to the Environment." §4.9 and §6.6.
- **Kennedy W.E. Jr., Parkhurst M.A., Aaberg R.L., Rhoads K.C., Hill R.L., Martin J.B.** (1992). *Evaluation of Exposure Pathways to Man From Disposal of Radioactive Materials Into Sanitary Sewer Systems*. NUREG/CR-5814 / PNL-7892, U.S. NRC. §5.2.1, §5.2.2, Tables A.16, A.20, A.21, B.7.
- **ICRU Report 57** (1998). "Conversion Coefficients for use in Radiological Protection against External Radiation." Related literature; not consulted for this app, whose conversion coefficients are taken from ICRP Publication 74.
- **Instrucción IS-28** (CSN, 22 September 2010). "Especificaciones técnicas de funcionamiento que deben cumplir las instalaciones radiactivas de segunda y tercera categoría." BOE nº 246, 11 October 2010 (BOE-A-2010-15594).
- **[Real Decreto 1029/2022](https://www.boe.es/buscar/act.php?id=BOE-A-2022-21682)**, de 20 de diciembre, por el que se aprueba el Reglamento sobre protección de la salud contra los riesgos derivados de la exposición a las radiaciones ionizantes. BOE-A-2022-21682.
- **[Real Decreto 1217/2024](https://www.boe.es/buscar/act.php?id=BOE-A-2024-25205)**, de 3 de diciembre, por el que se aprueba el Reglamento sobre instalaciones nucleares y radiactivas, y otras actividades relacionadas con la exposición a las radiaciones ionizantes. BOE-A-2024-25205.
- **Zanzonico P.B. et al.** (1999). "Bremsstrahlung radiation exposure from pure beta-ray emitters." *J Nucl Med* 40(6):1024–1028. Methodological background only; the application's container constants are not tabulated in the article.
- **NIST XCOM / XAAMDI**. Photon mass attenuation coefficients for lead, elemental iron and ordinary concrete.
- **Trubey D.K.** (1991). *New Gamma-Ray Buildup Factor Data for Point Kernel Calculations: ANS-6.4.3 Standard Reference Data*. NUREG/CR-5740 / ORNL/RSIC-49/R1, Table 3 (exposure buildup factors for lead, iron and concrete).
- **Oumano M. et al.** (2025). "Shielding resources for four common radiopharmaceuticals utilized for imaging and therapy: Tc-99m, F-18, I-131, and Lu-177." *J Appl Clin Med Phys* 26(5):e70084. DOI 10.1002/acm2.70084 (CC BY 4.0).

---

## Support & Feedback

For issues, questions, or feature requests, contact the person or organisation that supplied your copy of the application.

## Development tooling

This application was developed with the assistance of AI coding tools — Anthropic **Claude Code** and OpenAI **Codex** — operated, reviewed and directed by the author, who remains the sole author and licensor of the original code. These tools hold no authorship, copyright or licence interest in the application; this statement is a voluntary transparency notice, not a licence obligation.

Correctness does not rest on how the code was written: numerical data are taken from the cited sources (ICRP, ICRU, NIST, NUREG/ANS, BOE) — transcribed where the source tabulates them, computed or reconstructed from them where indicated (e.g. the operational Γ constants, the H'(0.07) spectra, the explicitly experimental Y-90 container estimates), with the status labelled per value — the calculation paths are checked by the automated test suites against external anchors, and adoption for professional use requires the independent human validation described in the acceptance sheet.

---

## License

The original application code is licensed under the **European Union Public Licence, version 1.2 only (EUPL-1.2)**. It may be used in educational, research, regulatory, commercial and healthcare settings, subject to the licence terms, including its copyleft and source-availability requirements.

This application is supplied directly in machine-readable source-code form. The corresponding HTML, CSS and JavaScript files, together with the licence and attribution files, accompany each local copy; no external source-code service is required.

Bundled third-party software and data are not relicensed by the EUPL. In particular, the ICRP-07 decay data retains the educational, research and not-for-profit terms in `LICENSE.TXT`; other sources retain the terms stated in `THIRD_PARTY_NOTICES.md`. See **About, guide & licences** in the application for the complete texts and scope map.

For regulatory use, verify against primary sources and consult local radiation protection authorities.
