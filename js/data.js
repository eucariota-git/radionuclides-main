/**
 * data.js — Physical constants and tabulated data
 *
 * Sources:
 *   ICRU 57 / ICRP 74 (1996): fluence-to-dose-equivalent conversion coefficients
 *   NIST XCOM: mass attenuation coefficients for Pb and ordinary concrete
 *
 * H*(10) conversion coefficients h*(10) [pSv·cm²] for photons
 *   Expanded and aligned field (isotropic point source approximation)
 *   Reference: ICRP Publication 74, Table A.2 (equivalent to ICRU 57)
 *
 * H'(0.07) conversion coefficients h'(0.07,0°) [pSv·cm²] for photons
 *   Normal incidence on ICRU sphere at 0.07 mm depth.
 *   Constructed as h'(0.07)/Φ = (Ka/Φ) × hK'(0.07,0°;E), with:
 *     Ka/Φ      — air kerma per fluence (Hubbell & Seltzer; identical to the kerma
 *                 function tabulated in Cornejo et al. 2015, Tabla I)
 *     hK'(0.07) — air-kerma-to-H'(0.07,0°) coefficients, ICRP 74 / ICRU 57
 *                 (as reproduced in PTB-Dos-34, Ankerhold 2000, Table 3.4)
 *   Provenance per energy range:
 *     10–100 keV : exact ICRP 74 hK'(0.07,0°) values
 *     150–400 keV: hK' interpolated through anchors derived from the published
 *                  per-line contributions in Cornejo et al. (SEPR companion report):
 *                  171 keV → 1.38, 245 keV → 1.32 Sv/Gy
 *     ≥500 keV   : kerma approximation h'(0.07) ≈ h*(10) (difference ≲5%; H'(0.07)
 *                  is never the selected operational quantity above 300 keV — see
 *                  the Cornejo <300 keV criterion in dose.html)
 *   Validation: reproduces the four published Γ^H'(0.07) values of Cornejo et al.
 *   2015 Tabla III within 1.3% (Pd-103: 38.0, In-111: 96.1, I-125: 40.9, Xe-133: 16.8).
 *
 * Dose rate constant formula (per Cornejo et al. methodology):
 *   Γ [μSv·h⁻¹·GBq⁻¹·m²] = K × Σᵢ (nᵢ × h(Eᵢ))
 *   where K = 1/(4π) × (10⁹ dis/s/GBq) × (3600 s/h) × (10⁶ μSv/Sv) × (10⁻¹⁶ Sv·m²/[pSv·cm²])
 *         K = 28.648
 *   nᵢ  = photon yield per decay (fraction, not %)
 *   Eᵢ  = photon energy in MeV
 *   Filter: Eᵢ ≥ 0.020 MeV (20 keV) AND nᵢ ≥ 0.0001 (0.01%)
 */

'use strict';

const PHYSICS = (() => {

  // ---------------------------------------------------------------------------
  // Dose rate constant factor K
  // Γ [μSv·h⁻¹·GBq⁻¹·m²] = K * Σ(n_i * h_i[pSv·cm²])
  //
  // Unit conversion breakdown:
  //   1/(4π) = geometric factor for point source (solid angle)
  //   1e9     = conversions from GBq (10⁹ Bq) to decay rate [dis/s]
  //   3600    = hours to seconds conversion [s/h]
  //   1e6     = microsieverts to sieverts [μSv/Sv]
  //   1e-16   = pico-sievert-square-centimeter to sievert-square-meter [pSv·cm² → Sv·m²]
  // ---------------------------------------------------------------------------
  const GAMMA_FACTOR = 1 / (4 * Math.PI) * 1e9 * 3600 * 1e6 * 1e-16;
  // = 1/(4π) × 3.6×10¹⁸ × 10⁻¹⁶ = 1/(4π) × 360 = 28.648

  // ---------------------------------------------------------------------------
  // ICRU 57 / ICRP 74: h*(10) and h'(0.07) conversion coefficients
  // Format: [energy_MeV, h_H10_pSvcm2, h_H007_pSvcm2]
  // ---------------------------------------------------------------------------
  const ICRU57 = [
    // E (MeV)   h*(10)   h'(0.07,0°)
    [0.010,     0.061,    7.220],
    [0.015,     0.830,    3.210],
    [0.020,     1.050,    1.810],
    [0.030,     0.810,    0.901],
    [0.040,     0.640,    0.604],
    [0.050,     0.550,    0.502],
    [0.060,     0.510,    0.447],
    [0.080,     0.530,    0.475],
    [0.100,     0.610,    0.577],
    [0.150,     0.890,    0.852],
    [0.200,     1.200,    1.160],
    [0.300,     1.800,    1.750],
    [0.400,     2.380,    2.290],
    [0.500,     2.930,    2.930],
    [0.600,     3.440,    3.440],
    [0.800,     4.380,    4.380],
    [1.000,     5.200,    5.200],
    [1.250,     6.110,    6.110],
    [1.500,     6.910,    6.910],
    [2.000,     8.330,    8.330],
    [3.000,    10.600,   10.600],
    [4.000,    12.500,   12.500],
    [5.000,    14.100,   14.100],
    [6.000,    15.600,   15.600],
    [8.000,    18.200,   18.200],
    [10.000,   20.400,   20.400],
  ];

  // ---------------------------------------------------------------------------
  // NIST XCOM: mass attenuation coefficients μ/ρ [cm²/g]
  // Lead (Pb): ρ = 11.35 g/cm³  — K-edge at 88.0 keV
  // Ordinary concrete: ρ = 2.35 g/cm³
  // Format: [energy_MeV, mu_rho_Pb, mu_rho_concrete]
  // ---------------------------------------------------------------------------
  const ATTENUATION = [
    // E (MeV)  μ/ρ Pb    μ/ρ concrete
    [0.015,    232.60,     9.400],
    [0.020,     87.81,     4.422],
    [0.030,     21.27,     1.340],
    [0.040,      8.041,    0.6327],
    [0.050,      3.625,    0.3876],
    [0.060,      1.853,    0.2751],
    [0.080,      0.8948,   0.2160],
    // K-edge of Pb at 88.0 keV — interpolation crosses this boundary
    // Values below 88 keV use the sub-K-edge branch; above use post-K-edge
    [0.0880,     0.8430,   0.2140],   // just below K-edge (sub-edge)
    [0.0881,     5.200,    0.2138],   // just above K-edge (super-edge sentinel)
    [0.100,      5.549,    0.1823],
    [0.150,      2.014,    0.1514],
    [0.200,      0.9985,   0.1373],
    [0.300,      0.3790,   0.1177],
    [0.400,      0.2245,   0.1075],
    [0.511,      0.1619,   0.09621],
    [0.600,      0.1438,   0.08936],
    [0.800,      0.1207,   0.07657],
    [1.000,      0.1065,   0.06699],
    [1.250,      0.09285,  0.05816],
    [1.500,      0.08334,  0.05162],
    [2.000,      0.06925,  0.04346],
    [3.000,      0.05665,  0.03568],
  ];

  const RHO_PB          = 11.35;  // g/cm³
  const RHO_CONCRETE    =  2.35;  // g/cm³  (ordinary/normal-weight, NIST)
  const RHO_CONCRETE_LW =  1.60;  // g/cm³  (light-weight, Oumano et al. 2025)

  // ---------------------------------------------------------------------------
  // Exposure buildup factors B(E, mfp) — point isotropic source, infinite medium
  //
  // Source: Trubey, D.K., "New Gamma-Ray Buildup Factor Data for Point Kernel
  // Calculations: ANS-6.4.3 Standard Reference Data", NUREG/CR-5740 /
  // ORNL/RSIC-49/R1 (Aug 1991), Table 3 "Exposure Buildup Factors" — Lead
  // (p. II-40) and Concrete (p. II-44). US-government report (public domain);
  // full PDF: https://www.osti.gov/servlets/purl/5441669
  // Values transcribed programmatically from the report scan and verified
  // visually against the page images (16 spot checks + mfp monotonicity).
  //
  // EXPOSURE response (absorption in air) is the appropriate one for dose
  // behind a shield — NOT the report's "energy absorption" tables, whose
  // response is energy deposited in the shield medium itself (report §2,
  // Definitions). The report provides G-P coefficients only for the latter,
  // so the exposure VALUES are interpolated directly (log-B, linear in mfp,
  // log-log in E) — more faithful than refitting.
  //
  // Row format: [E_MeV, B@0.5, B@1, B@2, B@3, B@4, B@5, B@6, B@7, B@8,
  //              B@10, B@15, B@20, B@25, B@30, B@35, B@40 mfp]
  // Pb rows 0.088/0.089 MeV straddle the K-edge (interpolation must not
  // cross it — see getBuildup). Validity: 0–40 mfp (clamped beyond, which
  // underestimates B but >40 mfp means transmission < 1e-17 — irrelevant).
  // ---------------------------------------------------------------------------
  const BUILDUP_MFP = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25, 30, 35, 40];

  const BUILDUP_PB = [
    [0.03,  1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.02, 1.02, 1.02, 1.02, 1.02, 1.02, 1.02, 1.02],
    [0.04,  1.01, 1.01, 1.02, 1.02, 1.02, 1.03, 1.03, 1.03, 1.03, 1.03, 1.04, 1.04, 1.04, 1.05, 1.05, 1.05],
    [0.05,  1.02, 1.02, 1.03, 1.04, 1.04, 1.04, 1.04, 1.05, 1.05, 1.05, 1.06, 1.06, 1.07, 1.07, 1.07, 1.08],
    [0.06,  1.02, 1.03, 1.05, 1.05, 1.06, 1.06, 1.07, 1.07, 1.07, 1.08, 1.09, 1.1, 1.11, 1.11, 1.12, 1.12],
    [0.08,  1.04, 1.06, 1.08, 1.1, 1.11, 1.12, 1.12, 1.13, 1.14, 1.15, 1.17, 1.19, 1.21, 1.22, 1.23, 1.24],
    [0.088,  1.05, 1.07, 1.1, 1.11, 1.13, 1.14, 1.15, 1.16, 1.17, 1.18, 1.21, 1.23, 1.25, 1.27, 1.28, 1.29],
    [0.089,  1.59, 2.24, 4.12, 7.66, 14.9, 30, 61.1, 119, 229, 875, 27300, 951000, 3.57e+07, 1.4e+09, 5.7e+10, 2.36e+12],
    [0.09,  1.58, 2.22, 4.05, 7.44, 14.3, 28.5, 57.5, 111, 212, 794, 23800, 801000, 2.91e+07, 1.11e+09, 4.34e+10, 1.74e+12],
    [0.1,  1.51, 2.04, 3.39, 5.6, 9.59, 17, 30.6, 54.9, 94.7, 294, 5800, 133000, 3.34e+06, 8.77e+07, 2.36e+09, 6.43e+10],
    [0.11,  1.44, 1.86, 2.81, 4.16, 6.3, 9.83, 15.6, 25.1, 39.7, 99.9, 1240, 18600, 305000, 5.17e+06, 8.94e+07, 1.56e+09],
    [0.12,  1.38, 1.7, 2.36, 3.13, 4.19, 5.71, 7.9, 11.2, 15.8, 32.1, 235, 2140, 21100, 215000, 2.22e+06, 2.33e+07],
    [0.13,  1.33, 1.58, 2.02, 2.44, 2.93, 3.52, 4.27, 5.26, 6.6, 10.3, 40.1, 198, 1080, 6110, 35400, 208000],
    [0.14,  1.28, 1.48, 1.77, 1.98, 2.19, 2.4, 2.62, 2.87, 3.18, 3.99, 7.47, 17.1, 45, 128, 380, 1160],
    [0.15,  1.25, 1.4, 1.59, 1.69, 1.77, 1.84, 1.9, 1.95, 2.01, 2.13, 2.47, 2.87, 3.34, 4.02, 5.06, 6.65],
    [0.16,  1.22, 1.34, 1.45, 1.51, 1.54, 1.56, 1.58, 1.59, 1.6, 1.61, 1.64, 1.65, 1.65, 1.66, 1.66, 1.67],
    [0.2,  1.15, 1.2, 1.24, 1.26, 1.27, 1.29, 1.3, 1.31, 1.32, 1.35, 1.39, 1.42, 1.44, 1.47, 1.49, 1.5],
    [0.3,  1.1, 1.15, 1.21, 1.26, 1.3, 1.33, 1.36, 1.38, 1.4, 1.44, 1.52, 1.59, 1.64, 1.68, 1.72, 1.75],
    [0.4,  1.12, 1.19, 1.3, 1.39, 1.45, 1.51, 1.57, 1.62, 1.67, 1.75, 1.93, 2.08, 2.19, 2.29, 2.38, 2.45],
    [0.5,  1.14, 1.24, 1.39, 1.52, 1.62, 1.71, 1.8, 1.88, 1.95, 2.1, 2.39, 2.64, 2.85, 3.02, 3.18, 3.31],
    [0.6,  1.15, 1.28, 1.46, 1.62, 1.76, 1.88, 1.99, 2.1, 2.2, 2.39, 2.79, 3.11, 3.38, 3.61, 3.82, 4.02],
    [0.8,  1.18, 1.34, 1.59, 1.82, 2.01, 2.19, 2.37, 2.53, 2.69, 2.99, 3.65, 4.2, 4.67, 5.1, 5.49, 5.84],
    [1,  1.2, 1.38, 1.68, 1.95, 2.19, 2.43, 2.66, 2.89, 3.1, 3.51, 4.45, 5.27, 5.98, 6.64, 7.23, 7.79],
    [1.5,  1.19, 1.38, 1.73, 2.07, 2.4, 2.74, 3.08, 3.42, 3.77, 4.47, 6.26, 8.11, 9.94, 11.7, 13.4, 15],
    [2,  1.21, 1.4, 1.76, 2.14, 2.52, 2.91, 3.32, 3.74, 4.17, 5.07, 7.44, 9.98, 12.6, 15.4, 18.2, 21],
    [3,  1.23, 1.4, 1.73, 2.1, 2.5, 2.93, 3.4, 3.89, 4.41, 5.56, 8.91, 12.9, 17.5, 22.5, 28.1, 34],
    [4,  1.21, 1.36, 1.67, 2.02, 2.4, 2.82, 3.28, 3.79, 4.35, 5.61, 9.73, 15.4, 23, 32.6, 44.6, 59.2],
    [5,  1.25, 1.41, 1.71, 2.05, 2.44, 2.88, 3.38, 3.93, 4.56, 6.03, 11.4, 19.9, 32.9, 52.2, 79.9, 119],
    [6,  1.26, 1.42, 1.73, 2.08, 2.49, 2.96, 3.51, 4.13, 4.84, 6.61, 13.7, 26.6, 49.6, 88.9, 155, 262],
    [8,  1.3, 1.51, 1.9, 2.36, 2.91, 3.59, 4.41, 5.39, 6.58, 9.73, 25.1, 62, 148, 344, 779, 1720],
    [10,  1.28, 1.51, 2.01, 2.63, 3.42, 4.45, 5.73, 7.37, 9.44, 15.4, 50.8, 161, 495, 1470, 4280, 12200],
    [15,  1.31, 1.63, 2.34, 3.34, 4.78, 6.83, 9.7, 13.7, 19.4, 38.7, 208, 1070, 5330, 25700, 121000, 559000],
  ];

  const BUILDUP_CONCRETE = [
    [0.015,  1.02, 1.03, 1.04, 1.05, 1.05, 1.06, 1.06, 1.07, 1.07, 1.08, 1.09, 1.1, 1.1, 1.11, 1.11, 1.11],
    [0.02,  1.05, 1.07, 1.09, 1.11, 1.13, 1.14, 1.15, 1.16, 1.17, 1.18, 1.21, 1.22, 1.24, 1.25, 1.26, 1.27],
    [0.03,  1.15, 1.21, 1.3, 1.37, 1.43, 1.47, 1.51, 1.54, 1.57, 1.63, 1.74, 1.82, 1.89, 1.94, 1.99, 2.02],
    [0.04,  1.3, 1.46, 1.69, 1.87, 2.01, 2.14, 2.25, 2.35, 2.45, 2.62, 2.98, 3.27, 3.51, 3.73, 3.91, 4.03],
    [0.05,  1.42, 1.74, 2.26, 2.63, 2.95, 3.25, 3.53, 3.79, 4.04, 4.51, 5.57, 6.52, 7.38, 8.18, 8.87, 9.44],
    [0.06,  1.68, 2.15, 2.89, 3.54, 4.17, 4.77, 5.34, 5.9, 6.44, 7.52, 10.2, 12.7, 15.2, 18.2, 21.9, 26.5],
    [0.08,  1.84, 2.58, 3.96, 5.31, 6.69, 8.09, 9.52, 11, 12.5, 15.7, 24.3, 33.8, 44.3, 55.4, 66.8, 78.1],
    [0.1,  1.89, 2.78, 4.63, 6.63, 8.8, 11.1, 13.6, 16.3, 19.2, 25.6, 44.9, 69.1, 97.9, 131, 170, 214],
    [0.15,  1.84, 2.82, 5.13, 7.92, 11.2, 15, 19.3, 24.2, 29.7, 42.7, 87.6, 153, 240, 353, 494, 664],
    [0.2,  1.78, 2.72, 5.05, 8, 11.6, 15.9, 20.9, 26.7, 33.4, 49.6, 109, 201, 331, 507, 734, 1020],
    [0.3,  1.68, 2.52, 4.66, 7.42, 10.8, 15, 19.9, 25.6, 32.2, 48.2, 107, 198, 326, 497, 716, 985],
    [0.4,  1.61, 2.37, 4.31, 6.8, 9.85, 13.5, 17.8, 22.8, 28.5, 42.1, 90.7, 162, 259, 383, 536, 719],
    [0.5,  1.57, 2.27, 4.03, 6.26, 8.97, 12.2, 15.9, 20.2, 25, 36.4, 75.6, 131, 203, 292, 399, 523],
    [0.6,  1.53, 2.18, 3.8, 5.82, 8.25, 11.1, 14.3, 18, 22.2, 31.8, 63.6, 107, 161, 226, 302, 389],
    [0.8,  1.48, 2.06, 3.47, 5.18, 7.18, 9.47, 12, 14.9, 18.1, 25.1, 47.4, 75.7, 110, 149, 193, 242],
    [1,  1.45, 1.98, 3.24, 4.72, 6.42, 8.33, 10.4, 12.7, 15.2, 20.7, 37.2, 57.1, 80.1, 106, 134, 164],
    [1.5,  1.39, 1.85, 2.86, 4, 5.25, 6.6, 8.05, 9.58, 11.2, 14.6, 24.2, 35, 46.9, 59.6, 73, 87.1],
    [2,  1.37, 1.77, 2.65, 3.6, 4.61, 5.68, 6.8, 7.97, 9.18, 11.7, 18.6, 26, 33.9, 42.2, 50.9, 59.8],
    [3,  1.33, 1.67, 2.38, 3.09, 3.84, 4.61, 5.4, 6.2, 7.03, 8.71, 13.1, 17.7, 22.5, 27.4, 32.4, 37.4],
    [4,  1.31, 1.61, 2.18, 2.77, 3.37, 3.98, 4.6, 5.23, 5.86, 7.15, 10.5, 13.9, 17.4, 20.9, 24.6, 28.4],
    [5,  1.27, 1.53, 2.04, 2.53, 3.03, 3.54, 4.05, 4.57, 5.09, 6.15, 8.85, 11.6, 14.4, 17.3, 20.5, 24.8],
    [6,  1.26, 1.49, 1.93, 2.37, 2.8, 3.25, 3.69, 4.14, 4.6, 5.52, 7.86, 10.2, 12.7, 15.2, 17.8, 20.5],
    [8,  1.22, 1.41, 1.76, 2.11, 2.45, 2.81, 3.16, 3.51, 3.87, 4.59, 6.43, 8.31, 10.2, 12.2, 14.1, 16.2],
    [10,  1.19, 1.35, 1.64, 1.93, 2.22, 2.51, 2.8, 3.1, 3.4, 4.01, 5.57, 7.19, 8.86, 10.6, 12.3, 14.5],
    [15,  1.15, 1.26, 1.46, 1.66, 1.86, 2.07, 2.28, 2.5, 2.71, 3.16, 4.34, 5.59, 6.91, 8.27, 9.63, 10.9],
  ];

  // ---------------------------------------------------------------------------
  // Linear interpolation helper (log-log for attenuation, log-linear for ICRU)
  // ---------------------------------------------------------------------------
  function interpLinear(table, x, colX, colY) {
    if (x <= table[0][colX])  return table[0][colY];
    if (x >= table[table.length - 1][colX]) return table[table.length - 1][colY];
    for (let i = 0; i < table.length - 1; i++) {
      const x0 = table[i][colX], x1 = table[i + 1][colX];
      if (x >= x0 && x <= x1) {
        const t = (x - x0) / (x1 - x0);
        return table[i][colY] + t * (table[i + 1][colY] - table[i][colY]);
      }
    }
    return table[table.length - 1][colY];
  }

  // Log-log interpolation (better for attenuation coefficients)
  function interpLogLog(table, x, colX, colY) {
    if (x <= table[0][colX])  return table[0][colY];
    if (x >= table[table.length - 1][colX]) return table[table.length - 1][colY];
    for (let i = 0; i < table.length - 1; i++) {
      const x0 = table[i][colX], x1 = table[i + 1][colX];
      if (x >= x0 && x <= x1) {
        const y0 = table[i][colY], y1 = table[i + 1][colY];
        if (y0 <= 0 || y1 <= 0) {
          // Fallback to linear if non-positive values
          const t = (x - x0) / (x1 - x0);
          return y0 + t * (y1 - y0);
        }
        const t = Math.log(x / x0) / Math.log(x1 / x0);
        return Math.exp(Math.log(y0) + t * (Math.log(y1) - Math.log(y0)));
      }
    }
    return table[table.length - 1][colY];
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Get h*(10) [pSv·cm²] at energy E_MeV (log-linear interp on ICRU57 table, per ICRP 74 §5.2) */
  function getH10(E_MeV) {
    return interpLogLog(ICRU57, E_MeV, 0, 1);
  }

  /** Get h'(0.07) [pSv·cm²] at energy E_MeV */
  function getH007(E_MeV) {
    return interpLogLog(ICRU57, E_MeV, 0, 2);
  }

  /**
   * Get linear attenuation coefficient μ [cm⁻¹] for a material.
   * Handles Pb K-edge discontinuity explicitly.
   * @param {number} E_MeV - photon energy in MeV
   * @param {'Pb'|'concrete'|'concrete_NW'|'concrete_LW'} material - shielding material
   * @returns {number} μ in cm⁻¹
   * @throws {Error} if material is not recognized
   */
  function getMu(E_MeV, material) {
    const PB_KEDGE = 0.08800; // MeV

    if (material === 'Pb') {
      // Split table at K-edge to avoid erroneous interpolation across the jump
      const subEdge   = ATTENUATION.filter(r => r[0] <= PB_KEDGE);
      const superEdge = ATTENUATION.filter(r => r[0] >= 0.0881);
      const muRho = E_MeV < PB_KEDGE
        ? interpLogLog(subEdge,   E_MeV, 0, 1)
        : interpLogLog(superEdge, E_MeV, 0, 1);
      return muRho * RHO_PB;
    }

    // All concrete variants share the same elemental composition (μ/ρ)
    const muRho = interpLogLog(ATTENUATION, E_MeV, 0, 2);
    if (material === 'concrete_LW') return muRho * RHO_CONCRETE_LW;
    if (material === 'concrete_NW' || material === 'concrete') return muRho * RHO_CONCRETE;

    // Unknown material: throw error instead of silently defaulting
    throw new Error(`Unknown material "${material}". Expected: 'Pb', 'concrete', 'concrete_NW', or 'concrete_LW'.`);
  }

  /**
   * Interpolate B(E, mfp) on an exposure-buildup table.
   * mfp axis: log(B) linear in mfp; below 0.5 mfp interpolates from B(0) = 1.
   * E axis: log(B) linear in log(E), clamped to the tabulated range.
   */
  function _buildupInterp(rows, E_MeV, mfp) {
    function atEnergy(row) {
      // row = [E, B@0.5, B@1, ..., B@40] aligned with BUILDUP_MFP
      if (mfp <= BUILDUP_MFP[0]) {
        // between (0, B=1) and (0.5, B₀.₅): log-linear from 1
        return Math.exp(Math.log(row[1]) * (mfp / BUILDUP_MFP[0]));
      }
      const last = BUILDUP_MFP.length - 1;
      if (mfp >= BUILDUP_MFP[last]) return row[last + 1];  // clamp at 40 mfp
      for (let k = 0; k < last; k++) {
        if (mfp >= BUILDUP_MFP[k] && mfp <= BUILDUP_MFP[k + 1]) {
          const t = (mfp - BUILDUP_MFP[k]) / (BUILDUP_MFP[k + 1] - BUILDUP_MFP[k]);
          return Math.exp(Math.log(row[k + 1]) + t * (Math.log(row[k + 2]) - Math.log(row[k + 1])));
        }
      }
      return row[last + 1];
    }
    if (E_MeV <= rows[0][0]) return atEnergy(rows[0]);
    if (E_MeV >= rows[rows.length - 1][0]) return atEnergy(rows[rows.length - 1]);
    for (let i = 0; i < rows.length - 1; i++) {
      if (E_MeV >= rows[i][0] && E_MeV <= rows[i + 1][0]) {
        const B0 = atEnergy(rows[i]), B1 = atEnergy(rows[i + 1]);
        const t = Math.log(E_MeV / rows[i][0]) / Math.log(rows[i + 1][0] / rows[i][0]);
        return Math.exp(Math.log(B0) + t * (Math.log(B1) - Math.log(B0)));
      }
    }
    return atEnergy(rows[rows.length - 1]);
  }

  /**
   * Exposure buildup factor B(E, mfp) for a point isotropic source.
   * Source: ANSI/ANS-6.4.3 reference data (NUREG/CR-5740 Table 3) — see the
   * BUILDUP_* table header above for provenance and interpolation notes.
   * @param {number} E_MeV    - photon energy [MeV]
   * @param {number} mfp      - shield thickness in mean free paths (μ·x)
   * @param {string} material - 'Pb'|'concrete'|'concrete_NW'|'concrete_LW'|'none'
   * @returns {number} B ≥ 1
   */
  function getBuildup(E_MeV, mfp, material) {
    if (!(mfp > 0) || material === 'none') return 1.0;
    if (material === 'Pb') {
      // do not interpolate across the K-edge (B jumps ~3 orders of magnitude)
      const PB_KEDGE = 0.0885;
      const rows = E_MeV < PB_KEDGE
        ? BUILDUP_PB.filter(r => r[0] <= 0.088)
        : BUILDUP_PB.filter(r => r[0] >= 0.089);
      return _buildupInterp(rows, E_MeV, mfp);
    }
    if (material === 'concrete' || material === 'concrete_NW' || material === 'concrete_LW') {
      // both concrete variants share μ/ρ — B depends on mfp count, not density
      return _buildupInterp(BUILDUP_CONCRETE, E_MeV, mfp);
    }
    throw new Error(`Unknown material "${material}". Expected: 'Pb', 'concrete', 'concrete_NW', or 'concrete_LW'.`);
  }

  /**
   * Calculate HVL (cm) given μ (cm⁻¹).
   * HVL = ln(2) / μ
   */
  function hvl(mu_cm) {
    return mu_cm > 0 ? Math.LN2 / mu_cm : Infinity;
  }

  /**
   * Calculate dose rate constants Γ^H*(10) and Γ^H'(0.07)
   * from a list of photon emissions following Cornejo et al. methodology.
   *
   * @param {Array} emissions - [{energy_keV, yield_percent, type}]
   *   type: 'G' = gamma, 'X' = X-ray, 'AQ' = annihilation quantum
   *   (included if E >= 20 keV and yield >= 0.01%)
   * @returns {{ gammaH10: number, gammaH007: number, contributions: Array }}
   *   gammaH10 and gammaH007 in μSv·h⁻¹·GBq⁻¹·m²
   */
  function calcGammaConstants(emissions) {
    const ENERGY_THRESHOLD_MEV = 0.020; // 20 keV
    const YIELD_THRESHOLD      = 0.0001; // 0.01% expressed as fraction

    const contributions = [];
    let sumH10  = 0;
    let sumH007 = 0;

    for (const em of emissions) {
      const E_MeV = em.energy_keV / 1000;
      const n     = em.yield_percent / 100; // fraction

      // Apply Cornejo et al. selection criteria
      if (E_MeV < ENERGY_THRESHOLD_MEV) continue;
      if (n < YIELD_THRESHOLD)          continue;
      if (!['G', 'g', 'X', 'x', 'AQ', 'aq'].includes(em.type)) continue;

      const h10  = getH10(E_MeV);
      const h007 = getH007(E_MeV);

      const contrib10  = n * h10;
      const contrib007 = n * h007;
      sumH10  += contrib10;
      sumH007 += contrib007;

      contributions.push({
        energy_keV: em.energy_keV,
        yield_percent: em.yield_percent,
        type: em.type,
        decay_mode: em.decay_mode || null,
        decay_percent: em.decay_percent ?? null,
        h10_pSvcm2: h10,
        h007_pSvcm2: h007,
        contrib_H10:  contrib10  * GAMMA_FACTOR,
        contrib_H007: contrib007 * GAMMA_FACTOR,
      });
    }

    return {
      gammaH10:      sumH10  * GAMMA_FACTOR,
      gammaH007:     sumH007 * GAMMA_FACTOR,
      contributions,
    };
  }

  // Y-90 bremsstrahlung container ESTIMATES.
  // Methodology after Zanzonico et al., J Nucl Med 40(6):906-915, 1999, which
  // tabulates specific bremsstrahlung constants for soft tissue and bone only —
  // NOT for these container geometries. Container values below are estimates
  // pending verification against a primary source.
  const Y90_CONTAINERS = {
    none: { name: 'No container', gamma_H10: 0.001, gamma_H007: 0.001 },
    pmma: { name: 'PMMA (acrylic)', gamma_H10: 0.009, gamma_H007: 0.012 },
    pb: { name: 'Lead (Pb)', gamma_H10: 0.034, gamma_H007: 0.042, warning: true },
    tungsten: { name: 'Tungsten (W)', gamma_H10: 0.016, gamma_H007: 0.020 }
  };

  return {
    GAMMA_FACTOR,
    ICRU57,
    ATTENUATION,
    RHO_PB,
    RHO_CONCRETE,
    RHO_CONCRETE_LW,
    Y90_CONTAINERS,
    getH10,
    getH007,
    getMu,
    getBuildup,
    hvl,
    calcGammaConstants,
  };

})();
