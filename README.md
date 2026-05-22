# NM Radionuclide Planner

Web application for nuclear medicine radionuclide properties, decay calculations, and external dose estimation for radiation workers.

**Live app:** https://eucariota-git.github.io/radionuclides-main/

Target users: medical physicists and radiation protection specialists.

---

## Features

### Properties (`index.html`)
- Database of 34 radionuclides used in nuclear medicine (PET, SPECT, therapy, brachytherapy)
  - 32 nuclides: dose rate constants from Cornejo et al. (2006)
  - 2 nuclides (Ga-68, Y-90): additions with recalculated constants using ICRP 107 photon data and ICRU 57 conversion coefficients
  - Note: Some values differ from Cornejo due to updated nuclear data in ICRP 107; published Cornejo values are preserved in `cornejo_validation` field
- Controlled liquid effluent concentration limits calculated from IS-28 and ICRP 119 adult ingestion coefficients
- Filterable by category and modality

### Decay calculator (`decay.html`)
- A(t) = A₀ · e^(−λt) with interactive Chart.js v4.4.0 curve (loaded locally, no CDN dependency)
- Supports MBq, GBq, mCi, Ci
- Time to target activity

### Dose estimator (`dose.html`)
- **Dose rate at user-selected distance** (primary output) with 1 m reference column
- **H\*(10)** ambient dose equivalent for whole body (d ≥ 25 cm)
- **H'(0.07)** directional dose equivalent for extremities (d < 25 cm); used when available for low-energy emitters, otherwise H*(10) is conservatively applied
- **Y-90 bremsstrahlung table** (Zanzonico et al. 1999) with interactive container selection (PMMA, Pb, W, none); applies H'(0.07) at d < 25 cm where applicable; Pb warning and dose consolidation via `PHYSICS.Y90_CONTAINERS`
- Shielding: Lead and concrete (normal-weight and light-weight)
- **Archer broad-beam method** (Monte Carlo, Oumano et al. 2025) for Tc-99m, F-18, I-131, Lu-177
- Narrow-beam fallback (NIST XCOM) for all other nuclides
- Cumulative dose with radioactive decay integration
- **Annual dose limit comparison** (RD 1029/2022 / EURATOM 2013/59):
  - Effective dose: 20 mSv/y worker, 1 mSv/y public
  - Extremities: 500 mSv/y
  - **Lens of eye: 50 mSv/y max annual, 100 mSv/5-year cycle (current regime since 22 Jun 2024)**
  - Crystal lens calculation with both limits displayed
- CSV export includes dose rates at both selected distance and 1 m reference

### Custom nuclide (`custom.html`)
- Upload CSV in IAEA LiveChart format
- Calculates Γ^H\*(10) and Γ^H'(0.07) using Cornejo et al. methodology (ICRU 57 / ICRP 74)
- Filter criteria: photons (G/X), E ≥ 20 keV, yield ≥ 0.01%

### Extended database — ICRP 107 (`index.html` + `validate-icrp107.html`)
- Main database contains 34 curated radionuclides. For any other nuclide, the Properties page offers fallback search in **ICRP Publication 107** (1252 nuclides)
- **"Search in ICRP 107" button** appears when a nuclide is not found in the main database
- Automatically calculates Γ^H\*(10) and Γ^H'(0.07) from ICRP 107 photon emissions, including annihilation quanta where present (E ≥ 20 keV, yield ≥ 0.01%)
- Displays photon spectrum (energy, yield, type) with **max photon energy** for H'(0.07) assessment
- **Validation tool** (`validate-icrp107.html`) — internal compliance tool:
  - Tests 20 reference nuclides (7 original + 8 Phase 2 + 5 Phase 3, including I-125, Cu-64, Re-188, Tm-170, Au-198, Yb-169)
  - Validates: Z extraction, half-life parsing, photon count filtering, dose constant calculation
  - Color-coded status: ✓ Pass (< 5% deviation) | ⚠ Warning (5–15%) | ✗ Fail (> 15%)
  - All tests currently passing
- Parser metadata: SHA256 hashes of source ICRP-107 files stored in JSON for audit trail
- See `references/icrp107/README.md` for detailed documentation on ICRP 107 integration

---

## Physics

### Dose rate constants
Γ [μSv·h⁻¹·GBq⁻¹·m²] = K · Σᵢ (nᵢ · h(Eᵢ))

where K = 28.648, nᵢ = photon yield per decay, h(Eᵢ) = fluence-to-dose conversion coefficient (ICRP 74).

### Shielding — Archer equation (broad beam)
T(x) = [(1 + β/α) · e^(αγx) − β/α]^(−1/γ)

Parameters from Monte Carlo simulations (GATE/MCNP6) for Tc-99m, F-18, I-131, Lu-177 in lead, normal-weight concrete and light-weight concrete.
Source: Oumano et al., *J Appl Clin Med Phys*, 2025. doi:10.1002/acm2.70084

### Shielding — narrow beam (fallback)
T(x) = e^(−μx)

μ from NIST XCOM. Lead K-edge at 88 keV handled explicitly.

---

## Data sources

| Data | Source |
|------|--------|
| Γ^H\*(10), Γ^H'(0.07) constants (32 curated nuclides) | Cornejo et al., *Rev. Fis. Med.* 2006 |
| Γ^H\*(10), Γ^H'(0.07) constants (Ga-68, Y-90, + recalculations) | ICRP 107 photon data + ICRU 57 conversion coefficients |
| Fluence-to-dose coefficients h\*(10), h'(0.07) | ICRP Publication 74 / ICRU 57 |
| Adult ingestion dose coefficients and liquid effluent limits | ICRP Publication 119 Annex F / IS-28 Annex II |
| Mass attenuation coefficients | NIST XCOM |
| Archer shielding parameters | Oumano et al., *J Appl Clin Med Phys* 2025 |
| Nuclide emissions (custom upload) | IAEA LiveChart CSV format |
| Extended nuclide database (1252 nuclides) | ICRP Publication 107 (Endo & Eckerman, 2008) |
| Photon emissions for extended database | ICRP-07.RAD and ICRP-07.NDX files |

---

## Data Integrity & Traceability

All generated JSON files include metadata for audit trail:

```json
{
  "notes": {
    "generated_at": "2026-05-17T19:27:19.466Z",
    "generated_by_script": "tools/parse-icrp107.js",
    "icrp107_ndx_sha256": "6aa2f8d762c9d2df0b4848b9ed13979a1f5b71f2a7c1889e28b5512b46cbfd80",
    "parser_version": "2.0 (fixed-width columns)"
  }
}
```

- **Parser version 2.0:** FORTRAN fixed-width column extraction (not space-splitting)
- **Z values:** Derived from nuclide symbol, validated against ICRP-107
- **Hashes:** Allow verification that source files (NDX/RAD/JSON) have not been altered
- **Timestamps:** Track when data was last regenerated

---

## Recent Improvements & Bug Fixes (2026-05)

### Critical Fixes
- **Y-90 time unit conversion:** Fixed calculation of exposure time — now correctly applies unit conversion (min/h/d) in dose estimation
- **Y-90 H'(0.07) selection:** Y-90 bremsstrahlung now correctly applies H'(0.07) for extremities (d < 25 cm) in PMMA, Pb, and W containers
- **Lens of eye limits (RD 1029/2022):** Updated regulatory compliance to reflect new limits (100 mSv/5-year cycle from Jan 1 2026)

### Medium Priority
- **Y-90 data consolidation:** Zanzonico bremsstrahlung table now sourced from `PHYSICS.Y90_CONTAINERS` (single source of truth in `js/data.js`)
- **Chart.js offline support:** v4.4.0 bundled locally (`js/chart.umd.min.js`); no CDN dependency for offline compatibility
- **CSS variables:** Defined missing variables (`--border`, `--bg-elevated`, `--text-muted`, `--warning-100`, `--success`) for consistent styling

### Low Priority
- **Custom nuclides:** Added `max_photon_energy_keV` field for correct H'(0.07) assessment in user-uploaded nuclides
- **Validation expansion:** Extended ICRP 107 compliance testing from 7 to 20 reference nuclides (Phases 1–3)

---

## Compatibility

Works on desktop and mobile browsers. Loads from `file://`, `content://` (Android) and HTTP/HTTPS without a server — all dependencies are local:
- Curated and ICRP 107 data embedded as inline JS variables (`data/nuclides-data.js`, `data/icrp107-data.js`)
- Chart.js v4.4.0 bundled locally (`js/chart.umd.min.js`, no CDN dependency)

---

## Structure

```
index.html              Properties page (with ICRP 107 extended search)
decay.html              Decay calculator
dose.html               Dose estimator (with Y-90 Zanzonico, distance-aware output)
validate-icrp107.html   ICRP 107 validation tool (internal compliance testing)
custom.html             Custom nuclide upload

css/style.css           Shared styles

js/data.js              PHYSICS module — ICRU57 tables, attenuation coefficients, Y90_CONTAINERS (Zanzonico bremsstrahlung)
js/physics.js           CALC module — decay, dose, Archer/narrow-beam transmission
js/db.js                DB module — nuclide database management
js/csv-parser.js        CSV_PARSER module — IAEA LiveChart format
js/icrp107-loader.js    ICRP107 module — extended DB search, dose calculation, max photon energy
js/ui.js                UI module — dark mode, print, keyboard, history

data/nuclides.json      Radionuclide database (directly editable, source of truth)
data/nuclides-data.js   Auto-generated from nuclides.json (for file:// compatibility)
data/icrp107-index.json Extended database JSON (1252 nuclides with photon emissions)
data/icrp107-data.js    Embedded ICRP 107 data (for file:// compatibility)
data/y90-bremsstrahlung.json  Y-90 Zanzonico bremsstrahlung table (source; consolidated in PHYSICS.Y90_CONTAINERS)

data/sources/icrp107/   ICRP Publication 107 source files (NDX, RAD, BET)

tools/parse-icrp107.js  NDX/RAD/BET parser (FORTRAN fixed-width, generates icrp107-index.json)
tools/recalc-gamma.js   Recalculates Γ from photons using ICRU 57 / ICRP 74
tools/generate-data.js  Wraps nuclides.json as JS for offline compatibility
tools/add-max-energy.js Adds max_photon_energy_keV to ICRP 107 nuclides

references/             Source articles (Cornejo 2006, Oumano 2025, ICRP 107)
```
