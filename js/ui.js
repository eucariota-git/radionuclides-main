/* =========================================================
   UI Module — Shared functionality across all pages
   Dark mode, print, keyboard shortcuts, live calculation, input errors
   ========================================================= */

// Chart.js formats tick labels with the BROWSER locale, so a Spanish browser
// drew "33,2" and "0,5" on axes while the rest of the app uses a decimal point
// (audit 2026-10-14 v1.11, R-06). Every page loads Chart.js before this file.
// The en-US formatter still groups thousands ("1,000" keV on the photon-spectrum
// axis), which a Spanish reader takes for a decimal comma: strip the grouping in
// the default tick labels of linear and logarithmic axes. Axes with their own
// callback are unaffected.
if (typeof Chart !== 'undefined') {
  Chart.defaults.locale = 'en-US';
  // Then the user's decimal separator (UTILS.dec, comma mode only).
  const ungrouped = fmt => function (value, index, ticks) {
    const s = String(fmt.call(this, value, index, ticks)).replace(/,/g, '');
    return typeof UTILS !== 'undefined' ? UTILS.dec(s) : s;
  };
  Chart.defaults.scales.linear.ticks.callback = ungrouped(Chart.Ticks.formatters.numeric);
  Chart.defaults.scales.logarithmic.ticks.callback = ungrouped(Chart.Ticks.formatters.logarithmic);
}

const UI = (() => {
  // A link into a collapsed <details> (e.g. "see Method › Criteria per category")
  // opens the listed sections before the browser scrolls to the target.
  // An ⓘ field help inside a <label>: a click or tap shows its text instead of
  // moving the focus to the field
  document.addEventListener('click', e => {
    const tip = e.target.closest && e.target.closest('.hint-tip');
    if (tip) { e.preventDefault(); tip.focus(); }
  });
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[data-open-details]');
    if (!a) return;
    for (const id of a.dataset.openDetails.split(/\s+/)) {
      const d = document.getElementById(id);
      if (d && d.tagName === 'DETAILS') d.open = true;
    }
  });

  // Field help as an ⓘ icon: the text goes in data-tooltip and aria-label (both
  // translated by the Spanish overlay); shown on hover, focus or tap
  function hintTip(text) {
    const t = String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<span class="hint-tip" tabindex="0" role="img" aria-label="${t}" data-tooltip="${t}"><span class="ico ico-info" aria-hidden="true"></span></span>`;
  }

  // Dynamic ⓘ: same text in data-tooltip and aria-label; hidden when there is none
  function setHintTip(el, text) {
    if (!el) return;
    el.setAttribute('data-tooltip', text || '');
    el.setAttribute('aria-label', text || '');
    el.classList.toggle('hidden', !text);
  }

  /* --- Dark Mode ---
   * An explicit choice (button or Alt+D) is stored and wins. Without one, the
   * page follows the operating-system preference, also when it changes while
   * the page is open (presentation review 2026-10-15). */
  function initDarkMode() {
    let stored = null;
    try {
      stored = localStorage.getItem('nm_dark_mode');
    } catch (e) {
      // localStorage may not be available (e.g., file:// on some browsers)
    }
    const system = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const apply = dark => { document.documentElement.dataset.theme = dark ? 'dark' : ''; };
    if (stored === '1' || stored === '0') apply(stored === '1');
    else apply(!!(system && system.matches));

    const btn = document.getElementById('darkToggle');

    function syncIcon() {
      const isDark = document.documentElement.dataset.theme === 'dark';
      const icon = document.getElementById('darkIcon');
      if (icon) icon.className = 'ico ' + (isDark ? 'ico-sun' : 'ico-moon');
      if (btn) btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    }
    const announce = () => document.dispatchEvent(new CustomEvent('nm-theme-change', {
      detail: { theme: document.documentElement.dataset.theme || 'light' },
    }));

    syncIcon();

    if (system && system.addEventListener) {
      system.addEventListener('change', ev => {
        let explicit = null;
        try { explicit = localStorage.getItem('nm_dark_mode'); } catch (e) { /* unavailable */ }
        if (explicit === '1' || explicit === '0') return;
        apply(ev.matches);
        syncIcon();
        announce();
      });
    }

    if (!btn) return;
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.dataset.theme === 'dark';
      apply(!isDark);

      try {
        localStorage.setItem('nm_dark_mode', isDark ? '0' : '1');
      } catch (e) {
        // localStorage may be unavailable
      }

      syncIcon();
      announce();
    });
  }

  /* --- Decimal separator (2026-10-15) ---
   * Displayed numbers use a point or a comma; the interface stays in English.
   * Default: the stored choice, else the browser's number locale (does Intl
   * print 1.5 as "1,5"?). The header button switches it; pages re-render on
   * 'nm-decimal-change'. Numeric fields (.num-input, type="text") accept both
   * separators whatever the setting — UTILS.parseNumber. */
  function browserDecimal() {
    try {
      // the browser's own number locale (its default Intl locale)
      return new Intl.NumberFormat().format(1.5).includes(',') ? 'comma' : 'point';
    } catch (e) {
      return 'point';
    }
  }

  // Rewrite the separator of the plain numbers already in the fields (defaults
  // written in the HTML with a point, or values typed before a switch).
  // Static <option data-num-label> texts with a value (Dose material densities)
  // follow the separator too; the HTML text, written with a point, is the source.
  function localizeInputs() {
    const sep = UTILS.getDecimalMode() === 'comma' ? ',' : '.';
    document.querySelectorAll('input.num-input').forEach(el => {
      const t = el.value.trim();
      if (/^[+-]?\d*[.,]\d+([eE][+-]?\d+)?$/.test(t)) el.value = t.replace(/[.,]/, sep);
    });
    document.querySelectorAll('option[data-num-label]').forEach(o => {
      if (!o.dataset.numLabel) o.dataset.numLabel = o.textContent;
      o.textContent = UTILS.dec(o.dataset.numLabel);
    });
    refreshNumberHints();
  }

  // Re-evaluate the "Read as …" note of every numeric field: a value written by
  // the page (Defaults, presets, adopted restriction) or a separator switch fires
  // no input event, and the note stayed on the old value (decimal review
  // 2026-10-15, D-01). Pages call it after writing fields.
  function refreshNumberHints() {
    document.querySelectorAll('input.num-input').forEach(numberHint);
  }

  // "1.500" or "2,250": one separator followed by exactly three digits reads as
  // a decimal (1.5) but may have been meant as a thousands group (1500). The
  // value is accepted; a note under the field says how it was read.
  function numberHint(el) {
    const id = el.id ? `${el.id}-numhint` : null;
    let hint = id ? document.getElementById(id) : null;
    const t = el.value.trim();
    const m = /^[+-]?([1-9]\d{0,2})[.,](\d{3})$/.exec(t);
    if (!m) { if (hint) hint.remove(); return; }
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'form-hint num-hint';
      if (id) hint.id = id;
      hint.setAttribute('role', 'status');
      const anchor = el.parentElement && el.parentElement.classList.contains('d-flex') ? el.parentElement : el;
      anchor.insertAdjacentElement('afterend', hint);
    }
    const v = UTILS.parseNumber(t);
    const thousands = m[1] + m[2];
    hint.textContent = `Read as ${UTILS.num(v)} (decimal separator). For ${thousands}, type ${thousands} without a separator.`;
  }

  function initDecimal() {
    if (typeof UTILS === 'undefined') return;
    let stored = null;
    try {
      stored = localStorage.getItem('nm_decimal');
    } catch (e) {
      // localStorage may be unavailable
    }
    UTILS.setDecimalMode(stored === 'comma' || stored === 'point' ? stored : browserDecimal());
    localizeInputs();

    const btn = document.getElementById('decimalToggle');
    const sync = () => {
      if (!btn) return;
      const isComma = UTILS.getDecimalMode() === 'comma';
      btn.textContent = isComma ? '1,5' : '1.5';
      btn.setAttribute('aria-pressed', isComma ? 'true' : 'false');
    };
    sync();
    if (btn) {
      btn.addEventListener('click', () => {
        const to = UTILS.getDecimalMode() === 'comma' ? 'point' : 'comma';
        UTILS.setDecimalMode(to);
        try {
          localStorage.setItem('nm_decimal', to);
        } catch (e) {
          // localStorage may be unavailable
        }
        localizeInputs();
        sync();
        document.dispatchEvent(new CustomEvent('nm-decimal-change', { detail: { mode: to } }));
      });
    }
    document.addEventListener('input', e => {
      if (e.target && e.target.matches && e.target.matches('input.num-input')) numberHint(e.target);
    });
  }

  /* --- Language of the screens (2026-10-15) ---
   * English by default; «ES» applies the Spanish display overlay (js/i18n.js),
   * which rewrites rendered text only — never values, data, calculations or
   * CSV files. The choice is stored (nm_lang). */
  function initLanguage() {
    if (typeof I18N === 'undefined') return;
    I18N.init();
    const btn = document.getElementById('langToggle');
    const sync = () => {
      if (!btn) return;
      const es = I18N.getLang() === 'es';
      btn.textContent = es ? 'ES' : 'EN';
      btn.setAttribute('aria-pressed', es ? 'true' : 'false');
    };
    sync();
    if (btn) {
      btn.addEventListener('click', () => {
        const to = I18N.getLang() === 'es' ? 'en' : 'es';
        try {
          localStorage.setItem('nm_lang', to);
        } catch (e) {
          // localStorage may be unavailable
        }
        I18N.setLang(to);
        sync();
      });
    }
  }

  function colorWithAlpha(color, alpha) {
    const hex = color.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
      const value = parseInt(hex[1], 16);
      return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
    }
    const rgb = color.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})`;
    return color;
  }

  function getChartTheme() {
    const styles = getComputedStyle(document.documentElement);
    const token = name => styles.getPropertyValue(name).trim();
    const green = token('--green-700');
    const orange = token('--warning-text');
    return {
      text: token('--gray-900'),
      grid: token('--border'),
      green,
      greenFill: colorWithAlpha(green, 0.08),
      orange,
      orangeFill: colorWithAlpha(orange, 0.06),
      danger: token('--danger'),
      // photon-spectrum hues by photon type (Properties detail panel)
      spectrum: { G: token('--spectrum-g'), X: token('--spectrum-x'), AQ: token('--spectrum-aq') },
      // chart surface, for the ring around markers
      surface: token('--white'),
    };
  }

  /* --- Version in the footer --- */
  // Written from UTILS.APP_VERSION only, so the footer always matches the code
  // that is running (also when the service worker serves a cached copy). The
  // separator goes inside the span: the text before it stays a catalog key.
  function initVersion() {
    if (typeof UTILS === 'undefined') return;
    document.querySelectorAll('.app-version').forEach(el => { el.textContent = '· v' + UTILS.APP_VERSION; });
  }

  /* --- Print --- */
  function initPrint() {
    window.addEventListener('beforeprint', () => {
      const pb = document.querySelector('.page-body');
      if (!pb) return;

      pb.dataset.printTitle = document.title.replace('NM Radionuclide Planner — ', '');
      pb.dataset.printDate = new Date().toLocaleString();
    });
  }

  /* --- Keyboard Shortcuts --- */
  function initKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Skip if user is typing in an input/textarea/select (except Esc)
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if (isInput && e.key !== 'Escape') {
        return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          const searchInput = document.getElementById('searchInput');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          break;

        case 'Escape':
          if (isInput) {
            e.target.blur();
          }
          const si = document.getElementById('searchInput');
          if (si) {
            si.value = '';
            si.dispatchEvent(new Event('input'));
          }
          const dp = document.getElementById('detailPanel');
          if (dp) {
            dp.classList.remove('visible');
          }
          break;

        case 'd':
        case 'D':
          if (e.altKey) {
            e.preventDefault();
            const darkToggle = document.getElementById('darkToggle');
            if (darkToggle) {
              darkToggle.click();
            }
          }
          break;
      }
    });

    // Append keyboard hint to page
    const pb = document.querySelector('.page-body');
    if (pb && !document.getElementById('keyboardHint')) {
      const hint = document.createElement('div');
      hint.id = 'keyboardHint';
      hint.className = 'keyboard-hint text-sm text-muted';
      hint.setAttribute('aria-label', 'Keyboard shortcuts');
      // Only the shortcuts that exist on this page (copy audit 2026-10-03, T35)
      const parts = [];
      if (document.getElementById('searchInput')) {
        parts.push('<kbd>/</kbd> search', '<kbd>Esc</kbd> clear search and close details');
      } else if (document.getElementById('nuclideSearch')) {
        parts.push('<kbd>&uarr;</kbd> <kbd>&darr;</kbd> choose nuclide', '<kbd>Enter</kbd> select', '<kbd>Esc</kbd> close list');
      }
      parts.push('<kbd>Alt+D</kbd> dark mode');
      hint.innerHTML = parts.join(' &nbsp; ');
      pb.appendChild(hint);
    }
  }

  /* --- Live calculation and input errors (presentation review 2026-10-15) ---
   * The four calculators recalculate as the inputs change. Decay and Dose had a
   * Calculate button and an «inputs changed — recalculate» notice (copy audit
   * 2026-10-03, T19); they now follow the contract of Effluent and Caregiver:
   * the results always describe the inputs on screen, and an invalid input
   * hides them, so the report and the CSV cannot describe a different case.
   *
   * onInputs(fn, {delay, exclude}) calls fn, debounced while typing, after any
   * input/change of a control inside <main> that is not inside `exclude`.
   * inputErrors(boxId) returns { show(message, fieldId), clear() }: the message
   * goes to the page's error box (instead of a modal alert) and the offending
   * field is marked aria-invalid and described by that box. */
  function onInputs(fn, { delay = 150, exclude = '' } = {}) {
    let timer = null;
    const handler = e => {
      const t = e.target;
      if (!t || !t.closest || !t.closest('main') || !t.matches('input, select, textarea')) return;
      if (exclude && t.closest(exclude)) return;
      clearTimeout(timer);
      timer = setTimeout(fn, e.type === 'change' ? 0 : delay);
    };
    document.addEventListener('input', handler);
    document.addEventListener('change', handler);
  }

  function inputErrors(boxId) {
    const box = document.getElementById(boxId);
    let marked = [];
    function clear() {
      for (const el of marked) {
        el.classList.remove('is-invalid');
        el.removeAttribute('aria-invalid');
        if (el.dataset.describedbyBefore) el.setAttribute('aria-describedby', el.dataset.describedbyBefore);
        else el.removeAttribute('aria-describedby');
        delete el.dataset.describedbyBefore;
      }
      marked = [];
      if (box) { box.textContent = ''; box.classList.add('hidden'); }
    }
    function show(message, fieldId) {
      clear();
      if (box) { box.textContent = message; box.classList.remove('hidden'); }
      const el = fieldId ? document.getElementById(fieldId) : null;
      if (el) {
        const before = el.getAttribute('aria-describedby');
        if (before) el.dataset.describedbyBefore = before;
        el.classList.add('is-invalid');
        el.setAttribute('aria-invalid', 'true');
        if (box) el.setAttribute('aria-describedby', [before, boxId].filter(Boolean).join(' '));
        marked.push(el);
      }
    }
    return { show, clear };
  }

  /* --- Calculation History --- */
  function saveHistory(key, entry) {
    try {
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift({ ts: Date.now(), ...entry });
      if (arr.length > 5) arr.length = 5;
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (e) {
      // localStorage may be full or unavailable
    }
  }

  function loadHistory(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
      return [];
    }
  }

  function showFatalError(message) {
    const host = document.querySelector('.page-body') || document.body;
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-lg';
    alert.setAttribute('role', 'alert');
    alert.textContent = message;
    host.prepend(alert);
  }

  // Public API
  return {
    initDarkMode,
    initDecimal,
    initLanguage,
    refreshNumberHints,
    hintTip,
    setHintTip,
    initPrint,
    initVersion,
    initKeyboard,
    showFatalError,
    getChartTheme,
    onInputs,
    inputErrors,
    saveHistory,
    loadHistory,
  };
})();
