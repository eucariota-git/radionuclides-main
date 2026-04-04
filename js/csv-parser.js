/**
 * csv-parser.js — IAEA LiveChart CSV format parser
 *
 * Expected header (from LiveChart export):
 *   energy, unc_en, intensity_%, unc_i, [col4], type, [col6], [col7], [col8], [col9],
 *   multipolarity, mixing_ratio, unc, conversion_coeff, unc,
 *   parent_Z, N, symbol, parent_energy_shift, parent_energy_keV, unc, jp,
 *   half_life, half-life_operator, unc, unit, half_life_s, unc,
 *   decay, decay_%, unc, Q, unc, Z, N, symbol, ENSDF_cut-off, authors, Extraction_date
 *
 * Relevant columns (0-indexed):
 *   0  = energy [keV]
 *   2  = intensity_% (yield per 100 decays)
 *   5  = type  (G = gamma, X = X-ray characteristic, E = electron, A = alpha, B = beta)
 *   14 = parent Z
 *   16 = parent symbol
 *   20 = spin-parity
 *   21 = half_life value
 *   24 = half_life unit  (s, m, h, d, y, ky, My, Gy, ...)
 *   25 = half_life [s]
 *   27 = decay mode (B-, B+, EC, IT, A, SF, ...)
 *   28 = decay branch %
 */

'use strict';

const CSV_PARSER = (() => {

  // Map LiveChart half-life unit strings to seconds (all keys lowercase for case-insensitive lookup)
  const UNIT_TO_S = {
    s: 1, m: 60, min: 60, h: 3600, d: 86400,
    y: 31557600, ky: 3.15576e10, my: 3.15576e13, gy: 3.15576e16,
    ms: 0.001, us: 1e-6, ns: 1e-9, ps: 1e-12, fs: 1e-15,
  };

  /**
   * Parse IAEA LiveChart CSV text.
   * @param {string} csvText - full content of the CSV file
   * @returns {{ nuclide: Object, emissions: Array }} parsed nuclide info and emission list
   */
  function parse(csvText) {
    const normalizedText = csvText.replace(/^\uFEFF/, '');
    const lines = normalizedText.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) throw new Error('CSV file appears empty or has no data rows.');

    // Skip header row(s) — identify header by presence of 'energy' in first column
    let dataStart = 0;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].trim().toLowerCase().startsWith('energy')) {
        dataStart = i + 1;
        break;
      }
    }

    const emissions = [];
    let parentSymbol = '';
    let halfLife_s   = null;
    let halfLifeDisplay = '';
    let decayMode    = '';
    let parentZ      = null;
    let parentN      = null;

    for (let i = dataStart; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      if (cols.length < 6) continue;

      const energy_keV   = parseFloat(cols[0]);
      const intensity    = parseFloat(cols[2]);   // %
      const type         = (cols[5] || '').trim().toUpperCase();

      if (isNaN(energy_keV) || isNaN(intensity)) continue;

      // Extract nuclide metadata from first valid data row
      if (parentSymbol === '' && cols.length > 16) {
        parentSymbol = (cols[16] || '').trim();
        if (!parentSymbol && cols.length > 34) {
          parentSymbol = (cols[34] || '').trim();
        }
        parentZ      = parseInt(cols[14], 10) || null;
        parentN      = parseInt(cols[15], 10) || null;
        decayMode    = (cols[27] || '').trim();

        // Half-life: prefer the pre-converted half_life [s] column (col 25)
        const hlRaw = (cols[25] || '').trim();
        if (hlRaw && !isNaN(parseFloat(hlRaw))) {
          halfLife_s = parseFloat(hlRaw);
        } else {
          // Fallback: parse from value + unit
          const hlVal  = parseFloat(cols[21]);
          const hlUnit = (cols[24] || '').trim().toLowerCase();
          if (!isNaN(hlVal) && UNIT_TO_S[hlUnit]) {
            halfLife_s = hlVal * UNIT_TO_S[hlUnit];
          }
        }

        // Display string — prefer value+unit columns; fall back to formatting half_life_s
        if (halfLife_s !== null) {
          const hlVal  = parseFloat(cols[21]);
          const hlUnit = (cols[24] || '').trim();
          if (!isNaN(hlVal) && hlUnit) {
            halfLifeDisplay = `${hlVal} ${hlUnit}`;
          } else {
            halfLifeDisplay = `${halfLife_s} s`;
          }
        }
      }

      // Extract per-row half-life (cols 21 = value, 24 = unit, 25 = half_life_s)
      let em_hl_s = null;
      let em_hl_display = '';
      if (cols.length > 25) {
        const hlRaw = (cols[25] || '').trim();
        if (hlRaw && !isNaN(parseFloat(hlRaw))) {
          em_hl_s = parseFloat(hlRaw);
        } else {
          const hlVal  = parseFloat(cols[21]);
          const hlUnit = (cols[24] || '').trim().toLowerCase();
          if (!isNaN(hlVal) && UNIT_TO_S[hlUnit]) {
            em_hl_s = hlVal * UNIT_TO_S[hlUnit];
          }
        }
        if (em_hl_s !== null) {
          const hlVal  = parseFloat(cols[21]);
          const hlUnit = (cols[24] || '').trim();
          em_hl_display = (!isNaN(hlVal) && hlUnit) ? `${hlVal} ${hlUnit}` : `${em_hl_s} s`;
        }
      }

      // Extract per-row decay mode and branch % (cols 27 and 28)
      const em_decay_mode    = cols.length > 27 ? (cols[27] || '').trim() : '';
      const em_decay_percent = cols.length > 28 ? parseFloat(cols[28]) : NaN;

      emissions.push({ energy_keV, yield_percent: intensity, type,
        half_life_s: em_hl_s, half_life_display: em_hl_display,
        decay_mode: em_decay_mode,
        decay_percent: isNaN(em_decay_percent) ? null : em_decay_percent });
    }

    // Accept missing parsed symbol so the user can enter it manually if needed.
    if (halfLife_s === null) throw new Error('Could not parse half-life from CSV.');

    // Build a nuclide id from the symbol (e.g. "Lu" from first data row → need A)
    // The symbol in col 17 is just the element symbol; use the CSV filename or
    // parent_energy_keV col to infer. We'll use the parent_Z + symbol heuristic.
    // For the id we ask the user to confirm via the UI.
    const nuclideInfo = {
      symbol:           parentSymbol,
      Z:                parentZ,
      N:                parentN,
      A:                (parentZ !== null && parentN !== null) ? parentZ + parentN : null,
      half_life_s:      halfLife_s,
      half_life_display: halfLifeDisplay,
      decay_mode:       decayMode,
    };

    return { nuclide: nuclideInfo, emissions };
  }

  /**
   * Split a CSV line respecting quoted fields.
   */
  function splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { result.push(current); current = ''; continue; }
      current += ch;
    }
    result.push(current);
    return result;
  }

  /**
   * Filter emissions per Cornejo et al. criteria and return summary.
   * @param {Array} emissions - [{energy_keV, yield_percent, type}]
   * @returns {Array} filtered emissions (E >= 20 keV, yield >= 0.01%, type G or X)
   */
  function filterEmissions(emissions) {
    return emissions.filter(e =>
      e.energy_keV >= 20 &&
      e.yield_percent >= 0.01 &&
      ['G', 'X'].includes(e.type.toUpperCase())
    );
  }

  return { parse, filterEmissions, splitCSVLine };

})();
