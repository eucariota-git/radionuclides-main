/**
 * data.js — Physical constants and tabulated data
 *
 * Sources:
 *   ICRU 57 / ICRP 74 (1996): fluence-to-dose-equivalent conversion coefficients
 *   NIST XCOM: mass attenuation coefficients for Pb, Fe and ordinary concrete
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
 *     ≥500 keV   : kerma approximation h'(0.07) ≈ h*(10) (difference ≲5%)
 *   Validation: reproduces the four published Γ^H'(0.07) values of Cornejo et al.
 *   2015 Tabla III within −9.4% … +4.0% (Pd-103: 34.42 vs 38.0 = −9.42%;
 *   In-111: 96.46 vs 96.1 = +0.37%; I-125: 42.52 vs 40.9 = +3.96%;
 *   Xe-133: 17.35 vs 16.8 = +3.27%). The larger Pd-103 gap reflects updated
 *   ICRP-107 nuclear data, not a methodology error.
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
  // NIST mass attenuation coefficients μ/ρ [cm²/g] — total attenuation WITH
  // coherent (Rayleigh) scattering. Transcribed from the NIST X-Ray Attenuation
  // and Absorption Data (XAAMDI, Hubbell & Seltzer):
  //   Lead (Z=82):  physics.nist.gov/PhysRefData/XrayMassCoef/ElemTab/z82.html
  //   Iron (Z=26): physics.nist.gov/PhysRefData/XrayMassCoef/ElemTab/z26.html
  //   Ordinary concrete: .../XrayMassCoef/ComTab/concrete.html
  //
  // KNOWN LIMITATION — μ and B are not strictly compatible (audit 2026-07-15,
  // finding 3). NUREG/CR-5740 computed its buildup factors OMITTING coherent
  // scattering, and states that mean-free-path distances should be evaluated
  // with the coefficient WITHOUT it. Using the with-coherent μ here inflates the
  // mfp count by roughly 4-11% in Pb (coherent is ~4% of total μ near 100 keV,
  // ~11% near 60 keV). The two effects push T in OPPOSITE directions — a larger
  // μ lowers e^(−μx) but raises B — so the net sign is NOT universal and must not
  // be claimed as conservative. The report likewise requires finite-barrier and
  // tissue-interface corrections (up to 1.45 in Pb) that are not applied here.
  // Quantifying this properly needs the without-coherent NIST table; until then
  // it is a declared limitation, not a correction.
  //
  // Lead (Pb): ρ = 11.35 g/cm³  — K-edge at 88.0 keV
  // Iron (Fe): ρ = 7.874 g/cm³   — elemental iron, not generic steel
  // Ordinary concrete: ρ = 2.300 g/cm³ (NIST "Concrete, Ordinary")
  // Format: [energy_MeV, mu_rho_Pb, mu_rho_concrete, mu_rho_Fe]. Grid extends to 10 MeV so
  // the ICRP-107 lines above 3 MeV (up to ~9.9 MeV) are interpolated, not clamped.
  // ---------------------------------------------------------------------------
  const ATTENUATION = [
    // E (MeV)  μ/ρ Pb     μ/ρ concrete  μ/ρ Fe
    [0.015,    111.6,      6.351,        57.08  ],
    [0.020,     86.36,     2.806,        25.68  ],
    [0.030,     30.32,     0.9601,        8.176 ],
    [0.040,     14.36,     0.5058,        3.629 ],
    [0.050,      8.041,    0.3412,        1.958 ],
    [0.060,      5.021,    0.2660,        1.205 ],
    [0.080,      2.419,    0.2014,        0.5952],
    // K-edge of Pb — interpolation must not cross this boundary (see PB_KEDGE_MEV).
    // Concrete has no edge here; both sentinel rows carry its interpolated μ/ρ.
    [0.0880,     1.910,    0.1890,        0.48678],   // just below Pb K-edge (sub-edge)
    [0.0881,     7.683,    0.1890,        0.48561],   // just above Pb K-edge (super-edge sentinel)
    [0.100,      5.549,    0.1738,        0.3717 ],
    [0.150,      2.014,    0.1436,        0.1964 ],
    [0.200,      0.9985,   0.1282,        0.1460 ],
    [0.300,      0.4031,   0.1097,        0.1099 ],
    [0.400,      0.2323,   0.09783,       0.09400],
    [0.500,      0.1614,   0.08915,       0.08414],
    [0.600,      0.1248,   0.08236,       0.07704],
    [0.800,      0.08870,  0.07227,       0.06699],
    [1.000,      0.07102,  0.06495,       0.05995],
    [1.250,      0.05876,  0.05807,       0.05350],
    [1.500,      0.05222,  0.05288,       0.04883],
    [2.000,      0.04606,  0.04557,       0.04265],
    [3.000,      0.04234,  0.03701,       0.03621],
    [4.000,      0.04197,  0.03217,       0.03312],
    [5.000,      0.04272,  0.02908,       0.03146],
    [6.000,      0.04391,  0.02697,       0.03057],
    [8.000,      0.04675,  0.02432,       0.02991],
    [10.000,     0.04972,  0.02278,       0.02994],
  ];

  const RHO_PB          = 11.35;  // g/cm³
  const RHO_FE          =  7.874; // g/cm³  (NIST elemental iron, Z=26)
  const RHO_CONCRETE    =  2.300; // g/cm³  (NIST "Concrete, Ordinary")
  const RHO_CONCRETE_LW =  1.60;  // g/cm³  (light-weight, Oumano et al. 2025)

  // ---------------------------------------------------------------------------
  // Pb K-edge — NIST value 0.0880045 MeV, where μ/ρ jumps 1.910 → 7.683 cm²/g.
  // getMu() AND getBuildup() must branch on the SAME threshold: below the edge a
  // photon sees the low μ and a near-unity B; above it, a high μ and a very large
  // B (scatter degraded below the edge escapes). Mixing branches is unphysical —
  // combining post-edge μ with pre-edge B underestimated T by ~300× at 88.2 keV
  // (audit 2026-07-15, finding 1), i.e. in the NON-conservative direction.
  //
  // ICRP-107 photon energies are rounded to 0.1 keV, so a line stored as 88.0 keV
  // (e.g. Cd-109, true energy 88.034 keV — actually ABOVE the edge) falls in the
  // sub-edge branch. That assignment is deliberate: it is the conservative one
  // (overestimates T, hence dose). Residual uncertainty for lines within ±0.05 keV
  // of the edge is ~2× and stems from the source data's precision, not the model.
  // ---------------------------------------------------------------------------
  const PB_KEDGE_MEV = 0.0880045;

  // ---------------------------------------------------------------------------
  // Exposure buildup factors B(E, mfp) — point isotropic source, infinite medium
  //
  // Source: Trubey, D.K., "New Gamma-Ray Buildup Factor Data for Point Kernel
  // Calculations: ANS-6.4.3 Standard Reference Data", NUREG/CR-5740 /
  // ORNL/RSIC-49/R1 (Aug 1991), Table 3 "Exposure Buildup Factors" — Lead
  // (p. II-40) and Concrete (p. II-44). NRC/ORNL report released for
  // unlimited distribution; only numeric Table 3 values are transcribed here
  // (the underlying ANSI/ANS-6.4.3 standard is (c) American Nuclear Society
  // and is not redistributed). Full PDF:
  // https://www.osti.gov/servlets/purl/5441669
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
  // cross it — see getBuildup). Validity: 0–40 mfp. Beyond 40 mfp B is clamped
  // to its 40-mfp value, which UNDERESTIMATES the true (still-growing) build-up.
  // This is NOT negligible at low energy in high-Z media — e.g. Pb near 89 keV
  // has B(40)·e^-40 ≈ 1e-5, not the ~1e-17 a bare exponential would suggest — so
  // dose.html warns when a requested thickness pushes the dominant line past
  // 40 mfp (the result is then an out-of-range extrapolation).
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

  // NUREG/CR-5740 Table 3, p. II-33: exposure buildup factors for elemental
  // iron. This is deliberately labelled Fe throughout the UI; it must not be
  // treated as a universal steel alloy without a composition-specific model.
  const BUILDUP_FE = [
    [0.015, 1, 1, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01],
    [0.020, 1.01, 1.01, 1.01, 1.02, 1.02, 1.02, 1.02, 1.02, 1.02, 1.02, 1.03, 1.03, 1.03, 1.03, 1.03, 1.04],
    [0.030, 1.02, 1.03, 1.04, 1.04, 1.05, 1.05, 1.06, 1.06, 1.06, 1.07, 1.07, 1.08, 1.08, 1.09, 1.09, 1.09],
    [0.040, 1.04, 1.06, 1.08, 1.09, 1.10, 1.11, 1.12, 1.13, 1.13, 1.14, 1.16, 1.17, 1.18, 1.19, 1.20, 1.21],
    [0.050, 1.07, 1.10, 1.14, 1.16, 1.18, 1.20, 1.22, 1.23, 1.24, 1.26, 1.30, 1.33, 1.35, 1.37, 1.38, 1.39],
    [0.060, 1.11, 1.15, 1.21, 1.25, 1.29, 1.32, 1.34, 1.37, 1.39, 1.42, 1.49, 1.54, 1.58, 1.62, 1.64, 1.66],
    [0.080, 1.19, 1.27, 1.39, 1.49, 1.57, 1.64, 1.70, 1.75, 1.81, 1.90, 2.08, 2.22, 2.34, 2.45, 2.53, 2.59],
    [0.100, 1.26, 1.40, 1.61, 1.78, 1.94, 2.07, 2.20, 2.31, 2.41, 2.61, 3.01, 3.33, 3.61, 3.86, 4.07, 4.23],
    [0.150, 1.40, 1.68, 2.15, 2.59, 3.00, 3.39, 3.77, 4.13, 4.49, 5.17, 6.75, 8.21, 9.58, 10.9, 12.1, 13.2],
    [0.200, 1.47, 1.86, 2.59, 3.33, 4.08, 4.85, 5.64, 6.44, 7.25, 8.90, 13.2, 17.6, 22.2, 26.9, 31.7, 36.4],
    [0.300, 1.51, 1.99, 3.00, 4.12, 5.34, 6.66, 8.08, 9.59, 11.2, 14.7, 24.7, 36.4, 49.6, 64.3, 80.3, 97.4],
    [0.400, 1.50, 2.01, 3.12, 4.40, 5.86, 7.48, 9.27, 11.2, 13.3, 18.1, 32.6, 50.8, 72.5, 97.7, 126, 158],
    [0.500, 1.48, 1.99, 3.12, 4.44, 5.96, 7.68, 9.58, 11.7, 14.0, 19.1, 35.1, 55.4, 79.9, 108, 141, 177],
    [0.600, 1.46, 1.96, 3.07, 4.39, 5.90, 7.61, 9.51, 11.6, 13.9, 19.0, 34.8, 54.8, 78.8, 107, 138, 173],
    [0.800, 1.43, 1.90, 2.96, 4.20, 5.62, 7.21, 8.96, 10.9, 13.0, 17.5, 31.4, 48.5, 68.4, 91.0, 116, 144],
    [1.000, 1.41, 1.85, 2.85, 4.00, 5.30, 6.74, 8.31, 10.0, 11.8, 15.8, 27.5, 41.3, 57.0, 74.5, 93.5, 114],
    [1.500, 1.37, 1.76, 2.62, 3.59, 4.65, 5.79, 7.01, 8.30, 9.65, 12.5, 20.6, 29.7, 39.7, 50.4, 61.8, 73.8],
    [2.000, 1.35, 1.71, 2.49, 3.34, 4.25, 5.22, 6.25, 7.33, 8.45, 10.8, 17.4, 24.6, 32.5, 40.9, 49.8, 59.1],
    [3.000, 1.32, 1.64, 2.28, 2.96, 3.68, 4.45, 5.25, 6.09, 6.96, 8.80, 13.8, 19.4, 25.4, 31.7, 38.4, 45.5],
    [4.000, 1.30, 1.57, 2.12, 2.68, 3.29, 3.93, 4.60, 5.31, 6.05, 7.60, 11.9, 16.8, 22.1, 27.9, 34.0, 40.6],
    [5.000, 1.27, 1.51, 1.97, 2.46, 2.98, 3.53, 4.11, 4.73, 5.38, 6.75, 10.7, 15.2, 20.3, 25.9, 32.0, 38.8],
    [6.000, 1.25, 1.47, 1.87, 2.30, 2.76, 3.25, 3.78, 4.33, 4.92, 6.18, 9.85, 14.2, 19.3, 25.1, 31.5, 38.8],
    [8.000, 1.22, 1.39, 1.71, 2.04, 2.41, 2.81, 3.24, 3.71, 4.20, 5.30, 8.64, 12.9, 18.2, 24.5, 32.0, 40.9],
    [10.000, 1.19, 1.33, 1.59, 1.86, 2.16, 2.50, 2.87, 3.27, 3.71, 4.69, 7.88, 12.3, 18.1, 25.7, 35.3, 47.6],
    [15.000, 1.14, 1.24, 1.41, 1.59, 1.80, 2.04, 2.31, 2.61, 2.95, 3.77, 6.80, 11.8, 20.0, 32.8, 52.6, 82.8],
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
   * @param {'Pb'|'Fe'|'concrete'|'concrete_NW'|'concrete_LW'} material - shielding material
   * @returns {number} μ in cm⁻¹
   * @throws {Error} if material is not recognized
   */
  function getMu(E_MeV, material) {
    if (material === 'Pb') {
      // Split table at K-edge to avoid erroneous interpolation across the jump.
      // Threshold shared with getBuildup() — see PB_KEDGE_MEV.
      const subEdge   = ATTENUATION.filter(r => r[0] <= 0.0880);
      const superEdge = ATTENUATION.filter(r => r[0] >= 0.0881);
      const muRho = E_MeV < PB_KEDGE_MEV
        ? interpLogLog(subEdge,   E_MeV, 0, 1)
        : interpLogLog(superEdge, E_MeV, 0, 1);
      return muRho * RHO_PB;
    }

    if (material === 'Fe') {
      return interpLogLog(ATTENUATION, E_MeV, 0, 3) * RHO_FE;
    }

    // All concrete variants share the same elemental composition (μ/ρ)
    const muRho = interpLogLog(ATTENUATION, E_MeV, 0, 2);
    if (material === 'concrete_LW') return muRho * RHO_CONCRETE_LW;
    if (material === 'concrete_NW' || material === 'concrete') return muRho * RHO_CONCRETE;

    // Unknown material: throw error instead of silently defaulting
    throw new Error(`Unknown material "${material}". Expected: 'Pb', 'Fe', 'concrete', 'concrete_NW', or 'concrete_LW'.`);
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
   * @param {string} material - 'Pb'|'Fe'|'concrete'|'concrete_NW'|'concrete_LW'|'none'
   * @returns {number} B ≥ 1
   */
  function getBuildup(E_MeV, mfp, material) {
    if (!(mfp > 0) || material === 'none') return 1.0;
    if (material === 'Pb') {
      // do not interpolate across the K-edge (B jumps ~3 orders of magnitude).
      // Threshold MUST match getMu() — see PB_KEDGE_MEV.
      const rows = E_MeV < PB_KEDGE_MEV
        ? BUILDUP_PB.filter(r => r[0] <= 0.088)
        : BUILDUP_PB.filter(r => r[0] >= 0.089);
      return _buildupInterp(rows, E_MeV, mfp);
    }
    if (material === 'Fe') return _buildupInterp(BUILDUP_FE, E_MeV, mfp);
    if (material === 'concrete' || material === 'concrete_NW' || material === 'concrete_LW') {
      // both concrete variants share μ/ρ — B depends on mfp count, not density
      return _buildupInterp(BUILDUP_CONCRETE, E_MeV, mfp);
    }
    throw new Error(`Unknown material "${material}". Expected: 'Pb', 'Fe', 'concrete', 'concrete_NW', or 'concrete_LW'.`);
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

  /**
   * Build a dose-weighted line spectrum for spectrum-weighted shielding from a
   * list of photon emissions: wᵢ = nᵢ·h(Eᵢ) normalized to Σw = 1 — the same
   * pipeline as tools/add-shielding-spectra.js uses for the curated
   * shielding_spectrum / shielding_spectrum_h007 fields (same filter as
   * calcGammaConstants: G/X/AQ, E ≥ 20 keV, yield ≥ 0.01%; no dose cut — lines
   * that are weak UNSHIELDED are exactly the ones that dominate SHIELDED).
   * Used to shield ICRP 107 extended nuclides with their full spectrum instead
   * of the single representative line (which misestimated T by >10× for 153
   * multi-line nuclides, e.g. Sn-113 at 5 mm Pb: 7.7e-112 vs 2.4e-3).
   *
   * The weighting quantity MATTERS. The h'(0.07)/h*(10) response ratio is NOT
   * monotonic — 1.72 at 20 keV, dipping to 0.876 at 60 keV, back to 1.00 above
   * 500 keV — so H'(0.07) weighting boosts both the softest and the hardest
   * lines while suppressing the 40–300 keV band. Shielding H'(0.07) with H*(10)
   * weights (as this function did before 2026-07-15) therefore errs in EITHER
   * direction depending on the spectrum: it overstates T by 74% for the soft
   * emitter Pd-103 at 1 mm Pb (5.09e-4 vs 2.93e-4) but understates it by ~8% for
   * Re-186, which has a hard tail. There is no conservative side to fall back on;
   * each quantity needs its own weights.
   *
   * @param {Array} emissions - [{energy_keV, yield_percent, type}]
   * @param {'H10'|'H007'} [quantity='H10'] - operational quantity to weight by
   * @returns {Array<[number,number]>|null} [[E_keV, w], ...] sorted by E,
   *   or null if no line passes the filter
   */
  function buildShieldingSpectrum(emissions, quantity) {
    const { gammaH10, gammaH007, contributions } = calcGammaConstants(emissions || []);
    const useH007 = quantity === 'H007';
    const total   = useH007 ? gammaH007 : gammaH10;
    if (!contributions.length || total <= 0) return null;
    return contributions
      .map(c => [c.energy_keV, (useH007 ? c.contrib_H007 : c.contrib_H10) / total])
      .sort((a, b) => a[0] - b[0]);
  }

  // Y-90 bremsstrahlung container ESTIMATES — NOT TRACEABLE TO A PRIMARY SOURCE.
  // Methodology after Zanzonico et al., J Nucl Med 40(6):1024-1028, 1999, which
  // tabulates specific bremsstrahlung constants for soft tissue and bone only —
  // NOT for these container geometries. The values below are estimates, and no
  // measurement or primary reference backs them.
  //
  // Consequently dose.html presents Y-90 as an EXPERIMENTAL SCENARIO: it shows
  // the numbers but issues no regulatory verdict and does not label them as
  // validated data (audit 2026-07-15, finding 5). Replace with measured or
  // primary-sourced constants before any regulatory or design use.
  //
  // `warning` marks a container whose high-Z wall RAISES bremsstrahlung output
  // relative to PMMA — the counter-intuitive direction the user must be told
  // about. It applies to tungsten too (1.8× PMMA), not just lead; flagging only
  // lead steered users toward W in silence.
  const Y90_CONTAINERS = {
    none:     { name: 'No container',   gamma_H10: 0.001, gamma_H007: 0.001 },
    pmma:     { name: 'PMMA (acrylic)', gamma_H10: 0.009, gamma_H007: 0.012 },
    pb:       { name: 'Lead (Pb)',      gamma_H10: 0.034, gamma_H007: 0.042, warning: 'Lead raises bremsstrahlung ~3.8× vs PMMA' },
    tungsten: { name: 'Tungsten (W)',   gamma_H10: 0.016, gamma_H007: 0.020, warning: 'Tungsten raises bremsstrahlung ~1.8× vs PMMA' },
  };

  /**
   * Validity domain of the shielding tables, read from the tables themselves so
   * UI warnings cannot drift from the data (audit 2026-07-15).
   * Outside these bounds getMu/getBuildup CLAMP silently, which understates the
   * transmitted dose (non-conservative) — callers should warn.
   * @param {'Pb'|'Fe'|'concrete'|'concrete_NW'|'concrete_LW'} material
   * @returns {{ buildup_E_min_MeV, buildup_E_max_MeV, buildup_mfp_max, atten_E_max_MeV }}
   */
  function getShieldingRange(material) {
    const rows = material === 'Pb' ? BUILDUP_PB : material === 'Fe' ? BUILDUP_FE : BUILDUP_CONCRETE;
    return {
      buildup_E_min_MeV: rows[0][0],
      buildup_E_max_MeV: rows[rows.length - 1][0],
      buildup_mfp_max:   BUILDUP_MFP[BUILDUP_MFP.length - 1],
      atten_E_max_MeV:   ATTENUATION[ATTENUATION.length - 1][0],
    };
  }

  return {
    GAMMA_FACTOR,
    ICRU57,
    ATTENUATION,
    RHO_PB,
    RHO_FE,
    RHO_CONCRETE,
    RHO_CONCRETE_LW,
    PB_KEDGE_MEV,
    Y90_CONTAINERS,
    getH10,
    getH007,
    getMu,
    getBuildup,
    getShieldingRange,
    hvl,
    calcGammaConstants,
    buildShieldingSpectrum,
  };

})();
