/**
 * nuclide-id.js — Canonical radionuclide identifier handling
 *
 * Shared by the curated DB and the ICRP 107 extended loader so URL aliases do
 * not select a different data source. Examples: 177Lu/Lu177 -> Lu-177,
 * 99mTc/Tc99m -> Tc-99m.
 */

'use strict';

const NUCLIDE_ID = (() => {
  function titleElement(symbol) {
    return symbol.slice(0, 1).toUpperCase() + symbol.slice(1).toLowerCase();
  }

  function normalize(name) {
    if (!name) return '';
    const clean = String(name).trim().replace(/\s+/g, '');

    // Already normalized (e.g. Lu-177, Tc-99m).
    const normalized = clean.match(/^([A-Za-z]{1,2})-(\d+[A-Za-z]?)$/);
    if (normalized) return `${titleElement(normalized[1])}-${normalized[2].toLowerCase()}`;

    // Element first without dash: Lu177, Tc99m.
    const elementFirst = clean.match(/^([A-Za-z]{1,2})(\d+[A-Za-z]?)$/);
    if (elementFirst) return `${titleElement(elementFirst[1])}-${elementFirst[2].toLowerCase()}`;

    // Mass first: 177Lu, 99mTc.
    const massFirst = clean.match(/^(\d+)([A-Za-z]+)$/);
    if (massFirst) {
      let mass = massFirst[1];
      let suffix = massFirst[2];
      if (suffix.length > 2 && suffix[0] === suffix[0].toLowerCase()) {
        mass += suffix[0].toLowerCase();
        suffix = suffix.slice(1);
      }
      return `${titleElement(suffix)}-${mass}`;
    }

    return clean;
  }

  return { normalize };
})();
