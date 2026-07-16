/* =========================================================
   UI Module — Shared functionality across all pages
   Dark mode, print, keyboard shortcuts, history management
   ========================================================= */

const UI = (() => {
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
      hint.innerHTML = '<kbd>/</kbd> search &nbsp; <kbd>Esc</kbd> clear &nbsp; <kbd>Alt+D</kbd> dark mode';
      pb.appendChild(hint);
    }
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
    saveHistory,
    loadHistory,
  };
})();
