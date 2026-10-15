/* =========================================================
   UI Module — Shared functionality across all pages
   Dark mode, print, keyboard shortcuts, history management
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
  const ungrouped = fmt => function (value, index, ticks) {
    return String(fmt.call(this, value, index, ticks)).replace(/,/g, '');
  };
  Chart.defaults.scales.linear.ticks.callback = ungrouped(Chart.Ticks.formatters.numeric);
  Chart.defaults.scales.logarithmic.ticks.callback = ungrouped(Chart.Ticks.formatters.logarithmic);
}

const UI = (() => {
  // A link into a collapsed <details> (e.g. "see Method › Criteria per category")
  // opens the listed sections before the browser scrolls to the target.
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[data-open-details]');
    if (!a) return;
    for (const id of a.dataset.openDetails.split(/\s+/)) {
      const d = document.getElementById(id);
      if (d && d.tagName === 'DETAILS') d.open = true;
    }
  });

  /* --- Dark Mode --- */
  function initDarkMode() {
    // Restore dark mode preference from localStorage
    try {
      const stored = localStorage.getItem('nm_dark_mode');
      if (stored === '1') {
        document.documentElement.dataset.theme = 'dark';
      }
    } catch (e) {
      // localStorage may not be available (e.g., file:// on some browsers)
    }

    const btn = document.getElementById('darkToggle');
    if (!btn) return;

    function syncIcon() {
      const isDark = document.documentElement.dataset.theme === 'dark';
      const icon = document.getElementById('darkIcon');
      if (icon) {
        icon.textContent = isDark ? '☀️' : '🌙';
      }
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    }

    syncIcon();

    btn.addEventListener('click', () => {
      const isDark = document.documentElement.dataset.theme === 'dark';
      document.documentElement.dataset.theme = isDark ? '' : 'dark';

      try {
        localStorage.setItem('nm_dark_mode', isDark ? '0' : '1');
      } catch (e) {
        // localStorage may be unavailable
      }

      syncIcon();
      document.dispatchEvent(new CustomEvent('nm-theme-change', {
        detail: { theme: document.documentElement.dataset.theme || 'light' },
      }));
    });
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

  /* --- Stale results (copy audit 2026-10-03, T19) ---
   * After a calculation, editing any input outside the results card leaves the
   * displayed results (and the report/CSV, which describe the LAST calculation)
   * out of step with the form. watchStaleResults() shows a notice at the top of
   * the results card until the next successful calculation calls fresh(). */
  function watchStaleResults(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return { fresh() {}, isStale: () => false };
    const note = document.createElement('div');
    note.id = 'staleNote';
    note.className = 'alert alert-warning mb-1 hidden';
    note.setAttribute('role', 'status');
    note.textContent = 'Inputs changed — recalculate to update results. The report and the CSV export still describe the last calculation.';
    const title = card.querySelector('.card-title');
    if (title) title.insertAdjacentElement('afterend', note); else card.prepend(note);
    let stale = false, calculated = false;
    const mark = e => {
      if (!calculated || card.contains(e.target)) return;
      if (!e.target.closest || !e.target.closest('main')) return;
      if (!e.target.matches('input, select, textarea, li')) return;
      stale = true;
      note.classList.remove('hidden');
    };
    document.addEventListener('input', mark);
    document.addEventListener('change', mark);
    return {
      fresh() { calculated = true; stale = false; note.classList.add('hidden'); },
      isStale: () => stale,
    };
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
    initPrint,
    initKeyboard,
    showFatalError,
    getChartTheme,
    watchStaleResults,
    saveHistory,
    loadHistory,
  };
})();
