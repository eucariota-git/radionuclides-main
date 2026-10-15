'use strict';

/* =========================================================
   I18N — optional Spanish screens over the English application
   =========================================================
 * The application is written, tested and exported in English. This module is
 * a DISPLAY OVERLAY: when the user picks «ES» it rewrites the text the pages
 * have already rendered — text nodes, a few attributes (title, placeholder,
 * aria-label, data-tooltip, data-label), option texts, chart labels — using
 * the catalog I18N_ES (js/i18n-es.js). It never touches field or option
 * VALUES, data, calculation modules or CSV builders, and no application code
 * reads rendered text back, so a calculation cannot depend on the language.
 *
 * Exact-match safety: an entry applies only to the exact English text it was
 * written for (after trimming). If an English sentence changes, its Spanish
 * entry stops matching and the correct English text is shown — never a stale
 * Spanish one. Texts with values use anchored patterns whose captures (numbers,
 * units, decimal separator) are copied unchanged.
 *
 * Elements with translate="no" (references, citations, identifiers) are left
 * as published. English is the default; the choice is stored (nm_lang).
 */
const I18N = (() => {
  const ATTRS = ['title', 'placeholder', 'aria-label', 'data-tooltip', 'data-label'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'NOSCRIPT']);
  let lang = 'en';
  let exact = new Map();
  let patterns = [];
  let scoped = [];
  const hits = new Set();   // entries used in this session (tools/i18n-coverage.js)   // [[CSS selector, Map]] — context-dependent entries, checked first
  let observer = null;
  // node → { en, shown }: the English text and what is displayed, so a later
  // change by the page (new English text) is told apart from our own rewrite
  const textState = new WeakMap();
  const attrState = new WeakMap();   // element → { attr: { en, shown } }

  function loadCatalog() {
    const c = (typeof I18N_ES !== 'undefined' && I18N_ES) || { exact: {}, patterns: [] };
    exact = new Map(Object.entries(c.exact || {}));
    scoped = Object.entries(c.scoped || {}).map(([sel, m]) => [sel, new Map(Object.entries(m))]);
    patterns = (c.patterns || []).map(([re, rep]) => [re instanceof RegExp ? re : new RegExp(re), rep]);
  }

  /** Spanish for an English string, or null (no entry: the English stays).
   *  el: the element that shows it, for the context-dependent (scoped) entries
   *  ("Decay" is a page name in the menu and a decay mode in a table). */
  function lookup(s, el) {
    if (typeof s !== 'string') return null;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    // Internal runs of white space (line breaks and indentation of the HTML
    // source) count as one space, as the browser displays them
    const core = m[2].replace(/\s+/g, ' ');
    if (!core) return null;
    let t;
    if (el && el.closest) {
      for (const [sel, map] of scoped) {
        if (map.has(core) && el.closest(sel)) { t = map.get(core); hits.add(core); break; }
      }
    }
    if (t === undefined) { t = exact.get(core); if (t !== undefined) hits.add(core); }
    if (t === undefined) {
      for (const [re, rep] of patterns) {
        // A pattern whose function finds nothing to translate returns the text
        // unchanged: try the next one
        if (re.test(core)) {
          const r = core.replace(re, rep);
          if (r !== core) { t = r; hits.add(re.source); break; }
        }
      }
    }
    return t === undefined ? null : m[1] + t + m[3];
  }
  /** The text to show for an English string in the current language. */
  const t = (s, el) => (lang === 'es' ? (lookup(s, el) ?? s) : s);

  function skipped(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (SKIP.has(e.tagName) || e.getAttribute('translate') === 'no') return true;
    }
    return false;
  }

  function doText(node) {
    const cur = node.data;
    const st = textState.get(node);
    const en = st && cur === st.shown ? st.en : cur;
    const shown = t(en, node.parentElement);
    textState.set(node, { en, shown });
    if (cur !== shown) node.data = shown;
  }

  function doAttrs(el) {
    let st = attrState.get(el);
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a);
      st = st || {};
      const prev = st[a];
      const en = prev && cur === prev.shown ? prev.en : cur;
      const shown = t(en, el);
      st[a] = { en, shown };
      if (cur !== shown) el.setAttribute(a, shown);
    }
    if (st) attrState.set(el, st);
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      if (!skipped(root.parentElement)) doText(root);
      return;
    }
    if (root.nodeType !== 1 || skipped(root)) return;
    doAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.nodeType === 1 && (SKIP.has(n.tagName) || n.getAttribute('translate') === 'no')
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) doText(n);
      else doAttrs(n);
    }
  }

  function translateTitle() {
    const st = textState.get(document);
    const cur = document.title;
    const en = st && cur === st.shown ? st.en : cur;
    const shown = t(en);
    textState.set(document, { en, shown });
    if (cur !== shown) document.title = shown;
  }

  function translateAll() {
    translateTitle();
    walk(document.body);
    refreshCharts();
  }

  function observe(on) {
    if (on && !observer && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(records => {
        for (const r of records) {
          if (r.type === 'childList') r.addedNodes.forEach(walk);
          else if (r.type === 'characterData') walk(r.target);
          else if (r.type === 'attributes') doAttrs(r.target);
        }
      });
      observer.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ATTRS });
    } else if (!on && observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // ---- Chart.js: canvas text is outside the DOM ----
  // Legend texts and tooltips are translated at draw time (dataset.label is
  // never modified); axis titles are rewritten in the options with the English
  // kept aside, restored when switching back.
  const titleState = new WeakMap();
  function chartPlugin() {
    if (typeof Chart === 'undefined' || chartPlugin.done) return;
    chartPlugin.done = true;
    const legend = Chart.defaults.plugins.legend.labels;
    const gen = legend.generateLabels;
    legend.generateLabels = function (chart) {
      return gen.call(this, chart).map(item => ({ ...item, text: t(item.text, chart.canvas) }));
    };
    Chart.register({
      id: 'nmI18n',
      beforeUpdate(chart) {
        for (const s of Object.values((chart.options && chart.options.scales) || {})) {
          const ti = s && s.title;
          if (!ti || typeof ti.text !== 'string') continue;
          const st = titleState.get(ti);
          const en = st && ti.text === st.shown ? st.en : ti.text;
          const shown = t(en, chart.canvas);
          titleState.set(ti, { en, shown });
          ti.text = shown;
        }
      },
      beforeTooltipDraw(chart, args) {
        const tt = args && args.tooltip;
        if (!tt || lang !== 'es') return;
        if (Array.isArray(tt.title)) tt.title = tt.title.map(x => t(x, chart.canvas));
        if (Array.isArray(tt.body)) tt.body.forEach(b => { b.lines = b.lines.map(x => t(x, chart.canvas)); });
      },
    });
  }
  function refreshCharts() {
    if (typeof Chart === 'undefined') return;
    document.querySelectorAll('canvas').forEach(cv => {
      const c = Chart.getChart(cv);
      if (c) c.update('none');
    });
  }

  function setLang(next) {
    lang = next === 'es' ? 'es' : 'en';
    document.documentElement.lang = lang;
    translateAll();
    observe(lang === 'es');
    document.dispatchEvent(new CustomEvent('nm-lang-change', { detail: { lang } }));
  }

  function init() {
    loadCatalog();
    chartPlugin();
    let stored = null;
    try {
      stored = localStorage.getItem('nm_lang');
    } catch (e) {
      // localStorage may be unavailable
    }
    // The report is built and printed in the same task: translate it on beforeprint
    window.addEventListener('beforeprint', () => {
      if (lang === 'es') walk(document.getElementById('printReport'));
    });
    if (stored === 'es') setLang('es');
    return lang;
  }

  return {
    init,
    setLang,
    getLang: () => lang,
    /** Spanish for a string (null if none) — for tests and tools */
    lookup,
    /** Catalog entries used so far (keys and pattern sources) — for the coverage tool */
    hits: () => [...hits],
    /** Translate a subtree now (e.g. a report just built) */
    translate: root => { if (lang === 'es') walk(root); },
  };
})();
