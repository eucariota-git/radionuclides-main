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
    hvl,
    calcGammaConstants,
  };

})();
