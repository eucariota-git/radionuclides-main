/**
 * effluent.js — Liquid-effluent screening, NUREG/CR-5814 Scenarios No. 1 and 2
 *
 * EFFLUENT.load()          loads data/effluent-scenarios.json (fetch first, then
 *                          the embedded EFFLUENT_DATA twin — same pattern as
 *                          DB.load(), so file:// and offline work).
 * EFFLUENT.evaluate()      converts the page inputs (display units) to SI, calls
 *                          the pure CALC functions per nuclide and scenario, and
 *                          returns results in display units plus the per-scenario
 *                          linear sum over nuclides.
 * EFFLUENT.defaultInput()  the data-file defaults in the shape evaluate() takes.
 *
 * The two scenarios have DIFFERENT receptors (sewer inspector vs STP sludge
 * operator): their doses are never added together.
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
    return !!(d && d.parameters && d.parameters.common && d.parameters.s1 && d.parameters.s2 &&
      d.geometries && Array.isArray(d.nuclides) && d.nuclides.length &&
      d.nuclides.every(n => n && n.id && n.k_ext && n.k_ext.s1 && n.e_inh && n.source_term));
  }

  async function load() {
    if (_data) return _data;
    const embeddedRaw = typeof EFFLUENT_DATA !== 'undefined' ? EFFLUENT_DATA : null;
    const embedded = isValidData(embeddedRaw) ? embeddedRaw : null;
    let data = null;
    try {
      const resp = await fetch('data/effluent-scenarios.json');
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
    if (!data) throw new Error('No valid effluent data source available. Ensure effluent-scenarios-data.js is present.');
    _data = data;
    return data;
  }

  function getData() { return _data; }

  /**
   * Half-life for a nuclide of the data file: the app database first (single
   * source of truth), then the file's own ICRP 107 fallback (Lu-177m is not a
   * curated entry).
   * @param {object} nd - nuclide record of the effluent data file
   * @param {object|null} dbRecord - DB.getById(nd.id)
   */
  function halfLifeOf(nd, dbRecord) {
    if (dbRecord && Number.isFinite(dbRecord.half_life_s)) return dbRecord.half_life_s;
    if (Number.isFinite(nd.half_life_s_fallback)) return nd.half_life_s_fallback;
    throw new Error(`${nd.id}: no half-life available`);
  }

  const values = group => Object.fromEntries(Object.entries(group).map(([k, p]) => [k, p.value]));

  /**
   * Defaults of the data file, in the shape evaluate() expects.
   * @param {object} data
   * @param {function} halfLife - (nd) => half_life_s
   * @param {'L10'|'L45'} [geometry]
   */
  function defaultInput(data, halfLife, geometry = data.geometries.default) {
    return {
      geometry,
      common: values(data.parameters.common),
      s1: values(data.parameters.s1),
      s2: values(data.parameters.s2),
      nuclides: data.nuclides.map(nd => Object.assign({
        id: nd.id,
        include: nd.include_default,
        controlled: nd.source_term.controlled_default,
        half_life_s: halfLife(nd),
        k1_nSv_h_per_Bq_m3: nd.k_ext.s1.value,
        k2_nSv_h_per_Bq_m3: nd.k_ext.s2 ? nd.k_ext.s2[geometry].value : null,
        e_inh_Sv_per_Bq: nd.e_inh.value,
      }, nd.source_term)),
    };
  }

  function checkSourceTerm(n) {
    for (const key of ['patients_per_y', 'cycles_per_patient', 'activity_per_cycle_GBq', 'fraction_in_hospital']) {
      if (!Number.isFinite(n[key]) || n[key] < 0) throw new RangeError(`${n.id}: ${key} must be a finite number ≥ 0`);
    }
    if (n.fraction_in_hospital > 1) throw new RangeError(`${n.id}: fraction excreted in hospital must be ≤ 1`);
  }

  /**
   * Source term per included nuclide (GBq/y).
   *   A_adm  = patients × cycles × administered activity per cycle
   *   e_hosp = A_adm × fraction excreted in hospital
   *   A_hosp = activity leaving the hospital: e_hosp, or, for nuclides
   *            controlled in decay tanks, e_hosp × min(1, L / Σ e_hosp of the
   *            controlled nuclides) — the annual tank discharge L is shared in
   *            proportion to the activity excreted into the tanks, with no decay
   *            credit when Σ e_hosp < L.
   *   A_home = A_adm × (1 − fraction in hospital): all administered activity is
   *            assumed to be excreted.
   * Scenario 1 receives A_hosp; Scenario 2 receives A_hosp + A_home × catchment.
   */
  function sourceTerms(nuclides, tankLimit_GBq_y, catchment) {
    if (!(Number.isFinite(tankLimit_GBq_y) && tankLimit_GBq_y >= 0)) {
      throw new RangeError('Annual discharge from decay tanks must be a finite number ≥ 0');
    }
    const inc = nuclides.filter(n => n.include);
    inc.forEach(checkSourceTerm);
    const eHosp = n => n.patients_per_y * n.cycles_per_patient * n.activity_per_cycle_GBq * n.fraction_in_hospital;
    const sumControlled = inc.filter(n => n.controlled).reduce((a, n) => a + eHosp(n), 0);
    const tankFactor = sumControlled > tankLimit_GBq_y ? tankLimit_GBq_y / sumControlled : 1;
    const out = {};
    for (const n of inc) {
      const A_adm = n.patients_per_y * n.cycles_per_patient * n.activity_per_cycle_GBq;
      const e_hosp = eHosp(n);
      const A_hosp = n.controlled ? e_hosp * tankFactor : e_hosp;
      const A_home = A_adm * (1 - n.fraction_in_hospital);
      out[n.id] = { A_adm, e_hosp, A_hosp, A_home, controlled: !!n.controlled,
                    A1: A_hosp, A2: A_hosp + A_home * catchment };
    }
    return { byId: out, sumControlled_GBq_y: sumControlled, tankFactor, tankLimit_GBq_y };
  }

  /**
   * @param {object} input - see defaultInput()
   * @returns {{ source: object (see sourceTerms),
   *             s1: {rows, total_mSv_y, fraction_of_criterion},
   *             s2: {rows, total_mSv_y, fraction_of_criterion},
   *             criterion_mSv_y: number }}
   *   Scenario 2 rows of nuclides without a coefficient carry `no_coefficient: true`
   *   and do not contribute to the total.
   */
  function evaluate(input) {
    const c = input.common, p1 = input.s1, p2 = input.s2;
    const catchment = p2.catchment_pct / 100;
    if (!(catchment >= 0 && catchment <= 1)) throw new RangeError('Catchment fraction must be between 0 and 100 %');
    const breathing_m3_s = c.breathing_rate_m3_h / S_PER_H;

    const st = sourceTerms(input.nuclides, c.tank_limit_GBq_y, catchment);
    const s1rows = [], s2rows = [];
    let t1 = 0, t2 = 0;
    for (const n of input.nuclides) {
      if (!n.include) continue;
      const lambda_s = Math.LN2 / n.half_life_s;
      const A1_GBq_y = st.byId[n.id].A1;
      const A2_GBq_y = st.byId[n.id].A2;

      const s1params = A => ({
        lambda_s, transit_s: p1.transit_h * S_PER_H, A_Bq_per_y: A,
        water_volume_m3_per_y: p1.water_volume_m3_y, water_density_kg_m3: p1.water_density_kg_m3,
        aerosol_kg_m3: p1.aerosol_loading_kg_m3, respirable_fraction: p1.respirable_fraction,
        breathing_m3_s, t_ext_s: p1.t_external_h_y * S_PER_H, t_inh_s: p1.t_inhalation_h_y * S_PER_H,
        geometry_factor: p1.geometry_factor,
        k_Sv_m3_per_Bq_s: n.k1_nSv_h_per_Bq_m3 * NSV_H_TO_SV_S, e_inh_Sv_per_Bq: n.e_inh_Sv_per_Bq,
      });
      // Per-GBq factors are evaluated with 1 GBq, as in the workbooks (A_ref),
      // so they stay defined when the source term is zero.
      const r1 = CALC.sewerInspectorScenario1(s1params(A1_GBq_y * 1e9));
      const u1 = CALC.sewerInspectorScenario1(s1params(1e9));
      t1 += r1.E * 1e3;
      s1rows.push({
        id: n.id, A_GBq_y: A1_GBq_y, DF: r1.DF,
        per_GBq: { C_water_Bq_m3: u1.C_water, C_air_Bq_m3: u1.C_air,
                   D_ext_uSv: u1.E_ext * 1e6, D_inh_uSv: u1.E_inh * 1e6, FD_uSv: u1.E * 1e6 },
        E_ext_mSv_y: r1.E_ext * 1e3, E_inh_mSv_y: r1.E_inh * 1e3, E_mSv_y: r1.E * 1e3,
        dominant: u1.dominant,
      });

      if (n.k2_nSv_h_per_Bq_m3 === null || n.k2_nSv_h_per_Bq_m3 === undefined) {
        s2rows.push({ id: n.id, A_GBq_y: A2_GBq_y, no_coefficient: true });
        continue;
      }
      const s2params = A => ({
        lambda_s, transit_s: p2.transit_d * S_PER_D, A_Bq_per_y: A,
        wet_sludge_kg_per_y: p2.wet_sludge_t_per_y * 1000, solids_fraction: p2.solids_fraction,
        wet_density_kg_m3: p2.wet_density_kg_m3, dust_kg_m3: p2.dust_loading_kg_m3,
        respirable_fraction: p2.respirable_fraction, sludge_fraction: p2.sludge_fraction,
        breathing_m3_s, t_ext_s: p2.t_external_h_y * S_PER_H, t_inh_s: p2.t_inhalation_h_y * S_PER_H,
        geometry_factor: p2.geometry_factor,
        k_Sv_m3_per_Bq_s: n.k2_nSv_h_per_Bq_m3 * NSV_H_TO_SV_S, e_inh_Sv_per_Bq: n.e_inh_Sv_per_Bq,
      });
      const r2 = CALC.sludgeOperatorScenario2(s2params(A2_GBq_y * 1e9));
      const u2 = CALC.sludgeOperatorScenario2(s2params(1e9));
      t2 += r2.E * 1e3;
      s2rows.push({
        id: n.id, A_GBq_y: A2_GBq_y, DF: r2.DF,
        per_GBq: { C_dry_Bq_kg: u2.C_dry, C_wet_Bq_m3: u2.C_wet, C_air_Bq_m3: u2.C_air,
                   D_ext_uSv: u2.E_ext * 1e6, D_inh_uSv: u2.E_inh * 1e6, FD_uSv: u2.E * 1e6 },
        E_ext_mSv_y: r2.E_ext * 1e3, E_inh_mSv_y: r2.E_inh * 1e3, E_mSv_y: r2.E * 1e3,
        dominant: u2.dominant,
      });
    }
    const crit = c.dose_criterion_mSv_y;
    const frac = t => (crit > 0 ? t / crit : NaN);
    return {
      source: st,
      s1: { rows: s1rows, total_mSv_y: t1, fraction_of_criterion: frac(t1) },
      s2: { rows: s2rows, total_mSv_y: t2, fraction_of_criterion: frac(t2) },
      criterion_mSv_y: crit,
    };
  }

  /**
   * Indicative Scenario 2 cross-checks for a nuclide that carries
   * `cross_checks` in the data file (I-131). Neither value is used in the result.
   *
   * NUREG/CR-5814 Table B.7 is rescaled to the user plant through the only
   * parameters that change the wet-sludge concentration and exposure:
   * C_wet ∝ ρ_wet · f_solids / M_dry, times DF and t_ext · f_geom.
   *
   * @param {object} nuclideData - nuclide record of the data file
   * @param {number} half_life_s
   * @param {object} plant - Scenario 2 parameter values (input.s2)
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

  /**
   * Indicative comparison of the PHITS coefficients with the GENII-1990 factors
   * of NUREG/CR-5814 Table A.21, for nuclides that carry `nureg_table_A21`.
   * Factors in Sv/y per Bq/m³ are converted with 1 y = 8766 h.
   * @returns {null | { k1_phits, k1_nureg, ratio1, k2_phits, k2_nureg, ratio2 }}
   *   coefficients in (nSv/h)/(Bq/m³); ratio = PHITS / NUREG
   */
  function nuregComparison(nd, geometry) {
    const a = nd && nd.nureg_table_A21;
    if (!a) return null;
    const toNsvH = f => f / 8766 * 1e9;
    const k1_nureg = toNsvH(a.sewer_maint_Sv_y_per_Bq_m3);
    const k2_nureg = toNsvH(a.stp_wkr_Sv_y_per_Bq_m3);
    const k1_phits = nd.k_ext.s1.value;
    const k2_phits = nd.k_ext.s2 ? nd.k_ext.s2[geometry].value : null;
    return {
      k1_phits, k1_nureg, ratio1: k1_phits / k1_nureg,
      k2_phits, k2_nureg, ratio2: k2_phits === null ? null : k2_phits / k2_nureg,
    };
  }

  return { load, getData, halfLifeOf, defaultInput, sourceTerms, evaluate, crossChecks, nuregComparison, isValidData };

})();
