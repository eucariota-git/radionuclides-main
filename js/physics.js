/**
 * physics.js — Core radiological calculations
 *
 * All functions are pure (no DOM). Requires data.js to be loaded first.
 *
 * Dose rate formula (point source):
 *   Ḣ [μSv/h] = Γ [μSv·h⁻¹·GBq⁻¹·m²] × A [GBq] × T(x) / d² [m²]
 *
 * Transmission T(x):
 *   Archer (broad beam, default when params available):
 *     T(x) = [(1 + β/α)·e^(αγx) − β/α]^(−1/γ)   x in mm
 *     Source: Oumano et al. J Appl Clin Med Phys 2025
 *   Narrow beam (fallback when Archer params unavailable):
 *     T(x) = e^(−μ(E)·x)   x in cm
 *
 * Cumulative dose with radioactive decay over time t [h]:
 *   H [μSv] = Γ × A₀ × T / d² × (1 − e^(−λt)) / λ
 *   λ [h⁻¹] = ln(2) / T½[h]
 */

'use strict';

const CALC = (() => {

  const LN2 = Math.LN2;

  // ---------------------------------------------------------------------------
  // Decay
  // ---------------------------------------------------------------------------

  /**
   * Decay constant λ from half-life.
   * @param {number} halfLife - half-life in any unit
   * @returns {number} λ in same unit⁻¹
   */
  function lambda(halfLife) {
    return LN2 / halfLife;
  }

  /**
   * Activity at time t.
   * @param {number} A0   - initial activity (any unit)
   * @param {number} T_half - half-life (same time unit as t)
   * @param {number} t    - elapsed time (same unit)
   * @returns {number} A(t) in same activity unit
   */
  function activityAtTime(A0, T_half, t) {
    return A0 * Math.exp(-lambda(T_half) * t);
  }

  /**
   * Time to reach a target activity.
   * @param {number} A0      - initial activity
   * @param {number} Atarget - target activity (< A0)
   * @param {number} T_half  - half-life (any time unit)
   * @returns {number} time in same unit as T_half; Infinity if Atarget >= A0
   */
  function timeToActivity(A0, Atarget, T_half) {
    if (Atarget >= A0) return 0;
    if (Atarget <= 0)  return Infinity;
    return -T_half * Math.log2(Atarget / A0);
  }

  /**
   * Generate decay curve data points.
   * @param {number} A0       - initial activity [MBq or GBq]
   * @param {number} T_half_h - half-life in hours
   * @param {number} nPoints  - number of data points
   * @returns {Array<{t_h, A}>} array of {t_h [h], A [same unit as A0]}
   */
  function decayCurve(A0, T_half_h, nPoints = 100) {
    // Span 5 half-lives or until activity < 0.1% of A0
    const tMax = Math.min(T_half_h * 7, T_half_h * 10);
    const dt   = tMax / (nPoints - 1);
    const points = [];
    for (let i = 0; i < nPoints; i++) {
      const t = i * dt;
      points.push({ t_h: t, A: activityAtTime(A0, T_half_h, t) });
    }
    return points;
  }

  // ---------------------------------------------------------------------------
  // Dose rate
  // ---------------------------------------------------------------------------

  /**
   * Narrow-beam transmission factor.
   * @param {number} x_cm    - shield thickness [cm]
   * @param {number} E_MeV   - representative photon energy [MeV]
   * @param {string} material - 'Pb'|'concrete'|'concrete_NW'|'concrete_LW'|'none'
   * @returns {number} T ∈ (0, 1]
   */
  function transmission(x_cm, E_MeV, material) {
    if (material === 'none' || x_cm <= 0) return 1.0;
    const mu = PHYSICS.getMu(E_MeV, material);
    return Math.exp(-mu * x_cm);
  }

  /**
   * Archer broad-beam transmission.
   * T(x) = [(1 + β/α)·e^(αγx) − β/α]^(−1/γ)
   * @param {number} x_mm - shield thickness [mm]
   * @param {{alpha:number, beta:number, gamma:number}} p - Archer parameters
   * @returns {number} T ∈ (0, 1]
   */
  function transmissionArcher(x_mm, p) {
    if (x_mm <= 0) return 1.0;
    const ratio = p.beta / p.alpha;
    const val   = (1 + ratio) * Math.exp(p.alpha * p.gamma * x_mm) - ratio;
    return Math.pow(val, -1 / p.gamma);
  }

  /**
   * Inverse Archer equation: thickness [mm] for a desired transmission T.
   * x = (1/αγ) · ln[(T^(−γ) + β/α) / (1 + β/α)]
   */
  function _archerThickness_mm(T, p) {
    if (T >= 1) return 0;
    if (T <= 0) return Infinity;
    const ratio = p.beta / p.alpha;
    return (1 / (p.alpha * p.gamma)) *
           Math.log((Math.pow(T, -p.gamma) + ratio) / (1 + ratio));
  }

  /**
   * Best available transmission: Archer if params given, else narrow beam.
   * @param {number} x_cm
   * @param {number} E_MeV
   * @param {string} material
   * @param {object|null} archerParams - from nuclide.archer_params[material] or null
   */
  function getTransmission(x_cm, E_MeV, material, archerParams) {
    if (material === 'none' || x_cm <= 0) return 1.0;
    if (archerParams) return transmissionArcher(x_cm * 10, archerParams);
    return transmission(x_cm, E_MeV, material);
  }

  /**
   * Instantaneous dose rate at distance d with optional shielding.
   * @param {number} gamma        - Γ [μSv·h⁻¹·GBq⁻¹·m²]
   * @param {number} A_GBq        - activity [GBq]
   * @param {number} d_m          - distance [m]
   * @param {number} x_cm         - shield thickness [cm]
   * @param {number} E_MeV        - representative photon energy [MeV]
   * @param {string} material
   * @param {object|null} [archerParams] - optional Archer parameters
   * @returns {number} dose rate [μSv/h]
   */
  function doseRate(gamma, A_GBq, d_m, x_cm, E_MeV, material, archerParams) {
    if (d_m <= 0) return Infinity;
    const T = getTransmission(x_cm, E_MeV, material, archerParams || null);
    return (gamma * A_GBq * T) / (d_m * d_m);
  }

  /**
   * Cumulative dose over time t_h considering radioactive decay.
   * H = Γ × A₀ × T / d² × (1 − e^(−λt)) / λ
   * @param {number} gamma        - Γ constant [μSv·h⁻¹·GBq⁻¹·m²]
   * @param {number} A0_GBq       - initial activity [GBq]
   * @param {number} d_m          - distance [m]
   * @param {number} t_h          - exposure time [h]
   * @param {number} T_half_h     - half-life [h]
   * @param {number} x_cm         - shield thickness [cm]
   * @param {number} E_MeV        - representative energy [MeV]
   * @param {string} material
   * @param {object|null} [archerParams] - optional Archer parameters
   * @returns {number} cumulative dose [μSv]
   */
  function cumulativeDose(gamma, A0_GBq, d_m, t_h, T_half_h, x_cm, E_MeV, material, archerParams) {
    if (d_m <= 0) return Infinity;
    const T     = getTransmission(x_cm, E_MeV, material, archerParams || null);
    const lam   = lambda(T_half_h);
    const Hdot0 = (gamma * A0_GBq * T) / (d_m * d_m);
    if (T_half_h === Infinity || lam === 0) return Hdot0 * t_h;
    return Hdot0 * (1 - Math.exp(-lam * t_h)) / lam;
  }

  /**
   * HVL and TVL — uses Archer equation when params provided, else narrow beam.
   * @param {number} E_MeV
   * @param {string} material
   * @param {object|null} [archerParams]
   * @returns {{ hvl_cm, tvl_cm, mu_cm, method }}
   */
  function hvlTvl(E_MeV, material, archerParams) {
    if (archerParams) {
      const hvl_mm = _archerThickness_mm(0.5, archerParams);
      const tvl_mm = _archerThickness_mm(0.1, archerParams);
      return {
        mu_cm:  null,
        hvl_cm: hvl_mm / 10,
        tvl_cm: tvl_mm / 10,
        method: 'archer',
      };
    }
    const mu = PHYSICS.getMu(E_MeV, material);
    return {
      mu_cm:  mu,
      hvl_cm: mu > 0 ? LN2 / mu : Infinity,
      tvl_cm: mu > 0 ? Math.log(10) / mu : Infinity,
      method: 'narrow_beam',
    };
  }

  /**
   * Thickness [cm] of material required to achieve a given transmission.
   * Uses Archer when params given, else narrow beam.
   */
  function thicknessForAttenuation(attenuation, E_MeV, material, archerParams) {
    if (attenuation >= 1) return 0;
    if (attenuation <= 0) return Infinity;
    if (archerParams) return _archerThickness_mm(attenuation, archerParams) / 10;
    const mu = PHYSICS.getMu(E_MeV, material);
    return -Math.log(attenuation) / mu;
  }

  /**
   * Convert activity between units.
   * @param {number} value
   * @param {'MBq'|'GBq'|'mCi'|'Ci'|'kBq'|'Bq'} fromUnit
   * @param {'MBq'|'GBq'|'mCi'|'Ci'|'kBq'|'Bq'} toUnit
   */
  function convertActivity(value, fromUnit, toUnit) {
    const toMBq = { Bq: 1e-6, kBq: 1e-3, MBq: 1, GBq: 1e3, mCi: 37, Ci: 37000 };
    const valMBq = value * (toMBq[fromUnit] || 1);
    return valMBq / (toMBq[toUnit] || 1);
  }

  /**
   * Format a dose rate or dose value with appropriate unit prefix.
   * @param {number} value - in μSv or μSv/h
   * @returns {{ value: number, unit: string, display: string }}
   */
  function formatDose(value_uSv) {
    if (!isFinite(value_uSv) || value_uSv < 0) return { value: value_uSv, unit: 'μSv', display: '—' };
    if (value_uSv >= 1e6)  return { value: value_uSv / 1e6, unit: 'Sv',  display: (value_uSv / 1e6).toPrecision(4) + ' Sv' };
    if (value_uSv >= 1e3)  return { value: value_uSv / 1e3, unit: 'mSv', display: (value_uSv / 1e3).toPrecision(4) + ' mSv' };
    if (value_uSv >= 1)    return { value: value_uSv,       unit: 'μSv', display: value_uSv.toPrecision(4) + ' μSv' };
    return { value: value_uSv * 1e3, unit: 'nSv', display: (value_uSv * 1e3).toPrecision(4) + ' nSv' };
  }

  function formatDoseRate(value_uSvh) {
    const f = formatDose(value_uSvh);
    return { ...f, unit: f.unit + '/h', display: f.display.replace(f.unit, f.unit + '/h') };
  }

  /**
   * Format a time value nicely.
   * @param {number} t_s - time in seconds
   */
  function formatHalfLife(t_s) {
    if (t_s < 60)        return t_s.toFixed(2) + ' s';
    if (t_s < 3600)      return (t_s / 60).toFixed(2) + ' min';
    if (t_s < 86400)     return (t_s / 3600).toFixed(3) + ' h';
    if (t_s < 31557600)  return (t_s / 86400).toFixed(2) + ' d';
    return (t_s / 31557600).toFixed(2) + ' y';
  }

  return {
    lambda,
    activityAtTime,
    timeToActivity,
    decayCurve,
    transmission,
    transmissionArcher,
    getTransmission,
    doseRate,
    cumulativeDose,
    hvlTvl,
    thicknessForAttenuation,
    convertActivity,
    formatDose,
    formatDoseRate,
    formatHalfLife,
  };

})();
