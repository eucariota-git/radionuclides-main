'use strict';

const UTILS = (() => {
  // Application identity, printed in every calculation report (report.js) so
  // two different code versions never produce indistinguishable reports
  // (audit 2026-07-16, H-07). APP_BUILD must equal CACHE_VERSION in sw.js —
  // update both together; validate-app.js enforces the match.
  const APP_VERSION = '1.2.1';
  const APP_BUILD = 'nm-planner-v27';

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function safeFilename(name) {
    return name.trim().replace(/[^A-Za-z0-9\-_.]/g, '_').replace(/_+/g, '_').slice(0, 64);
  }

  // Convert to superscript scientific notation (e.g., 1.5×10⁴)
  const toSci = (v, decimals = 1) => v.toExponential(decimals).replace(/e([+-])(\d+)/, (_, sign, digits) => {
    const sup = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
    return '×10' + (sign === '-' ? '⁻' : '') + [...digits].map(c => sup[c] ?? c).join('');
  });

  function fmt(val) {
    // Unified numeric formatting convention (Octava ronda)
    // Handles four cases: large values, small values, integer-part values, and decimals-only values
    // Returns '—' (em-dash) for null, undefined, or non-finite values
    //
    // NOTE: fmt() rounds to 1 decimal for anything ≥ 1, which is too coarse to
    // display a regulatory ratio next to a compliance verdict (1.04 → "1.0" reads
    // as compliant beside an EXCEEDED badge). Use fmtRatio() for any value the
    // user compares against a limit — see audit 2026-07-15, finding 7.
    if (val === null || val === undefined || !Number.isFinite(val)) return '—';
    if (val === 0) return '0';

    const absVal = Math.abs(val);

    // Case 1: Very large values (≥ 10,000) → scientific notation with 1 decimal
    // Example: 15000 → "1.5×10⁴"
    if (absVal >= 10000) return toSci(val);

    // Case 2: Very small values (≤ 0.0001) → scientific notation with 1 decimal
    // Example: 0.00005 → "5.0×10⁻⁵"
    if (absVal <= 0.0001) return toSci(val);

    // Case 3: Integer part ≠ 0 (absVal ≥ 1) → 1 decimal place
    // Example: 6.0067 → "6.0", 165.5 → "165.5"
    if (Math.floor(absVal) >= 1) return val.toFixed(1);

    // Case 4: Pure decimal (absVal < 1) → "first non-zero decimal + one more"
    // Example: 0.123 → "0.12", 0.003 → "0.003", 0.5 → "0.5"
    // Strategy: find position of first non-zero digit after decimal point,
    // then include one additional digit of precision
    const decStr = absVal.toFixed(20).split('.')[1] || '';
    let firstNZ = 0;
    while (firstNZ < decStr.length && decStr[firstNZ] === '0') firstNZ++;
    return parseFloat(val.toFixed(firstNZ + 2)).toString();
  }

  /**
   * Format a value that the user reads against a regulatory threshold (sum of
   * fractions vs 1, % of limit vs 100, clearance ratio vs 1).
   *
   * fmt() shows one decimal above 1, so a sum of fractions of 1.04 renders "1.0"
   * — visually compliant, right next to the EXCEEDED verdict computed from the
   * exact value. 0.999 renders "1", 100.04 renders "100.0" (audit 2026-07-15,
   * finding 7). The verdict was never wrong; the number shown contradicted it.
   *
   * Rather than fix a digit count, this guarantees the invariant that matters:
   * THE DISPLAYED VALUE NEVER LANDS ON THE OTHER SIDE OF THE THRESHOLD FROM THE
   * TRUE ONE. It starts at 3 significant figures and adds decimals only until
   * that holds, so 1.04 → "1.04", 0.999 → "0.999", 99.99 → "99.99" (vs 100),
   * 100.04 → "100.04", while ordinary values stay short (0.5 → "0.500").
   *
   * @param {number} val - value to display
   * @param {number} [threshold=1] - limit it is compared against (use 100 for %)
   * @returns {string}
   */
  function fmtRatio(val, threshold = 1) {
    if (val === null || val === undefined || !Number.isFinite(val)) return '—';
    if (val === 0) return '0';

    const absVal = Math.abs(val);
    if (absVal >= 1e5 || absVal < 1e-4) return toSci(val, 2);

    // 3 significant figures as the floor
    const magnitude = Math.floor(Math.log10(absVal));
    const baseDecimals = Math.max(0, 2 - magnitude);

    // Same side of the threshold as the exact value? (equality is its own side)
    const side = (v) => (v > threshold) - (v < threshold);
    const trueSide = side(val);

    for (let d = baseDecimals; d <= 12; d++) {
      const text = val.toFixed(d);
      if (side(parseFloat(text)) === trueSide) return text;
    }
    return val.toFixed(12);
  }

  function formatDate(date) {
    if (!(date instanceof Date) || !isFinite(date)) return '—';
    return date.toLocaleString();
  }

  // Create safe HTML attributes (for data-* attributes, href, etc.)
  function safeAttr(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    APP_VERSION,
    APP_BUILD,
    escapeHtml,
    safeFilename,
    fmt,
    fmtRatio,
    formatDate,
    safeAttr,
  };
})();
