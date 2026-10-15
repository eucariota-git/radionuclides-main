'use strict';

/* =========================================================
   I18N_ES — Spanish catalog for the display overlay (js/i18n.js)
   =========================================================
 * exact:    English text as rendered (trimmed) → Spanish. Every key must exist
 *           verbatim in the sources (test/validate-app.js checks it), so an
 *           English text that changes leaves its entry orphaned and the test
 *           fails until the Spanish is updated.
 * patterns: [anchored RegExp, replacement] for texts that carry values; the
 *           captures are copied unchanged (numbers, units, separator).
 *
 * Terminology: docs/I18N_GLOSSARY_ES.md (each term with its official source).
 * References, citations and identifiers are not translated (translate="no").
 */
const I18N_ES = {
  // Context-dependent entries (CSS selector of the element that shows the
  // text), checked before `exact`: "Decay" is a page in the menu and a decay
  // mode in a table.
  scoped: {
    '.site-nav': {
      'Properties': 'Propiedades',
      'Decay': 'Decaimiento',
      'Dose': 'Dosis',
      'Effluent': 'Efluentes',
      'Caregiver': 'Acompañantes',
      'Guide': 'Guía',
    },
  },
  exact: {
    // ---- Header (all pages) ----
    'Skip to main content': 'Saltar al contenido principal',
    'Main navigation': 'Navegación principal',
    'Toggle dark mode': 'Modo oscuro',
    'Decimal comma': 'Coma decimal',
    'Decimal separator of the displayed numbers: point or comma (input accepts both)':
      'Separador decimal de los números mostrados: punto o coma (la entrada admite ambos)',
    'Language of the screens: English or Spanish (calculations and CSV files do not change)':
      'Idioma de las pantallas: inglés o español (los cálculos y los archivos CSV no cambian)',
    'Language: Spanish': 'Idioma: español',
  },
  patterns: [],
};
