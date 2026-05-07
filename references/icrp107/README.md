# ICRP Publication 107 — Nuclear Decay Data

## Source

ICRP Publication 107: Nuclear Decay Data for Dosimetric Calculations
- **Source**: International Commission on Radiological Protection
- **Publication date**: June 2008
- **Authors**: A. Endo, K.F. Eckerman

## Files

- `ICRP-07.NDX` — Nuclide index (1252 nuclides, 279 KB)
- `ICRP-07.RAD` — Discrete radiation emissions (gammas, X-rays, internal conversion electrons, alphas, etc.) — 455K lines, 14 MB
- `ICRP-07.BET` — Beta spectra (continuous emission distributions) — 111K lines, 2.1 MB
- `ICRP-07.ACK` — Acknowledgments and additional metadata
- `ICRP-07.NSF` — Nuclear structure information

## Usage in Radionuclide Planner

The ICRP 107 data is used as an **extended database** for nuclides not included in the primary curated database (`data/nuclides.json`, ~34 nuclides from Cornejo et al.).

### Processing Pipeline

1. **Parser** (`tools/parse-icrp107.js`) — Reads NDX/RAD/BET files and generates `data/icrp107-index.json`
   - Converts half-lives to seconds
   - Extracts photon emissions (G, X rays; excludes beta, alpha, electrons)
   - Applies Cornejo filter: E ≥ 20 keV, yield ≥ 0.01%
   - Result: 1115 nuclides with at least one photon meeting criteria

2. **Browser Loader** (`js/icrp107-loader.js`) — Lazy-loads index on page load
   - Provides search by ID or name
   - Normalizes names ("Lu177" ↔ "Lu-177", "177Lu" ↔ "Lu-177")
   - Calculates gamma dose constants on-demand using `PHYSICS.calcGammaConstants()`

3. **Properties Page** (`index.html`) — Falls back to ICRP 107 when main DB has no match
   - Shows half-life, decay modes, photon spectrum
   - Displays banner: "⚠ Extended ICRP 107 database — unvalidated"

## Gamma Dose Constants

ICRP 107 photons are fed into the **Cornejo et al. (2006)** calculation:

$$\Gamma^{H*(10)} = K \sum_i n_i \cdot h(E_i)$$

where:
- $K$ = 28.648 μSv·h⁻¹·GBq⁻¹·m² per pSv·cm²
- $n_i$ = photon yield (fraction per decay)
- $h(E_i)$ = ICRU 57 / ICRP 74 fluence-to-dose conversion coefficient

Constants calculated from ICRP 107 are **informational only**. They are NOT manually validated and should not be used for clinical or regulatory submissions without independent verification.

## Data Quality Notes

- **Half-lives**: Extracted from NDX format descriptor; converted to seconds with full scientific notation support (picoseconds to millions of years)
- **Photon energies**: In keV; 1 decimal place precision
- **Yields**: Percent per decay; 4 decimal place precision
- **Decay modes**: Limited; NDX parsing captures daughters and branching fractions where available
- **Beta spectra**: Available in BET file (111K lines); NOT parsed in phase 1

## License & Redistribution

ICRP Publication 107 is © ICRP and licensed for use in research and educational settings. For regulatory or commercial use, consult the ICRP publication directly at https://www.icrp.org/.

The parsed JSON files derived from ICRP 107 are provided as-is for reference. Do not rely on them for clinical submissions without verification against the original ICRP 107 document.

## Related References

- **Cornejo Díaz, N., et al.** (2006). "Determination of gamma-ray dose rate constants in terms of air kerma and ambient dose equivalent rate for 67 radionuclides." Revista de Física Médica, 7(2).
- **ICRU Report 57** (1998). "Dosimetry of External Electron Beams for Radiotherapy." International Commission on Radiation Units and Measurements.
- **ICRP Publication 74** (1996). "Conversion Coefficients for Use in Radiological Protection against External Radiation." International Commission on Radiological Protection.
