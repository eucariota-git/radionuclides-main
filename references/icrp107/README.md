# ICRP Publication 107 — Nuclear Decay Data

## Source

ICRP Publication 107: Nuclear Decay Data for Dosimetric Calculations
- **Source**: International Commission on Radiological Protection
- **Publication date**: June 2008
- **Authors**: A. Endo, K.F. Eckerman

## Files (NOT in this repository — local only)

The raw ICRP 107 distribution files are **© ICRP ("all rights reserved") and are
not versioned in this public repository**. Maintainers keep them locally in
`data/sources/icrp107/` (gitignored), where `tools/parse-icrp107.js` expects them:

- `ICRP-07.NDX` — Nuclide index (1252 nuclides, 279 KB)
- `ICRP-07.RAD` — Discrete radiation emissions (gammas, X-rays, internal conversion electrons, alphas, etc.) — 455K lines, 14 MB
- `ICRP-07.BET` — Beta spectra (continuous emission distributions) — 111K lines, 2.1 MB
- `ICRP-07.ACK` — Acknowledgments and additional metadata
- `ICRP-07.NSF` — Nuclear structure information

**To obtain them:** download ICRP Publication 107 (free) from
<https://www.icrp.org/publication.asp?id=ICRP%20Publication%20107> — the
electronic data files accompany the publication. The official data user guide
(`USERGUIDE.pdf`) is also kept locally only.

**To verify your copy:** the SHA256 hashes of the NDX/RAD/BET files used to
generate the shipped datasets are recorded in `data/icrp107-index.json`
(`notes.source_files_hashes`). Compare with `sha256sum ICRP-07.NDX` etc. before
regenerating.

The parsed, derived datasets (`data/icrp107-index.json`, `data/icrp107-data.js`)
**are** versioned — they are transformative extracts (filtered photon lines and
computed properties) required by the application, distributed for
research/educational use with attribution to ICRP 107.

## Usage in Radionuclide Planner

The ICRP 107 data is used as an **extended database** for nuclides not included in the primary curated database (`data/nuclides.json`, 40 curated nuclides).

### Processing Pipeline

1. **Parser** (`tools/parse-icrp107.js`) — Reads the NDX, RAD and BET files and generates `data/icrp107-index.json` plus `data/icrp107-data.js`
   - Converts half-lives to seconds
   - Extracts photon emissions (G, X rays, and annihilation quanta; excludes beta, alpha, electrons)
   - Applies Cornejo filter: E ≥ 20 keV, yield ≥ 0.01%
   - Result: all 1252 nuclides of the NDX file, 1163 of them with at least one photon meeting the criteria
   - BET: the endpoint of each β block (`e_max_beta_MeV`, the last energy of the block) and the β yield per decay (`beta_yield_per_decay`); the spectra themselves are not stored

2. **Browser Loader** (`js/icrp107-loader.js`) — Loads the embedded JS data when available, with JSON `fetch()` fallback
   - Provides search by ID or name
   - Normalizes names ("Lu177" ↔ "Lu-177", "177Lu" ↔ "Lu-177")
   - Calculates gamma dose constants on-demand using `PHYSICS.calcGammaConstants()`

3. **Properties Page** (`index.html`) — Extended search with on-demand dose calculation
   - Main search first queries `data/nuclides.json` (40 curated nuclides)
   - If there is no match, the ICRP 107 index is searched automatically (plus identifiers that exist only in the regulatory tables); the "Search in ICRP 107" button remains as a fallback when the index is not ready
   - Short-lived progeny in equilibrium is included by default (descendants with T½ ≤ 1/10 of the parent's and ≤ 30 d, at the Bateman ratio); Dose offers «parent only"
   - When ICRP 107 result is selected:
     - Displays half-life, decay modes, photon spectrum (filtered)
     - **Automatically calculates** Γ^H*(10) and Γ^H'(0.07) from photon emissions
    - Shows warning: constants calculated from ICRP 107 emissions are not manually validated
    - Photons table shows energy (keV), yield (%), and type (G/X/AQ)

## Gamma Dose Constants

ICRP 107 photons are fed into the **Cornejo et al. (2015)** calculation:

$$\Gamma^{H*(10)} = K \sum_i n_i \cdot h(E_i)$$

where:
- $K$ = 28.648 μSv·h⁻¹·GBq⁻¹·m² per pSv·cm²
- $n_i$ = photon yield (fraction per decay)
- $h(E_i)$ = ICRP 74 Table A.21 fluence-to-dose conversion coefficient

Constants calculated from ICRP 107 are **informational only**. They are NOT manually validated and should not be used for clinical or regulatory submissions without independent verification.

### Comparison with published values vs regression checks

Two different kinds of check — do not read one as the other:

- **Published values** (`test/validate-data.js`, Test 2b): `cornejo_validation` must hold the values printed in Cornejo et al. (2015), Table III, for the 32 nuclides it publishes (e.g. F-18 166, Tc-99m 21.7, I-131 65.7, Lu-177 6.0 μSv·h⁻¹·GBq⁻¹·m²) — a transcription check. The app shows the deviation of each recalculated constant from them; no test requires agreement, and the differences are reported, not reconciled. Ga-68 is **not** in Cornejo's table: it has no published comparison value.
- **Regression** (`test/validate-constants.js`): Γ recomputed from the ICRP 107 index is compared with the project's own previously computed values (e.g. I-125 35.52, against Cornejo's published 35.3). It detects unintended changes in the code or the data; it does not validate the values against a publication.

#### Positron Emitters

Beta-plus emitters include positron annihilation quanta when present in `ICRP-07.RAD` (type code `3`, label `AQ`). This is required for PET nuclides such as F-18 and Ga-68, where the 511 keV photons dominate the external dose-rate constant.

## Data Quality Notes

- **Half-lives**: Extracted from NDX format descriptor; converted to seconds with full scientific notation support (picoseconds to millions of years)
- **Photon energies**: In keV; 1 decimal place precision
- **Yields**: Percent per decay; 4 decimal place precision
- **Decay modes**: Limited; NDX parsing captures daughters and branching fractions where available
- **Beta spectra**: the BET file (111K lines) is parsed for the β endpoint and β yield of each nuclide; the spectral shapes are not stored
- **Calculators**: `decay.html` and `dose.html` accept both curated database and ICRP 107 entries via `resolveNuclide()` and `ICRP107.calcConstants()`; the Properties page provides extended search across all 1,252 nuclides.

## License & Redistribution

The ICRP-07 data files are © 2008 A. Endo and K.F. Eckerman (ICRP Publication 107; the printed publication is © 2008 Elsevier Ltd.). Their copyright notice permits use, copying and distribution of the data files "for educational, research, and not-for-profit purposes, without fee", provided the copyright notice accompanies all copies and distributions — see [LICENSE.TXT](../../LICENSE.TXT) at the repository root (the filename is mandated by the notice itself), which covers the parsed derivatives distributed here (`data/icrp107-index.json`, `data/icrp107-data.js`, and the photon-derived values in `data/nuclides.json` / `data/nuclides-data.js`). Commercial use requires permission from the copyright holders (https://www.icrp.org/).

The parsed JSON files derived from ICRP 107 are provided as-is for reference. Do not rely on them for clinical submissions without verification against the original ICRP 107 document.

## Related References

- **Cornejo Díaz N., Brosed Serreta A., Ruiz Manzano P.** (2015). "Constantes de tasa de kerma en aire y de tasa de equivalente de dosis ambiental de algunos radionucleidos utilizados en aplicaciones médicas." *Radioprotección* (SEPR), Nº 83, 39–42.
- **ICRU Report 57** (1998). "Conversion Coefficients for use in Radiological Protection against External Radiation." International Commission on Radiation Units and Measurements.
- **ICRP Publication 74** (1996). "Conversion Coefficients for Use in Radiological Protection against External Radiation." International Commission on Radiological Protection.
