/**
 * ICRP 107 Extended Nuclide Database Loader
 *
 * Provides search and access to the extended ICRP 107 nuclide database (1251 nuclides).
 * Only the filtered photons (G/X rays, E≥20keV, yield≥0.01%) are loaded.
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
      const response = await fetch('data/icrp107-index.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      indexData = await response.json();

      // Build lookup map by ID (exact) and by normalized ID
      for (const nuclide of indexData.nuclides) {
        indexMap.set(nuclide.id, nuclide);
        const normalized = normalize(nuclide.id);
        if (normalized !== nuclide.id) {
          indexMap.set(normalized, nuclide);
        }
      }
    } catch (err) {
      console.error('Failed to load ICRP 107 index:', err);
      throw err;
    }
  }

  /**
   * Normalize nuclide names
   * "Lu177" → "Lu-177"
   * "177Lu" → "Lu-177" (if supported; for now just add dash)
   */
  function normalize(name) {
    if (!name) return '';

    // Already normalized (e.g., "Lu-177")
    if (/^[A-Z][a-z]?-\d+/.test(name)) return name;

    // "Lu177" → "Lu-177"
    const match1 = name.match(/^([A-Z][a-z]?)(\d+[a-z]?)$/);
    if (match1) return match1[1] + '-' + match1[2];

    // "177Lu" → "Lu-177" (element at end)
    const match2 = name.match(/^(\d+[a-z]?)([A-Z][a-z]?)$/i);
    if (match2) return match2[2] + '-' + match2[1];

    return name;
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

    const q = query.toLowerCase();
    const results = [];

    for (const nuclide of indexData.nuclides) {
      if (nuclide.id.toLowerCase().includes(q) ||
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
      return {
        ...result,
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
