/**
 * caregiver.js — External dose to a caregiver / family member after discharge
 * of a radionuclide-therapy patient.
 *
 * Port of the workbook Dosis_acompanantes_simple_v2.1.xlsx (sheets Dosis,
 * Curva and Comprobación). Same model, same validations, same inverse
 * calculations; the cell each function reproduces is cited next to it.
 *
 * CAREGIVER.load()           loads data/caregiver.json (fetch first, then the
 *                            embedded CAREGIVER_DATA twin — same pattern as
 *                            EFFLUENT.load(), so file:// and offline work).
 * CAREGIVER.evaluate(input)  dose per cycle and per treatment, status, warnings
 *                            and inverse calculations.
 * CAREGIVER.curve(input)     treatment dose vs restriction (same restriction in
 *                            both rows), sheet Curva.
 * CAREGIVER.selfCheck(input) independent recalculation in µSv and h (sheet
 *                            Comprobación A) plus the workbook v6 reference
 *                            cases (sheet Comprobación B).
 *
 * Time model: two CONSECUTIVE exponentials — the fast effective half-life from
 * discharge to the end of the fast phase, then the slow one starting from the
 * rate reached. Integration in SI (Sv/s, s, Sv) to infinity.
 *
 * No DOM access: the page owns the UI.
 */

'use strict';

const CAREGIVER = (() => {

  const S_PER_H = 3600;
  const S_PER_D = 86400;
  const LN2 = Math.LN2;
  // |fn − fr| below this is treated as "the restriction changes nothing" (D60/D61)
  const EPS_F = 1e-12;

  let _data = null;

  function isValidData(d) {
    return !!(d && d.meta && d.defaults && d.profiles && Array.isArray(d.categories) &&
      d.categories.length && Array.isArray(d.curve_days) && d.reference_cases &&
      Array.isArray(d.cohabitation_scenarios) && d.cohabitation_scenarios.length && d.cohabitation_free &&
      Object.values(d.profiles).every(p => p && p.label && Array.isArray(p.points)));
  }

  async function load() {
    if (_data) return _data;
    const embeddedRaw = typeof CAREGIVER_DATA !== 'undefined' ? CAREGIVER_DATA : null;
    const embedded = isValidData(embeddedRaw) ? embeddedRaw : null;
    let data = null;
    try {
      const resp = await fetch('data/caregiver.json');
      if (resp.ok) {
        const candidate = await resp.json();
        if (!isValidData(candidate)) {
          console.warn('Fetched caregiver data is invalid; using embedded fallback.');
        } else if (embedded && JSON.stringify(candidate) !== JSON.stringify(embedded)) {
          console.warn('Fetched and embedded caregiver data differ; using the coherent embedded fallback.');
        } else {
          data = candidate;
        }
      }
    } catch (e) {
      // file:// or offline — embedded copy below
    }
    if (!data) data = embedded;
    if (!data) throw new Error('No valid caregiver data source available. Ensure caregiver-data.js is present.');
    _data = data;
    return data;
  }

  function getData() { return _data; }
  /** For the test suite and Node use: inject the data object directly. */
  function setData(d) {
    if (!isValidData(d)) throw new Error('Invalid caregiver data');
    _data = d;
  }

  const num = v => typeof v === 'number' && Number.isFinite(v);

  // ---------------------------------------------------------------------------
  // Kinetics (sheet Dosis, rows 45–51)
  // ---------------------------------------------------------------------------

  /** D45: validation of the general data. Returns null when ready, else the message. */
  function generalStatus(input, data) {
    const { rate_1m_uSv_h: R, discharge_h: tA, fast_end_h: tF, T_fast_h: Tf, T_slow_h: Ts, cycles: N } = input;
    if (![R, tA, tF, Ts, N].every(num)) {
      return 'Missing data: discharge rate, discharge time, end of the fast phase, slow half-life or number of cycles';
    }
    if (R < 0 || tA < 0 || tF < 0 || Ts <= 0 || N < 1 || N !== Math.trunc(N)) {
      return 'Invalid rate, times, half-life or number of cycles';
    }
    // The workbook enforces ≥ 0 only through Excel data validation (D24); the
    // engine must not rely on the form's min attribute.
    const spc = input.spc_min_restriction_d;
    if (spc !== null && spc !== undefined && !(num(spc) && spc >= 0)) {
      return 'Invalid minimum restriction of the product information: leave it empty or enter a number ≥ 0';
    }
    if (!data.profiles[input.profile]) return 'Select a proximity profile';
    if (tF <= tA) return null;
    if (!num(Tf)) return 'Missing fast half-life: discharge precedes the end of the fast phase';
    if (Tf <= 0 || Tf > Ts) return 'Check the fast phase: 0 < T fast ≤ T slow';
    return null;
  }

  /**
   * D46–D51. A in Sv/s, tr in s, λ in s⁻¹, integrals in Sv at 1 m.
   * @returns {{A:number,tr:number,lf:number,ls:number,Itail:number,Iinf:number}}
   */
  function kinetics(input) {
    const tr = Math.max(0, input.fast_end_h - input.discharge_h) * S_PER_H;
    const ls = LN2 / (input.T_slow_h * S_PER_H);
    const lf = tr > 0 ? LN2 / (input.T_fast_h * S_PER_H) : ls;
    const A = input.rate_1m_uSv_h * 1e-6 / S_PER_H;
    const Itail = A * Math.exp(-lf * tr) / ls;
    const Iinf = A * (1 - Math.exp(-lf * tr)) / lf + Itail;
    return { A, tr, lf, ls, Itail, Iinf };
  }

  /** D56: integral at 1 m from discharge to C seconds (Sv). */
  function integralBefore(k, C) {
    const { A, tr, lf, ls } = k;
    return A * ((1 - Math.exp(-lf * Math.min(C, tr))) / lf +
      Math.exp(-lf * tr) * (1 - Math.exp(-ls * Math.max(0, C - tr))) / ls);
  }

  /** E56: integral at 1 m from C seconds to infinity (Sv). */
  function integralAfter(k, C) {
    const { A, tr, lf, ls } = k;
    return C < tr
      ? A * ((Math.exp(-lf * C) - Math.exp(-lf * tr)) / lf + Math.exp(-lf * tr) / ls)
      : A * Math.exp(-lf * tr) * Math.exp(-ls * (C - tr)) / ls;
  }

  // ---------------------------------------------------------------------------
  // Proximity profiles (rows 80–100) and spatial factors (F56:G57)
  // ---------------------------------------------------------------------------

  /** Points {distance_m, factor} of the selected profile; "own" is built from the measurements. */
  function profilePoints(input, data) {
    const p = data.profiles[input.profile];
    if (!p) return [];
    if (input.profile !== 'own') return p.points.map(pt => ({ distance_m: pt.distance_m, factor: pt.factor, note: pt.note }));
    const R = input.rate_1m_uSv_h;
    // E95: the 1 m row has factor 1 whenever the 1 m rate is a non-negative number
    const pts = [{ distance_m: 1, factor: num(R) && R >= 0 ? 1 : null, rate_uSv_h: num(R) ? R : null, fixed: true }];
    for (const m of input.own_measurements || []) {
      const d = m && m.distance_m, r = m && m.rate_uSv_h;
      if (!num(d) && !num(r)) continue;
      // E96:E100
      const factor = num(d) && d > 0 && num(r) && r > 0 && num(R) && R > 0 ? r / R : null;
      pts.push({ distance_m: num(d) ? d : null, factor, rate_uSv_h: num(r) ? r : null });
    }
    return pts;
  }

  /**
   * F56: factor for a row/period. 0 hours → 0 (no contact; distance may be empty).
   * Otherwise the distance must appear exactly once in the profile with a factor > 0.
   * @returns {number|null} null = "no factor"
   */
  function spatialFactor(hours, distance, points) {
    if (hours === 0) return 0;
    if (!(num(distance) && distance > 0)) return null;
    const matches = points.filter(p => p.distance_m === distance);
    if (matches.length !== 1) return null;
    const f = matches[0].factor;
    return num(f) && f > 0 ? f : null;
  }

  const ROW_NAME = { day: 'Day-time', sleep: 'Sleeping' };

  /** B32/B33: validation of one cohabitation row. Returns null when ready.
   *  The page may pass the row's current name (cohabitation scenario) as row.label. */
  function rowStatus(key, row, fDuring, fAfter, daysOptional = false) {
    const n = row.label || ROW_NAME[key];
    if ((!daysOptional && !num(row.days)) || !num(row.h_during) || !num(row.h_after)) return `${n}: missing days or hours`;
    if ((num(row.days) && row.days < 0) || row.h_during < 0 || row.h_during > 24 || row.h_after < 0 || row.h_after > 24) {
      return `${n}: invalid days or hours`;
    }
    if (fDuring === null || fAfter === null) return `${n}: distance without a valid factor in the profile`;
    return null;
  }

  /** D54: maximum hours/day over all periods (the two rows may have different restrictions). */
  function maxHoursPerDay(day, sleep) {
    return Math.max(
      (day.days > 0 ? day.h_during : day.h_after) + (sleep.days > 0 ? sleep.h_during : sleep.h_after),
      (day.days > sleep.days ? day.h_during : day.h_after) + sleep.h_after,
      day.h_after + (sleep.days > day.days ? sleep.h_during : sleep.h_after),
      day.h_after + sleep.h_after);
  }

  /** D22 / F22: criterion and its basis. */
  function criterionOf(input, data) {
    const cat = data.categories.find(c => c.key === input.category);
    if (!cat) return { value: null, basis: '', label: '' };
    if (cat.key === 'other') {
      return { value: num(input.manual_criterion_mSv) ? input.manual_criterion_mSv : null, basis: cat.basis, label: cat.label };
    }
    return { value: cat.criterion_mSv, basis: cat.basis, label: cat.label };
  }

  /** D41 / Curva: treatment dose (mSv) with the same restriction R (s) in both rows. */
  function doseWithRestriction(N, fr, fn, k, Rs) {
    return N * (fr * k.Iinf + (fn - fr) * integralAfter(k, Rs)) * 1000;
  }

  // ---------------------------------------------------------------------------
  // Main evaluation (sheet Dosis)
  // ---------------------------------------------------------------------------

  function evaluate(input, data = _data) {
    if (!data) throw new Error('Caregiver data not loaded');
    const out = {
      // ready: the table gives a dose (days entered); tableReady: hours and
      // distances give fr and fn, enough for the inverse calculations and the curve
      ready: false, tableReady: false, noDays: false, status: '', warnings: [],
      criterion: criterionOf(input, data),
      kinetics: null, rows: {}, fr: null, fn: null, maxHours: null,
      perCycle_mSv: null, treatment_mSv: null, margin_mSv: null,
      inverse: { ready: false, maxRate_uSv_h: null, floor_mSv: null, indefiniteKind: null, minRestriction_d: null,
        minRestrictionCode: null, adopted_d: null, adoptedNote: '', doseAtAdopted_mSv: null },
    };
    const general = generalStatus(input, data);
    const points = profilePoints(input, data);
    out.points = points;

    // Spatial factors and row checks. The restriction days may be left empty in
    // BOTH rows (the default since v1.17.1): the minimum and adopted restriction
    // depend only on fr and fn, so they are given before the user chooses the days.
    const rowStatuses = {};
    const noDays = [input.rows.day.days, input.rows.sleep.days].every(v => v === null || v === undefined);
    out.noDays = noDays;
    for (const key of ['day', 'sleep']) {
      const row = input.rows[key];
      const fDuring = num(row.h_during) ? spatialFactor(row.h_during, row.d_during, points) : null;
      const fAfter = num(row.h_after) ? spatialFactor(row.h_after, row.d_after, points) : null;
      rowStatuses[key] = rowStatus(key, row, fDuring, fAfter, noDays);
      out.rows[key] = { fDuring, fAfter, status: rowStatuses[key], before_Sv: null, after_Sv: null, dose_mSv: null };
    }
    const day = input.rows.day, sleep = input.rows.sleep;
    const R = out.rows;
    // D52/D53: equivalent hours at 1 m / 24
    if ([R.day.fDuring, R.sleep.fDuring, day.h_during, sleep.h_during].every(num)) {
      out.fr = (day.h_during * R.day.fDuring + sleep.h_during * R.sleep.fDuring) / 24;
    }
    if ([R.day.fAfter, R.sleep.fAfter, day.h_after, sleep.h_after].every(num)) {
      out.fn = (day.h_after * R.day.fAfter + sleep.h_after * R.sleep.fAfter) / 24;
    }
    if ([day.days, sleep.days, day.h_during, sleep.h_during, day.h_after, sleep.h_after].every(num)) {
      out.maxHours = maxHoursPerDay(day, sleep);
    } else if (noDays && [day.h_after, sleep.h_after].every(num)) {
      // No days yet: only the schedule after the restriction is sure to apply (a
      // 0-day restriction never uses the "during" hours). The common schedule
      // during a positive restriction is checked by the inverse calculation
      // (commonFeasible), as with days entered (audit 2026-10-22, A-03).
      out.maxHours = day.h_after + sleep.h_after;
    }
    // More weighted contact DURING the restriction than after it: restricting
    // then raises the dose. Usually a table filled the wrong way round
    // (audit 2026-10-15, second opinion, finding 2).
    const restrictionIncreases = num(out.fr) && num(out.fn) && out.fr - out.fn > EPS_F;

    // Warnings (B10)
    const prof = data.profiles[input.profile];
    const rp = input.radiopharmaceutical || '';
    if (prof) {
      if (prof.warn_unless && rp !== prof.warn_unless) out.warnings.push(prof.warning);
      if (prof.warn_if_prefix && rp.startsWith(prof.warn_if_prefix)) out.warnings.push(prof.warning);
      if (prof.warn_if_equals && rp === prof.warn_if_equals) out.warnings.push(prof.warning);
    }
    const spc = input.spc_min_restriction_d;
    if (num(spc) && spc > 0 && num(day.days) && num(sleep.days) && Math.min(day.days, sleep.days) < spc) {
      out.warnings.push('A restriction is shorter than the minimum of the product information (SmPC).');
    }
    if (restrictionIncreases) {
      out.warnings.push('Contact during the restriction is greater than after it (spatial factor × hours): restricting increases the dose. Check the cohabitation table.');
    }
    if (num(input.discharge_h) && num(input.fast_end_h) && input.fast_end_h > 0 && input.discharge_h >= input.fast_end_h) {
      out.warnings.push('Discharge after the end of the fast phase: the discharge rate must already be measured in the slow phase.');
    }
    // Cohabitation scenario and a category the application does not adopt for it
    // (children: public criterion at any age, a department decision — not the
    // Forum's Table 2): a warning, not a block; the manual criterion is never questioned
    const sc = (data.cohabitation_scenarios || []).find(s => s.key === input.scenario);
    const cat = data.categories.find(c => c.key === input.category);
    if (sc && cat && cat.key !== 'other' && !sc.categories_ok.includes(cat.key)) {
      const ok = sc.categories_ok.map(k => (data.categories.find(c => c.key === k) || {}).label).join(' or ');
      out.warnings.push(`Category «${cat.label}» is not the one adopted in this application for the scenario «${sc.label}» (${ok}): check the criterion.`);
    }

    if (general) { out.status = general; return out; }
    const k = kinetics(input);
    out.kinetics = k;
    const N = input.cycles;

    // Rows 56–57: integrals and dose per row per cycle
    for (const key of ['day', 'sleep']) {
      if (rowStatuses[key] || noDays) continue;
      const row = input.rows[key];
      const C = row.days * S_PER_D;
      const before = integralBefore(k, C), after = integralAfter(k, C);
      Object.assign(R[key], { C_s: C, before_Sv: before, after_Sv: after });
      if (out.maxHours <= 24) {
        R[key].dose_mSv = (before * row.h_during / 24 * R[key].fDuring + after * row.h_after / 24 * R[key].fAfter) * 1000;
      }
    }

    // B9: overall status
    const crit = out.criterion.value;
    if (rowStatuses.day) out.status = rowStatuses.day;
    else if (rowStatuses.sleep) out.status = rowStatuses.sleep;
    else if (out.maxHours > 24) out.status = 'Cohabitation exceeds 24 hours/day in some period';
    else if (noDays) {
      out.tableReady = true;
      out.status = !num(crit) || crit <= 0
        ? 'Restriction days not entered and a positive dose criterion is missing: enter the criterion to get the minimum and adopted restriction.'
        : 'Restriction days not entered: the minimum and adopted restriction do not depend on them. Enter the days, or use the adopted restriction, to get the dose of the table and the maximum rate.';
    } else {
      out.ready = out.tableReady = true;
      out.perCycle_mSv = R.day.dose_mSv + R.sleep.dose_mSv;
      out.treatment_mSv = out.perCycle_mSv * N;
      if (!num(crit) || crit <= 0) out.status = 'Dose calculated; a positive dose criterion is missing';
      else {
        out.margin_mSv = crit - out.treatment_mSv;
        out.status = out.treatment_mSv <= crit ? 'Within the applied criterion' : 'Exceeds the applied criterion';
      }
    }

    // Inverse calculations (rows 37–41, 58–61)
    const inv = out.inverse;
    if (out.ready && num(crit) && crit > 0 && out.treatment_mSv > 0) {
      inv.maxRate_uSv_h = input.rate_1m_uSv_h * crit / out.treatment_mSv;      // D37
    }
    const fr = out.fr, fn = out.fn;
    // Applying the SAME restriction to both rows puts both "during" schedules in
    // the same days. The table may be valid (e.g. a 0-day row whose "during"
    // hours never apply) while that common schedule is not: the workbook
    // (D58–D61, sheet Curva) does not check it and can recommend > 24 h/d.
    // The check applies only when a POSITIVE common restriction is actually
    // proposed: a 0-day solution never uses the "during" hours and stays valid
    // (audit 2026-10-14, N-07 — v1.9.1 rejected it).
    out.commonDuring_h = num(day.h_during) && num(sleep.h_during) ? day.h_during + sleep.h_during : null;
    out.commonFeasible = out.commonDuring_h !== null && out.commonDuring_h <= 24;
    if (out.tableReady && num(crit) && crit > 0 && num(fr) && num(fn)) {
      inv.ready = true;
      // Dose with an indefinite common restriction: only defined if that schedule
      // fits in a day. It is a FLOOR (lower bound) only when fr < fn; when fr > fn
      // it is the upper asymptote the dose grows towards (second opinion, finding 2).
      inv.floor_mSv = out.commonFeasible ? N * fr * k.Iinf * 1000 : null;       // D38
      inv.indefiniteKind = Math.abs(fn - fr) <= EPS_F ? 'equal' : fr < fn ? 'floor' : 'ceiling';
      const target = crit / 1000 / N;                                             // D59
      let t = null, code = null;
      if (Math.abs(fn - fr) <= EPS_F) {
        code = target >= fr * k.Iinf ? 'not_dependent' : 'unattainable';
      } else if (fn < fr) {
        // The dose is lowest with NO restriction (D(0) = N·fn·I∞) and grows with it.
        // The workbook answered "does not reduce the dose" even when 0 d met the
        // criterion; the answer is 0 d, or unattainable however short.
        if (target >= fn * k.Iinf) t = 0;
        else code = 'restriction_increases';
      } else if (target >= fn * k.Iinf) {
        t = 0;
      } else if (target <= fr * k.Iinf) {
        code = 'unattainable_reduce';
      } else {
        const phi = (target - fr * k.Iinf) / (fn - fr);                           // D60
        t = phi <= k.Itail
          ? k.tr + Math.log(k.Itail / phi) / k.ls
          : -Math.log((phi - k.Itail) * k.lf / k.A + Math.exp(-k.lf * k.tr)) / k.lf;
      }
      inv.minRestrictionCode = code;
      inv.minRestriction_d = t === null ? null : t / S_PER_D;                     // D39
      const spcN = num(spc) ? spc : 0;
      if (inv.minRestriction_d !== null) inv.adopted_d = Math.max(Math.ceil(inv.minRestriction_d), spcN);  // D40
      else if (code === 'not_dependent') inv.adopted_d = spcN;
      if (inv.adopted_d !== null) {
        // F40
        const short = (key) => {
          const row = input.rows[key], f = R[key];
          return row.h_during * f.fDuring !== row.h_after * f.fAfter && row.days < inv.adopted_d;
        };
        inv.adoptedNote = noDays ? 'Restriction days not entered in the cohabitation table'
          : short('day') || short('sleep')
            ? 'The cohabitation table uses fewer days than the adopted restriction'
            : 'The cohabitation table covers the adopted restriction';
        inv.doseAtAdopted_mSv = doseWithRestriction(N, fr, fn, k, inv.adopted_d * S_PER_D);  // D41
        // A product-information minimum can push the adopted restriction past the
        // criterion when restricting raises the dose (fr > fn): say so.
        if (inv.doseAtAdopted_mSv > crit * (1 + 1e-12)) {
          inv.adoptedNote += ' — with this restriction the treatment dose EXCEEDS the criterion';
        }
      }
      if (!out.commonFeasible && !(inv.adopted_d === 0)) {
        // a positive (or no) common restriction would need > 24 h/d during it
        Object.assign(inv, { minRestrictionCode: 'infeasible_common', minRestriction_d: null, adopted_d: null,
          adoptedNote: '', doseAtAdopted_mSv: null });
      }
    }
    return out;
  }

  const INVERSE_TEXT = {
    not_dependent: 'Does not depend on the restriction: criterion met',
    unattainable: 'Unattainable: reduce contact',
    restriction_increases: 'Unattainable: with more contact during the restriction than after it, any restriction increases the dose — reduce contact',
    unattainable_reduce: 'Unattainable: reduce contact during the restriction',
    infeasible_common: 'Not applicable: with the same restriction in both rows the hours during the restriction exceed 24 h/day',
  };

  /** Sheet Curva: treatment dose vs restriction (same restriction in both rows). */
  function curve(input, data = _data, days = (data || {}).curve_days) {
    const out = evaluate(input, data);
    // Only for accepted inputs and a feasible common schedule (the workbook's
    // Curva only requires D45 and fr/fn, and plots rejected cases)
    if (!out.tableReady || !out.commonFeasible || !num(out.fr) || !num(out.fn)) return { points: [], out };
    const N = input.cycles;
    return {
      points: days.map(d => ({ days: d, dose_mSv: doseWithRestriction(N, out.fr, out.fn, out.kinetics, d * S_PER_D) })),
      out,
    };
  }

  // ---------------------------------------------------------------------------
  // Self-check (sheet Comprobación) — independent formulation in µSv and h
  // ---------------------------------------------------------------------------

  /** P–U columns of Comprobación: hour/µSv formulation, independent of kinetics(). */
  function hourModel(rate, dischargeH, fastEndH, TfH, TsH) {
    const tr = Math.max(0, fastEndH - dischargeH);
    const ls = LN2 / TsH;
    const lf = tr > 0 ? LN2 / TfH : ls;
    const S = rate * Math.exp(-lf * tr) / ls;
    const T = rate * (1 - Math.exp(-lf * tr)) / lf + S;
    const U = Ch => (Ch < tr ? rate * (Math.exp(-lf * Ch) - Math.exp(-lf * tr)) / lf + S : S * Math.exp(-ls * (Ch - tr)));
    return { tr, lf, ls, S, T, U };
  }

  function selfCheck(input, data = _data) {
    const items = [];
    const out = evaluate(input, data);
    const crit = out.criterion.value;
    // A. Current inputs (D13–D21); without restriction days only the inverse one
    if (out.tableReady) {
      const m = hourModel(input.rate_1m_uSv_h, input.discharge_h, input.fast_end_h, input.T_fast_h, input.T_slow_h);
      const rowDose = key => {
        const row = input.rows[key], f = out.rows[key], Ch = row.days * 24;
        return row.h_during / 24 * f.fDuring * (m.T - m.U(Ch)) + row.h_after / 24 * f.fAfter * m.U(Ch);
      };
      const indep = out.ready ? (rowDose('day') + rowDose('sleep')) / 1000 : null;
      if (out.ready) items.push({ label: 'Direct calculation (dose per cycle)', ok: Math.abs(indep - out.perCycle_mSv) <= 1e-9 * Math.max(1, Math.abs(indep)) });
      const inv = out.inverse;
      // Every answer of the inverse calculation is checked with the hour model,
      // not only a positive solution (audit 2026-10-22, A-02): D(C) = N·[fr·T + (fn − fr)·U(C)]
      if (inv.ready && num(out.fr) && num(out.fn)) {
        const N = input.cycles, D0 = N * out.fn * m.T / 1000, Dinf = N * out.fr * m.T / 1000;
        const le = (a, b) => a <= b * (1 + 1e-9), gt = (a, b) => a > b * (1 - 1e-9);
        let ok = null;
        if (num(inv.minRestriction_d) && inv.minRestriction_d > 0) {
          const d = N * (out.fr * m.T + (out.fn - out.fr) * m.U(inv.minRestriction_d * 24)) / 1000;
          ok = Math.abs(d - crit) <= 1e-6 * crit;
        } else if (inv.minRestriction_d === 0) ok = le(D0, crit);                       // no restriction already meets it
        else if (inv.minRestrictionCode === 'not_dependent') ok = le(Dinf, crit) && le(D0, crit);
        else if (inv.minRestrictionCode === 'unattainable') ok = gt(Dinf, crit) && gt(D0, crit);
        else if (inv.minRestrictionCode === 'unattainable_reduce') ok = out.fr < out.fn && le(crit, Dinf);
        else if (inv.minRestrictionCode === 'restriction_increases') ok = out.fr > out.fn && gt(D0, crit);
        if (ok !== null) items.push({ label: 'Inverse calculation: minimum restriction', ok });
      }
      if (num(inv.maxRate_uSv_h) && num(indep) && indep > 0) {
        items.push({ label: 'Inverse calculation: maximum rate', ok: Math.abs(inv.maxRate_uSv_h * indep / input.rate_1m_uSv_h * input.cycles - crit) <= 1e-6 * crit });
      }
    }
    // B. Reference cases of workbook v6 (rows 25–33)
    const rc = data.reference_cases;
    const caseDose = c => {
      const m = hourModel(c.rate, c.discharge_h, 24, c.T_fast_h, c.T_slow_h);
      return 6 * (c.fr * m.T + (c.fn - c.fr) * m.U(c.days * 24)) / 1000;
    };
    rc.cases.forEach(c => {
      const v = caseDose(c);
      let ok;
      if (num(c.expected_mSv)) ok = Math.abs(v - c.expected_mSv) <= c.tol + 1e-9;
      else if (num(c.expected_gt_mSv)) ok = v > c.expected_gt_mSv;
      else ok = v < c.expected_lt_mSv;
      items.push({ label: c.label, ok, value: v, reference: true });
    });
    const mr = rc.max_rate_case;
    const base = rc.cases[mr.from_case];
    const maxRate = base.rate * mr.criterion_mSv / caseDose(base);
    items.push({ label: mr.label, ok: Math.abs(maxRate - mr.expected_uSv_h) <= mr.tol + 1e-9, value: maxRate, reference: true });
    // The reference cases verify the formulas; they say nothing about rejected
    // current inputs, which are reported as "not checked", never as OK.
    const current = items.filter(i => !i.reference);
    const referencesOk = items.filter(i => i.reference).every(i => i.ok);
    // No check of the current case is "not checked", never OK ([].every() is true)
    const currentOk = out.tableReady && current.length ? current.every(i => i.ok) : null;
    return { ok: referencesOk && currentOk === true, referencesOk, currentOk, items };
  }

  /** Default input in the shape evaluate() takes (deep copy of the data file defaults). */
  function defaultInput(data = _data) {
    return JSON.parse(JSON.stringify(data.defaults));
  }

  return {
    load, getData, setData, evaluate, curve, selfCheck, defaultInput, profilePoints,
    INVERSE_TEXT,
    // exposed for the test suite
    _internal: { kinetics, integralBefore, integralAfter, spatialFactor, maxHoursPerDay, hourModel },
  };
})();
