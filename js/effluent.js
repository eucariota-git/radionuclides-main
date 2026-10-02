/**
 * effluent.js — Liquid-effluent screening, NUREG/CR-5814 Scenario No. 2
 *
 * EFFLUENT.load()       loads data/effluent-scenario2.json (fetch first, then
 *                       the embedded EFFLUENT_S2_DATA twin — same pattern as
 *                       DB.load(), so file:// and offline work).
 * EFFLUENT.evaluate()   converts the page inputs (display units) to SI, calls
 *                       the pure CALC.sludgeOperatorScenario2 per nuclide and
 *                       returns results in display units plus the linear sum.
 *
 * No DOM access: the page owns the UI. Requires physics.js (CALC).
 */

'use strict';

const EFFLUENT = (() => {

  const S_PER_H = 3600;
  const S_PER_D = 86400;
  // (nSv/h)/(Bq/m³) → (Sv/s)/(Bq/m³)
  const NSV_H_TO_SV_S = 1e-9 / S_PER_H;

  let _data = null;

  function isValidData(d) {
    return !!(d && d.parameters && d.geometries && Array.isArray(d.nuclides) && d.nuclides.length &&
      d.nuclides.every(n => n && n.id && n.k_ext && n.e_inh && n.source_term));
  }

  async function load() {
    if (_data) return _data;
    const embeddedRaw = typeof EFFLUENT_S2_DATA !== 'undefined' ? EFFLUENT_S2_DATA : null;
    const embedded = isValidData(embeddedRaw) ? embeddedRaw : null;
    let data = null;
    try {
      const resp = await fetch('data/effluent-scenario2.json');
      if (resp.ok) {
        const candidate = await resp.json();
        if (!isValidData(candidate)) {
          console.warn('Fetched effluent data is invalid; using embedded fallback.');
        } else if (embedded && JSON.stringify(candidate) !== JSON.stringify(embedded)) {
          console.warn('Fetched and embedded effluent data differ; using the coherent embedded fallback.');
        } else {
          data = candidate;
        }
      }
    } catch (e) {
      // file:// or offline — embedded copy below
    }
    if (!data) data = embedded;
    if (!data) throw new Error('No valid effluent data source available. Ensure effluent-scenario2-data.js is present.');
    _data = data;
    return data;
  }

  function getData() { return _data; }

  /**
   * @param {object} input
   * @param {'L10'|'L45'} input.geometry
   * @param {object} input.plant   keys as in data.parameters, display units
   * @param {Array}  input.nuclides [{ id, include, half_life_s, patients_per_y,
   *                 cycles_per_patient, activity_per_cycle_GBq, fraction_to_sewer,
   *                 k_nSv_h_per_Bq_m3, e_inh_Sv_per_Bq }]
   * @returns {{ rows: Array, total_mSv_y: number, criterion_mSv_y: number, fraction_of_criterion: number }}
   */
  function evaluate(input) {
    const pl = input.plant;
    const catchment = pl.catchment_pct / 100;
    if (!(catchment >= 0 && catchment <= 1)) throw new RangeError('Catchment fraction must be between 0 and 100 %');

    const rows = [];
    let total = 0;
    for (const n of input.nuclides) {
      if (!n.include) continue;
      for (const key of ['patients_per_y', 'cycles_per_patient', 'activity_per_cycle_GBq', 'fraction_to_sewer']) {
        if (!Number.isFinite(n[key]) || n[key] < 0) throw new RangeError(`${n.id}: ${key} must be a finite number ≥ 0`);
      }
      if (n.fraction_to_sewer > 1) throw new RangeError(`${n.id}: fraction reaching the sewer must be ≤ 1`);

      const A_GBq_y = n.patients_per_y * n.cycles_per_patient * n.activity_per_cycle_GBq *
        n.fraction_to_sewer * catchment;
      const r = CALC.sludgeOperatorScenario2({
        lambda_s: Math.LN2 / n.half_life_s,
        transit_s: pl.transit_d * S_PER_D,
        A_Bq_per_y: A_GBq_y * 1e9,
        wet_sludge_kg_per_y: pl.wet_sludge_t_per_y * 1000,
        solids_fraction: pl.solids_fraction,
        wet_density_kg_m3: pl.wet_density_kg_m3,
        dust_kg_m3: pl.dust_loading_kg_m3,
        respirable_fraction: pl.respirable_fraction,
        sludge_fraction: pl.sludge_fraction,
        breathing_m3_s: pl.breathing_rate_m3_h / S_PER_H,
        t_ext_s: pl.t_external_h_y * S_PER_H,
        t_inh_s: pl.t_inhalation_h_y * S_PER_H,
        geometry_factor: pl.geometry_factor,
        k_Sv_m3_per_Bq_s: n.k_nSv_h_per_Bq_m3 * NSV_H_TO_SV_S,
        e_inh_Sv_per_Bq: n.e_inh_Sv_per_Bq,
      });
      // Per-GBq factors are evaluated with 1 GBq, as in the workbook (A_ref),
      // so they stay defined when the source term is zero.
      const unit = CALC.sludgeOperatorScenario2({
        lambda_s: Math.LN2 / n.half_life_s, transit_s: pl.transit_d * S_PER_D, A_Bq_per_y: 1e9,
        wet_sludge_kg_per_y: pl.wet_sludge_t_per_y * 1000, solids_fraction: pl.solids_fraction,
        wet_density_kg_m3: pl.wet_density_kg_m3, dust_kg_m3: pl.dust_loading_kg_m3,
        respirable_fraction: pl.respirable_fraction, sludge_fraction: pl.sludge_fraction,
        breathing_m3_s: pl.breathing_rate_m3_h / S_PER_H, t_ext_s: pl.t_external_h_y * S_PER_H,
        t_inh_s: pl.t_inhalation_h_y * S_PER_H, geometry_factor: pl.geometry_factor,
        k_Sv_m3_per_Bq_s: n.k_nSv_h_per_Bq_m3 * NSV_H_TO_SV_S, e_inh_Sv_per_Bq: n.e_inh_Sv_per_Bq,
      });

      const E_mSv = r.E * 1e3;
      total += E_mSv;
      rows.push({
        id: n.id,
        A_GBq_y,
        DF: r.DF,
        per_GBq: {                      // concentrations and doses for 1 GBq discharged
          C_dry_Bq_kg: unit.C_dry,
          C_wet_Bq_m3: unit.C_wet,
          C_air_Bq_m3: unit.C_air,
          D_ext_uSv: unit.E_ext * 1e6,
          D_inh_uSv: unit.E_inh * 1e6,
          FD_uSv: unit.E * 1e6,
        },
        C_dry_Bq_kg: r.C_dry,
        C_wet_Bq_m3: r.C_wet,
        C_air_Bq_m3: r.C_air,
        E_ext_mSv_y: r.E_ext * 1e3,
        E_inh_mSv_y: r.E_inh * 1e3,
        E_mSv_y: E_mSv,
        dominant: unit.dominant,
      });
    }
    const crit = pl.dose_criterion_mSv_y;
    return {
      rows,
      total_mSv_y: total,
      criterion_mSv_y: crit,
      fraction_of_criterion: crit > 0 ? total / crit : NaN,
    };
  }

  /**
   * Indicative cross-checks for a nuclide that carries `cross_checks` in the
   * data file (I-131). Neither value is used in the result.
   *
   * NUREG/CR-5814 Table B.7 is rescaled to the user plant through the only
   * parameters that change the wet-sludge concentration and exposure:
   * C_wet ∝ ρ_wet · f_solids / M_dry, times DF and t_ext · f_geom.
   *
   * @returns {null | { nureg_uSv_per_GBq, nureg_raw_uSv_per_GBq, srs19_uSv_per_GBq, srs19_rescaled_uSv_per_GBq }}
   */
  function crossChecks(nuclideData, half_life_s, plant) {
    const cc = nuclideData && nuclideData.cross_checks;
    if (!cc) return null;
    const lambda_d = Math.LN2 / (half_life_s / S_PER_D);
    const dryUser_t = plant.wet_sludge_t_per_y * plant.solids_fraction;
    const out = {};
    if (cc.nureg_table_B7) {
      const ref = cc.nureg_table_B7.reference_plant;
      const raw = cc.nureg_table_B7.uSv_per_GBq;
      out.nureg_raw_uSv_per_GBq = raw;
      out.nureg_uSv_per_GBq = raw *
        (ref.dry_sludge_t_per_y / dryUser_t) *
        (plant.solids_fraction / ref.solids_fraction) *
        (plant.wet_density_kg_m3 / ref.wet_density_kg_m3) *
        Math.exp(-lambda_d * (plant.transit_d - ref.transit_d)) *
        (plant.t_external_h_y / ref.t_external_h_y) * plant.geometry_factor *
        plant.sludge_fraction;
    }
    if (cc.srs19_table_I_IV) {
      const raw = cc.srs19_table_I_IV.Sv_per_y_per_Bq_per_y * 1e9 * 1e6;   // µSv per GBq
      out.srs19_uSv_per_GBq = raw;
      out.srs19_rescaled_uSv_per_GBq = raw * (400 / dryUser_t);             // SRS-19 generic plant: 400 t/y dry
    }
    return out;
  }

  return { load, getData, evaluate, crossChecks, isValidData };

})();
