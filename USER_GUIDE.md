# NM Radionuclide Planner — User Guide

A web application for nuclear medicine radionuclide properties, decay calculations, and external dose estimation.

**Live app:** https://eucariota-git.github.io/radionuclides-main/

---

## Quick Start

The application has no installation or authentication. Simply open the link above in any modern web browser.

- **Desktop**: Firefox, Chrome, Safari, Edge (recommended)
- **Mobile**: iOS Safari, Chrome mobile (with landscape mode for better experience)
- **Offline**: Works entirely offline when opened from `file://` or after first load

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

**Main database**: 34 radionuclides from **Cornejo et al. (2006)** — peer-reviewed, manually validated values.

#### Extended Database — ICRP 107

The application includes an **extended database of 1,251 radionuclides** from ICRP Publication 107 (2008). If you search for a nuclide not in the main database:

1. Search bar will show "No results in main database"
2. Click **"Search in ICRP 107"** button
3. Results appear with:
   - **Nuclide ID** (e.g., "Am-241")
   - **Half-life** (auto-calculated from ICRP 107)
   - **Decay mode** (extracted from nuclear data)
   - **Photon emissions** — filtered table showing:
     - Energy [keV]
     - Yield [% per decay]
     - Type (G = gamma, X = X-ray)
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
- After 6 hours: 884 MBq (89% of initial)
- Time to reach 100 MBq: 20.6 hours

---

### 3. Dose Estimator (`dose.html`)

**Purpose**: Calculate external dose rates and cumulative dose for a worker handling radioactivity.

**How to use**:
1. **Select nuclide** and **activity** (MBq, GBq, mCi, Ci)
2. **Distance**: Enter distance from source (cm)
   - ≥ 25 cm → uses **H\*(10)** (whole body)
   - < 25 cm → uses **H'(0.07)** (extremity)
3. **Dose rate** is calculated instantly:
   - H ̇ = Γ × A / r²
   - Units: μSv/h at 1 m

4. **Optional: Shielding**
   - Material: Lead or Concrete (normal or lightweight)
   - Thickness: 0–300 mm
   - Transmission curve shows dose reduction
   - Uses **Archer broad-beam** (Monte Carlo) for Tc-99m, F-18, I-131, Lu-177
   - Uses **narrow-beam** (NIST XCOM) for other nuclides

5. **Cumulative dose**:
   - Enter number of **administrations** (doses given to patients)
   - Enter **time between doses** (hours/days)
   - Accounts for radioactive decay between doses
   - Total cumulative dose is calculated

6. **Annual dose limit check**:
   - Compares to EU RD 1029/2022 limits:
     - Whole body: 20 mSv/year
     - Extremities (hands/feet): 500 mSv/year
     - Lens of eye: 20 mSv/year
   - Shows **status**: ✓ Safe | ⚠ Caution | ✗ Exceeds limit

**Example**:
- 100 MBq Tc-99m at 50 cm: 38.8 μSv/h
- With 5 mm lead shielding: 3.9 μSv/h (90% reduction)
- 200 administrations/year with 5mm lead: 1.6 mSv/year (Safe)

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

**Purpose**: Compare dose constants calculated from ICRP 107 photon emissions against published peer-reviewed values.

**How to use**:
1. Open `validate-icrp107.html` (or link from References)
2. Table automatically loads and compares:
   - **F-18**: Published 166 μSv·h⁻¹·GBq⁻¹·m² vs calculated
   - **Tc-99m**: Published 21.7 vs calculated
   - **I-131**: Published 65.7 vs calculated
   - **Lu-177**: Published 6.0 vs calculated
   - **Ga-68**: Published 157 vs calculated (special case)

3. **Status column**:
   - ✓ **Match** (< 5% deviation) — Excellent agreement
   - ~ **Close** (5–15% deviation) — Acceptable approximation
   - ✗ **Diverge** (> 15% deviation) — Investigate further
   - ⚠ **Special case** — Requires manual review

**Interpretation**:
- ±5% deviations indicate reliable ICRP 107 calculations
- Larger deviations may indicate:
  - Insufficient photon data (missing beta/annihilation)
  - Rounding differences
  - Different methodology for threshold filtering

**Ga-68 note**: Published constant includes positron annihilation (511 keV). ICRP 107 discrete photons alone yield ~10 μSv·h⁻¹·GBq⁻¹·m². Annihilation contributes ~147, totaling ~157.

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

### Main Database (34 nuclides)
- **Source**: Cornejo et al. (2006) — peer-reviewed journal article
- **Validation**: Manually reviewed and compared against literature
- **Use case**: Clinical and regulatory submissions (with verification)

### Extended Database (1,251 nuclides from ICRP 107)
- **Source**: ICRP Publication 107 (2008) — official decay data compilation
- **Calculation**: Γ constants derived from photon spectrum using ICRU 57 / ICRP 74 conversion coefficients
- **Validation**: ±5% agreement with published values for F-18, Tc-99m, I-131, Lu-177
- **Use case**: Reference and estimation only — NOT validated for clinical use
- **Limitations**:
  - Excludes positron annihilation for β⁺ emitters (affects Ga-68, others)
  - Excludes continuous beta spectrum contribution
  - Derived constants not peer-reviewed

### Dose Calculations
- **Ambient dose equivalent H\*(10)** assumes:
  - Photon field (gamma and X-rays)
  - Point source at specified distance
  - No scattering (narrow-beam ideal)
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

- **Cornejo Díaz, N., et al.** (2006). "Determination of gamma-ray dose rate constants in terms of air kerma and ambient dose equivalent rate for 67 radionuclides." *Revista de Física Médica*, 7(2), 5–69.
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
