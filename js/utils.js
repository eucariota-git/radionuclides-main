'use strict';

const UTILS = (() => {
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function safeFilename(name) {
    return name.trim().replace(/[^A-Za-z0-9\-_.]/g, '_').replace(/_+/g, '_').slice(0, 64);
  }

  function fmt(val) {
    // Unified numeric formatting convention (Octava ronda)
    // Handles four cases: large values, small values, integer-part values, and decimals-only values
    // Returns '—' (em-dash) for null, undefined, or non-finite values
    if (val === null || val === undefined || !Number.isFinite(val)) return '—';
    if (val === 0) return '0';

    const absVal = Math.abs(val);

    // Helper: convert to superscript scientific notation (e.g., 1.5×10⁴)
    const toSci = (v) => v.toExponential(1).replace(/e([+-])(\d+)/, (_, sign, digits) => {
      const sup = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
      return '×10' + (sign === '-' ? '⁻' : '') + [...digits].map(c => sup[c] ?? c).join('');
    });

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
    escapeHtml,
    safeFilename,
    fmt,
    formatDate,
    safeAttr,
  };
})();
