'use strict';

const UTILS = (() => {
  // Application identity, printed in every calculation report (report.js) so
  // two different code versions never produce indistinguishable reports
  // (audit 2026-07-16, H-07). APP_BUILD must equal CACHE_VERSION in sw.js —
  // update both together; validate-app.js enforces the match.
  const APP_VERSION = '1.20.2';
  const APP_BUILD = 'nm-planner-v71';
  // Author of the application, the data compilation and the Effluent PHITS coefficients
  const APP_AUTHOR = 'José Ramón Sendón del Río';

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* --- Decimal separator (2026-10-15) ---
   * The interface is in English for every user, but the DECIMAL SEPARATOR of
   * what the app displays follows the user: point or comma, chosen in the header
   * (UI.initDecimal: stored choice, else the browser language). Input accepts
   * both (parseNumber). CSV exports always use the point (withPoint), so files
   * stay machine-readable and reproducible.
   *
   * Only VALUE strings are localized — never identifiers that contain digits
   * and points (ANS-6.4.3, §5.2.1, v1.14.0, para. 2.49): dec() must be applied
   * to a number or a "value unit" string, not to prose. */
  let decimalMode = 'point';
  let forcedPoint = 0;
  const comma = () => decimalMode === 'comma' && forcedPoint === 0;
  function setDecimalMode(mode) { decimalMode = mode === 'comma' ? 'comma' : 'point'; }
  function getDecimalMode() { return decimalMode; }
  /** "6.64 d" → "6,64 d" in comma mode (points between digits only). */
  function dec(str) {
    if (str === null || str === undefined) return str;
    const t = String(str);
    return comma() ? t.replace(/(\d)\.(\d)/g, '$1,$2') : t;
  }
  /** A number as written in the data (no rounding), with the user's separator. */
  const num = v => dec(String(v));
  /** Run fn with the point forced (CSV builders). */
  function withPoint(fn) {
    forcedPoint++;
    try { return fn(); } finally { forcedPoint--; }
  }
  /**
   * Read a number typed with a decimal point OR a decimal comma.
   * '' → null (empty field); anything not a plain number → NaN. Accepted:
   * 0.3, 0,3, .5, ,5, 12, -1, 1e-7, 1,2e3. Rejected: more than one separator
   * (1.000,5 — 1,000.5), grouping spaces (1 000), trailing text (3 m). A field
   * of type="number" read "0,3" as 3 in a browser set to English and
   * "1.000,5" as 1.0005, silently.
   */
  function parseNumber(text) {
    const t = String(text ?? '').trim();
    if (t === '') return null;
    if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)([eE][+-]?\d+)?$/.test(t)) return NaN;
    const v = Number(t.replace(',', '.'));
    return Number.isFinite(v) ? v : NaN;
  }
  /** Value for an input field, with the user's separator ('' for null). */
  const inputValue = v => (v === null || v === undefined || v === '' ? '' : num(v));

  function safeFilename(name) {
    return name.trim().replace(/[^A-Za-z0-9\-_.]/g, '_').replace(/_+/g, '_').slice(0, 64);
  }

  // Convert to superscript scientific notation (e.g., 1.5×10⁴)
  const toSci = (v, decimals = 1) => dec(v.toExponential(decimals).replace(/e([+-])(\d+)/, (_, sign, digits) => {
    const sup = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
    return '×10' + (sign === '-' ? '⁻' : '') + [...digits].map(c => sup[c] ?? c).join('');
  }));

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
    if (Math.floor(absVal) >= 1) return dec(val.toFixed(1));

    // Case 4: Pure decimal (absVal < 1) → "first non-zero decimal + one more"
    // Example: 0.123 → "0.12", 0.003 → "0.003", 0.5 → "0.5"
    // Strategy: find position of first non-zero digit after decimal point,
    // then include one additional digit of precision
    const decStr = absVal.toFixed(20).split('.')[1] || '';
    let firstNZ = 0;
    while (firstNZ < decStr.length && decStr[firstNZ] === '0') firstNZ++;
    return dec(parseFloat(val.toFixed(firstNZ + 2)).toString());
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
      if (side(parseFloat(text)) === trueSide) return dec(text);
    }
    return dec(val.toFixed(12));
  }

  /**
   * Reference data (Γ, regulatory levels, coefficients) at a fixed number of
   * significant figures, without the false precision of fmt() ("3880.0" Bq/L,
   * "100.0 kBq/kg") and without fmt()'s 2-figure cut above 10 000 ("6.9×10⁴"
   * for 69 400) — audit 2026-10-14 v1.11, R-06. Trailing zeros are kept
   * (6 → "6.00"): they state the precision.
   * @param {number} val
   * @param {number} [sig=3]
   */
  function fmtSig(val, sig = 3) {
    if (val === null || val === undefined || !Number.isFinite(val)) return '—';
    if (val === 0) return '0';
    const a = Math.abs(val);
    if (a >= 1e6 || a < 1e-3) return toSci(val, sig - 1);
    const mag = Math.floor(Math.log10(a));
    if (mag >= sig - 1) {
      const step = 10 ** (mag - sig + 1);
      return dec(String(Math.round(val / step) * step));
    }
    return dec(val.toPrecision(sig));
  }

  /**
   * CSV cell guard against formula injection: a text cell starting with
   * = + - @ TAB or CR gets a leading apostrophe. A NUMBER is never prefixed —
   * the old per-page guard turned a negative margin into the text "'-2.86"
   * (audit 2026-10-15, F-03).
   * @param {string} str
   */
  function csvSafe(str) {
    const s = String(str);
    // a plain decimal number, nothing around it (Number() would also accept "\t1")
    if (/^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return s;
    return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
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
    APP_AUTHOR,
    escapeHtml,
    safeFilename,
    setDecimalMode,
    getDecimalMode,
    dec,
    num,
    withPoint,
    parseNumber,
    inputValue,
    fmt,
    fmtRatio,
    fmtSig,
    toSci,
    csvSafe,
    formatDate,
    safeAttr,
  };
})();
