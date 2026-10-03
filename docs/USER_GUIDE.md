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
- **Offline**: Works entirely offline when opened from `file://`; a copy first loaded over HTTP(S) can also work offline from its local cache
- **Install as app (PWA)**: when served through `localhost` or HTTPS, a compatible browser can offer "Install" / "Add to Home screen" — the app then runs standalone with its own icon and a service worker keeps all assets cached for fully offline use
- **Reports**: the Decay, Dose and Effluent calculators include a **📄 Report / PDF** button that generates a printable calculation report (timestamp, database version, inputs, results, method, data sources, disclaimer and sign-off line) — use the browser's "Save as PDF" destination to archive it

---

## Main Pages

### 1. Properties (`index.html`)

**Purpose**: Look up radionuclide properties, half-lives, decay modes, and dose rate constants.

**How to use**:
1. **Search** for a nuclide by name or symbol:
   - Type "Tc-99m", "technetium", "99m", or "tecnecio" (Spanish)
   - Filter by modality (PET, SPECT, Therapy, Brachytherapy) using buttons
2. **View properties**:
   - Half-life in human-readable format
   - Decay modes (α, β⁻, β⁺, EC, IT, etc.)
   - Dose rate constants:
     - **Γ^H\*(10)**: Ambient dose equivalent rate constant (area monitoring; effective-dose estimator) — μSv·h⁻¹·GBq⁻¹·m²
     - **Γ^H'(0.07)**: Directional dose equivalent rate constant (area monitoring; skin/extremity indicator) — μSv·h⁻¹·GBq⁻¹·m²
   - Representative photon energy
   - Liquid effluent individual concentration level, (1 mSv / e(g)) / 600 L with the adult ingestion coefficient of RD 783/2001 Annex III table a), adult (> 17 y), kept in force by the CSN Resolution of 3 April 2024 (numerical transcription: ICRP 119 Table F.1); when several chemical forms are tabulated, the most restrictive governs (one of the IS-28 II.A.4 conditions for controlled sewer discharge; a complete assessment must also verify the mixture sum Σ(Cᵢ/Lᵢ) ≤ 1 and the annual activity limits — 10 GBq H-3, 1 GBq C-14 and < 1 GBq the rest combined — which this application does not evaluate)
   - RD 1217/2024 Annex IV, for **every** nuclide in the detail panel (curated and ICRP 107 extended):
     - **Table A1** (257 entries) — activity-concentration value for exemption of practices or clearance of materials, any quantity and any type of solid material; entries marked (a) refer to the parent and already account for the listed progeny. Nuclides not in A1 are shown as *not tabulated*: Annex III.1.b refers to the European Commission's "Radiation Protection 122 Part 1" (not included); natural radionuclides fall under Table A2 (not implemented)
     - **Table B** (297 rows) — exemption of moderate quantities (≤ 1000 kg): column 2 concentration (kBq/kg) and column 3 total activity (Bq). Not tabulated: Annex II A.3.a refers to the CSN values
     - Four note/progeny inconsistencies of the BOE itself (A1 Ce-144, U-231; B Ag-108m, U-230) are shown as printed, with a warning
3. **Clinical use**: See modality and intended clinical applications
4. **Export**: Download the table as CSV

**Main database**: 40 radionuclides — 32 with published comparison values in **Cornejo et al. (2015)**, **Ga-68**, the pure-β⁻ special case **Y-90**, and 6 therapy/imaging additions (**Zr-89, Cu-67, Tb-161, Ho-166, Ra-223+daughters, Ac-225+daughters**). Operational values use ICRP 107 photon data and ICRU 57 conversion coefficients where indicated; material differences from published comparison values are shown contextually.

#### Extended Database — ICRP 107

The application includes an **extended database of 1,252 radionuclides** from ICRP Publication 107 (2008). If you search for a nuclide not in the main database:

1. Search bar will show "No results in main database"
2. Click **"Search in ICRP 107"** button
3. Results appear with:
   - **Nuclide ID** (e.g., "Am-241")
   - **Half-life** (auto-calculated from ICRP 107)
   - **Decay mode** (extracted from nuclear data)
   - **Photon emissions** — filtered table showing:
     - Energy [keV]
     - Yield [% per decay]
     - Type (G = gamma, X = X-ray, AQ = annihilation quantum)
   - **Calculated dose constants**:
     - Γ^H\*(10) — **automatically calculated** from photon emissions using Cornejo et al. methodology
     - Γ^H'(0.07) — extremity dose constant
   - **Warning banner**: "⚠ Constants calculated from ICRP 107 emissions — not manually validated. For clinical/regulatory use, verify against primary sources."

**Use ICRP 107 for**:
- Quick reference on any radionuclide (half-life, decay modes, spectrum)
- Estimating dose constants for nuclides not in the curated database
- Exploring photon spectra for shielding calculations
- Educational purposes

**Do NOT use ICRP 107 for**:
- Clinical or regulatory submissions without independent verification
- High-precision dosimetry — use published, peer-reviewed constants
- Safety decisions without expert review

**Example**: Search for "Am-241" (Americium-241):
- ICRP 107 shows: T₁/₂ = 432.2 years, α decay, ~50 X-ray photons filtered
- Calculated Γ^H\*(10) ≈ 0.48 μSv·h⁻¹·GBq⁻¹·m² (informational only)

---

### 2. Decay Calculator (`decay.html`)

**Purpose**: Calculate how much activity remains after a time period, or time needed to reach a target activity.

**How to use**:
1. Select a nuclide from dropdown (or paste an ID)
2. Enter **Initial Activity**:
   - Input value and unit (MBq, GBq, mCi, Ci)
   - Converts to seconds for calculation
3. Choose calculation mode:
   - **Time → Activity**: Enter time, get remaining activity
   - **Activity → Time**: Enter target activity, get required decay time
4. Adjust **Time**:
   - Use slider or input field
   - Units: seconds, minutes, hours, days, years
5. View **Decay Curve**: Interactive chart shows A(t) = A₀ · e^(−λt)
6. **Clearance and exemption** (RD 1217/2024 Annex IV, single nuclide; mixtures and sums over sources are not evaluated):
   - **Clearance, Table A1**: enter the material weight; A/m is compared with the A1 value at t = 0 and at t, with the time needed to reach it. Works for curated and extended entries; Mo-99 gives the same result from either entry
   - **Exemption, Table B** — Annex II A.1 sets *separate* criteria: a) a source — total activity vs column 3; b) material in moderate quantity (≤ 1000 kg) — A/m vs column 2. Above 1000 kg, c) applies: Table A1

**Example**:
- Initial: 1000 MBq Tc-99m
- After 6 hours: ~501 MBq (50% of initial, approximately one half-life)
- Time to reach 100 MBq: 20.6 hours

---

### 3. Dose Estimator (`dose.html`)

**Purpose**: Calculate external dose rates and cumulative dose for a worker handling radioactivity.

**How to use**:
1. **Select nuclide** and **activity** (MBq, GBq, mCi, Ci)
2. **Distance**: Enter distance from source (m or cm)
   - **Dose rate is calculated at YOUR selected distance** (primary output)
   - Both quantities are always shown: **H\*(10)** (ambient dose equivalent, effective-dose estimator) and **H'(0.07)** (directional dose equivalent, skin/extremity indicator — falls back to the H\*(10) value when no Γ^H'(0.07) constant exists)
   - These are **area-monitoring** quantities; compliance with dose limits is assessed with personal dosimetry (Hp(10), Hp(0.07), Hp(3))
   - Reference dose rate @ 1 m shown for comparison
3. **Dose rate** is calculated instantly:
   - H ̇ = Γ × A / r²
   - Units: μSv/h at distance you specify

4. **Optional: Shielding**
   - Material: Lead, elemental Iron, or Concrete (normal or lightweight). Iron is modelled as Fe at ρ = 7.874 g/cm³, not as a generic steel alloy
   - Thickness: 0–300 mm
   - Transmission curve shows dose reduction
   - Uses **Archer broad-beam** (Monte Carlo) for Tc-99m, F-18, I-131, Lu-177
   - Uses **spectrum-weighted narrow-beam with build-up** (dose-weighted sum over the nuclide's ICRP 107 photon lines; NIST XCOM attenuation; ANSI/ANS-6.4.3 point-isotropic exposure buildup factors) for other nuclides — accounts for beam hardening AND scatter build-up (ICRP 107 extended entries build the spectrum dynamically at selection time)

5. **Cumulative dose**:
   - Enter **exposure time per administration** (hours/min): time the worker is near the source per patient
   - Enter **number of administrations per year**
   - Models radioactive decay *during* each exposure (with decay mode enabled)
   - Annual total = single-administration dose × number of administrations
   - **Note**: inter-administration decay is not modelled; each administration is treated independently

6. **Annual dose limit check**:
   - Compares to EU RD 1029/2022 limits:
     - **Whole body**: 20 mSv/year (worker)
     - **Extremities** (hands/feet): 500 mSv/year
     - **Lens of eye**: <em>Both conditions must be satisfied:</em> 50 mSv/year max annual AND 100 mSv over any consecutive 5-year period (current regime since 2024-06-22)
   - Shows **status**: ✓ Safe | ⚠ Caution | ✗ Exceeds limit

7. **Special case — Y-90 (pure beta emitter)**:
   - Photon dose-rate constants are not applicable in Properties; Dose provides a separate experimental bremsstrahlung scenario
   - Select an assumed container geometry: PMMA, Lead, Tungsten, or None
   - The displayed container-dependent values are estimates inspired by the Zanzonico et al. (1999) formalism; that publication does **not** tabulate these container constants
   - The scenario reports no regulatory verdict. Do not use it for shielding design or regulatory submissions without a primary source or measurements for the actual geometry

**Example**:
- 100 MBq Tc-99m at 50 cm: ~8.7 μSv/h (Γ = 21.7 μSv·h⁻¹·GBq⁻¹·m²)
- With 5 mm lead shielding: ~0.9 μSv/h (~90% reduction)
- 200 administrations/year with 5mm lead: ~1.6 mSv/year (Safe)

- Y-90 scenarios are clearly marked experimental and are excluded from regulatory conclusions

---

### 4. Liquid Effluent — Sewer and STP Workers (`effluent.html`)

**Purpose**: Screening estimate of the annual effective dose from Lu-177, I-131, Lu-177m, Tc-99m and F-18 excreted by nuclear-medicine patients, for two workers of NUREG/CR-5814 (1992) who are members of the public with respect to the licensee:
- **Scenario 1 — sewer system inspector** (§5.2.1): external immersion in the facility's wastewater (water slab at 1 m) and inhalation of aerosol in the interceptor
- **Scenario 2 — STP / EDAR sludge process operator** (§5.2.2): external exposure to dewatered sludge and inhalation of resuspended dry sludge, with the screening philosophy of IAEA SRS-19 (2001) §4.9 and §6.6

The two scenarios concern **different receptors: each total is compared with the criterion on its own and they are never added together**.

**How to use**:
1. **Source term** (one row per nuclide; tick *Include* — only Lu-177 and I-131 are included by default): A_adm = patients/year × cycles/patient × administered activity per cycle, all of it assumed to be excreted; *fraction excreted in hospital*; *decay tanks* if the nuclide is controlled in hospital decay tanks
   - The fraction excreted in hospital leaves through the facility's sewer connection. For nuclides controlled in decay tanks only the annual tank discharge leaves (common parameter, default 1 GBq/y for the sum of controlled nuclides — the IS-28 Annex II II.A.4 annual limit), shared among them in proportion to the activity excreted into the tanks; when that activity is below the limit, all of it is assumed discharged (no decay credit)
   - The rest is excreted at home
   - **Scenario 1** receives only the activity leaving the hospital; **Scenario 2** receives the activity leaving the hospital plus the activity excreted at home by the patients living in the STP catchment
   - I-131: always one treatment per patient (default 0.8 GBq, the workbook value)
   - Lu-177m: impurity of carrier-added Lu-177 (default 0.01 % of 7.4 GBq per cycle)
   - Tc-99m: no default in the reference workbooks — enter the facility's data
2. **Scenario 1**: facility type (hospital 20 000 m³/y, clinic 3650 m³/y, or the licensee's figure — consumption ≈ discharge), water density, aerosol loading, respirable fraction, exposure times, geometry factor and transit time (≈ 0.2 h)
3. **Scenario 2**: wet (dewatered) sludge production — plant-specific, from PRTR-España, waste code LER 19 08 05 —, solids fraction, wet density, fraction retained in sludge, transit time to the press (≈ 3 d), dust loading, respirable fraction, exposure times, geometry factor and the external-coefficient geometry (*up to 100 m²*, 10 × 10 × 3 m, or *up to 2000 m²*, 45 × 45 × 3 m, default)
4. **Common**: breathing rate, annual discharge from decay tanks and a **user-defined** dose criterion (default 1 mSv/y; the app attributes no regulatory basis to it)

Results update as you type: per scenario, decay factor, concentrations and dose factor per GBq discharged; annual external, inhalation and total dose per nuclide; per-scenario sum and percentage of the criterion. **📄 Report / PDF** and **⬇ Export CSV** record every input and coefficient.

**Model** (per nuclide, A = activity reaching the sewer in one year, DF = exp(−λ·t_transit)):
- Scenario 1: C_water [Bq/m³] = A · DF / V; C_air = (C_water / ρ_water) · aerosol loading · f_resp; E_ext = C_water · k₁ · t_ext · g; E_inh = C_air · BR · t_inh · e(inh)
- Scenario 2: C_dry [Bq/kg] = A · f_sludge · DF / (M_wet · f_solids); C_wet [Bq/m³] = A · f_sludge · DF · ρ_wet / M_wet; C_air = C_dry · dust loading · f_resp; E_ext = C_wet · k₂ · t_ext · f_geom; E_inh = C_air · BR · t_inh · e(inh)

**Data**:
- **k₁, k₂** (external): effective-dose-rate coefficients (ICRP 116, rotational geometry) calculated with PHITS — Scenario 1 for a 600 × 200 × 50 cm water slab with the receptor at 1 m, Scenario 2 for a uniform 3 m deep sludge source with the receptor at 2 m. They are **not** point-source Γ constants and apply only to those geometries. F-18 has no Scenario 2 coefficient and is shown as *not evaluated*, not as zero
- **e(inh)**: RD 783/2001 Annex III table b), adult (> 17 y) member of the public, kept in force by the CSN Resolution of 3 April 2024 (numerical transcription: ICRP 119 Table G.1) — Lu-177 M 1.1×10⁻⁹, Lu-177m M 1.3×10⁻⁸, I-131 F 7.4×10⁻⁹, Tc-99m M 1.9×10⁻¹¹, F-18 M 5.6×10⁻¹¹ Sv/Bq
- Half-lives from the app database; Lu-177m, which is not a curated entry, from ICRP 107 (160.4 d)

**Limitations**:
- Screening models; no decay during the exposure year (continuous discharge, steady-state concentrations)
- Scenario 1 coefficients are photon-only: bremsstrahlung from beta and positron emission is not included and has not been bounded for this geometry — the limitation is larger for F-18 and I-131
- NUREG/CR-5814 prescribes an infinite slab for Scenario 2, which neither coefficient covers. For Lu-177 the PHITS study measured that the 2000 m² coefficient captures 73–75 % of the infinite slab
- Inhalation uses public dose coefficients: neither worker is an exposed worker of the licensee
- **Not a complete discharge assessment.** The IS-28 Annex II II.A.4 sewer conditions (per-nuclide level, sum of fractions, annual activity limits) and mixture clearance are evaluated separately
- A collapsible panel compares the coefficients with the GENII-1990 factors of NUREG/CR-5814 Table A.21 (I-131, F-18, Tc-99m; the PHITS Scenario 1 coefficients are 2.7–3.6 times higher, a difference that has not been investigated) and the I-131 Scenario 2 result with NUREG/CR-5814 Table B.7 and IAEA SRS-19 Table I–IV. All are indicative only; SRS-19 Annex I uses an occupancy of 0.288 where 2000/8760 = 0.228

**Example** (default values, Lu-177 and I-131 included, no decay tanks, 2000 m² geometry):
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
| `/` | Focus the search bar (Properties page) |
| `Escape` | Clear the search / close the detail panel |
| `Alt+D` | Toggle dark mode |

---

## Data Quality & Limitations

### Main Database (40 nuclides)
- **Published comparison**: Cornejo et al. (2015) for 32 nuclides (ΓKair matches the published table)
- **Additional nuclides**: Ga-68 (ICRP 107 / ICRU 57) and Y-90 (pure β⁻ emitter; no applicable photon dose-rate constants in Properties)
- **Note**: Operational Γ H*(10) / H'(0.07) values use ICRP 107 nuclear data; material differences from published Cornejo values are reported with the affected nuclide and in calculation reports
- **Use case**: Radiation protection estimation; verify against primary sources for regulatory submissions

### Extended Database (1,252 nuclides from ICRP 107)
- **Source**: ICRP Publication 107 (2008) — official decay data compilation
- **Calculation**: Γ constants derived from photon spectrum using ICRU 57 / ICRP 74 conversion coefficients
- **Validation**: ±5% agreement with published values for F-18, Tc-99m, I-131, Lu-177, Ga-68
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

- **Directional dose H'(0.07)** for extremities:
  - 0.07 mm depth (70 μm)
  - Used for hands, feet, forearms
  - ICRP 74 conversion coefficients

---

## Troubleshooting

**Q: Search returns no results**
- A: Check spelling (e.g., "Tc-99m" not "Tc99m")
- A: Click "Search in ICRP 107" for extended database
- A: Try searching by element name (English or Spanish, e.g. "technetium", "tecnecio") or by clinical use

**Q: ICRP 107 data doesn't load**
- A: The ICRP 107 database is bundled locally; an internet connection is not required
- A: Check the browser console (F12) for a missing or blocked `data/icrp107-data.js` file
- A: For an installed PWA, clear this app's site data or unregister its service worker, then reload while online once; a normal browser-cache clear may leave the installed service worker active
- A: For `file://`, keep the complete folder structure together and reopen `index.html`

**Q: Calculated dose seems too high/low**
- A: Verify activity units (MBq vs GBq)
- A: Check distance in correct units (cm, not m)
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
- **ICRU Report 57** (1998). "Conversion Coefficients for use in Radiological Protection against External Radiation."
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
