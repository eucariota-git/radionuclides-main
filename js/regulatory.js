/**
 * regulatory.js — Spanish regulatory reference values (no DOM)
 *
 *   REGULATORY.clearanceA1(id)    RD 1217/2024 Annex IV Table A1 (kBq/kg)
 *   REGULATORY.exemptionB(id)     RD 1217/2024 Annex IV Table B (kBq/kg, Bq)
 *   REGULATORY.ingestionAdult(id) e(g) adult public — RD 783/2001 Annex III
 *                                 table a), kept by the CSN Resolution of
 *                                 3 April 2024 (transcription: ICRP 119 F.1)
 *   REGULATORY.dischargeLevel(id) IS-28 Annex II II.A.4 individual level,
 *                                 C = 1 mSv / (e(g) · 600 L)
 *
 * Every lookup returns an explicit status, so "the nuclide is not in the table"
 * is never confused with "the app has no data" (audit 2026-10-03, finding 2).
 * Composite curated entries resolve to their parent ('Mo-99+Tc-99m' → 'Mo-99'),
 * so a value never depends on which entry was selected (finding 3).
 *
 * Data: data/regulatory.json, loaded by fetch with the embedded
 * REGULATORY_DATA twin as fallback (file:// and offline), as DB.load().
 */

'use strict';

const REGULATORY = (() => {

  let _data = null;

  // Members of the natural U-238 and Th-232 decay series, and K-40 (Table A2).
  const NATURAL = new Set([
    'U-238', 'Th-234', 'Pa-234m', 'U-234', 'Th-230', 'Ra-226', 'Rn-222', 'Po-218', 'Pb-214', 'Bi-214', 'Po-214',
    'Pb-210', 'Bi-210', 'Po-210',
    'Th-232', 'Ra-228', 'Ac-228', 'Th-228', 'Ra-224', 'Rn-220', 'Po-216', 'Pb-212', 'Bi-212', 'Po-212', 'Tl-208',
    'K-40',
  ]);

  function isValid(d) {
    return !!(d && d.rd1217_annex4 && Array.isArray(d.rd1217_annex4.a1) && d.rd1217_annex4.a1.length &&
      Array.isArray(d.rd1217_annex4.b) && d.ingestion_public_adult && Array.isArray(d.ingestion_public_adult.rows));
  }

  /** Synchronous init from the embedded copy (always loaded by the pages). */
  function _initEmbedded() {
    if (!_data && typeof REGULATORY_DATA !== 'undefined' && isValid(REGULATORY_DATA)) _data = REGULATORY_DATA;
    return _data;
  }

  async function load() {
    const embedded = _initEmbedded();
    try {
      const resp = await fetch('data/regulatory.json');
      if (resp.ok) {
        const candidate = await resp.json();
        if (isValid(candidate) && (!embedded || JSON.stringify(candidate) === JSON.stringify(embedded))) _data = candidate;
        else console.warn('Fetched regulatory data is invalid or differs from the embedded copy; using the embedded copy.');
      }
    } catch (e) {
      // file:// or offline — embedded copy
    }
    if (!_data) throw new Error('No valid regulatory data available. Ensure regulatory-data.js is present.');
    return _data;
  }

  function data() {
    const d = _data || _initEmbedded();
    if (!d) throw new Error('Regulatory data not loaded');
    return d;
  }

  /** 'Mo-99+Tc-99m' → 'Mo-99'; trims whitespace. */
  function parentId(id) {
    return String(id || '').trim().split('+')[0].trim();
  }

  function rowsWithText(rows, noteKey) {
    const a4 = data().rd1217_annex4;
    return rows.map(r => Object.assign({}, r, {
      note_text: r.note_text || (r.note === noteKey ? a4[`note_${noteKey}`] : null),
    }));
  }

  /**
   * @returns {{status:'listed', id, rows:Array, natural:boolean} |
   *           {status:'not_tabulated', id, text:string, natural:boolean, natural_text:string|null}}
   *   rows: [{id, note, kBq_kg, progeny[], note_text, source_inconsistency?}]
   */
  function clearanceA1(id) {
    const pid = parentId(id);
    const a4 = data().rd1217_annex4;
    const rows = a4.a1.filter(r => r.id === pid);
    const natural = NATURAL.has(pid);
    if (rows.length) return { status: 'listed', id: pid, rows: rowsWithText(rows, 'a'), natural };
    return { status: 'not_tabulated', id: pid, text: a4.not_tabulated_a1, natural,
             natural_text: natural ? a4.natural_note : null };
  }

  /**
   * @returns {{status:'listed', id, rows:Array} | {status:'not_tabulated', id, text}}
   *   rows: [{id, note, conc_kBq_kg (column 2), activity_Bq (column 3), progeny[], note_text}]
   *   A nuclide can have two rows (U-240, with and without (b)).
   */
  function exemptionB(id) {
    const pid = parentId(id);
    const a4 = data().rd1217_annex4;
    const rows = a4.b.filter(r => r.id === pid);
    if (rows.length) return { status: 'listed', id: pid, rows: rowsWithText(rows, 'b') };
    return { status: 'not_tabulated', id: pid, text: a4.not_tabulated_b };
  }

  /**
   * @returns {{status:'listed', id, rows:Array, governing:object} | {status:'not_tabulated', id}}
   *   rows: [{id, f1, e_Sv_per_Bq, compound}]; governing = largest e(g).
   */
  function ingestionAdult(id) {
    const pid = parentId(id);
    const rows = data().ingestion_public_adult.rows.filter(r => r.id === pid);
    if (!rows.length) return { status: 'not_tabulated', id: pid };
    const governing = rows.reduce((a, r) => (r.e_Sv_per_Bq > a.e_Sv_per_Bq ? r : a), rows[0]);
    return { status: 'listed', id: pid, rows, governing };
  }

  /**
   * IS-28 Annex II II.A.4 individual concentration level for one nuclide:
   *   C [Bq/m³] = 1e-3 Sv / (e(g) [Sv/Bq] × 0.600 m³);  Bq/L = C / 1000.
   * Unrounded; display with 3 significant figures. One of the THREE numeric
   * conditions of II.A.4 (the sum of fractions and the annual activity limits
   * are evaluated separately).
   * @returns {null | {Bq_per_L:number, e_Sv_per_Bq:number, compound:string|null, alternatives:number}}
   */
  function dischargeLevel(id) {
    const ing = ingestionAdult(id);
    if (ing.status !== 'listed') return null;
    const e = ing.governing.e_Sv_per_Bq;
    return {
      Bq_per_L: 1e-3 / (e * 0.600) / 1000,
      e_Sv_per_Bq: e,
      compound: ing.governing.compound,
      alternatives: ing.rows.length,
    };
  }

  function sources() {
    const d = data();
    return { annex4: d.rd1217_annex4.source, ingestion: d.ingestion_public_adult.source,
             criteria: d.rd1217_annex4.criteria, governing_rule: d.ingestion_public_adult.governing_rule };
  }

  return { load, parentId, clearanceA1, exemptionB, ingestionAdult, dischargeLevel, sources, isValid };

})();
