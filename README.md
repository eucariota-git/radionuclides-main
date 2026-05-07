# NM Radionuclide Planner

Web application for nuclear medicine radionuclide properties, decay calculations, and external dose estimation for radiation workers.

**Live app:** https://eucariota-git.github.io/radionuclides-main/

Target users: medical physicists and radiation protection specialists.

---

## Features

### Properties (`index.html`)
- Database of 34 radionuclides used in nuclear medicine (PET, SPECT, therapy, brachytherapy)
- Dose rate constants Γ^H\*(10) and Γ^H'(0.07) from Cornejo et al. (2006)
- Controlled liquid effluent concentration limits calculated from IS-28 and ICRP 119 adult ingestion coefficients
- Filterable by category and modality

### Decay calculator (`decay.html`)
- A(t) = A₀ · e^(−λt) with interactive Chart.js curve
- Supports MBq, GBq, mCi, Ci
- Time to target activity

### Dose estimator (`dose.html`)
- **H\*(10)** ambient dose equivalent for whole body (d ≥ 25 cm)
- **H'(0.07)** directional dose equivalent for extremities (d < 25 cm); used when available for low-energy emitters, otherwise H*(10) is conservatively applied
- Shielding: Lead and concrete (normal-weight and light-weight)
- **Archer broad-beam method** (Monte Carlo, Oumano et al. 2025) for Tc-99m, F-18, I-131, Lu-177
- Narrow-beam fallback (NIST XCOM) for all other nuclides
- Cumulative dose with radioactive decay integration
- Annual dose limit comparison (RD 1029/2022 / EURATOM 2013/59)

### Custom nuclide (`custom.html`)
- Upload CSV in IAEA LiveChart format
- Calculates Γ^H\*(10) and Γ^H'(0.07) using Cornejo et al. methodology (ICRU 57 / ICRP 74)
- Filter criteria: photons (G/X), E ≥ 20 keV, yield ≥ 0.01%

### Extended database — ICRP 107 (`index.html`)
- Main database contains 34 curated radionuclides. For any other nuclide, the Properties page offers fallback search in **ICRP Publication 107** (1251 nuclides)
- **"Search in ICRP 107" button** appears when a nuclide is not found in the main database
- Automatically calculates Γ^H\*(10) and Γ^H'(0.07) from ICRP 107 photon emissions (E ≥ 20 keV, yield ≥ 0.01%)
- Displays photon spectrum (energy, yield, type) with warning that constants are not manually validated
- **Validation tool** (`validate-icrp107.html`) compares calculated constants against published values for key nuclides (F-18, Tc-99m, I-131, Lu-177, Ga-68)
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
| Γ^H\*(10), Γ^H'(0.07) constants (34 nuclides) | Cornejo et al., *Rev. Fis. Med.* 2006 |
| Fluence-to-dose coefficients h\*(10), h'(0.07) | ICRP Publication 74 / ICRU 57 |
| Adult ingestion dose coefficients and liquid effluent limits | ICRP Publication 119 Annex F / IS-28 Annex II |
| Mass attenuation coefficients | NIST XCOM |
| Archer shielding parameters | Oumano et al., *J Appl Clin Med Phys* 2025 |
| Nuclide emissions (custom upload) | IAEA LiveChart CSV format |
| Extended nuclide database (1251 nuclides) | ICRP Publication 107 (Endo & Eckerman, 2008) |
| Photon emissions for extended database | ICRP-07.RAD and ICRP-07.NDX files |

---

## Compatibility

Works on desktop and mobile browsers. Loads from `file://`, `content://` (Android) and HTTP/HTTPS without a server — data is embedded as an inline JS variable (`data/nuclides-data.js`).

---

## Structure

```
index.html          Properties page (with ICRP 107 extended search)
decay.html          Decay calculator
dose.html           Dose estimator
custom.html         Custom nuclide upload
validate-icrp107.html  ICRP 107 validation tool (compare calculated vs published constants)

css/style.css       Styles

js/data.js          PHYSICS module — ICRU57 tables, attenuation coefficients
js/physics.js       CALC module — decay, dose, Archer/narrow-beam transmission
js/db.js            DB module — nuclide database management
js/csv-parser.js    CSV_PARSER module — IAEA LiveChart format
js/icrp107-loader.js   ICRP107 module — extended database search and dose calculation

data/nuclides.json  Radionuclide database (directly editable)
data/nuclides-data.js  Auto-generated from nuclides.json (for file:// compatibility)
data/icrp107-index.json  Extended database (1251 nuclides with photon emissions)

data/sources/icrp107/   ICRP Publication 107 source files (NDX, RAD, BET)

tools/parse-icrp107.js  Parser for ICRP 107 files (generates icrp107-index.json)

references/         Source articles (Cornejo 2006, Oumano 2025, ICRP 107)
```
