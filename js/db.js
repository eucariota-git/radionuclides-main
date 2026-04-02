/**
 * db.js — Nuclide database loader and search helpers
 *
 * Uses NUCLIDE_DATA global (from data/nuclides-data.js) as primary source.
 * Optionally tries fetch('data/nuclides.json') to pick up edits made to the
 * JSON file when served from an HTTP server. Falls back silently to NUCLIDE_DATA
 * (works with file:// protocol and offline use).
 *
 * Custom nuclides added via the Custom page are persisted in sessionStorage
 * and merged at load time.
 */

'use strict';

const DB = (() => {

  let _nuclides = [];
  let _meta     = {};

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  async function load() {
    let data = null;

    // 1. Try fetch (works on HTTP servers and GitHub Pages)
    try {
      const resp = await fetch('data/nuclides.json');
      if (resp.ok) data = await resp.json();
    } catch (e) {
      // fetch not available (file:// protocol, offline, etc.) — use built-in data
    }

    // 2. Fall back to built-in NUCLIDE_DATA (loaded via <script> tag)
    if (!data) {
      if (typeof NUCLIDE_DATA !== 'undefined') {
        data = NUCLIDE_DATA;
      } else {
        throw new Error('No nuclide data source available. Ensure nuclides-data.js is loaded.');
      }
    }

    _meta     = { version: data.version, reference: data.reference, notes: data.notes };
    _nuclides = (data.nuclides || []).slice();

    // 3. Merge custom nuclides from sessionStorage
    const customRaw = sessionStorage.getItem('custom_nuclides');
    if (customRaw) {
      try {
        const custom = JSON.parse(customRaw);
        for (const cn of custom) {
          cn._custom = true;
          const idx = _nuclides.findIndex(n => n.id === cn.id);
          if (idx >= 0) _nuclides[idx] = cn;
          else _nuclides.push(cn);
        }
      } catch (e) { /* ignore corrupt storage */ }
    }

    return _nuclides;
  }

  // ---------------------------------------------------------------------------
  // Query
  // ---------------------------------------------------------------------------

  function getAll() { return _nuclides; }
  function getMeta() { return _meta; }

  function getById(id) {
    return _nuclides.find(n => n.id === id) || null;
  }

  /**
   * Search by query string — matches id, name, symbol, clinical_use (case-insensitive).
   */
  function search(query) {
    if (!query || query.trim() === '') return _nuclides;
    const q = query.trim().toLowerCase();
    return _nuclides.filter(n =>
      n.id.toLowerCase().includes(q)       ||
      n.name.toLowerCase().includes(q)     ||
      n.symbol.toLowerCase().includes(q)   ||
      (n.clinical_use || '').toLowerCase().includes(q)
    );
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
  // Custom nuclide management (sessionStorage)
  // ---------------------------------------------------------------------------

  function addCustomNuclide(nuclide) {
    nuclide._custom = true;
    const existing = JSON.parse(sessionStorage.getItem('custom_nuclides') || '[]');
    const idx = existing.findIndex(n => n.id === nuclide.id);
    if (idx >= 0) existing[idx] = nuclide;
    else existing.push(nuclide);
    sessionStorage.setItem('custom_nuclides', JSON.stringify(existing));

    const liveIdx = _nuclides.findIndex(n => n.id === nuclide.id);
    if (liveIdx >= 0) _nuclides[liveIdx] = nuclide;
    else _nuclides.push(nuclide);
  }

  function removeCustomNuclide(id) {
    const existing = JSON.parse(sessionStorage.getItem('custom_nuclides') || '[]');
    sessionStorage.setItem('custom_nuclides', JSON.stringify(existing.filter(n => n.id !== id)));
    _nuclides = _nuclides.filter(n => n.id !== id);
  }

  function getCustomNuclides() {
    return _nuclides.filter(n => n._custom);
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
    addCustomNuclide,
    removeCustomNuclide,
    getCustomNuclides,
    halfLifeHours,
  };

})();
