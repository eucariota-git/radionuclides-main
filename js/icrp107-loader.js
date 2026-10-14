/**
 * ICRP 107 Extended Nuclide Database Loader
 *
 * Provides search and access to the extended ICRP 107 nuclide database (1252 nuclides).
 * Only the filtered photons (G/X/AQ, E>=20keV, yield>=0.01%) are loaded.
 *
 * API:
 *   ICRP107.search(query)      - Search by ID or normalized name
 *   ICRP107.get(id)            - Get full nuclide data
 *   ICRP107.calcConstants(id)  - Calculate gamma dose constants from photons
 *   ICRP107.normalize(name)    - Normalize name ("Lu177" → "Lu-177")
 *   ICRP107.isReady()          - Check if data is loaded
 */

const ICRP107 = (function() {
  let indexData = null;
  let indexMap = new Map(); // For faster lookups

  /**
   * Load the index on first use
   */
  async function ensureLoaded() {
    if (indexData) return;

    try {
      if (typeof ICRP107_DATA !== 'undefined') {
        indexData = ICRP107_DATA;
      } else {
        const response = await fetch('data/icrp107-index.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        indexData = await response.json();
      }
      buildIndex();
    } catch (err) {
      console.error('Failed to load ICRP 107 index:', err);
      throw err;
    }
  }

  function buildIndex() {
    indexMap = new Map();
    for (const nuclide of indexData.nuclides) {
      indexMap.set(nuclide.id, nuclide);
      indexMap.set(normalize(nuclide.id), nuclide);
    }
  }

  /**
   * Normalize nuclide names
   * "Lu177" → "Lu-177"
   * "177Lu" → "Lu-177"
   */
  function normalize(name) {
    return NUCLIDE_ID.normalize(name);
  }

  /**
   * Search for nuclides by ID or name (case-insensitive substring)
   * @param {string} query - search string
   * @param {number} limit - max results to return (default 50)
   */
  function search(query, limit = 50) {
    if (!indexData) {
      console.error('ICRP 107 data not yet loaded. Call ICRP107.search after page load or use async.');
      return [];
    }

    if (!query) return [];

    const q = String(query).trim().toLowerCase();
    if (q.length < 2) return []; // Require at least 2 characters to avoid huge result sets

    const normalizedQ = normalize(query).toLowerCase();
    const results = [];
    const exact = indexMap.get(normalize(query));
    if (exact && results.length < limit) results.push(exact);

    for (const nuclide of indexData.nuclides) {
      if (results.length >= limit) break;
      if (results.includes(nuclide)) continue;
      const normalizedId = normalize(nuclide.id).toLowerCase();
      if (nuclide.id.toLowerCase().includes(q) ||
          normalizedId.includes(normalizedQ) ||
          nuclide.half_life_display.toLowerCase().includes(q)) {
        results.push(nuclide);
      }
    }

    return results;
  }

  /**
   * Get a single nuclide by ID (exact match)
   */
  function get(id) {
    if (!indexData) {
      console.error('ICRP 107 data not yet loaded.');
      return null;
    }

    const normalized = normalize(id);
    return indexMap.get(id) || indexMap.get(normalized) || null;
  }

  /**
   * Calculate gamma dose constants from photon emissions
   * Uses PHYSICS.calcGammaConstants() if available
   */
  function calcConstants(id, opts = {}) {
    const nuclide = get(id);
    if (!nuclide) return null;
    // opts.progeny: include the equilibrium progeny (see progeny()).
    const photons = opts.progeny ? photonsWithProgeny(id) : (nuclide.photons || []);
    if (photons.length === 0) return null;

    // Check if PHYSICS module is available (from data.js)
    if (typeof PHYSICS === 'undefined' || !PHYSICS.calcGammaConstants) {
      console.warn('PHYSICS module not available. Cannot calculate gamma constants.');
      return null;
    }

    try {
      // PHYSICS.calcGammaConstants expects [{energy_keV, yield_percent, type}]
      const result = PHYSICS.calcGammaConstants(photons);
      if (!result.contributions.length) return null;

      // Calculate max photon energy for H'(0.07) assessment
      const maxPhotonEnergy = Math.max(...result.contributions.map(c => c.energy_keV));

      return {
        ...result,
        max_photon_energy_keV: maxPhotonEnergy,
        source: 'ICRP 107',
        method: 'calculated_from_photon_emissions',
        nuclide_id: nuclide.id,
        photons,
        progeny: opts.progeny ? progeny(id) : [],
      };
    } catch (err) {
      console.error(`Failed to calculate constants for ${id}:`, err);
      return null;
    }
  }

  /**
   * Short-lived progeny that grows into equilibrium with the parent (audit
   * 2026-10-14 v1.11, R-01). The extended entries used to give Γ from the
   * parent's lines only, so Ge-68 and Sr-82 (generator parents, all their dose
   * from Ga-68/Rb-82) showed no photon dose at all and Sn-113 a third of it.
   *
   * Rule (an app criterion, not a regulatory one): follow the NDX daughters
   * recursively and keep every descendant whose half-life is at most 1/10 of the
   * CHAIN PARENT's (so equilibrium is reached and stays) and at most 30 d (so it
   * is reached within about a year — Th-230 would otherwise take in Ra-226 and
   * its 16 000-year ingrowth). A descendant that fails the rule ends its branch:
   * Ra-226 keeps Rn-222…Po-214 but not Pb-210. The
   * equilibrium activity per unit parent activity is the asymptotic Bateman
   * ratio Π bᵢ·λᵢ/(λᵢ − λ₁) — 1 for secular equilibrium, > 1 for transient
   * (Mo-99 → Tc-99m: 0.8773 × 1.100 = 0.965, the value of the curated entry).
   * Stable daughters and daughters absent from the index are skipped.
   * @returns {Array<{id, fraction, half_life_s}>} progeny only (parent excluded)
   */
  const MAX_PROGENY_HALF_LIFE_S = 30 * 86400;
  function progeny(id) {
    const parent = get(id);
    if (!parent || !(parent.half_life_s > 0) || !Number.isFinite(parent.half_life_s)) return [];
    const lp = Math.LN2 / parent.half_life_s;
    const out = new Map();
    (function walk(n, factor, depth) {
      if (depth > 12) return;
      for (const dm of n.decay_modes || []) {
        const d = dm.daughter ? get(dm.daughter) : null;
        if (!d || !(d.half_life_s > 0) || d.half_life_s > parent.half_life_s / 10 || d.half_life_s > MAX_PROGENY_HALF_LIFE_S) continue;
        const ld = Math.LN2 / d.half_life_s;
        const f = factor * dm.branching * ld / (ld - lp);
        const prev = out.get(d.id);
        out.set(d.id, { id: d.id, fraction: (prev ? prev.fraction : 0) + f, half_life_s: d.half_life_s });
        walk(d, f, depth + 1);
      }
    })(parent, 1, 0);
    return [...out.values()];
  }

  /**
   * Photon list of the parent plus its equilibrium progeny, each daughter's
   * yields scaled by its activity fraction (same rule as the curated chains).
   */
  function photonsWithProgeny(id) {
    const parent = get(id);
    if (!parent) return [];
    const lines = (parent.photons || []).map(p => ({ ...p, from: parent.id }));
    for (const m of progeny(id)) {
      for (const p of (get(m.id).photons || [])) {
        lines.push({ ...p, yield_percent: p.yield_percent * m.fraction, from: m.id });
      }
    }
    return lines.sort((a, b) => a.energy_keV - b.energy_keV);
  }

  // Liquid-effluent levels are no longer derived here: the ICRP 107 index has
  // no dose coefficients (dose_ingestion_Sv_per_Bq is null for every entry), and
  // the old helper rounded to one decimal. Use REGULATORY.dischargeLevel (js/
  // regulatory.js), which takes e(g) from RD 783/2001 Annex III table a)
  // (audit 2026-10-03).

  /**
   * Check if data is loaded
   */
  function isReady() {
    return indexData !== null;
  }

  /**
   * Public API
   */
  return {
    search,
    get,
    normalize,
    calcConstants,
    progeny,
    photonsWithProgeny,
    isReady,
    // For testing:
    _ensureLoaded: ensureLoaded,
  };
})();

// Auto-load on page ready (only if we're in a browser with document)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ICRP107._ensureLoaded().catch(console.error));
  } else {
    ICRP107._ensureLoaded().catch(console.error);
  }
}
