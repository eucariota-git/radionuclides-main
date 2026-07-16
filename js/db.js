/**
 * db.js — Nuclide database loader and search helpers
 *
 * Uses NUCLIDE_DATA global (from data/nuclides-data.js) as primary source.
 * Optionally tries fetch('data/nuclides.json') to pick up edits made to the
 * JSON file when served from an HTTP server. Falls back silently to NUCLIDE_DATA
 * (works with file:// protocol and offline use).
 */

'use strict';

const DB = (() => {

  let _nuclides = [];
  let _meta     = {};

  // Spanish names for search
  const ES_NAMES = {
    'C-11':          'carbono',
    'N-13':          'nitrógeno nitrogeno',
    'O-15':          'oxígeno oxigeno',
    'F-18':          'flúor fluor',
    'Na-24':         'sodio',
    'K-42':          'potasio',
    'Cr-51':         'cromo',
    'Co-57':         'cobalto',
    'Co-58':         'cobalto',
    'Fe-59':         'hierro',
    'Co-60':         'cobalto',
    'Cu-64':         'cobre',
    'Ga-67':         'galio',
    'Ga-68':         'galio',
    'Se-75':         'selenio',
    'Tc-99m':        'tecnecio',
    'Mo-99+Tc-99m':  'molibdeno tecnecio',
    'Pd-103':        'paladio',
    'In-111':        'indio',
    'I-123':         'yodo',
    'I-125':         'yodo',
    'I-131':         'yodo',
    'Xe-133':        'xenón xenon',
    'Cs-137':        'cesio',
    'Sm-153':        'samario',
    'Yb-169':        'iterbio',
    'Tm-170':        'tulio',
    'Lu-177':        'lutecio',
    'Re-186':        'renio',
    'Re-188':        'renio',
    'Ir-192':        'iridio',
    'Au-198':        'oro',
    'Tl-201':        'talio',
    'Y-90':          'itrio',
    'Zr-89':         'circonio zirconio',
    'Cu-67':         'cobre',
    'Tb-161':        'terbio',
    'Ho-166':        'holmio',
    'Ra-223':        'radio xofigo',
    'Ac-225':        'actinio',
  };

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  function isValidData(data) {
    if (!data || typeof data !== 'object' || !data.version ||
        !Array.isArray(data.nuclides) || data.nuclides.length === 0) return false;

    const ids = new Set();
    return data.nuclides.every(n => {
      if (!n || typeof n !== 'object' || typeof n.id !== 'string' || !n.id ||
          typeof n.name !== 'string' || typeof n.symbol !== 'string' ||
          !Number.isFinite(n.half_life_s) || n.half_life_s <= 0 ||
          !Object.prototype.hasOwnProperty.call(n, 'gamma_H10') || ids.has(n.id)) return false;
      ids.add(n.id);
      return true;
    });
  }

  function sameData(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  async function load() {
    let data = null;
    const embeddedRaw = typeof NUCLIDE_DATA !== 'undefined' ? NUCLIDE_DATA : null;
    const embedded = isValidData(embeddedRaw) ? embeddedRaw : null;

    if (embeddedRaw && !embedded) {
      console.warn('Embedded nuclide database is invalid; trying JSON source.');
    }

    // 1. Try fetch (works on local or remote HTTP servers)
    try {
      const resp = await fetch('data/nuclides.json');
      if (resp.ok) {
        const candidate = await resp.json();
        if (!isValidData(candidate)) {
          console.warn('Fetched nuclide database is empty or structurally invalid; using embedded fallback.');
        } else if (embedded && !sameData(candidate, embedded)) {
          console.warn('Fetched and embedded nuclide databases differ; using the coherent embedded fallback.');
        } else {
          data = candidate;
        }
      }
    } catch (e) {
      // fetch not available (file:// protocol, offline, etc.) — use built-in data
    }

    // 2. Fall back to built-in NUCLIDE_DATA (loaded via <script> tag)
    if (!data) {
      if (embedded) {
        data = embedded;
      } else {
        throw new Error('No valid nuclide data source available. Ensure nuclides-data.js is present and synchronized.');
      }
    }

    _meta     = { version: data.version, reference: data.reference, notes: data.notes };
    // Presentation order is independent of append order in the source JSON.
    // Array.prototype.sort is stable, so entries with the same mass number keep
    // their curated relative order (e.g. Tc-99m / Mo-99+Tc-99m).
    _nuclides = (data.nuclides || []).slice().sort((a, b) =>
      (Number.isFinite(a.A) ? a.A : Infinity) - (Number.isFinite(b.A) ? b.A : Infinity)
    );

    return _nuclides;
  }

  // ---------------------------------------------------------------------------
  // Query
  // ---------------------------------------------------------------------------

  function getAll() { return _nuclides; }
  function getMeta() { return _meta; }

  function getById(id) {
    const normalized = NUCLIDE_ID.normalize(id);
    return _nuclides.find(n => n.id === normalized) || null;
  }

  /**
   * Search by query string — matches id, name, symbol, clinical_use, and Spanish names (case-insensitive).
   */
  function search(query) {
    if (!query || query.trim() === '') return _nuclides;
    const q = query.trim().toLowerCase();
    return _nuclides.filter(n => {
      const nameEs = (ES_NAMES[n.id] || '').toLowerCase();
      return n.id.toLowerCase().includes(q)       ||
             n.name.toLowerCase().includes(q)     ||
             n.symbol.toLowerCase().includes(q)   ||
             nameEs.includes(q)                   ||
             (n.clinical_use || '').toLowerCase().includes(q);
    });
  }

  /**
   * Filter by modality / category.
   */
  function filter({ modality = 'all', category = 'all' } = {}) {
    return _nuclides.filter(n => {
      const mMatch = modality === 'all' || n.modality === modality;
      const cMatch = category === 'all' || n.category === category || n.category === 'both';
      return mMatch && cMatch;
    });
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /** Half-life in hours (for dose/decay calculators) */
  function halfLifeHours(nuclide) {
    return nuclide.half_life_s / 3600;
  }

  return {
    load,
    getAll,
    getMeta,
    getById,
    search,
    filter,
    halfLifeHours,
  };

})();
