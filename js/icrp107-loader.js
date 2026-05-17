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

  function titleElement(symbol) {
    if (!symbol) return '';
    return symbol.slice(0, 1).toUpperCase() + symbol.slice(1).toLowerCase();
  }

  /**
   * Normalize nuclide names
   * "Lu177" → "Lu-177"
   * "177Lu" → "Lu-177" (if supported; for now just add dash)
   */
  function normalize(name) {
    if (!name) return '';
    const clean = String(name).trim().replace(/\s+/g, '');

    // Already normalized (e.g., "Lu-177")
    const normalized = clean.match(/^([A-Za-z]{1,2})-(\d+[A-Za-z]?)$/);
    if (normalized) return `${titleElement(normalized[1])}-${normalized[2]}`;

    // "Lu177" → "Lu-177"
    const match1 = clean.match(/^([A-Za-z]{1,2})(\d+[A-Za-z]?)$/);
    if (match1) return `${titleElement(match1[1])}-${match1[2]}`;

    // "177Lu" -> "Lu-177", "99mTc" -> "Tc-99m"
    const match2 = clean.match(/^(\d+)([A-Za-z]+)$/);
    if (match2) {
      let mass = match2[1];
      let suffix = match2[2];
      if (suffix.length > 2 && suffix[0] === suffix[0].toLowerCase()) {
        mass += suffix[0].toLowerCase();
        suffix = suffix.slice(1);
      }
      return `${titleElement(suffix)}-${mass}`;
    }

    return clean;
  }

  /**
   * Search for nuclides by ID or name (case-insensitive substring)
   */
  function search(query) {
    if (!indexData) {
      console.error('ICRP 107 data not yet loaded. Call ICRP107.search after page load or use async.');
      return [];
    }

    if (!query) return [];

    const q = String(query).trim().toLowerCase();
    const normalizedQ = normalize(query).toLowerCase();
    const results = [];
    const exact = indexMap.get(normalize(query));
    if (exact) results.push(exact);

    for (const nuclide of indexData.nuclides) {
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
  function calcConstants(id) {
    const nuclide = get(id);
    if (!nuclide || !nuclide.photons || nuclide.photons.length === 0) {
      return null;
    }

    // Check if PHYSICS module is available (from data.js)
    if (typeof PHYSICS === 'undefined' || !PHYSICS.calcGammaConstants) {
      console.warn('PHYSICS module not available. Cannot calculate gamma constants.');
      return null;
    }

    try {
      // PHYSICS.calcGammaConstants expects [{energy_keV, yield_percent, type}]
      const result = PHYSICS.calcGammaConstants(nuclide.photons);

      // Calculate max photon energy for H'(0.07) assessment
      let maxPhotonEnergy = null;
      if (nuclide.photons && nuclide.photons.length > 0) {
        maxPhotonEnergy = Math.max(...nuclide.photons.map(p => p.energy_keV));
      }

      return {
        ...result,
        max_photon_energy_keV: maxPhotonEnergy,
        source: 'ICRP 107',
        method: 'calculated_from_photon_emissions',
        nuclide_id: nuclide.id,
      };
    } catch (err) {
      console.error(`Failed to calculate constants for ${id}:`, err);
      return null;
    }
  }

  /**
   * Calculate liquid effluent limit from ingestion dose coefficient
   * Formula: C_liq [Bq/L] = (1 mSv/year) / (dose_coeff [Sv/Bq] × 600 L/year)
   *                        = 0.001 / (dose_coeff × 600)
   *                        = 1.667e-6 / dose_coeff
   */
  function calcEffluentLimit(id) {
    const nuclide = get(id);
    if (!nuclide) return null;

    const doseCoeff = nuclide.dose_ingestion_Sv_per_Bq;
    if (!doseCoeff || doseCoeff <= 0) {
      return null; // No coefficient available (e.g., noble gases)
    }

    const limit = 0.001 / (doseCoeff * 600);
    return Math.round(limit * 10) / 10; // Round to 1 decimal place
  }

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
    calcEffluentLimit,
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
