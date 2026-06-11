# NM Radionuclide Planner — User Guide

A web application for nuclear medicine radionuclide properties, decay calculations, and external dose estimation.

**Live app:** https://eucariota-git.github.io/radionuclides-main/

---

## Quick Start

The application has no installation or authentication. Simply open the link above in any modern web browser.

- **Desktop**: Firefox, Chrome, Safari, Edge (recommended)
- **Mobile**: iOS Safari, Chrome mobile (with landscape mode for better experience)
- **Offline**: Works entirely offline when opened from `file://` or after first load
- **Install as app (PWA)**: when served over HTTP(S) (e.g. the GitHub Pages link), the browser offers "Install" / "Add to Home screen" — the app then runs standalone with its own icon and a service worker keeps all assets cached for fully offline use
- **Reports**: the Decay and Dose calculators include a **📄 Report / PDF** button that generates a printable calculation report (timestamp, database version, inputs, results, method, data sources, disclaimer and sign-off line) — use the browser's "Save as PDF" destination to archive it

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
     - **Γ^H\*(10)**: Whole-body dose rate constant (d ≥ 25 cm) — μSv·h⁻¹·GBq⁻¹·m²
     - **Γ^H'(0.07)**: Extremity dose rate constant (d < 25 cm) — μSv·h⁻¹·GBq⁻¹·m²
   - Representative photon energy
   - Liquid effluent concentration limit (drinking water standard)
3. **Clinical use**: See modality and intended clinical applications
4. **Export**: Download the table as CSV

**Main database**: 40 radionuclides — 32 primarily from **Cornejo et al. (2015)**, plus **Ga-68** and **Y-90**, plus 6 therapy/imaging additions (**Zr-89, Cu-67, Tb-161, Ho-166, Ra-223+daughters, Ac-225+daughters**). Some operational values recalculated from ICRP 107 photon data; published Cornejo values preserved in `cornejo_validation`.

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
   - ≥ 25 cm → uses **H\*(10)** (whole body)
   - < 25 cm → uses **H'(0.07)** (extremity)
   - Reference dose rate @ 1 m shown for comparison
3. **Dose rate** is calculated instantly:
   - H ̇ = Γ × A / r²
   - Units: μSv/h at distance you specify

4. **Optional: Shielding**
   - Material: Lead or Concrete (normal or lightweight)
   - Thickness: 0–300 mm
   - Transmission curve shows dose reduction
   - Uses **Archer broad-beam** (Monte Carlo) for Tc-99m, F-18, I-131, Lu-177
   - Uses **spectrum-weighted narrow-beam with build-up** (dose-weighted sum over the nuclide's ICRP 107 photon lines; NIST XCOM attenuation; ANSI/ANS-6.4.3 point-isotropic exposure buildup factors) for other nuclides — accounts for beam hardening AND scatter build-up
   - Custom nuclides without a stored spectrum fall back to single-line narrow-beam (also with build-up)

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
   - Select container type: **PMMA** (standard), Lead, Tungsten, or None
   - Dose calculated from **bremsstrahlung** container estimates (methodology after Zanzonico et al. 1999; container values not tabulated in that publication)
   - ⚠️ **Warning**: Lead **increases bremsstrahlung 3–4×** compared to PMMA
   - Recommendation: Use PMMA or plastic for shielding Y-90; if using lead, accept higher external dose

**Example**:
- 100 MBq Tc-99m at 50 cm: ~8.7 μSv/h (Γ = 21.7 μSv·h⁻¹·GBq⁻¹·m²)
- With 5 mm lead shielding: ~0.9 μSv/h (~90% reduction)
- 200 administrations/year with 5mm lead: ~1.6 mSv/year (Safe)

- Y-90 500 MBq in PMMA syringe at 20 cm: dose shown; try Lead → warning shown + higher dose

---

### 4. Custom Nuclide (`custom.html`)

**Purpose**: Upload photon emission data for any radionuclide (not in the main database) and calculate dose constants.

**How to use**:
1. **Prepare CSV file** in IAEA LiveChart format:
   ```
   Nuclide,Half-life,Energy(keV),Intensity(%),Type
   F-18,109.77m,511,193.3,B+
   F-18,109.77m,511,193.3,ann
   ```
   - Download from https://www-nds.iaea.org/livechart/

2. **Upload** CSV file using the upload button
3. Parser extracts:
   - Nuclide ID, half-life
   - Photon emissions (gamma, X-ray, annihilation)
   - Filters: E ≥ 20 keV, yield ≥ 0.01%

4. **Calculated constants** appear:
   - Γ^H\*(10) using Cornejo et al. methodology
   - Γ^H'(0.07) for extremity dose
   - Photon contributions table
   - All photons meeting the filter criteria

5. **Add to session**:
   - Click "Add to session" to use in other calculators
   - Data stored in browser session (disappears on refresh)

---

### 5. Validation Tool (`validate-icrp107.html`)

**Purpose**: Internal compliance testing. Validates that the ICRP-107 parser and dose constant calculation are accurate.

**For internal use only.** Confirms:
- Z (atomic number) correctly extracted from nuclide symbol
- Half-life correctly parsed from NDX fixed-width format
- Photons correctly filtered (G/X photons, E≥20keV, yield≥0.01%)
- Dose constants calculated within acceptable tolerance

**How to use**:
1. Click **"Validation"** link in main navigation
2. Table automatically loads and tests 20 reference nuclides:
   - Phase 1: F-18, Tc-99m, I-131, Lu-177, Ga-68, I-123, Tl-201
   - Phase 2: I-125, Co-60, Se-75, In-111, Sm-153, Re-186, Ir-192, Pd-103
   - Phase 3: Cu-64, Re-188, Tm-170, Au-198, Yb-169

3. **Columns validated**:
   - **Z**: Atomic number (expected vs extracted)
   - **Half-life**: In hours (expected vs parsed from NDX)
   - **Photons**: Count filtered (expected minimum vs actual)
   - **E_max**: Maximum photon energy in spectrum
   - **Γ^H*(10)**: Dose constant with deviation %
   - **Overall**: Pass / Warning / Fail

4. **Status indicators**:
   - ✓ **Pass** (green) — All fields within tolerance, deviation < 5%
   - ⚠ **Warning** (yellow) — Some fields within 5–15% tolerance
   - ✗ **Fail** (red) — Significant deviation > 15% (investigate)

5. **Summary**:
   - "X/20 nuclides pass validation" shown at top
   - All 20 reference nuclides currently pass

**Data integrity**:
- SHA256 hashes of source files (NDX, RAD) stored in JSON metadata
- Timestamps show when data was last regenerated
- Parser version (2.0 fixed-width columns) documented

---

## Dark Mode

Toggle dark/light mode using the **moon icon** (🌙) in the top-right corner. Preference is saved in browser.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+K` or `Cmd+K` | Focus search bar |
| `Escape` | Close detail panel or clear search |
| `Alt+L` | Open dose calculator with selected nuclide |
| `Alt+D` | Open decay calculator with selected nuclide |

---

## Data Quality & Limitations

### Main Database (40 nuclides)
- **Primary source**: Cornejo et al. (2015) for 32 nuclides (ΓKair matches published table)
- **Additional nuclides**: Ga-68 (ICRU 57 / ICRP 74) and Y-90 (container bremsstrahlung estimates, methodology after Zanzonico et al. 1999)
- **Note**: Operational Γ H*(10) / H'(0.07) values use ICRP 107 nuclear data; Cornejo published values stored in `cornejo_validation` for traceability
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
  - Scatter build-up included via infinite-medium point-isotropic factors (ANSI/ANS-6.4.3) — slightly conservative for finite barriers; still not a substitute for structural shielding design calculations
  - Calibration per ICRU 51

- **Directional dose H'(0.07)** for extremities:
  - 0.07 mm depth (70 μm)
  - Used for hands, feet, forearms
  - ICRP 74 conversion coefficients

---

## Troubleshooting

**Q: Search returns no results**
- A: Check spelling (e.g., "Tc-99m" not "Tc99m")
- A: Click "Search in ICRP 107" for extended database
- A: Try searching by atomic number or clinical use

**Q: ICRP 107 data doesn't load**
- A: Check browser console (F12) for errors
- A: Ensure internet connection is active
- A: Clear browser cache and reload

**Q: Calculated dose seems too high/low**
- A: Verify activity units (MBq vs GBq)
- A: Check distance in correct units (cm, not m)
- A: For custom nuclides, verify photon energies and yields

**Q: Can I use ICRP 107 for regulatory submissions?**
- A: No. ICRP 107 calculated constants are informational only.
- A: Use published peer-reviewed values (like Cornejo et al. when available)
- A: If no published value exists, verify ICRP 107 calculation independently before regulatory use

---

## References

- **Cornejo Díaz N., Brosed Serreta A., Ruiz Manzano P.** (2015). "Constantes de tasa de kerma en aire y de tasa de equivalente de dosis ambiental de algunos radionucleidos utilizados en aplicaciones médicas." *Radioprotección* (SEPR), Nº 83, 39–42.
- **ICRP Publication 74** (1996). "Conversion Coefficients for Use in Radiological Protection against External Radiation." International Commission on Radiological Protection.
- **ICRP Publication 107** (2008). "Nuclear Decay Data for Dosimetric Calculations." Endo & Eckerman.
- **ICRP Publication 119** (2012). "Compendium of Dose Coefficients based on ICRP Publication 60."
- **ICRU Report 57** (1998). "Dosimetry of External Electron Beams for Radiotherapy."
- **IS-28** (2023). "Requirements for radioactive material authorization in Spain."
- **Oumano et al.** (2025). "Validation of Archer broad-beam attenuation parameters for Tc-99m, F-18, I-131, Lu-177 in lead and concrete." *J Appl Clin Med Phys*, 26(1).

---

## Support & Feedback

For issues, questions, or feature requests:
- **GitHub**: https://github.com/eucariota-git/radionuclides-main/issues
- **Author contact**: See repository

---

## License

This application is provided for educational and research purposes. Data sources are cited above. ICRP Publications are copyrighted by the International Commission on Radiological Protection.

For regulatory use, verify against primary sources and consult local radiation protection authorities.
