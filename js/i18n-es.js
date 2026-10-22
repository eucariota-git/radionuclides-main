'use strict';

/* =========================================================
   I18N_ES — Spanish catalog for the display overlay (js/i18n.js)
   =========================================================
 * scoped:   { CSS selector: { English: Spanish } } — context-dependent texts,
 *           checked first ("Decay" is a page in the menu, a mode in a table).
 * exact:    English text as rendered (trimmed, white space collapsed) →
 *           Spanish. Every key must exist verbatim in the sources (Test 23),
 *           so an English text that changes leaves its entry orphaned and the
 *           test fails until the Spanish is updated.
 * patterns: [anchored RegExp, replacement string or function] for texts built
 *           with values or with data texts; captured values are copied as they
 *           are (numbers, units, decimal separator).
 *
 * Terminology: docs/I18N_GLOSSARY_ES.md. In Spanish, quantity names use the
 * decimal comma — H'(0,07), Hp(0,07) — and the year symbol is «a».
 * References, citations and identifiers are not translated.
 */

// Spanish for a data text (exact entry), or the text itself
const esText = s => (I18N_ES.exact[s] !== undefined ? I18N_ES.exact[s] : s);

// Element names of the curated entries ("Lutetium-177" → "Lutecio-177")
const ES_ELEMENTS = {
  Carbon: 'Carbono', Nitrogen: 'Nitrógeno', Oxygen: 'Oxígeno', Fluorine: 'Flúor', Sodium: 'Sodio', Potassium: 'Potasio',
  Chromium: 'Cromo', Cobalt: 'Cobalto', Iron: 'Hierro', Copper: 'Cobre', Gallium: 'Galio', Selenium: 'Selenio',
  Technetium: 'Tecnecio', Molybdenum: 'Molibdeno', Palladium: 'Paladio', Indium: 'Indio', Iodine: 'Yodo', Xenon: 'Xenón',
  Caesium: 'Cesio', Barium: 'Bario', Samarium: 'Samario', Ytterbium: 'Iterbio', Thulium: 'Tulio', Lutetium: 'Lutecio',
  Rhenium: 'Renio', Iridium: 'Iridio', Gold: 'Oro', Thallium: 'Talio', Yttrium: 'Itrio', Zirconium: 'Circonio',
  Terbium: 'Terbio', Holmium: 'Holmio', Radium: 'Radio', Actinium: 'Actinio',
};
const esNames = s => s
  .replace(/\b([A-Z][a-z]+)(?=-\d)/g, w => ES_ELEMENTS[w] || w)
  .replace(' (equilibrium)', ' (equilibrio)').replace(' (+ daughters)', ' (+ descendientes)');

// Shielding materials as the Dose page names them
const ES_MATERIALS = {
  'Lead (Pb)': 'Plomo (Pb)', 'Iron (Fe)': 'Hierro (Fe)', 'Concrete NW': 'Hormigón normal', 'Concrete LW': 'Hormigón ligero',
  'Concrete, normal-weight': 'Hormigón normal', 'Concrete, light-weight': 'Hormigón ligero', 'Tungsten (W)': 'Wolframio (W)',
};
// Decay-mode names joined by " + " (Dose, nuclides without photons)
const ES_MODES = { 'electron capture': 'captura electrónica', 'electron capture / β+': 'captura electrónica / β+',
  'isomeric transition': 'transición isomérica', 'spontaneous fission': 'fisión espontánea' };
const esModes = s => s.split(' + ').map(m => ES_MODES[m] || m).join(' + ');
// "/y" → "/a" in value strings (year symbol in the Spanish screens)
const esPerYear = s => s.replace(/(Sv|Bq)\/y\b/g, '$1/a');
// Shielding range warnings (screen, report, CSV-independent)
const esShield = s => s
  .replace('OUT OF VALIDATED RANGE — ', 'FUERA DEL INTERVALO VALIDADO — ')
  .replace('⚠ Shielding out of validated range: ', '⚠ Blindaje fuera del intervalo validado: ')
  .replace('⚠ Out of validated range: ', '⚠ Fuera del intervalo validado: ')
  .replace(/(\S+)% of the dose weight sits above the tabulated attenuation range \((.+?) MeV\); μ is held at the \2 MeV value/g,
    '$1 % del peso de dosis queda por encima del intervalo tabulado de atenuación ($2 MeV); μ se mantiene en el valor de $2 MeV')
  .replace(/(\S+)% of the dose weight exceeds (\d+) mean free paths \(deepest line: (.+?) mfp\); the build-up factor is clamped and( underestimates the transmitted dose)?/g,
    (m, p, n, d, u) => `${p} % del peso de dosis supera ${n} recorridos libres medios (línea más profunda: ${d} rlm); el factor de acumulación se limita y${u ? ' subestima la dosis transmitida' : ''}`)
  .replace(/^the transmitted dose/, 'la dosis transmitida')
  .replace(/(\S+)% of the dose weight lies below (\S+) keV, where the (.+?) build-up table starts; B is held at its lowest tabulated energy/g,
    (m, p, e, mat) => `${p} % del peso de dosis está por debajo de ${e} keV, donde empieza la tabla de acumulación de ${(ES_MATERIALS[mat] || mat).replace(/^./, c => c.toLowerCase())}; B se mantiene en su energía tabulada más baja`)
  .replace('Treat the shielding result as an extrapolation', 'Trate el resultado del blindaje como una extrapolación');

// Effluent: "/y" in units, and the report rows of each scenario
const esUnit = u => u.replace(/\/y$/, '/a');
const esEffRow = s => esPerYear(s)
  .split(' GBq/y').join(' GBq/a')
  .replace('external: not available (no Scenario 2 coefficient — not a zero dose)', 'externa: no disponible (sin coeficiente del escenario 2; no es una dosis nula)')
  .replace(' (external ', ' (externa ').replace(', inhalation ', ', inhalación ').replace('; inhalation ', '; inhalación ')
  .replace(' (inhalation only)', ' (solo inhalación)').replace('; C wastewater ', '; C agua residual ').replace('; C wet sludge ', '; C lodo húmedo ')
  .replace(' Bq/m³ per GBq', ' Bq/m³ por GBq');
// Report identifiers with English words around them (Effluent coefficients)
const esReport = s => s
  .replace(/\(coefficient ([AB])\)/, '(coeficiente $1)')
  .replace(/^Tc-99m Scenario 2 report /, 'informe del escenario 2 del Tc-99m ')
  .replace('(air domain accepted with DEV-05)', '(dominio de aire aceptado con DEV-05)');

// Provenance labels built from fixed pieces (Γ source column and notes)
const esSource = s => [
  ['(photon data, incl. progeny in secular equilibrium)', '(datos de fotones, incl. progenie en equilibrio secular)'],
  ['(photon data)', '(datos de fotones)'],
  ['(conversion coefficients)', '(coeficientes de conversión)'],
  ['ICRP 74 Table A.21', 'ICRP 74, tabla A.21'],
  [' (not manually validated)', ' (sin validación manual)'],
  [', incl. progeny', ', incl. progenie'],
  ['source not recorded', 'fuente no registrada'],
  ['K-air', 'K-aire'],
].reduce((t, [en, es]) => t.split(en).join(es), s);

const I18N_ES = {
  scoped: {
    '.site-nav': {
      'Properties': 'Propiedades',
      'Decay': 'Decaimiento',
      'Dose': 'Dosis',
      'Effluent': 'Efluentes',
      'Caregiver': 'Acompañantes',
      'Guide': 'Guía',
    },
    '.about-toc': {
      'Guide': 'Guía',
      'Methods & limitations': 'Métodos y limitaciones',
      'References': 'Referencias',
      'Licences': 'Licencias',
      'Third-party notices': 'Avisos de terceros',
    },
    // Fragments of the Properties reference notes
    '#refList': {
      'not': 'no',
    },
    '#detailProps': {
      'max': 'máx',
    },
    // Decay: subscript of A_target, and a fragment of the exemption note
    'label[for="Atarget"]': {
      'target': 'objetivo',
    },
    '#exemptionContent': {
      'separate': 'distintos',
    },
    // Dose
    '#shieldMaterial': { 'None': 'Ninguno' },
    '#patientTx': { 'none': 'ninguna' },
    '#y90ShieldNote': { 'only': 'solo' },
    '#shieldRangeWarn': { 'underestimates': 'subestima' },
    // Effluent: subscripts and fragments of the method formulas and the cross-check
    '#methodDetails': {
      'transit': 'tránsito', 'water': 'agua', 'air': 'aire', 'dry': 'seco', 'wet': 'húmedo', 'solids': 'sólidos', 'sludge': 'lodo',
      'not': 'no son', 'and k': 'y k',
    },
    '#crossCheckBody': { 'sludge': 'lodo', 'and f': 'y f' },
    '#radiopharmaceutical': { 'Other': 'Otro' },
    // Caregiver method formulas (fragments around <sub>/<sup>)
    '#methodDetails .text-sm': {
      'With Ḣ': 'Con Ḣ', 'the rate at 1 m at discharge, t': 'la tasa a 1 m en el alta, t', 'fast end': 'fin fase rápida', 'discharge': 'alta',
      ') the remaining duration of the fast phase, λ = ln 2 / T': ') la duración restante de la fase rápida, λ = ln 2 / T', 'eff': 'ef', 'when t': 'cuando t',
      '= 0), and two': '= 0), y dos exponenciales', 'consecutive': 'consecutivas',
      'exponentials (the slow phase starts from the rate reached at the end of the fast phase):': '(la fase lenta parte de la tasa alcanzada al final de la fase rápida):',
      'tail': 'cola', 'For a restriction of C days: I': 'Para una restricción de C días: I', 'before': 'antes', 'Ḣ dt and I': 'Ḣ dt e I', 'after': 'después',
      'Dose per cycle and row = I': 'Dosis por ciclo y fila = I', 'during': 'durante',
      ', with f the spatial factor of the profile relative to 1 m; treatment dose = cycles × Σ rows': ', con f el factor espacial del perfil respecto a 1 m; dosis del tratamiento = ciclos × Σ filas',
      '/ 24; dose with an indefinite restriction = cycles · f': '/ 24; dosis con restricción indefinida = ciclos · f',
      '(a floor if f': '(un suelo si f', ', an upper asymptote if f': ', una asíntota superior si f', 'Maximum rate = Ḣ': 'Tasa máxima = Ḣ',
      '· criterion / treatment dose (the dose is proportional to the rate). Minimum restriction: the C that solves cycles · [f':
        '· criterio / dosis del tratamiento (la dosis es proporcional a la tasa). Restricción mínima: el C que resuelve ciclos · [f',
      '(C)] = criterion, analytically in either phase': '(C)] = criterio, analíticamente en cualquiera de las fases',
    },
  },

  exact: {
    // ================= Header and footer (all pages) =================
    'Skip to main content': 'Saltar al contenido principal',
    'Main navigation': 'Navegación principal',
    'Toggle dark mode': 'Modo oscuro',
    'Decimal comma': 'Coma decimal',
    'Decimal separator of the displayed numbers: point or comma (input accepts both)':
      'Separador decimal de los números mostrados: punto o coma (la entrada admite ambos)',
    'Language of the screens: English or Spanish (calculations and CSV files do not change)':
      'Idioma de las pantallas: inglés o español (los cálculos y los archivos CSV no cambian)',
    'Language: Spanish': 'Idioma: español',
    'Keyboard shortcuts': 'Atajos de teclado',
    'search': 'buscar',
    'clear search and close details': 'borrar la búsqueda y cerrar el detalle',
    'dark mode': 'modo oscuro',
    'choose nuclide': 'elegir nucleido',
    'select': 'seleccionar',
    'close list': 'cerrar la lista',
    'NM Radionuclide Planner — For radiation protection estimation purposes. Verify against primary sources for regulatory submissions.':
      'NM Radionuclide Planner — Para estimaciones de protección radiológica. Verifique con las fuentes primarias antes de cualquier presentación reglamentaria.',
    'Original application and code: © 2026 Ramon Sendon · EUPL-1.2 · Third-party data: separate terms —':
      'Aplicación y código originales: © 2026 Ramon Sendon · EUPL-1.2 · Datos de terceros: condiciones propias —',
    'About, guide & licences': 'Acerca de, guía y licencias',

    // ================= About (about.html) =================
    // The guide is a separate Spanish article (docs/USER_GUIDE.es.md); the
    // licence texts and third-party notices stay in English (translate="no")
    'NM Radionuclide Planner — About, Guide & Licences': 'NM Radionuclide Planner — Acerca de, guía y licencias',
    'About, Guide & Licences': 'Acerca de, guía y licencias',
    'User guidance, licence terms and third-party attributions available directly in the app.':
      'Guía de uso, condiciones de licencia y atribuciones de terceros, disponibles directamente en la aplicación.',
    'On this page': 'En esta página',
    'Original application and code: © 2026 Ramon Sendon · EUPL-1.2 · Third-party data: separate terms — About, guide & licences':
      'Aplicación y código originales: © 2026 Ramon Sendon · EUPL-1.2 · Datos de terceros: condiciones propias — Acerca de, guía y licencias',

    // Quantity names (decimal comma in Spanish, RD 1029/2022 Annex I)
    "H'(0.07)": "H'(0,07)",
    "H*(10) and H'(0.07)": "H*(10) y H'(0,07)",

    // ================= Properties (index.html) =================
    'NM Radionuclide Planner — Properties': 'NM Radionuclide Planner — Propiedades',
    'Radionuclide Properties': 'Propiedades de radionucleidos',
    'Search radionuclides': 'Buscar radionucleidos',
    'Search by name, symbol or clinical use…': 'Buscar por nombre, símbolo o uso clínico…',
    'Clear': 'Borrar',
    'Export table as CSV': 'Exportar la tabla como CSV',
    'Export CSV': 'Exportar CSV',
    'All': 'Todos',
    'Therapy': 'Terapia',
    'Brachytherapy': 'Braquiterapia',
    'Other': 'Otros',
    'Radionuclide properties': 'Propiedades de radionucleidos',
    'Nuclide': 'Nucleido',
    'Decay': 'Desintegración',
    'Modality or origin. Curated entries show their modality; extended results show their origin (ICRP 107 or regulatory tables only) and have no modality classification.':
      'Modalidad u origen. Las entradas revisadas muestran su modalidad; los resultados ampliados muestran su origen (ICRP 107 o solo tablas reglamentarias) y no tienen clasificación por modalidad.',
    'Curated entries: modality. Extended results: origin of the record (ICRP 107, or regulatory tables only) — they have no modality classification.':
      'Entradas revisadas: modalidad. Resultados ampliados: origen del registro (ICRP 107 o solo tablas reglamentarias); no tienen clasificación por modalidad.',
    'Modality / origin': 'Modalidad / origen',
    'Gamma K-air. Air kerma rate constant at 1 metre from 1 GBq, in microgray per hour per GBq per square metre.':
      'Gamma K-aire. Constante de tasa de kerma en aire a 1 metro de 1 GBq, en microgray por hora por GBq por metro cuadrado.',
    'Air-kerma rate at 1 m from a 1 GBq point source, without attenuation. See the Γ source column for provenance.':
      'Tasa de kerma en aire a 1 m de una fuente puntual de 1 GBq, sin atenuación. La procedencia figura en la columna «Fuente de Γ».',
    'K-air': 'K-aire',
    'Gamma H star 10. Ambient dose equivalent rate constant for area monitoring and effective-dose estimation, in microsievert per hour per GBq per square metre.':
      'Gamma H asterisco 10. Constante de tasa de equivalente de dosis ambiental, para la vigilancia radiológica de áreas y la estimación de la dosis efectiva, en microsievert por hora por GBq por metro cuadrado.',
    'Ambient dose equivalent rate constant (area monitoring; estimator of effective dose). ICRP 74 Table A.21 coefficients.':
      'Constante de tasa de equivalente de dosis ambiental (vigilancia radiológica de áreas; estimador de la dosis efectiva). Coeficientes de la tabla A.21 de ICRP 74.',
    'Gamma H prime 0.07. Directional dose equivalent rate constant for area monitoring and skin or extremity indication, in microsievert per hour per GBq per square metre.':
      'Gamma H prima 0,07. Constante de tasa de equivalente de dosis direccional, para la vigilancia radiológica de áreas y como indicador para piel o extremidades, en microsievert por hora por GBq por metro cuadrado.',
    'Directional dose equivalent rate constant at 0.07 mm depth (area monitoring; skin/extremity indicator).':
      'Constante de tasa de equivalente de dosis direccional a 0,07 mm de profundidad (vigilancia radiológica de áreas; indicador para piel y extremidades).',
    'Representative energy: Nominal energy carried over from the original data set, for orientation only: curated entries shield and integrate over their full line spectrum, not this value. It is not always the most intense line (Co-60, 1250 keV, and Ir-192, 370 keV, carry a mean energy).':
      'Energía representativa: energía nominal heredada del conjunto de datos original, solo como orientación; en las entradas revisadas el blindaje y la integración usan todo su espectro de líneas, no este valor. No siempre es la línea más intensa (Co-60, 1250 keV, e Ir-192, 370 keV, llevan una energía media).',
    'Nominal energy carried over from the original data set, for orientation only: curated entries shield and integrate over their full line spectrum, not this value. It is not always the most intense line (Co-60, 1250 keV, and Ir-192, 370 keV, carry a mean energy).':
      'Energía nominal heredada del conjunto de datos original, solo como orientación; en las entradas revisadas el blindaje y la integración usan todo su espectro de líneas, no este valor. No siempre es la línea más intensa (Co-60, 1250 keV, e Ir-192, 370 keV, llevan una energía media).',
    'Rep. energy': 'Energía repr.',
    'Liquid effluent individual concentration level in becquerel per litre. One of several IS-28 II.A.4 conditions: a complete assessment also requires the mixture sum, the annual activity limits, an express discharge authorisation and soluble or dispersible material.':
      'Nivel de concentración individual para efluentes líquidos, en becquerel por litro. Es una de varias condiciones de la IS-28 II.A.4: una evaluación completa requiere además la suma de las fracciones de la mezcla, los límites anuales de actividad, la autorización expresa de vertido y que el material sea soluble o dispersable.',
    'Individual concentration level, (1 mSv / e(g)) / 600 L — only ONE of the IS-28 II.A.4 conditions (see the reference notes below).':
      'Nivel de concentración individual, (1 mSv / e(g)) / 600 L: solo UNA de las condiciones de la IS-28 II.A.4 (véanse las notas de referencia más abajo).',
    'Liquid effluent': 'Efluente líquido',
    'Activity concentration value for exemption of practices or clearance of materials under RD 1217/2024 Annex IV Table A1, in kilobecquerel per kilogram.':
      'Valor de concentración de actividad para la exención de prácticas o la desclasificación de materiales según la tabla A1 del anexo IV del RD 1217/2024, en kilobecquerel por kilogramo.',
    'RD 1217/2024 Annex IV Table A1: clearance / exemption level for any quantity of solid material (kBq/kg = Bq/g).':
      'Tabla A1 del anexo IV del RD 1217/2024: nivel de desclasificación / exención para cualquier cantidad de material sólido (kBq/kg = Bq/g).',
    'Exemption /': 'Exención /',
    'clearance': 'desclasificación',
    'Source of the dose rate constants Gamma K-air, Gamma H star 10 and Gamma H prime 0.07.':
      'Fuente de las constantes de tasa de dosis Gamma K-aire, Gamma H asterisco 10 y Gamma H prima 0,07.',
    "Provenance of the three dose-rate constant columns, stated per quantity: K-air may be a published value while H*(10) and H'(0.07) are recalculated. Liquid-effluent and exemption/clearance values have their own regulatory sources.":
      "Procedencia de las tres columnas de constantes de tasa de dosis, indicada por magnitud: K-aire puede ser un valor publicado mientras que H*(10) y H'(0,07) se recalculan. Los valores de efluente líquido y de exención/desclasificación tienen sus propias fuentes reglamentarias.",
    'Γ source': 'Fuente de Γ',
    'Not tabulated': 'No figura en la tabla',
    'K-air, H*, H′: Cornejo (2015)': 'K-aire, H*, H′: Cornejo (2015)',
    'Not applicable': 'No aplicable',
    'No selected photon line': 'Sin línea de fotones seleccionada',
    'Assess mixture components separately': 'Evalúe por separado los componentes de la mezcla',
    'mixture': 'mezcla',
    'Not calculated': 'No calculado',
    'See details': 'Ver detalle',
    'No results in main database.': 'Sin resultados en la base de datos principal.',
    'Search in ICRP 107': 'Buscar en ICRP 107',
    'Γ from ICRP 107 photon lines (E ≥ 20 keV, yield ≥ 0.01 %) and ICRP 74 Table A.21; sources and limits in the reference notes below.':
      'Γ a partir de las líneas de fotones de ICRP 107 (E ≥ 20 keV, rendimiento ≥ 0,01 %) y de la tabla A.21 de ICRP 74; fuentes y límites en las notas de referencia más abajo.',
    '↻ Open in Decay Calculator': '↻ Abrir en la calculadora de decaimiento',
    '🔆 Open in Dose Estimator': '🔆 Abrir en el estimador de dosis',
    'Reference & data notes — sources, method and limits of the values above':
      'Notas de referencia y de datos: fuentes, método y límites de los valores anteriores',
    '32 nuclides:': '32 nucleidos:',
    "Cornejo et al. (2015) provides published comparison values, and its air-kerma constants are the ones shown in the K-air column. H*(10) and H'(0.07) are recalculated using the stated nuclear data (ICRP 107, 2008) and conversion coefficients (ICRP 74, 1996, Table A.21); where they differ from the published values, the difference has not been reconciled.":
      "Cornejo et al. (2015) aporta valores publicados de comparación, y sus constantes de kerma en aire son las que se muestran en la columna K-aire. H*(10) y H'(0,07) se recalculan con los datos nucleares indicados (ICRP 107, 2008) y los coeficientes de conversión (ICRP 74, 1996, tabla A.21); donde difieren de los valores publicados, la diferencia no se ha conciliado.",
    'Ga-68, Zr-89, Cu-67, Tb-161, Ho-166, Ra-223 and Ac-225:': 'Ga-68, Zr-89, Cu-67, Tb-161, Ho-166, Ra-223 y Ac-225:',
    'no published comparison; calculated in the same way. For the two alpha-therapy chains (Ra-223, Ac-225) the constants':
      'sin comparación publicada; calculados del mismo modo. Para las dos cadenas de terapia alfa (Ra-223, Ac-225) las constantes',
    'assume all progeny retained in the source and in secular equilibrium':
      'suponen toda la progenie retenida en la fuente y en equilibrio secular',
    '— check it for the actual source (preparation time, loss of gaseous progeny).':
      '— compruébelo para la fuente real (tiempo desde la preparación, pérdida de progenie gaseosa).',
    'predominantly a β⁻ emitter with no photon line passing the filter; photon dose-rate constants are not applicable on this page. Dose offers a separate, explicitly experimental container-dependent bremsstrahlung scenario; direct beta dose is not calculated.':
      'emisor predominantemente β⁻ sin ninguna línea de fotones que pase el filtro; las constantes de tasa de dosis de fotones no son aplicables en esta página. La página Dosis ofrece aparte un escenario de radiación de frenado (bremsstrahlung), explícitamente experimental y dependiente del contenedor; la dosis beta directa no se calcula.',
    "are both AREA-monitoring operational quantities and are always shown side by side: H*(10) estimates effective dose, H'(0.07) indicates skin/extremity dose. Neither bounds the other (H*(10) is":
      "son ambas magnitudes operacionales de vigilancia radiológica de ÁREAS y se muestran siempre juntas: H*(10) estima la dosis efectiva y H'(0,07) indica la dosis en piel y extremidades. Ninguna acota a la otra (H*(10)",
    'always the higher figure — for Pd-103 the stored Γ': 'es siempre la cifra más alta: para el Pd-103, la Γ',
    'is about 40% below Γ': 'almacenada es alrededor de un 40 % inferior a la Γ',
    '). Personal dosimetry quantities are Hp(10) / Hp(0.07) / Hp(3); limit comparisons in the dose page are indicative screening only.':
      '). Las magnitudes de dosimetría personal son Hp(10) / Hp(0,07) / Hp(3); las comparaciones con límites de la página Dosis son solo cribado orientativo.',
    'Clearance — Table A1': 'Desclasificación — tabla A1',
    '(RD 1217/2024 Annex IV, 257 entries): activity concentration for any quantity of solid material; the same values give the exemption of unlimited quantities (Annex II A.1.c). This is the value of the «Exemption / clearance» column. Not tabulated: Annex III.1.b refers to the European Commission\'s "Radiation Protection 122 Part 1".':
      '(anexo IV del RD 1217/2024, 257 entradas): concentración de actividad para cualquier cantidad de material sólido; los mismos valores dan la exención de cantidades ilimitadas (anexo II A.1.c). Es el valor de la columna «Exención / desclasificación». Si no figura en la tabla: el anexo III.1.b remite a «Radiation Protection 122 Part 1» de la Comisión Europea.',
    'Exemption of moderate quantities — Table B': 'Exención de cantidades moderadas — tabla B',
    '(≤ 1000 kg): two separate criteria, not simultaneous conditions — column 3, total activity in Bq, for radioactive sources (Annex II A.1.a), and column 2, activity concentration in kBq/kg, for materials in moderate quantity (A.1.b). Shown in the detail panel. Not tabulated: Annex II A.3.a (values set by the CSN).':
      '(≤ 1000 kg): dos criterios distintos, no condiciones simultáneas: columna 3, actividad total en Bq, para fuentes radiactivas (anexo II A.1.a), y columna 2, concentración de actividad en kBq/kg, para materiales en cantidad moderada (A.1.b). Se muestran en el panel de detalle. Si no figura en la tabla: anexo II A.3.a (valores establecidos por el CSN).',
    'Both are individual values for one nuclide (mixtures are not evaluated); Decay uses them for single-nuclide estimates.':
      'Ambos son valores individuales para un nucleido (no se evalúan mezclas); la página Decaimiento los usa para estimaciones de un solo nucleido.',
    'Liquid effluent column': 'Columna de efluente líquido',
    "(individual discharge concentration level, every nuclide): (1 mSv / e(g)) / 600 L, IS-28 Annex II II.A.4, with the adult ingestion coefficient e(g) of RD 783/2001 Annex III table a), kept in force by RD 1029/2022 and the CSN Resolution of 3 April 2024 (numerical transcription: ICRP 119 Table F.1); the most restrictive chemical form governs. It is only one condition of II.A.4: the mixture sum of fractions ≤ 1 and the annual activity limits (10 GBq H-3, 1 GBq C-14, < 1 GBq the rest combined) are not evaluated here, and II.A.4 also requires an express discharge authorisation and soluble or readily dispersible material. The facility's authorisation prevails.":
      '(nivel de concentración individual de vertido, para cada nucleido): (1 mSv / e(g)) / 600 L, IS-28, anexo II, II.A.4, con el coeficiente de dosis por ingestión e(g) del adulto de la tabla a) del anexo III del RD 783/2001, mantenido en vigor por el RD 1029/2022 y por la Resolución del CSN de 3 de abril de 2024 (transcripción numérica: ICRP 119, tabla F.1); prevalece la forma química más restrictiva. Es solo una de las condiciones de II.A.4: aquí no se evalúan la suma de las fracciones de la mezcla ≤ 1 ni los límites anuales de actividad (10 GBq de H-3, 1 GBq de C-14, < 1 GBq el resto en conjunto), y II.A.4 exige además autorización expresa de vertido y material soluble o fácilmente dispersable. Prevalece la autorización de la instalación.',
    'Example applications': 'Aplicaciones de ejemplo',
    'shown for the curated nuclides are illustrative. They mix current, historical and research uses and do not indicate marketing authorisation, clinical status or availability in Spain.':
      'que se muestran para los nucleidos revisados son ilustrativas. Mezclan usos actuales, históricos y de investigación, y no indican autorización de comercialización, situación clínica ni disponibilidad en España.',

    // Detail panel
    'Half-life': 'Periodo de semidesintegración',
    'Decay mode': 'Modo de desintegración',
    'Representative photon energy': 'Energía representativa de fotones',
    'keV — nominal, for orientation; the calculations use the full spectrum below':
      'keV — nominal, como orientación; los cálculos usan el espectro completo que figura debajo',
    'Clearance / exemption, Table A1': 'Desclasificación / exención, tabla A1',
    'kBq/kg · RD 1217/2024 Annex IV Table A1': 'kBq/kg · RD 1217/2024, anexo IV, tabla A1',
    'Exemption ≤ 1000 kg, Table B': 'Exención ≤ 1000 kg, tabla B',
    'column 2 (concentration) · column 3 (total activity)': 'columna 2 (concentración) · columna 3 (actividad total)',
    'Individual discharge concentration level': 'Nivel de concentración individual de vertido',
    'Spectrum view': 'Vista del espectro',
    'Yield': 'Rendimiento',
    'Share of Γ': 'Fracción de Γ',
    'Photons per 100 decays, logarithmic scale.': 'Fotones por 100 desintegraciones, escala logarítmica.',
    'Photons per 100 decays, linear scale: lines below about 1 % of the tallest are not visible (the table lists them all).':
      'Fotones por 100 desintegraciones, escala lineal: las líneas por debajo de aproximadamente un 1 % de la más alta no se ven (la tabla las recoge todas).',
    'Y-axis scale': 'Escala del eje Y',
    'Linear': 'Lineal',
    'Yield [%]': 'Rendimiento [%]',
    'Type': 'Tipo',
    'Emitter': 'Emisor',
    'X-ray': 'Rayos X',
    'Annihilation': 'Aniquilación',
    'Photon energy (keV)': 'Energía de los fotones (keV)',
    'Yield (% per decay)': 'Rendimiento (% por desintegración)',
    'Share of Γ H*(10) (%)': 'Fracción de Γ H*(10) (%)',
    'Table B: Annex II A.1 sets separate criteria — a) sources: total activity ≤ column 3; b) material ≤ 1000 kg: concentration ≤ column 2; c) unlimited quantity: Table A1.':
      'Tabla B: el anexo II A.1 establece criterios distintos — a) fuentes: actividad total ≤ columna 3; b) material ≤ 1000 kg: concentración ≤ columna 2; c) cantidad ilimitada: tabla A1.',
    'Annex III.1.b: RP 122 Part 1': 'Anexo III.1.b: RP 122 Part 1',
    'Annex II A.3.a: CSN values': 'Anexo II A.3.a: valores del CSN',
    'ICRP 107 extended entry — no application data': 'Entrada ampliada de ICRP 107 — sin datos de aplicación',
    'Photon emissions': 'Emisiones de fotones',
    'μSv·h⁻¹·GBq⁻¹·m² — ambient dose-equivalent rate constant, calculated from the selected photon lines':
      'μSv·h⁻¹·GBq⁻¹·m² — constante de tasa de equivalente de dosis ambiental, calculada con las líneas de fotones seleccionadas',
    'μSv·h⁻¹·GBq⁻¹·m² — directional dose-equivalent rate constant': 'μSv·h⁻¹·GBq⁻¹·m² — constante de tasa de equivalente de dosis direccional',
    'Short-lived progeny': 'Progenie de periodo corto',
    'Adult ingestion e(g)': 'Coeficiente de ingestión e(g), adulto',
    'Bq/L · IS-28 II.A.4 individual level': 'Bq/L · nivel individual IS-28 II.A.4',
    '⚠ This nuclide is from the ICRP 107 extended database. Photon emissions are available from ICRP Publication 107 (2008). Constants have NOT been manually validated. For clinical/regulatory use, verify against primary sources.':
      '⚠ Este nucleido procede de la base ampliada de ICRP 107. Las emisiones de fotones proceden de la publicación 107 de ICRP (2008). Las constantes NO se han validado manualmente. Para uso clínico o reglamentario, verifíquelas con las fuentes primarias.',
    'Predominantly β⁻ emitter with no photon line passing the filter: photon dose-rate constants are not applicable, and direct beta dose is not calculated by this app. The Dose page provides a separate experimental bremsstrahlung scenario whose estimates depend on container material; they are not primary-source container constants and must not be used for regulatory conclusions.':
      'Emisor predominantemente β⁻ sin ninguna línea de fotones que pase el filtro: las constantes de tasa de dosis de fotones no son aplicables y esta app no calcula la dosis beta directa. La página Dosis ofrece aparte un escenario experimental de radiación de frenado (bremsstrahlung) cuyas estimaciones dependen del material del contenedor; no son constantes de contenedor de fuente primaria y no deben usarse para conclusiones reglamentarias.',
    'None': 'Ninguna',
    'Regulatory values only': 'Solo valores reglamentarios',
    'No adult public ingestion coefficient tabulated under this identifier (e.g. noble gases)':
      'No hay coeficiente de ingestión de adulto del público tabulado con este identificador (p. ej., gases nobles)',

    // Regulatory data texts (data/regulatory.json)
    '(a) Parent radionuclide whose listed progeny is already accounted for in the value: only the parent is checked (Annex II A.3.b).':
      '(a) Radionucleido padre cuya progenie listada ya está incluida en el valor: solo se comprueba el padre (anexo II A.3.b).',
    '(b) Parent radionuclide whose listed progeny is already accounted for in the value: only the parent is checked (Annex II A.3.b).':
      '(b) Radionucleido padre cuya progenie listada ya está incluida en el valor: solo se comprueba el padre (anexo II A.3.b).',
    'Not in Table A1. For clearance, Annex III.1.b applies complementarily the clearance levels of the latest version of the European Commission document "Radiation Protection 122 Part 1" (not included in this app).':
      'No figura en la tabla A1. Para la desclasificación, el anexo III.1.b aplica complementariamente los niveles de desclasificación de la última versión del documento de la Comisión Europea «Radiation Protection 122 Part 1» (no incluido en esta app).',
    'Not in Table B. Annex II A.3.a: the exemption values established by the Consejo de Seguridad Nuclear apply (not included in this app).':
      'No figura en la tabla B. Anexo II A.3.a: se aplican los valores de exención establecidos por el Consejo de Seguridad Nuclear (no incluidos en esta app).',
    'Natural radionuclides in solid materials in secular equilibrium are covered by Table A2 (U-238 and Th-232 series, K-40), with its own conditions (Annex III.3) — not implemented in this app.':
      'Los radionucleidos naturales en materiales sólidos en equilibrio secular se rigen por la tabla A2 (series del U-238 y del Th-232, K-40), con sus propias condiciones (anexo III.3); no implementado en esta app.',
    'Note (1): potassium salts in quantities below 1000 kg are exempt ("Quedan exentas las sales de potasio en cantidades inferiores a 1.000 kg").':
      'Nota (1): «Quedan exentas las sales de potasio en cantidades inferiores a 1.000 kg».',

    // ================= Decay (decay.html) =================
    'NM Radionuclide Planner — Decay Calculator': 'NM Radionuclide Planner — Calculadora de decaimiento',
    'Decay Calculator': 'Calculadora de decaimiento',
    'Parameters': 'Parámetros',
    'Radionuclide': 'Radionucleido',
    'Search nuclide': 'Buscar nucleido',
    'Search nuclide (e.g. Lu-177, F-18, Zr-89)…': 'Buscar nucleido (p. ej., Lu-177, F-18, Zr-89)…',
    'Suggested nuclides': 'Nucleidos sugeridos',
    'Initial Activity A₀': 'Actividad inicial A₀',
    'Initial Activity': 'Actividad inicial',
    'Unit': 'Unidad',
    'Initial activity unit': 'Unidad de la actividad inicial',
    'Reference date & time': 'Fecha y hora de referencia',
    '(local)': '(hora local)',
    'Reference date and time (local time of this device)': 'Fecha y hora de referencia (hora local de este dispositivo)',
    'Target date & time': 'Fecha y hora objetivo',
    '(local, optional)': '(hora local, opcional)',
    'Target date and time (local time of this device)': 'Fecha y hora objetivo (hora local de este dispositivo)',
    '— or — Elapsed time': '— o bien — Tiempo transcurrido',
    'Elapsed time': 'Tiempo transcurrido',
    'Elapsed time unit': 'Unidad del tiempo transcurrido',
    'When filled, this value is used and the target date is ignored': 'Si se rellena, se usa este valor y se ignora la fecha objetivo',
    'Target Activity A': 'Actividad objetivo A',
    '(optional)': '(opcional)',
    'Target Activity': 'Actividad objetivo',
    'Target activity unit': 'Unidad de la actividad objetivo',
    'Calculates time to reach this activity': 'Calcula el tiempo hasta alcanzar esta actividad',
    'Mass of material being assessed': 'Masa del material evaluado',
    'Mass unit': 'Unidad de masa',
    'Mass that contains the entered activity (state whether it includes the container). Enables the Table A1 clearance and Table B (≤ 1000 kg) checks.':
      'Masa que contiene la actividad introducida (indique si incluye el contenedor). Activa las comprobaciones de desclasificación de la tabla A1 y de exención de la tabla B (≤ 1000 kg).',
    'Results update as you type.': 'Los resultados se actualizan al escribir.',
    'Results': 'Resultados',
    'No elapsed time or target date entered: the values below are at t = 0. Enter an':
      'No se ha introducido tiempo transcurrido ni fecha objetivo: los valores siguientes corresponden a t = 0. Introduzca un',
    'elapsed time': 'tiempo transcurrido',
    ', or a': ', o una',
    'target date and time': 'fecha y hora objetivo',
    ', to calculate A(t).': ', para calcular A(t).',
    'Fraction remaining (%)': 'Fracción restante (%)',
    'Elapsed': 'Transcurrido',
    'Activity lost': 'Actividad perdida',
    'Clearance assessment — RD 1217/2024, Annex IV Table A1': 'Evaluación de desclasificación — RD 1217/2024, anexo IV, tabla A1',
    'Exemption assessment — RD 1217/2024, Annex IV Table B': 'Evaluación de exención — RD 1217/2024, anexo IV, tabla B',
    '⚠ Above': '⚠ Por encima',
    '✓ Not above': '✓ No supera',
    'Enter the mass of material to evaluate this criterion.': 'Introduzca la masa del material para evaluar este criterio.',
    'Mass above 1000 kg: Annex II A.1.c applies (Table A1 values, see the clearance block).':
      'Masa superior a 1000 kg: se aplica el anexo II A.1.c (valores de la tabla A1; véase el bloque de desclasificación).',
    'Annex II A.1 of RD 1217/2024 sets': 'El anexo II A.1 del RD 1217/2024 establece criterios de exención',
    'exemption criteria: a) radioactive sources — total activity not above column 3 of Table B (for several sources, Σ Aᵢ/limitᵢ ≤ 1); b) materials in moderate quantity (≤ 1000 kg) — activity per unit mass not above column 2; c) unlimited quantity — Table A1.':
      ': a) fuentes radiactivas — actividad total no superior a la columna 3 de la tabla B (para varias fuentes, Σ Aᵢ/límiteᵢ ≤ 1); b) materiales en cantidad moderada (≤ 1000 kg) — actividad por unidad de masa no superior a la columna 2; c) cantidad ilimitada — tabla A1.',
    'Individual values for one nuclide': 'Valores individuales para un nucleido',
    '; sums over sources or mixtures are not evaluated. Exemption also requires the practice to be justified.':
      '; no se evalúan sumas de fuentes ni mezclas. La exención exige además que la práctica esté justificada.',
    'Decay Curve': 'Curva de decaimiento',
    'Activity at selected time points': 'Actividad en instantes seleccionados',
    'Activity concentration at selected time points': 'Concentración de actividad en instantes seleccionados',
    'Generate a printable calculation report with traceability (sources, method, disclaimer)':
      'Generar un informe de cálculo imprimible con trazabilidad (fuentes, método, advertencia)',
    'Report / PDF': 'Informe / PDF',
    'Export results as CSV': 'Exportar los resultados como CSV',
    'Time': 'Tiempo',
    'Elapsed (h)': 'Transcurrido (h)',
    'Activity (MBq)': 'Actividad (MBq)',
    'Activity (mCi)': 'Actividad (mCi)',
    'Concentration (kBq/kg)': 'Concentración (kBq/kg)',
    'Activity concentration (kBq/kg)': 'Concentración de actividad (kBq/kg)',
    'Decay data from ICRP 107': 'Datos de desintegración de ICRP 107',
    '⚠ ICRP 107 extended entry: decay data have NOT been manually validated. For clinical or regulatory use, verify them against primary sources (ICRP 107, 2008).':
      '⚠ Entrada ampliada de ICRP 107: los datos de desintegración NO se han validado manualmente. Para uso clínico o reglamentario, verifíquelos con las fuentes primarias (ICRP 107, 2008).',
    'Target activity must be a positive value below A₀.': 'La actividad objetivo debe ser un valor positivo inferior a A₀.',
    'Mass of material assessed': 'Masa del material evaluado',
    'A₀ / mass (t = 0)': 'A₀ / masa (t = 0)',
    'Table A1 clearance level': 'Nivel de desclasificación de la tabla A1',
    'Not tabulated in Table A1': 'No figura en la tabla A1',
    'Table A1 clearance level (RD 1217/2024)': 'Nivel de desclasificación de la tabla A1 (RD 1217/2024)',
    'Status at t = 0': 'Situación en t = 0',
    '✓ At or below the individual level': '✓ En el nivel individual o por debajo',
    '⚠ Above the individual level': '⚠ Por encima del nivel individual',
    'Time to reach the Table A1 concentration level': 'Tiempo hasta el nivel de concentración de la tabla A1',
    'Individual level for one nuclide:': 'Nivel individual para un nucleido:',
    "for mixtures, Annex III.1.a requires Σ(Cᵢ/Lᵢ) ≤ 1, which is not evaluated here. For parent entries marked (a), the value refers to the parent's activity and already accounts for the listed progeny. Clearance of materials from authorised practices is subject to the conditions of Annex III; consult the CSN.":
      'para mezclas, el anexo III.1.a exige Σ(Cᵢ/Lᵢ) ≤ 1, que aquí no se evalúa. En las entradas de padre marcadas (a), el valor se refiere a la actividad del padre y ya incluye la progenie listada. La desclasificación de materiales procedentes de prácticas autorizadas está sujeta a las condiciones del anexo III; consulte al CSN.',
    // Errors
    'Select a nuclide from the list.': 'Seleccione un nucleido de la lista.',
    'Activity must be a positive number.': 'La actividad debe ser un número positivo.',
    'Activity is outside the representable range.': 'La actividad está fuera del intervalo representable.',
    'Elapsed time must be a valid number (e.g. 24, 1.5 or 1,5, 1e2).': 'El tiempo transcurrido debe ser un número válido (p. ej., 24, 1.5 o 1,5, 1e2).',
    'Elapsed time must be a non-negative number.': 'El tiempo transcurrido no puede ser negativo.',
    'Enter a reference date and time before using a target date.': 'Introduzca una fecha y hora de referencia antes de usar una fecha objetivo.',
    'Reference and target dates must be valid.': 'Las fechas de referencia y objetivo deben ser válidas.',
    'Target date must be after reference date.': 'La fecha objetivo debe ser posterior a la de referencia.',
    'Mass of material must be a positive number.': 'La masa del material debe ser un número positivo.',
    'Target activity must be a non-negative number.': 'La actividad objetivo no puede ser negativa.',
    'Target activity is outside the representable range.': 'La actividad objetivo está fuera del intervalo representable.',

    // ================= Printed reports (js/report.js and the pages) =================
    'Decay Calculation': 'Cálculo de decaimiento',
    'Generated': 'Generado',
    'Application': 'Aplicación',
    'Database': 'Base de datos',
    'Half-life source': 'Fuente del periodo de semidesintegración',
    'Data status': 'Estado de los datos',
    'Nuclide source': 'Fuente del nucleido',
    'Input parameters': 'Parámetros de entrada',
    'Method & warnings': 'Método y advertencias',
    'Data sources': 'Fuentes de datos',
    'Disclaimer.': 'Advertencia.',
    'Point-source estimate for radiation protection planning. Geometry, scatter, build-up and source-distribution effects are not modelled unless stated. NOT valid for patient dosimetry or treatment planning. Results must be reviewed by a qualified medical physics / radiation protection expert before regulatory or clinical use. Generated by NM Radionuclide Planner, an open-source reference tool provided without warranty of any kind.':
      'Estimación de fuente puntual para la planificación de la protección radiológica. No se modelan la geometría, la dispersión, la acumulación (build-up) ni la distribución de la fuente salvo que se indique. NO es válida para la dosimetría de pacientes ni para la planificación de tratamientos. Los resultados deben ser revisados por un experto cualificado en física médica / protección radiológica antes de cualquier uso reglamentario o clínico. Generado por NM Radionuclide Planner, herramienta de referencia de código abierto proporcionada sin garantía de ningún tipo.',
    'Reviewed by (name / signature): ______________________________': 'Revisado por (nombre / firma): ______________________________',
    'Date: ____________': 'Fecha: ____________',
    'ICRP Publication 107 (2008), extended entry — not manually validated': 'ICRP Publication 107 (2008), entrada ampliada — sin validación manual',
    'Initial activity A₀': 'Actividad inicial A₀',
    'Half-life T½': 'Periodo de semidesintegración T½',
    'Elapsed time t': 'Tiempo transcurrido t',
    'none entered (no elapsed time or target date): values at t = 0': 'no introducido (sin tiempo transcurrido ni fecha objetivo): valores en t = 0',
    'Reference date/time (local)': 'Fecha/hora de referencia (local)',
    'Target date/time (local)': 'Fecha/hora objetivo (local)',
    'Elapsed time source': 'Origen del tiempo transcurrido',
    'Elapsed time entered manually; target date not used': 'Tiempo transcurrido introducido manualmente; no se usa la fecha objetivo',
    'Activity A(t)': 'Actividad A(t)',
    'Target exceeds A₀ and cannot be reached by decay': 'El objetivo supera A₀ y no se puede alcanzar por decaimiento',
    'A target of zero is never reached in finite time (exponential decay)': 'Un objetivo nulo no se alcanza en un tiempo finito (decaimiento exponencial)',
    'Target already reached at t = 0: the target equals the initial activity': 'Objetivo ya alcanzado en t = 0: el objetivo es igual a la actividad inicial',
    'not calculable': 'no calculable',
    'Specific activity at t = 0': 'Actividad específica en t = 0',
    'Clearance level (Table A1)': 'Nivel de desclasificación (tabla A1)',
    'Clearance assessment — RD 1217/2024 Annex IV Table A1': 'Evaluación de desclasificación — RD 1217/2024, anexo IV, tabla A1',
    'Clearance: individual Table A1 level for one nuclide (any quantity, any solid material); the mixture rule Σ(Cᵢ/Lᵢ) ≤ 1 of Annex III.1.a is not evaluated.':
      'Desclasificación: nivel individual de la tabla A1 para un nucleido (cualquier cantidad, cualquier material sólido); no se evalúa la regla de mezclas Σ(Cᵢ/Lᵢ) ≤ 1 del anexo III.1.a.',
    'Exemption assessment — RD 1217/2024 Annex IV Table B (Annex II A.1 a and b)': 'Evaluación de exención — RD 1217/2024, anexo IV, tabla B (anexo II A.1 a y b)',
    'b) Moderate quantity, column 2': 'b) Cantidad moderada, columna 2',
    'not evaluated: no mass of material entered': 'no evaluado: no se ha introducido la masa del material',
    'not applicable: mass above 1000 kg (Annex II A.1.c — Table A1)': 'no aplicable: masa superior a 1000 kg (anexo II A.1.c — tabla A1)',
    'Table B': 'Tabla B',
    'Note': 'Nota',
    'Exemption: Annex II A.1 criteria a) total activity (column 3) and b) activity per unit mass for ≤ 1000 kg (column 2) are separate criteria, shown for one nuclide; sums over several sources or mixtures are not evaluated.':
      'Exención: los criterios del anexo II A.1 a) actividad total (columna 3) y b) actividad por unidad de masa para ≤ 1000 kg (columna 2) son criterios distintos, mostrados para un nucleido; no se evalúan sumas de varias fuentes ni mezclas.',
    'Exponential decay of an isolated nuclide, A(t) = A₀·e^(−λt), with the half-life stated in the header. Dates and times are local times of the device that produced the report.':
      'Decaimiento exponencial de un nucleido aislado, A(t) = A₀·e^(−λt), con el periodo de semidesintegración indicado en la cabecera. Las fechas y horas son las locales del dispositivo que generó el informe.',
    'ICRP 107 extended entry: decay data not manually validated. Verify against primary sources before regulatory use.':
      'Entrada ampliada de ICRP 107: datos de desintegración sin validación manual. Verifíquelos con las fuentes primarias antes de cualquier uso reglamentario.',
    'Chain entry: dose constants include progeny in secular equilibrium; the decay calculation follows the parent half-life (valid once equilibrium is established, i.e. aged ≳ 10 daughter half-lives).':
      'Entrada de cadena: las constantes de dosis incluyen la progenie en equilibrio secular; el cálculo de decaimiento sigue el periodo del padre (válido una vez establecido el equilibrio, es decir, con una antigüedad ≳ 10 periodos del descendiente).',

    // ================= Dose (dose.html) =================
    'NM Radionuclide Planner — Dose Estimator': 'NM Radionuclide Planner — Estimador de dosis',
    'External Dose Estimator': 'Estimador de dosis externa',
    'Point source geometry. Area-monitoring operational quantities:': 'Geometría de fuente puntual. Magnitudes operacionales de vigilancia radiológica de áreas:',
    '(ambient dose equivalent, estimator of effective dose) |': '(equivalente de dosis ambiental, estimador de la dosis efectiva) |',
    "(directional dose equivalent at 0.07 mm, skin/extremity-relevant for low-energy emitters). Personal quantities (Hp(10), Hp(0.07), Hp(3)) are not calculated.":
      '(equivalente de dosis direccional a 0,07 mm, relevante para piel y extremidades con emisores de baja energía). No se calculan las magnitudes personales (Hp(10), Hp(0,07), Hp(3)).',
    'Source Parameters': 'Parámetros de la fuente',
    'Activity A₀': 'Actividad A₀',
    'Activity': 'Actividad',
    'Activity unit': 'Unidad de actividad',
    'Distance d': 'Distancia d',
    'Distance': 'Distancia',
    'Distance unit': 'Unidad de distancia',
    'Point-source approximation (1/d²)': 'Aproximación de fuente puntual (1/d²)',
    'Short distance: check the point-source approximation (real source/shield size matters at a few cm)':
      'Distancia corta: compruebe la aproximación de fuente puntual (a pocos cm importa el tamaño real de la fuente y del blindaje)',
    'Include (equilibrium)': 'Incluir (equilibrio)',
    'Parent only (fresh source)': 'Solo el padre (fuente recién separada)',
    'Shielding': 'Blindaje',
    'Material': 'Material',
    'Shield material': 'Material del blindaje',
    'Thickness': 'Espesor',
    'Thickness unit': 'Unidad del espesor',
    'Patient transmission': 'Transmisión del paciente',
    'Patient transmission (%)': 'Transmisión del paciente (%)',
    'Empty = no patient attenuation. No value is offered: it depends on photon energy, anatomy and orientation — derive it from measurement or a published study for your geometry.':
      'Vacío = sin atenuación del paciente. No se ofrece ningún valor: depende de la energía de los fotones, de la anatomía y de la orientación; obténgalo de una medida o de un estudio publicado para su geometría.',
    '⚠ For': '⚠ Para',
    'the external dose is a bremsstrahlung estimate and shielding is modelled': 'la dosis externa es una estimación de radiación de frenado y el blindaje se modela',
    'through the container selector below the results (PMMA / Pb / W). The general slab material and thickness above do not apply and are disabled while Y-90 is selected.':
      'mediante el selector de contenedor que hay bajo los resultados (PMMA / Pb / W). El material y el espesor generales de lámina indicados arriba no se aplican y quedan desactivados mientras Y-90 esté seleccionado.',
    'Exposure Time': 'Tiempo de exposición',
    'Exposure time per administration': 'Tiempo de exposición por administración',
    'Exposure time': 'Tiempo de exposición',
    'Exposure time unit': 'Unidad del tiempo de exposición',
    'Number of administrations per year': 'Número de administraciones por año',
    'Number of administrations': 'Número de administraciones',
    'Integrate physical decay during exposure?': '¿Integrar el decaimiento físico durante la exposición?',
    'Decay during the dose integral': 'Decaimiento en la integral de dosis',
    'Yes — integrate A(t) over the exposure': 'Sí — integrar A(t) durante la exposición',
    'No — constant activity for the dose integral': 'No — actividad constante en la integral de dosis',
    'Affects only the integrated dose. A₀ is the activity at the start of each exposure, and every administration repeats that assumption; the rate “after decay” is always calculated with decay.':
      'Solo afecta a la dosis integrada. A₀ es la actividad al comienzo de cada exposición, y cada administración repite esa hipótesis; la tasa «tras el decaimiento» se calcula siempre con decaimiento.',
    'Note:': 'Nota:',
    'Estimates for radiation protection using point-source geometry; room scatter and the actual source distribution are not modelled. Not suitable for dosimetric treatment planning.':
      'Estimaciones de protección radiológica con geometría de fuente puntual; no se modelan la dispersión en la sala ni la distribución real de la fuente. No apto para la planificación dosimétrica de tratamientos.',
    'Shielding method': 'Método de blindaje',
    'The shielding method actually used is named under “Shielding details”: the': 'El método de blindaje realmente usado se indica en «Detalles del blindaje»: el',
    'Archer broad-beam fit': 'ajuste de haz amplio de Archer',
    '(Oumano et al. 2025, full photon spectrum) only where a fit exists for the nuclide and material — Tc-99m, F-18, I-131 and Lu-177 behind lead or concrete; otherwise':
      '(Oumano et al. 2025, espectro de fotones completo) solo cuando existe un ajuste para el nucleido y el material — Tc-99m, F-18, I-131 y Lu-177 tras plomo u hormigón; en otro caso, la',
    'spectrum-weighted narrow-beam attenuation with build-up': 'atenuación de haz estrecho ponderada por el espectro con acumulación (build-up)',
    '(dose-weighted sum over the ICRP 107 (2008) photon lines with point-isotropic exposure build-up factors, ANSI/ANS-6.4.3; infinite-medium values, see NUREG/CR-5740 for finite-slab corrections that can move the result in either direction). Barrier scatter is approximated by the selected transmission model.':
      '(suma ponderada por la dosis sobre las líneas de fotones de ICRP 107 (2008) con factores de acumulación de exposición para fuente puntual isótropa, ANSI/ANS-6.4.3; valores de medio infinito, véase NUREG/CR-5740 para las correcciones de lámina finita, que pueden mover el resultado en cualquier sentido). La dispersión en la barrera se aproxima con el modelo de transmisión seleccionado.',
    'Quantity. H star 10 ambient dose equivalent and H prime 0.07 directional dose equivalent are both shown.':
      'Magnitud. Se muestran siempre el equivalente de dosis ambiental H asterisco 10 y el equivalente de dosis direccional H prima 0,07.',
    "Area-monitoring operational quantities: H*(10) ambient dose equivalent (effective-dose estimator) and H'(0.07) directional dose equivalent (skin/extremity indicator). Both are always shown.":
      "Magnitudes operacionales de vigilancia radiológica de áreas: equivalente de dosis ambiental H*(10) (estimador de la dosis efectiva) y equivalente de dosis direccional H'(0,07) (indicador para piel y extremidades). Se muestran siempre las dos.",
    'Quantity': 'Magnitud',
    'Dose-equivalent rate at t = 0': 'Tasa de equivalente de dosis en t = 0',
    'Rate after physical decay over t': 'Tasa tras el decaimiento físico durante t',
    'Reference dose-equivalent rate at 1 metre, at t = 0, with the same shielding and patient attenuation.':
      'Tasa de equivalente de dosis de referencia a 1 metro, en t = 0, con el mismo blindaje y la misma atenuación del paciente.',
    'Dose-equivalent rate at 1 m at t = 0, with the same shielding and patient attenuation (reference)':
      'Tasa de equivalente de dosis a 1 m en t = 0, con el mismo blindaje y la misma atenuación del paciente (referencia)',
    'Ref. at 1 m, t = 0': 'Ref. a 1 m, t = 0',
    'Annual integrated dose equivalent: dose per administration times administrations per year.':
      'Equivalente de dosis integrado anual: dosis por administración multiplicada por las administraciones por año.',
    'Dose equivalent integrated over the exposure time of one administration, multiplied by the administrations per year':
      'Equivalente de dosis integrado durante el tiempo de exposición de una administración, multiplicado por las administraciones por año',
    'Annual integrated H': 'H integrada anual',
    'Notes': 'Notas',
    'ambient dose equivalent (area monitoring) — effective-dose estimator': 'equivalente de dosis ambiental (vigilancia de áreas) — estimador de la dosis efectiva',
    'directional dose equivalent at 0.07 mm (area monitoring) — skin/extremity indicator': 'equivalente de dosis direccional a 0,07 mm (vigilancia de áreas) — indicador para piel y extremidades',
    'Rate at t = 0': 'Tasa en t = 0',
    'Rate after decay': 'Tasa tras el decaimiento',
    'Constant': 'Constante',
    "(no H'(0.07) constant — H*(10) value shown; may underestimate the skin dose of low-energy emitters)":
      "(sin constante H'(0,07): se muestra el valor de H*(10); puede subestimar la dosis en piel de los emisores de baja energía)",
    "(no H'(0.07) constant — H*(10) value used in that row)": "(sin constante H'(0,07): en esa fila se usa el valor de H*(10))",
    "⚠ H'(0.07) from Cornejo et al.": "⚠ H'(0,07) de Cornejo et al.",
    'Dose constants calculated from ICRP 107 photon spectrum using ICRP 74 Table A.21 coefficients and the Cornejo methodology':
      'Constantes de dosis calculadas a partir del espectro de fotones de ICRP 107 con los coeficientes de la tabla A.21 de ICRP 74 y la metodología de Cornejo',
    '⚠ ICRP 107 extended entry: photon emissions and dose constants are computed automatically and have NOT been manually validated. For clinical or regulatory use, verify them against primary sources (ICRP 107, 2008).':
      '⚠ Entrada ampliada de ICRP 107: las emisiones de fotones y las constantes de dosis se calculan automáticamente y NO se han validado manualmente. Para uso clínico o reglamentario, verifíquelas con las fuentes primarias (ICRP 107, 2008).',
    '⚠ Representative energy not defined; shielding calculations use narrow-beam approximation.': '⚠ Energía representativa no definida; el cálculo del blindaje usa la aproximación de haz estrecho.',
    'Shielding details': 'Detalles del blindaje',
    'Method': 'Método',
    'full photon spectrum (published fit)': 'espectro de fotones completo (ajuste publicado)',
    '| first tenth-value layer (TVL) =': '| primera capa decimorreductora (CDR) =',
    '| Transmission =': '| Transmisión =',
    'Archer broad-beam': 'Archer, haz amplio',
    'Narrow beam + build-up': 'Haz estrecho + acumulación',
    "Σ wᵢ·B(Eᵢ)·e⁻ᵘ⁽ᴱᵢ⁾ˣ dose-weighted (ICRP 107) + ANS-6.4.3 build-up, NIST XCOM — weighted separately for H*(10) and H'(0.07)":
      "Σ wᵢ·B(Eᵢ)·e⁻ᵘ⁽ᴱᵢ⁾ˣ ponderada por la dosis (ICRP 107) + acumulación ANS-6.4.3, NIST XCOM — ponderada por separado para H*(10) y H'(0,07)",
    'B(E)·e⁻ᵘˣ + ANS-6.4.3 build-up, NIST XCOM': 'B(E)·e⁻ᵘˣ + acumulación ANS-6.4.3, NIST XCOM',
    'Transmission': 'Transmisión',
    'Thickness / first HVL': 'Espesor / primera CHR',
    'Not the number of halvings: use the transmission': 'No es el número de reducciones a la mitad: use la transmisión',
    'Patient attenuation applied': 'Atenuación del paciente aplicada',
    'No patient attenuation': 'Sin atenuación del paciente',
    'Published fit; applicability range not checked by the app.': 'Ajuste publicado; la app no comprueba su intervalo de aplicabilidad.',
    'Published fit; applicability range not checked by the app': 'Ajuste publicado; la app no comprueba su intervalo de aplicabilidad',
    'Dose-equivalent rate vs distance (unshielded)': 'Tasa de equivalente de dosis frente a la distancia (sin blindaje)',
    'H*(10), ambient': 'H*(10), ambiental',
    "H'(0.07), directional": "H'(0,07), direccional",
    'Distance (m)': 'Distancia (m)',
    'Dose-equivalent rate (μSv/h)': 'Tasa de equivalente de dosis (μSv/h)',
    'Annual dose limit comparison': 'Comparación con los límites anuales de dosis',
    'Indicative screening only': 'Solo cribado orientativo',
    '— area-monitoring estimates compared with RD 1029/2022 annual limits. These operational-quantity estimates do not establish compliance. Apply the dose-assessment and monitoring methods required for the exposure situation.':
      '— estimaciones de vigilancia de áreas comparadas con los límites anuales del RD 1029/2022. Estas estimaciones con magnitudes operacionales no demuestran el cumplimiento. Aplique los métodos de evaluación de dosis y de vigilancia que exija la situación de exposición.',
    'Effective dose': 'Dosis efectiva',
    'of 20 mSv/y worker limit |': 'del límite de 20 mSv/a de los trabajadores expuestos |',
    'of 1 mSv/y public limit': 'del límite de 1 mSv/a de los miembros del público',
    'Lens of eye': 'Cristalino',
    '(screened with H*(10) — the actual assessment requires Hp(3) and the dosimetric history):': '(cribado con H*(10); la evaluación real requiere Hp(3) y el historial dosimétrico):',
    'Both RD 1029/2022 conditions must be satisfied:': 'Deben cumplirse las dos condiciones del RD 1029/2022:',
    'of 50 mSv/y max annual |': 'de la dosis máxima de 50 mSv en un único año oficial |',
    'of 100 mSv per consecutive 5-year period,': 'de 100 mSv a lo largo de cinco años oficiales consecutivos,',
    'projected assuming this same annual dose during 5 years': 'proyectado suponiendo esta misma dosis anual durante 5 años',
    'Skin / extremities': 'Piel / extremidades',
    'of 500 mSv/y limit': 'del límite de 500 mSv/a',
    'Limits: RD 1029/2022 art. 11 (exposed workers: 20 mSv/y effective; skin and extremities 500 mSv/y; lens of the eye 100 mSv in 5 consecutive years with at most 50 mSv in one year, since 22 June 2024) and art. 15 (public: 1 mSv/y). Regulatory limits, not design targets.':
      'Límites: RD 1029/2022, art. 11 (trabajadores expuestos: 20 mSv/a de dosis efectiva; piel y extremidades, 500 mSv/a; cristalino, 100 mSv a lo largo de cinco años oficiales consecutivos con un máximo de 50 mSv en un único año oficial, desde el 22 de junio de 2024) y art. 15 (público: 1 mSv/a). Límites reglamentarios, no objetivos de diseño.',
    'Enter an exposure time > 0 to see the annual limit comparison.': 'Introduzca un tiempo de exposición > 0 para ver la comparación con los límites anuales.',
    // Y-90
    'Y-90 experimental bremsstrahlung scenario': 'Escenario experimental de radiación de frenado de Y-90',
    '(bremsstrahlung component only — direct beta dose is excluded; container-dependent estimates; Zanzonico et al. 1999 provides the formalism, not these constants)':
      '(solo la componente de radiación de frenado — se excluye la dosis beta directa; estimaciones dependientes del contenedor; Zanzonico et al. 1999 aporta el formalismo, no estas constantes)',
    'Y-90 Bremsstrahlung Container:': 'Contenedor de Y-90 (radiación de frenado):',
    'No container': 'Sin contenedor',
    'PMMA (acrylic)': 'PMMA (acrílico)',
    'Lead (Pb)': 'Plomo (Pb)',
    'Tungsten (W)': 'Wolframio (W)',
    'Iron (Fe)': 'Hierro (Fe)',
    'Concrete NW': 'Hormigón normal',
    'Concrete LW': 'Hormigón ligero',
    'Confirm the actual container geometry with measurements or a primary source.': 'Confirme la geometría real del contenedor con medidas o con una fuente primaria.',
    'Experimental scenario — no regulatory screening for Y-90.': 'Escenario experimental: no se hace cribado reglamentario para el Y-90.',
    'The container bremsstrahlung constants are estimates with no primary source: Zanzonico et al. (1999) tabulate constants for soft tissue and bone, not for PMMA / Pb / W container geometries. They are shown to compare containers against each other, and must not be read as a dose assessment or compared with RD 1029/2022 limits. Obtain measured or primary-sourced constants before any regulatory or design use.':
      'Las constantes de radiación de frenado del contenedor son estimaciones sin fuente primaria: Zanzonico et al. (1999) tabulan constantes para tejido blando y hueso, no para geometrías de contenedor de PMMA / Pb / W. Se muestran para comparar los contenedores entre sí y no deben leerse como una evaluación de dosis ni compararse con los límites del RD 1029/2022. Obtenga constantes medidas o de fuente primaria antes de cualquier uso reglamentario o de diseño.',
    'Enter an exposure time > 0 to see the annual scenario dose.': 'Introduzca un tiempo de exposición > 0 para ver la dosis anual del escenario.',
    'Experimental bremsstrahlung component only; direct beta dose is excluded': 'Solo la componente experimental de radiación de frenado; se excluye la dosis beta directa',
    '. The dose shown above is a container-dependent scenario inspired by the Zanzonico et al. formalism (J Nucl Med 40(6):1024–1028, 1999). That publication does not tabulate these container constants; do not use them for design or regulatory conclusions without geometry-specific evidence. The H\'(0.07) figure is not a complete skin/extremity assessment.':
      ". La dosis mostrada arriba es un escenario dependiente del contenedor inspirado en el formalismo de Zanzonico et al. (J Nucl Med 40(6):1024–1028, 1999). Esa publicación no tabula estas constantes de contenedor; no las use para conclusiones de diseño o reglamentarias sin evidencias específicas de la geometría. El valor de H'(0,07) no es una evaluación completa de piel y extremidades.",
    ". Container estimate (methodology after Zanzonico et al. 1999); container values are estimates, not tabulated in that publication. The H'(0.07) figure is NOT a complete skin/extremity assessment: direct beta/electron irradiation is not calculated.":
      ". Estimación de contenedor (metodología según Zanzonico et al. 1999); los valores de contenedor son estimaciones, no tabuladas en esa publicación. El valor de H'(0,07) NO es una evaluación completa de piel y extremidades: no se calcula la irradiación beta/electrónica directa.",
    // No photon line
    'No photon dose estimate with the selected filter.': 'Sin estimación de dosis de fotones con el filtro seleccionado.',
    'electron capture': 'captura electrónica',
    'Not a pure β− emitter: assess the radiological hazard from the actual decay mode and from any progeny.':
      'No es un emisor β− puro: evalúe el riesgo radiológico según el modo de desintegración real y la progenie.',
    'Direct beta/electron dose (skin, extremities) and bremsstrahlung are not calculated here; assess them for the actual source and container.':
      'Aquí no se calculan la dosis beta/electrónica directa (piel, extremidades) ni la radiación de frenado; evalúelas para la fuente y el contenedor reales.',
    'Its short-lived progeny is excluded': 'Su progenie de periodo corto está excluida',
    '(Parent only selected above): select "Include" to estimate the dose from the progeny in equilibrium.':
      '(arriba se ha elegido «Solo el padre»): seleccione «Incluir» para estimar la dosis de la progenie en equilibrio.',
    "No photon line passes the app's filter. Direct beta/electron dose and bremsstrahlung are not calculated here; assess them for the actual source and container.":
      'Ninguna línea de fotones pasa el filtro de la app. Aquí no se calculan la dosis beta/electrónica directa ni la radiación de frenado; evalúelas para la fuente y el contenedor reales.',
    'Direct beta/electron dose (skin, extremities) and bremsstrahlung are not calculated here; assess them for the actual source and container. Zanzonico et al. (J Nucl Med 40(6), 1999) describe a bremsstrahlung methodology.':
      'Aquí no se calculan la dosis beta/electrónica directa (piel, extremidades) ni la radiación de frenado; evalúelas para la fuente y el contenedor reales. Zanzonico et al. (J Nucl Med 40(6), 1999) describen una metodología para la radiación de frenado.',
    'No external photon dose is estimated by this app. Assess the hazard according to the actual decay mode shown above — a β− bremsstrahlung scenario does not apply.':
      'Esta app no estima ninguna dosis externa de fotones. Evalúe el riesgo según el modo de desintegración real indicado arriba; no se aplica un escenario de radiación de frenado β−.',
    // Errors
    'Distance must be a valid number.': 'La distancia debe ser un número válido.',
    'Distance must be a positive number.': 'La distancia debe ser un número positivo.',
    'Shielding thickness must be a non-negative number.': 'El espesor del blindaje no puede ser negativo.',
    'Exposure time per administration must be a valid number.': 'El tiempo de exposición por administración debe ser un número válido.',
    'Exposure time per administration must be a positive number.': 'El tiempo de exposición por administración debe ser un número positivo.',
    'Number of administrations per year must be a positive whole number.': 'El número de administraciones por año debe ser un entero positivo.',
    'Patient transmission must be > 0 % and ≤ 100 %, or empty for no patient attenuation. There is no default: derive it from measurement or a published study for your geometry.':
      'La transmisión del paciente debe ser > 0 % y ≤ 100 %, o quedar vacía si no hay atenuación del paciente. No hay valor por defecto: obténgalo de una medida o de un estudio publicado para su geometría.',
    'The combination of activity, distance, time and administrations is outside the representable range.':
      'La combinación de actividad, distancia, tiempo y administraciones está fuera del intervalo representable.',
    // Dose report
    'External Dose Estimate': 'Estimación de dosis externa',
    'Curated entry computed from ICRP 107 photon data with ICRP 74 Table A.21 coefficients — no published comparison is recorded in this app':
      'Entrada revisada calculada con datos de fotones de ICRP 107 y coeficientes de la tabla A.21 de ICRP 74 — esta app no registra ninguna comparación publicada',
    'ICRP 107 extended entry — constants computed from the ICRP 107 photon spectrum, NOT manually validated against a published constant':
      'Entrada ampliada de ICRP 107 — constantes calculadas a partir del espectro de fotones de ICRP 107, NO validadas manualmente frente a una constante publicada',
    'ESTIMATE, no primary source — container bremsstrahlung constants follow the Zanzonico et al. (1999) methodology, but that publication tabulates soft tissue and bone only, not these container geometries. Not validated; no regulatory verdict is issued for this nuclide':
      'ESTIMACIÓN sin fuente primaria — las constantes de radiación de frenado del contenedor siguen la metodología de Zanzonico et al. (1999), pero esa publicación solo tabula tejido blando y hueso, no estas geometrías de contenedor. Sin validar; no se emite veredicto reglamentario para este nucleido',
    'Not applicable — predominantly β⁻ emitter with no photon line passing the filter; see the experimental container-dependent bremsstrahlung scenario in Dose (direct beta dose is not calculated)':
      'No aplicable — emisor predominantemente β⁻ sin ninguna línea de fotones que pase el filtro; véase el escenario experimental de radiación de frenado dependiente del contenedor en Dosis (no se calcula la dosis beta directa)',
    'none': 'ninguno',
    'Model validity': 'Validez del modelo',
    'No shielding': 'Sin blindaje',
    'Within the tabulated attenuation and build-up ranges': 'Dentro de los intervalos tabulados de atenuación y acumulación',
    'Experimental container estimates; validity not established; no regulatory assessment': 'Estimaciones experimentales de contenedor; validez no establecida; sin evaluación reglamentaria',
    'Administrations per year': 'Administraciones por año',
    'Decay during exposure': 'Decaimiento durante la exposición',
    'integrated A(t)': 'A(t) integrada',
    'no (constant activity for the dose integral)': 'no (actividad constante en la integral de dosis)',
    'Dose rate constants': 'Constantes de tasa de dosis',
    'Progeny in the constants': 'Progenie en las constantes',
    'none (no short-lived progeny under the app criterion)': 'ninguna (sin progenie de periodo corto según el criterio de la app)',
    'H*(10) rate at d, t = 0': 'Tasa de H*(10) a d, t = 0',
    'H*(10) rate at d, after physical decay over the exposure': 'Tasa de H*(10) a d, tras el decaimiento físico durante la exposición',
    'H*(10) rate at 1 m (reference; same shielding and patient attenuation), t = 0': 'Tasa de H*(10) a 1 m (referencia; mismo blindaje y atenuación del paciente), t = 0',
    'Annual integrated H*(10)': 'H*(10) integrada anual',
    'Annual dose limit comparison — indicative screening only (RD 1029/2022 arts. 11 and 15)': 'Comparación con los límites anuales de dosis — solo cribado orientativo (RD 1029/2022, arts. 11 y 15)',
    'Effective dose (screened with H*(10))': 'Dosis efectiva (cribado con H*(10))',
    'Lens of the eye (screened with H*(10); the assessment requires Hp(3) and the dosimetric history)': 'Cristalino (cribado con H*(10); la evaluación requiere Hp(3) y el historial dosimétrico)',
    'No shielding applied.': 'Sin blindaje.',
    'Single-line narrow-beam attenuation with point-isotropic exposure build-up (ANSI/ANS-6.4.3 reference data; NIST XCOM attenuation).':
      'Atenuación de haz estrecho de una sola línea con acumulación de exposición para fuente puntual isótropa (datos de referencia ANSI/ANS-6.4.3; atenuación de NIST XCOM).',
    "No H'(0.07) constant for this nuclide/energy — the H'(0.07) row shows the H*(10) value instead (may underestimate the skin dose of low-energy emitters).":
      "Sin constante H'(0,07) para este nucleido o energía: la fila de H'(0,07) muestra en su lugar el valor de H*(10) (puede subestimar la dosis en piel de los emisores de baja energía).",
    'ICRP 107 extended entry: constants computed automatically, NOT manually validated. Verify against primary sources before regulatory use.':
      'Entrada ampliada de ICRP 107: constantes calculadas automáticamente, SIN validación manual. Verifíquelas con las fuentes primarias antes de cualquier uso reglamentario.',
    'RD 1029/2022 — dose limits used in the regulatory comparison.': 'RD 1029/2022 — límites de dosis usados en la comparación reglamentaria.',
    'NIST XCOM — photon mass attenuation coefficients.': 'NIST XCOM — coeficientes másicos de atenuación de fotones.',
    "ICRP Publication 74 (1996), Table A.21 — conversion coefficients h*(10), h'(0.07,0°) per unit fluence.": "ICRP Publication 74 (1996), Table A.21 — coeficientes de conversión h*(10), h'(0,07,0°) por unidad de fluencia.",
    'Trubey D.K. (1991) NUREG/CR-5740 / ORNL/RSIC-49/R1 — ANSI/ANS-6.4.3 exposure buildup factors (Table 3).': 'Trubey D.K. (1991) NUREG/CR-5740 / ORNL/RSIC-49/R1 — factores de acumulación de exposición ANSI/ANS-6.4.3 (tabla 3).',
    'Oumano et al. (2025) J Appl Clin Med Phys — Archer broad-beam shielding parameters.': 'Oumano et al. (2025) J Appl Clin Med Phys — parámetros de blindaje de haz amplio de Archer.',
    'Zanzonico et al. (1999) J Nucl Med 40(6):1024–1028 — bremsstrahlung dose-rate methodology (the container constants used here are estimates, not tabulated in that publication).':
      'Zanzonico et al. (1999) J Nucl Med 40(6):1024–1028 — metodología de tasa de dosis de radiación de frenado (las constantes de contenedor usadas aquí son estimaciones, no tabuladas en esa publicación).',
    'ICRP 107 (calculated)': 'ICRP 107 (calculado)',
    'ICRP 107 (no photon emission above the 20 keV / 0.01% filter)': 'ICRP 107 (sin emisión de fotones por encima del filtro de 20 keV / 0,01 %)',

    // ================= Effluent (effluent.html) =================
    'NM Radionuclide Planner — Effluent: Sewer and STP Workers': 'NM Radionuclide Planner — Efluentes: trabajadores de alcantarillado y de depuradora',
    'Liquid Effluent — Sewer and STP Workers': 'Efluentes líquidos — trabajadores de alcantarillado y de depuradora',
    'Annual effective dose from activity excreted by nuclear-medicine patients, adapted from NUREG/CR-5814 (1992), for two receptors:':
      'Dosis efectiva anual debida a la actividad excretada por pacientes de medicina nuclear, adaptada de NUREG/CR-5814 (1992), para dos receptores:',
    'Scenario 1': 'Escenario 1',
    'Scenario 2': 'Escenario 2',
    ', sewer system inspector (wastewater + aerosol inhalation), and': ', trabajador de la red de alcantarillado (agua residual + inhalación de aerosol), y el',
    ', sewage-treatment-plant (STP / EDAR) sludge operator (dewatered sludge + resuspended dust). Model and sources under':
      ', trabajador de planta depuradora que manipula lodos (lodo deshidratado + polvo resuspendido). Modelo y fuentes en',
    'Screening estimate, not a complete discharge assessment.': 'Estimación de cribado, no una evaluación completa del vertido.',
    'Within each scenario, doses are computed per nuclide and summed linearly. The two scenarios concern':
      'Dentro de cada escenario, las dosis se calculan por nucleido y se suman linealmente. Los dos escenarios corresponden a',
    'different receptors and are never added together': 'receptores distintos y nunca se suman',
    '. The IS-28 Annex II II.A.4 sewer conditions (per-nuclide concentration level, sum of fractions, annual activity limits) and mixture clearance are evaluated separately. Inhalation uses dose coefficients for adult':
      '. Las condiciones de la IS-28, anexo II, II.A.4, para el alcantarillado (nivel de concentración por nucleido, suma de las fracciones, límites anuales de actividad) y la desclasificación de mezclas se evalúan aparte. La inhalación usa coeficientes de dosis de adultos',
    'members of the public': 'miembros del público',
    '(neither worker is an exposed worker of the licensee).': '(ninguno de los dos es trabajador expuesto del titular).',
    'A. Source term': 'A. Término fuente',
    'Include': 'Incluir',
    'Patients / y': 'Pacientes / a',
    'Cycles / patient': 'Ciclos / paciente',
    'A admin. / cycle (GBq)': 'A admin. / ciclo (GBq)',
    'Fraction of the administered activity excreted in hospital': 'Fracción de la actividad administrada excretada en el hospital',
    'In-hospital fraction': 'Fracción en el hospital',
    'Controlled in hospital decay tanks': 'Controlado en depósitos de decaimiento del hospital',
    'Tanks': 'Depósitos',
    'Activity leaving the hospital — Scenario 1': 'Actividad que sale del hospital — escenario 1',
    'Activity reaching the STP — Scenario 2': 'Actividad que llega a la depuradora — escenario 2',
    'excluded': 'excluido',
    '= patients × cycles × administered activity per cycle; all of it is assumed to be excreted. The fraction excreted':
      '= pacientes × ciclos × actividad administrada por ciclo; se supone que se excreta toda. La fracción excretada',
    'in hospital': 'en el hospital',
    "leaves through the facility's sewer connection — or, for a nuclide controlled in": 'sale por la acometida de alcantarillado de la instalación o, para un nucleido controlado en',
    'decay tanks': 'depósitos de decaimiento',
    ', only its share of the annual tank discharge (shared among the controlled nuclides in proportion to the activity excreted into the tanks; no decay credit when their sum is below it). The rest is excreted at home.':
      ', solo su parte del vertido anual de los depósitos (repartido entre los nucleidos controlados en proporción a la actividad excretada a los depósitos; sin crédito por decaimiento cuando su suma es inferior). El resto se excreta en el domicilio.',
    'receives only the activity leaving the hospital.': 'recibe solo la actividad que sale del hospital.',
    'receives the activity leaving the hospital plus the activity excreted at home by the patients living in the STP catchment.':
      'recibe la actividad que sale del hospital más la excretada en el domicilio por los pacientes que viven en la zona servida por la depuradora.',
    'No included nuclide is controlled in decay tanks.': 'Ningún nucleido incluido se controla en depósitos de decaimiento.',
    'Sources and assumptions of the default source term': 'Fuentes e hipótesis del término fuente por defecto',
    'B. Scenario 1 — sewer system inspector': 'B. Escenario 1 — trabajador de la red de alcantarillado',
    'Facility type': 'Tipo de instalación',
    'Custom (licensee data)': 'Personalizado (datos del titular)',
    "Generic annual water volumes; use the licensee's figure when available.": 'Volúmenes anuales genéricos de agua; use el dato del titular cuando lo haya.',
    'C. Scenario 2 — STP sludge process operator': 'C. Escenario 2 — trabajador de planta depuradora (manipulación de lodos)',
    'Wet sludge production is plant-specific: PRTR-España (': 'La producción de lodo húmedo es propia de cada planta: PRTR-España (',
    '), waste code LER 19 08 05.': '), código de residuo LER 19 08 05.',
    'External coefficient geometry': 'Geometría del coeficiente externo',
    'Sludge mass lateral extent': 'Extensión lateral de la masa de lodo',
    'D. Common parameters': 'D. Parámetros comunes',
    'Sources and assumptions of the parameters': 'Fuentes e hipótesis de los parámetros',
    'Facility presets': 'Valores predefinidos de instalación',
    'Scenario 1 — sewer system inspector': 'Escenario 1 — trabajador de la red de alcantarillado',
    'Scenario 2 — STP sludge process operator': 'Escenario 2 — trabajador de planta depuradora (manipulación de lodos)',
    'DF (transit decay)': 'DF (decaimiento en tránsito)',
    'C wastewater (Bq/m³ per GBq)': 'C agua residual (Bq/m³ por GBq)',
    'C air (Bq/m³ per GBq)': 'C aire (Bq/m³ por GBq)',
    'Dose per unit activity discharged in one year, under the parameters entered': 'Dosis por unidad de actividad vertida en un año, con los parámetros introducidos',
    'Activity leaving the hospital in one year': 'Actividad que sale del hospital en un año',
    'C dry sludge (Bq/kg per GBq)': 'C lodo seco (Bq/kg por GBq)',
    'C wet sludge (Bq/m³ per GBq)': 'C lodo húmedo (Bq/m³ por GBq)',
    'Dose per unit activity reaching the plant in one year, under the parameters entered': 'Dosis por unidad de actividad que llega a la planta en un año, con los parámetros introducidos',
    'Hospital discharge plus the activity excreted at home in the catchment': 'Vertido del hospital más la actividad excretada en el domicilio en la zona servida',
    'Scenario 1 — total E (included nuclides)': 'Escenario 1 — E total (nucleidos incluidos)',
    'Scenario 2 — total E (included nuclides)': 'Escenario 2 — E total (nucleidos incluidos)',
    'No nuclide included.': 'Ningún nucleido incluido.',
    'No external coefficient for Scenario 2': 'Sin coeficiente externo para el escenario 2',
    '(partial)': '(parcial)',
    'n/a — no coefficient (not zero)': 'n/d — sin coeficiente (no es cero)',
    'mSv/y — no comparison (criterion ≤ 0)': 'mSv/a — sin comparación (criterio ≤ 0)',
    'No positive criterion entered: totals are not compared.': 'No se ha introducido un criterio positivo: los totales no se comparan.',
    'E (mSv/y)': 'E (mSv/a)',
    'Leaving hospital (GBq/y)': 'Sale del hospital (GBq/a)',
    'External (mSv/y)': 'Externa (mSv/a)',
    'Inhalation (mSv/y)': 'Inhalación (mSv/a)',
    'Activity reaching STP (GBq/y)': 'Actividad que llega a la depuradora (GBq/a)',
    'ICRP Publication 107 (2008), 160.4 d (not in the curated database).': 'ICRP Publication 107 (2008), 160,4 d (no está en la base revisada).',
    'Coefficients used': 'Coeficientes usados',
    'Relative Monte Carlo standard uncertainty (coverage factor 1) / envelope': 'Incertidumbre típica relativa Monte Carlo (factor de cobertura 1) / envolvente',
    'Lung absorption type — F: fast; M: moderate absorption': 'Tipo de absorción pulmonar — F: rápida; M: moderada',
    'Type (F/M)': 'Tipo (F/M)',
    'Cross-check against published generic factors (indicative)': 'Contraste con factores genéricos publicados (orientativo)',
    'µSv per GBq': 'µSv por GBq',
    'Basis': 'Base',
    'nuclide not included': 'nucleido no incluido',
    'PHITS k, ICRP 116 effective dose': 'k de PHITS, dosis efectiva ICRP 116',
    'NUREG/CR-5814 Table B.7, rescaled': 'NUREG/CR-5814, tabla B.7, reescalada',
    'IAEA SRS-19 Table I–IV': 'IAEA SRS-19, tabla I–IV',
    'Rescaled value: × 400 t / dry sludge mass of this plant. SRS-19 treats the sludge activity as a surface deposit (1 m × 1000 kg/m³) with the ground-surface coefficient, i.e. without self-absorption, which explains most of the difference.':
      'Valor reescalado: × 400 t / masa de lodo seco de esta planta. SRS-19 trata la actividad del lodo como un depósito superficial (1 m × 1000 kg/m³) con el coeficiente de superficie del suelo, es decir, sin autoabsorción, lo que explica la mayor parte de la diferencia.',
    'PHITS coefficients vs NUREG/CR-5814 Table A.21 (GENII-1990)': 'Coeficientes PHITS frente a NUREG/CR-5814, tabla A.21 (GENII-1990)',
    'ratio': 'cociente',
    'No published factor available.': 'No hay ningún factor publicado disponible.',
    'Restore the default values': 'Restaurar los valores por defecto',
    'Defaults': 'Valores por defecto',
    'Method — formulas, sources and adaptations': 'Método — fórmulas, fuentes y adaptaciones',
    'For each nuclide, with A the activity reaching the sewer in one year and DF = exp(−λ·t': 'Para cada nucleido, con A la actividad que llega al alcantarillado en un año y DF = exp(−λ·t',
    "(NUREG/CR-5814 §5.2.1, transit ≈ 0.2 h, dilution in the facility's annual water volume V):": '(NUREG/CR-5814 §5.2.1, tránsito ≈ 0,2 h, dilución en el volumen anual de agua de la instalación V):',
    ') · aerosol loading · f': ') · carga de aerosol · f',
    "(NUREG/CR-5814 §5.2.2, transit ≈ 3 d, the year's discharge retained in the year's sludge):": '(NUREG/CR-5814 §5.2.2, tránsito ≈ 3 d, el vertido del año retenido en el lodo del año):',
    '· dust loading · f': '· carga de polvo · f',
    'No decay during the exposure year is applied. The concentration is the annual discharge divided by the annual water volume (Scenario 1) or by the annual sludge production (Scenario 2), with transit decay only; this is a screening assumption — a continuous discharge does not by itself demonstrate mixing or steady state. f':
      'No se aplica decaimiento durante el año de exposición. La concentración es el vertido anual dividido por el volumen anual de agua (escenario 1) o por la producción anual de lodo (escenario 2), solo con decaimiento en tránsito; es una hipótesis de cribado: un vertido continuo no demuestra por sí solo la mezcla ni el estado estacionario. f',
    'is the retained fraction as entered (default: 100%). k': 'es la fracción retenida introducida (por defecto: 100 %). k',
    'are effective-dose-rate coefficients (ICRP Publication 116 (2010), ROT) calculated with PHITS for the geometry of each scenario — they are':
      'son coeficientes de tasa de dosis efectiva (ICRP Publication 116 (2010), ROT) calculados con PHITS para la geometría de cada escenario;',
    'point-source Γ constants and only apply to that geometry.': 'constantes Γ de fuente puntual y solo se aplican a esa geometría.',
    'Algorithms and defaults are adapted from the reference workbooks': 'Los algoritmos y los valores por defecto se adaptan de los libros de referencia',
    '(Scenario 2) and': '(escenario 2) y',
    '(Scenario 1).': '(escenario 1).',
    'Inhalation coefficients are those for adult members of the public (RD 783/2001 Annex III table b), kept by the CSN Resolution of 3 April 2024; transcription: ICRP Publication 119 (2012), Table G.1), lung absorption type F (fast) or M (moderate). Half-lives are taken from the app database (Lu-177m, not a curated entry, from ICRP 107).':
      'Los coeficientes de inhalación son los de adultos miembros del público (RD 783/2001, anexo III, tabla b), mantenidos por la Resolución del CSN de 3 de abril de 2024; transcripción: ICRP Publication 119 (2012), tabla G.1), con absorción pulmonar de tipo F (rápida) o M (moderada). Los periodos de semidesintegración se toman de la base de datos de la app (el Lu-177m, que no es una entrada revisada, de ICRP 107).',
    'The entered values are outside the representable range': 'Los valores introducidos están fuera del intervalo representable',
    'Annual discharge from decay tanks must be a finite number ≥ 0': 'El vertido anual de los depósitos de decaimiento debe ser un número finito ≥ 0',
    'Catchment fraction must be between 0 and 100 %': 'La fracción de la zona servida debe estar entre 0 y 100 %',
    // Effluent report
    'Liquid Effluent — Sewer and STP Workers (NUREG/CR-5814 Scenarios 1 and 2)': 'Efluentes líquidos — trabajadores de alcantarillado y de depuradora (escenarios 1 y 2 de NUREG/CR-5814)',
    'Nuclides': 'Nucleidos',
    'Source term': 'Término fuente',
    'Decay tanks': 'Depósitos de decaimiento',
    'Controlled nuclides': 'Nucleidos controlados',
    'Excreted into the tanks': 'Excretado a los depósitos',
    'Annual tank discharge (shared)': 'Vertido anual de los depósitos (repartido)',
    'Scenario 1 parameters': 'Parámetros del escenario 1',
    'Scenario 2 parameters': 'Parámetros del escenario 2',
    'Common parameters': 'Parámetros comunes',
    'Coefficients': 'Coeficientes',
    'no coefficient': 'sin coeficiente',
    'Total (linear sum over included nuclides)': 'Total (suma lineal de los nucleidos incluidos)',
    'The two scenarios concern different receptors; their totals are not added together.': 'Los dos escenarios corresponden a receptores distintos; sus totales no se suman.',
    "All administered activity is assumed to be excreted. Scenario 1 receives the activity leaving the hospital (excreted in hospital, or the share of the decay-tank discharge for controlled nuclides), diluted in the facility's annual water volume. Scenario 2 receives that activity plus the activity excreted at home by the patients living in the STP catchment.":
      'Se supone que se excreta toda la actividad administrada. El escenario 1 recibe la actividad que sale del hospital (excretada en el hospital o, para los nucleidos controlados, la parte del vertido de los depósitos de decaimiento), diluida en el volumen anual de agua de la instalación. El escenario 2 recibe esa actividad más la excretada en el domicilio por los pacientes que viven en la zona servida por la depuradora.',
    'Scenario 2 screening model: retained fraction as entered (default: 100%) of the activity reaching the plant, in one year of sludge (IAEA SRS-19 (2001) §4.9 case b; NUREG/CR-5814 (1992) §5.1). Annual discharge / annual sludge production, with transit decay only; no decay during the exposure year.':
      'Modelo de cribado del escenario 2: fracción retenida introducida (por defecto: 100 %) de la actividad que llega a la planta, en un año de lodo (IAEA SRS-19 (2001) §4.9, caso b; NUREG/CR-5814 (1992) §5.1). Vertido anual / producción anual de lodo, solo con decaimiento en tránsito; sin decaimiento durante el año de exposición.',
    'Not a complete discharge assessment: IS-28 Annex II II.A.4 conditions and mixture clearance are evaluated separately.':
      'No es una evaluación completa del vertido: las condiciones de la IS-28, anexo II, II.A.4, y la desclasificación de mezclas se evalúan aparte.',
    'Inhalation dose coefficients for adult members of the public: RD 783/2001 Annex III table b), kept by the CSN Resolution of 3 April 2024 (numerical transcription: ICRP Publication 119 (2012) Table G.1). Absorption type F: fast; M: moderate.':
      'Coeficientes de dosis por inhalación de adultos miembros del público: RD 783/2001, anexo III, tabla b), mantenidos por la Resolución del CSN de 3 de abril de 2024 (transcripción numérica: ICRP Publication 119 (2012), tabla G.1). Tipo de absorción F: rápida; M: moderada.',
    'The criterion is user-defined; the app attributes no regulatory basis to it.': 'El criterio lo define el usuario; la app no le atribuye base reglamentaria.',
    'Generic screening estimate of the doses to a sewer system inspector and to a sewage-treatment-plant sludge operator, for radiation protection planning. The external coefficients apply only to the declared geometries. Results must be reviewed by a qualified radiation protection expert before regulatory use. Generated by NM Radionuclide Planner, an open-source reference tool provided without warranty of any kind.':
      'Estimación genérica de cribado de las dosis a un trabajador de la red de alcantarillado y a un trabajador de planta depuradora que manipula lodos, para la planificación de la protección radiológica. Los coeficientes externos solo se aplican a las geometrías declaradas. Los resultados deben ser revisados por un experto cualificado en protección radiológica antes de cualquier uso reglamentario. Generado por NM Radionuclide Planner, herramienta de referencia de código abierto proporcionada sin garantía de ningún tipo.',
    // Effluent data texts (data/effluent-scenarios.json)
    "Breathing rate (light work)":
      "Tasa de respiración (trabajo ligero)",
    "Air breathed per hour of exposure (light work).":
      "Aire respirado por hora de exposición (trabajo ligero).",
    "Dose criterion for comparison":
      "Criterio de dosis para la comparación",
    "Your own comparison value. The app attributes no regulatory basis to it; a value ≤ 0 means no comparison.":
      "Valor de comparación propio. La app no le atribuye base reglamentaria; un valor ≤ 0 significa que no se compara.",
    "Annual discharge from decay tanks (sum of controlled nuclides)":
      "Vertido anual de los depósitos de decaimiento (suma de los nucleidos controlados)",
    "Total annual release from the decay tanks, shared among the nuclides marked “Tanks”; no decay credit.":
      "Vertido anual total de los depósitos de decaimiento, repartido entre los nucleidos marcados como «Depósitos»; sin crédito por decaimiento.",
    "Water discharged by the facility":
      "Agua vertida por la instalación",
    "Annual water discharged by the facility; the activity leaving the hospital is diluted in it. Site-specific.":
      "Agua vertida al año por la instalación; en ella se diluye la actividad que sale del hospital. Propio del emplazamiento.",
    "Water density":
      "Densidad del agua",
    "Converts the wastewater concentration to a mass basis for the aerosol model.":
      "Convierte la concentración en el agua residual a base másica para el modelo de aerosol.",
    "Aerosol loading in air":
      "Carga de aerosol en el aire",
    "Mass of wastewater aerosol per m³ of air breathed by the inspector.":
      "Masa de aerosol de agua residual por m³ de aire respirado por el trabajador.",
    "Respirable fraction":
      "Fracción respirable",
    "Fraction of the aerosol that is respirable (0–1).":
      "Fracción del aerosol que es respirable (0–1).",
    "External exposure time":
      "Tiempo de exposición externa",
    "Hours per year the inspector spends above the wastewater.":
      "Horas al año que el trabajador pasa sobre el agua residual.",
    "Inhalation exposure time":
      "Tiempo de exposición por inhalación",
    "Hours per year without respiratory protection.":
      "Horas al año sin protección respiratoria.",
    "Geometry factor on external dose":
      "Factor de geometría de la dosis externa",
    "Multiplier on the external dose; 1 = model geometry (water slab, receptor 1 m above its surface).":
      "Multiplicador de la dosis externa; 1 = geometría del modelo (lámina de agua, receptor a 1 m sobre su superficie).",
    "Decay time from discharge to the inspector":
      "Tiempo de decaimiento desde el vertido hasta el trabajador",
    "Decay between discharge and the inspector’s position.":
      "Decaimiento entre el vertido y la posición del trabajador.",
    "Patients living in the STP catchment":
      "Pacientes que viven en la zona servida por la depuradora",
    "Share of patients whose home discharges to this treatment plant. Applies only to the activity excreted at home.":
      "Proporción de pacientes cuyo domicilio vierte a esta depuradora. Solo se aplica a la actividad excretada en el domicilio.",
    "Wet (dewatered) sludge production":
      "Producción de lodo húmedo (deshidratado)",
    "Annual mass of dewatered sludge produced by the plant. Site-specific; the default has not been verified.":
      "Masa anual de lodo deshidratado que produce la planta. Propio de la planta; el valor por defecto no se ha verificado.",
    "Solids fraction of wet sludge":
      "Fracción de sólidos del lodo húmedo",
    "Dry-matter fraction of the dewatered sludge (0–1). Site hypothesis; affects only inhalation.":
      "Fracción de materia seca del lodo deshidratado (0–1). Hipótesis del emplazamiento; solo afecta a la inhalación.",
    "Wet sludge density":
      "Densidad del lodo húmedo",
    "Density of the dewatered sludge; converts Bq/kg to Bq/m³ for the external pathway.":
      "Densidad del lodo deshidratado; convierte Bq/kg en Bq/m³ para la vía externa.",
    "Dust loading in air":
      "Carga de polvo en el aire",
    "Mass of resuspended dry sludge per m³ of air breathed by the operator.":
      "Masa de lodo seco resuspendido por m³ de aire respirado por el trabajador.",
    "Fraction of the dust that is respirable (0–1).":
      "Fracción del polvo que es respirable (0–1).",
    "Fraction of discharged activity retained in sludge":
      "Fracción de la actividad vertida retenida en el lodo",
    "Fraction of the activity reaching the plant that stays in the sludge (0–1). Default 1 = 100 %, a screening assumption.":
      "Fracción de la actividad que llega a la planta y queda en el lodo (0–1). Por defecto 1 = 100 %, hipótesis de cribado.",
    "Hours per year the operator spends near the sludge.":
      "Horas al año que el trabajador pasa cerca del lodo.",
    "Hours per year exposed to resuspended dust.":
      "Horas al año de exposición al polvo resuspendido.",
    "Geometry / shielding factor on external dose":
      "Factor de geometría / blindaje de la dosis externa",
    "Multiplier on the external dose; 1 = no credit for structures or distance.":
      "Multiplicador de la dosis externa; 1 = sin crédito por estructuras ni distancia.",
    "Decay time from discharge to sludge press":
      "Tiempo de decaimiento desde el vertido hasta la prensa de lodos",
    "Decay between discharge and the sludge press. No further decay is applied.":
      "Decaimiento entre el vertido y la prensa de lodos. No se aplica ningún otro decaimiento.",
    "ICRP light-work breathing rate (workbook cell D38).":
      "Tasa de respiración de ICRP para trabajo ligero (celda D38 del libro).",
    "User-defined. Workbook default (cell D60). No regulatory basis is attributed by the app.":
      "Definido por el usuario. Valor por defecto del libro (celda D60). La app no le atribuye base reglamentaria.",
    "IS-28 Annex II II.A.4: annual discharge strictly below 1 GBq for the sum of nuclides other than H-3 and C-14 (the facility's authorisation prevails). The 1 GBq/y default is that boundary — a boundary scenario, not a demonstration of compliance.":
      "IS-28, anexo II, II.A.4: vertido anual estrictamente inferior a 1 GBq para la suma de los nucleidos distintos del H-3 y del C-14 (prevalece la autorización de la instalación). El valor por defecto de 1 GBq/a es ese límite: un escenario de frontera, no una demostración de cumplimiento.",
    "Site-specific: obtain from the licensee (consumption ≈ discharge in a hospital). Workbook generic values (cell D20): hospital 20 000 m³/y, clinic 3650 m³/y.":
      "Propio del emplazamiento: obténgalo del titular (en un hospital, consumo ≈ vertido). Valores genéricos del libro (celda D20): hospital 20 000 m³/a, clínica 3650 m³/a.",
    "Mass basis for the aerosol resuspension model (workbook cell D21).":
      "Base másica del modelo de resuspensión de aerosol (celda D21 del libro).",
    "NUREG/CR-5814 §5.2.1 (20 h/y; respirator worn most of the time).":
      "NUREG/CR-5814 §5.2.1 (20 h/a; se lleva protección respiratoria la mayor parte del tiempo).",
    "Workbook cell D37 (water slab at 1 m, no correction).":
      "Celda D37 del libro (lámina de agua a 1 m, sin corrección).",
    "NUREG/CR-5814 §5.2.1 (≈ 0.2 h). Workbook cell D42: 0.008333 d.":
      "NUREG/CR-5814 §5.2.1 (≈ 0,2 h). Celda D42 del libro: 0,008333 d.",
    "Site-specific; applies only to the activity excreted at home (the hospital discharges to this STP). Workbook default (cell D10).":
      "Propio del emplazamiento; solo se aplica a la actividad excretada en el domicilio (el hospital vierte a esta depuradora). Valor por defecto del libro (celda D10).",
    "Site-specific: PRTR-España (prtr-es.miteco.gob.es), waste code LER 19 08 05. Default 5090 t/y = value of the reference workbook for STP PRTR code 7504; it has NOT been verified against the PRTR declaration (year, waste and mass basis).":
      "Propio del emplazamiento: PRTR-España (prtr-es.miteco.gob.es), código de residuo LER 19 08 05. Por defecto 5090 t/a = valor del libro de referencia para la depuradora con código PRTR 7504; NO se ha verificado con la declaración PRTR (año, residuo y base másica).",
    "Site hypothesis: value of the reference workbook, which cites PEMAR 2025-2035; no 20–25 % solids range has been found in the PEMAR. NUREG/CR-5814 uses 0.30. Only the inhalation pathway depends on it (the external pathway uses the wet-sludge concentration).":
      "Hipótesis del emplazamiento: valor del libro de referencia, que cita el PEMAR 2025-2035; en el PEMAR no se ha encontrado un intervalo de sólidos del 20–25 %. NUREG/CR-5814 usa 0,30. Solo depende de él la vía de inhalación (la vía externa usa la concentración en lodo húmedo).",
    "NUREG/CR-5814 (1992), Table A.16.":
      "NUREG/CR-5814 (1992), tabla A.16.",
    "NUREG/CR-5814 §5.2.2 (1.0E-4 g/m³); range 5E-8 – 5E-6 kg/m³. Same value in IAEA SRS-19 §6.6.2.":
      "NUREG/CR-5814 §5.2.2 (1,0E-4 g/m³); intervalo 5E-8 – 5E-6 kg/m³. Mismo valor en IAEA SRS-19 §6.6.2.",
    "NUREG/CR-5814 §5.1 and IAEA SRS-19 §4.9 case (b): all activity to sludge (conservative screening assumption).":
      "NUREG/CR-5814 §5.1 e IAEA SRS-19 §4.9, caso (b): toda la actividad pasa al lodo (hipótesis de cribado conservadora).",
    "NUREG/CR-5814 §5.2.2 (1500 h/y; range 500–1750 h/y). ISCORS 2004 §4.7.3: 1000 h/y.":
      "NUREG/CR-5814 §5.2.2 (1500 h/a; intervalo 500–1750 h/a). ISCORS 2004 §4.7.3: 1000 h/a.",
    "NUREG/CR-5814 §5.2.2 (300 h/y; range 100–350 h/y).":
      "NUREG/CR-5814 §5.2.2 (300 h/a; intervalo 100–350 h/a).",
    "Workbook cell D41 (no credit for structures).":
      "Celda D41 del libro (sin crédito por estructuras).",
    "NUREG/CR-5814 §5.2.2 (~3 d; range 3 – 50+ d).":
      "NUREG/CR-5814 §5.2.2 (~3 d; intervalo 3 – 50+ d).",
    "Workbook 'Efluentes - Dosis precisas escenarios 1_2_4 v2.xlsx', sheet Escenario-1, cell D20. Generic values; use the licensee's figure when available.":
      "Libro 'Efluentes - Dosis precisas escenarios 1_2_4 v2.xlsx', hoja Escenario-1, celda D20. Valores genéricos; use el dato del titular cuando lo haya.",
    "Model geometry: 10 × 10 × 3 m sludge mass; receptor 2 m above centre":
      "Geometría del modelo: masa de lodo de 10 × 10 × 3 m; receptor a 2 m sobre el centro",
    "Model geometry: 45 × 45 × 3 m sludge mass (2025 m²); receptor 2 m above centre":
      "Geometría del modelo: masa de lodo de 45 × 45 × 3 m (2025 m²); receptor a 2 m sobre el centro",
    "Comparable in size to a sludge press / hopper (3–6 m, NUREG/CR-5814 §5.2.2), a 100 m² biosolids pile (ISCORS 2004-03 §4.7.3) and drying beds 3.0–3.7 m wide (NUREG/CR-6289). The coefficient belongs to this model geometry; its use for a specific plant must be justified.":
      "De tamaño comparable a una prensa de lodos / tolva (3–6 m, NUREG/CR-5814 §5.2.2), a una pila de biosólidos de 100 m² (ISCORS 2004-03 §4.7.3) y a eras de secado de 3,0–3,7 m de anchura (NUREG/CR-6289). El coeficiente corresponde a esta geometría del modelo; su uso para una planta concreta debe justificarse.",
    "Default. The largest sludge element found in the Spanish plants reviewed is 616 m² (EDAR Sur de Madrid). The coefficient belongs to this model geometry; its use for a specific plant must be justified.":
      "Por defecto. El mayor elemento de lodo encontrado en las plantas españolas revisadas mide 616 m² (EDAR Sur de Madrid). El coeficiente corresponde a esta geometría del modelo; su uso para una planta concreta debe justificarse.",
    "NUREG/CR-5814 prescribes an infinite slab; no released coefficient covers it. For Lu-177 the PHITS study measured that the 45 × 45 m coefficient captures 73–75 % of the infinite slab (10 × 10 m: ≈ 51 %). No equivalent measurement exists for I-131.":
      "NUREG/CR-5814 prescribe una lámina infinita; ningún coeficiente publicado la cubre. Para el Lu-177, el estudio PHITS midió que el coeficiente de 45 × 45 m recoge el 73–75 % de la lámina infinita (10 × 10 m: ≈ 51 %). No existe una medida equivalente para el I-131.",
    "Water slab 600 × 200 × 50 cm (6 m³), receptor 1 m above the centre of its surface":
      "Lámina de agua de 600 × 200 × 50 cm (6 m³), receptor a 1 m sobre el centro de su superficie",
    "NUREG/CR-5814 §5.2.1 and Table A.20. The coefficients are photon-only: bremsstrahlung from beta and positron emission is not included and has not been bounded for this geometry (the CSDA range in air of a 0.5 MeV electron exceeds the 1 m distance). The limitation is more severe for F-18 and I-131 than for Lu-177, and least for Tc-99m.":
      "NUREG/CR-5814 §5.2.1 y tabla A.20. Los coeficientes son solo de fotones: no incluyen la radiación de frenado de la emisión beta y de positrones, que no se ha acotado para esta geometría (el alcance CSDA en aire de un electrón de 0,5 MeV supera la distancia de 1 m). La limitación es mayor para el F-18 y el I-131 que para el Lu-177, y menor para el Tc-99m.",
    "Administered activity per cycle":
      "Actividad administrada por ciclo",
    "Activity per treatment taken from the workbook (= activity at hospital discharge, NOT the administered activity)":
      "Actividad por tratamiento tomada del libro (= actividad en el alta hospitalaria, NO la actividad administrada)",
    "Lu-177m impurity per cycle":
      "Impureza de Lu-177m por ciclo",
    "Administered activity per study":
      "Actividad administrada por estudio",
    "Workbook defaults (cells D9, D11, D12); fraction excreted in hospital = 1 − 0.55 (workbook f_san, cell D14). Site-specific.":
      "Valores por defecto del libro (celdas D9, D11, D12); fracción excretada en el hospital = 1 − 0,55 (f_san del libro, celda D14). Propio del emplazamiento.",
    "Workbook I-131 estimate (cells G6, G56): 0.8 GBq per patient, half of it excreted at home; the fraction excreted in hospital is 1 − 0.5. One treatment per patient is an assumption of this scenario, not a clinical rule. Site-specific.":
      "Estimación del libro para el I-131 (celdas G6, G56): 0,8 GBq por paciente, la mitad excretada en el domicilio; la fracción excretada en el hospital es 1 − 0,5. Un tratamiento por paciente es una hipótesis de este escenario, no una regla clínica. Propio del emplazamiento.",
    "The 0.8 GBq default is the activity with which patients leave hospital in the reference workbook (cells G6, G56), entered here in the administered-activity field: the in-hospital excretion of the administered activity is therefore not represented by this default. Replace it with the administered activity and an in-hospital fraction justified for the facility.":
      "El valor por defecto de 0,8 GBq es la actividad con la que los pacientes salen del hospital en el libro de referencia (celdas G6, G56), introducida aquí en el campo de actividad administrada: por tanto, este valor no representa la excreción en el hospital de la actividad administrada. Sustitúyalo por la actividad administrada y una fracción en el hospital justificada para la instalación.",
    "NUREG/CR-5814 Table B.7: I-131, 3 d decay, 3.9E-2 rem/y for 1 Ci/y (≈ 10.5 µSv/GBq), external dose from the GENII-1990 'STP WKR' factor (effective dose equivalent, ICRP 26/30 era) for a 1 m deep infinite slab at 2 m. Rescaled to the user plant by dry sludge mass and solids fraction.":
      "NUREG/CR-5814, tabla B.7: I-131, 3 d de decaimiento, 3,9E-2 rem/a por 1 Ci/a (≈ 10,5 µSv/GBq), dosis externa con el factor 'STP WKR' de GENII-1990 (equivalente de dosis efectiva, época de ICRP 26/30) para una lámina infinita de 1 m de espesor a 2 m. Reescalada a la planta del usuario por la masa de lodo seco y la fracción de sólidos.",
    "IAEA SRS-19 (2001) Table I–IV: 400 t/y dry sludge, no transit decay, 2000 h/y. Annex I uses an occupancy of 0.288 where 2000/8760 = 0.228, so the factor may be 26 % high. Indicative only.":
      "IAEA SRS-19 (2001), tabla I–IV: 400 t/a de lodo seco, sin decaimiento en tránsito, 2000 h/a. El anexo I usa una ocupación de 0,288 cuando 2000/8760 = 0,228, por lo que el factor puede estar un 26 % alto. Solo orientativo.",
    "Impurity of carrier-added Lu-177: 0.01 % of 7.4 GBq per cycle (Workbook 'Efluentes - Dosis precisas escenarios 1_2_4 v2.xlsx', sheet Escenario-2, cell D11). Fraction excreted in hospital = 1 − 0.55. Site-specific.":
      "Impureza del Lu-177 con portador: 0,01 % de 7,4 GBq por ciclo (libro 'Efluentes - Dosis precisas escenarios 1_2_4 v2.xlsx', hoja Escenario-2, celda D11). Fracción excretada en el hospital = 1 − 0,55. Propio del emplazamiento.",
    "No default in the workbooks: enter the facility's data. Fraction excreted in hospital 0.45 = 1 − the workbook's generic 0.55.":
      "Sin valor por defecto en los libros: introduzca los datos de la instalación. Fracción excretada en el hospital 0,45 = 1 − el 0,55 genérico del libro.",
    "Workbook 'Efluentes - Dosis precisas escenarios 1_2_4 v2.xlsx', sheet Escenario-1 (cells D9–D13). Fraction excreted in hospital = 1 − 0.55. Site-specific.":
      "Libro 'Efluentes - Dosis precisas escenarios 1_2_4 v2.xlsx', hoja Escenario-1 (celdas D9–D13). Fracción excretada en el hospital = 1 − 0,55. Propio del emplazamiento.",
    "No Scenario 2 coefficient has been calculated (the workbook's 0 means 'not calculated'); after 3 d of transit the F-18 decay factor is about 1E-12.":
      "No se ha calculado coeficiente del escenario 2 (el 0 del libro significa 'no calculado'); tras 3 d de tránsito, el factor de decaimiento del F-18 es del orden de 1E-12.",
    "NUREG/CR-5814 Table A.21 (pp. A.54–A.56), 'Modified external dose factors for GENII, Sv/yr per Bq/m3 (8-Aug-90)': column 'SEWER MAINT 1.0 m' (Scenario 1) and 'STP WKR 0.15 m' (Scenario 2). Converted with 1 y = 8766 h, the convention that reproduces Table B.7. GENII-1990 effective dose equivalent (ICRP 26/30 era) and NUREG geometries (Table A.20); Lu-177 and Lu-177m are not tabulated. Indicative comparison only; the differences have not been investigated.":
      "NUREG/CR-5814, tabla A.21 (pp. A.54–A.56), 'Modified external dose factors for GENII, Sv/yr per Bq/m3 (8-Aug-90)': columna 'SEWER MAINT 1.0 m' (escenario 1) y 'STP WKR 0.15 m' (escenario 2). Convertidos con 1 a = 8766 h, la convención que reproduce la tabla B.7. Equivalente de dosis efectiva de GENII-1990 (época de ICRP 26/30) y geometrías del NUREG (tabla A.20); el Lu-177 y el Lu-177m no están tabulados. Comparación solo orientativa; las diferencias no se han investigado.",
    "Adaptations of NUREG/CR-5814, not reproductions: Scenario 1 dilutes the annual facility discharge in its annual water volume (NUREG used 10 % of the 10 CFR 20 concentrations); Scenario 2 uses finite 3 m deep PHITS geometries instead of the 1 m infinite slab, and site source terms instead of 1 Ci/y.":
      "Adaptaciones de NUREG/CR-5814, no reproducciones: el escenario 1 diluye el vertido anual de la instalación en su volumen anual de agua (el NUREG usaba el 10 % de las concentraciones de 10 CFR 20); el escenario 2 usa geometrías PHITS finitas de 3 m de espesor en lugar de la lámina infinita de 1 m, y términos fuente del emplazamiento en lugar de 1 Ci/a.",

    // ================= Caregiver (caregiver.html, js/caregiver.js) =================
    'NM Radionuclide Planner — Caregiver Dose after Discharge': 'NM Radionuclide Planner — Dosis a acompañantes tras el alta',
    'Caregiver Dose — External Exposure after Discharge': 'Dosis a acompañantes — exposición externa tras el alta',
    'External dose to one caregiver, relative or third party from a Lu-177 or I-131 therapy patient after discharge, with the maximum discharge rate and the minimum restriction period that meet the selected criterion.':
      'Dosis externa a una persona cuidadora, familiar o tercera persona debida a un paciente tratado con Lu-177 o I-131 tras el alta, con la tasa máxima en el alta y el periodo mínimo de restricción que cumplen el criterio seleccionado.',
    'Screening estimate for one person and equal cycles.': 'Estimación de cribado para una persona y ciclos iguales.',
    'The integral of the measured operational quantity is used as an estimator of external exposure; it is not automatically the individual effective dose nor the fetal dose. Internal contamination, the dose before discharge and other sources are not included. The criteria per category are':
      'La integral de la magnitud operacional medida se usa como estimador de la exposición externa; no es automáticamente la dosis efectiva individual ni la dosis fetal. No se incluyen la contaminación interna, la dosis antes del alta ni otras fuentes. Los criterios por categoría son',
    'evaluation criteria adopted by the department': 'criterios de evaluación adoptados por el servicio',
    ', not values fixed by regulation for this treatment.': ', no valores fijados por la normativa para este tratamiento.',
    'A. Case data': 'A. Datos del caso',
    'Kinetics preset': 'Cinética predefinida',
    'Custom (values entered)': 'Personalizada (valores introducidos)',
    'Fills radiopharmaceutical, fast phase, half-lives, cycles and profile. See the sources below.': 'Rellena el radiofármaco, la fase rápida, los periodos, los ciclos y el perfil. Véanse las fuentes más abajo.',
    'Radiopharmaceutical': 'Radiofármaco',
    'Used only to warn when the proximity profile does not match it.': 'Solo se usa para avisar cuando el perfil de proximidad no corresponde.',
    'Dose rate measured at 1 m at discharge (µSv/h)': 'Tasa de dosis medida a 1 m en el alta (µSv/h)',
    'Dose rate at 1 m at discharge': 'Tasa de dosis a 1 m en el alta',
    'Discharge time after administration (h)': 'Momento del alta tras la administración (h)',
    'Discharge time after administration': 'Momento del alta tras la administración',
    'End of the fast phase after administration (h)': 'Final de la fase rápida tras la administración (h)',
    'End of the fast phase after administration': 'Final de la fase rápida tras la administración',
    '24 h in Kurth et al. (2018) and Demir et al. (2016); 0 = no fast phase.': '24 h en Kurth et al. (2018) y Demir et al. (2016); 0 = sin fase rápida.',
    'Fast effective half-life (h)': 'Periodo efectivo rápido (h)',
    'Fast effective half-life': 'Periodo efectivo rápido',
    'Required: discharge precedes the end of the fast phase.': 'Necesario: el alta es anterior al final de la fase rápida.',
    'Not used: discharge is at or after the end of the fast phase.': 'No se usa: el alta coincide con el final de la fase rápida o es posterior.',
    'Slow effective half-life (h)': 'Periodo efectivo lento (h)',
    'Slow effective half-life': 'Periodo efectivo lento',
    'Number of equal cycles': 'Número de ciclos iguales',
    'Category of the exposed person': 'Categoría de la persona expuesta',
    'Method › Criteria per category': 'Método › Criterios por categoría',
    'Manual criterion (mSv per treatment)': 'Criterio manual (mSv por tratamiento)',
    'Manual criterion': 'Criterio manual',
    'Not used (only for «Other criterion»).': 'No se usa (solo para «Otro criterio»).',
    'Required for «Other criterion».': 'Necesario para «Otro criterio».',
    'Minimum restriction of the product information (d, optional)': 'Restricción mínima de la ficha técnica (d, opcional)',
    'Minimum restriction of the product information': 'Restricción mínima de la ficha técnica',
    'Lower bound for the adopted restriction.': 'Límite inferior de la restricción adoptada.',
    'Proximity profile': 'Perfil de proximidad',
    'Kinetics presets and their sources': 'Cinéticas predefinidas y sus fuentes',
    'Values entered by hand. Choose a preset to fill the kinetics from the literature.': 'Valores introducidos a mano. Elija una cinética predefinida para rellenarla con datos de la literatura.',
    'Rate (µSv/h)': 'Tasa (µSv/h)',
    'Factor relative to 1 m': 'Factor respecto a 1 m',
    '1 (fixed)': '1 (fijo)',
    'B. Cohabitation': 'B. Convivencia',
    'Contact': 'Contacto',
    'Restriction days counted from discharge': 'Días de restricción contados desde el alta',
    'Restriction (d from discharge)': 'Restricción (d desde el alta)',
    'During (h/d)': 'Durante (h/d)',
    'During (m)': 'Durante (m)',
    'After (h/d)': 'Después (h/d)',
    'After (m)': 'Después (m)',
    'Dose / cycle (mSv)': 'Dosis / ciclo (mSv)',
    'Day-time cohabitation': 'Convivencia diurna',
    'Sleeping in the same room': 'Dormir en la misma habitación',
    'Hours per day during the restriction': 'Horas al día durante la restricción',
    'Distance during the restriction (m)': 'Distancia durante la restricción (m)',
    'Hours per day after the restriction': 'Horas al día después de la restricción',
    'Distance after the restriction (m)': 'Distancia después de la restricción (m)',
    'Hours are mutually exclusive: sleeping is not counted as day-time cohabitation. «Sleeping in the same room» during the restriction is usually 0 h (sleeping apart). Zero hours = no contact; the distance may then be left empty. The distance is chosen from the profile list; 0.1 m = contact. Days are counted from discharge and each cycle is integrated to infinity. The criterion covers only the administrations entered; it does not by itself demonstrate annual compliance.':
      'Las horas son excluyentes: dormir no cuenta como convivencia diurna. «Dormir en la misma habitación» durante la restricción suele ser 0 h (dormir aparte). Cero horas = sin contacto; la distancia puede quedar vacía. La distancia se elige de la lista del perfil; 0,1 m = contacto. Los días se cuentan desde el alta y cada ciclo se integra hasta el infinito. El criterio solo cubre las administraciones introducidas; no demuestra por sí solo el cumplimiento anual.',
    'Dose per administration': 'Dosis por administración',
    'Dose of the treatment': 'Dosis del tratamiento',
    'Applied criterion': 'Criterio aplicado',
    'Margin to the criterion': 'Margen respecto al criterio',
    'Inverse calculations (same restriction in both rows)': 'Cálculos inversos (misma restricción en las dos filas)',
    'Maximum rate at 1 m at discharge with the restrictions entered': 'Tasa máxima a 1 m en el alta con las restricciones introducidas',
    'Treatment dose with an indefinite restriction (floor)': 'Dosis del tratamiento con restricción indefinida (suelo)',
    'Treatment dose with an indefinite restriction (upper asymptote — restricting increases the dose)': 'Dosis del tratamiento con restricción indefinida (asíntota superior: restringir aumenta la dosis)',
    'Treatment dose with an indefinite restriction (same as without restriction)': 'Dosis del tratamiento con restricción indefinida (igual que sin restricción)',
    'Treatment dose with an indefinite restriction': 'Dosis del tratamiento con restricción indefinida',
    'Minimum restriction': 'Restricción mínima',
    'Adopted restriction (rounded up, ≥ product information)': 'Restricción adoptada (redondeada al alza, ≥ ficha técnica)',
    'Treatment dose with the adopted restriction': 'Dosis del tratamiento con la restricción adoptada',
    'Write the adopted restriction in the days column of both cohabitation rows': 'Escribir la restricción adoptada en la columna de días de las dos filas de convivencia',
    'Use the adopted restriction in the table': 'Usar la restricción adoptada en la tabla',
    'Treatment dose vs restriction': 'Dosis del tratamiento frente a la restricción',
    'Same restriction in both cohabitation rows, with the hours and distances of the table. The curve tends to the dose with an indefinite restriction. With less contact during the restriction than after it, that value is a floor: below it the dose can only be lowered by reducing contact during the restriction. With more contact during it, the curve rises towards it (upper asymptote) and restricting only increases the dose.':
      'Misma restricción en las dos filas de convivencia, con las horas y distancias de la tabla. La curva tiende a la dosis con restricción indefinida. Con menos contacto durante la restricción que después, ese valor es un suelo: por debajo de él la dosis solo puede reducirse disminuyendo el contacto durante la restricción. Con más contacto durante ella, la curva sube hacia ese valor (asíntota superior) y restringir solo aumenta la dosis.',
    'Treatment dose versus restriction days': 'Dosis del tratamiento frente a los días de restricción',
    'No curve: the inputs are rejected (see the status above).': 'Sin curva: las entradas se rechazan (véase la situación arriba).',
    'No curve: with the same restriction in both rows the hours during the restriction would exceed 24 h/day.': 'Sin curva: con la misma restricción en las dos filas, las horas durante la restricción superarían 24 h/día.',
    'Self-check:': 'Autocomprobación:',
    'A: the result is recomputed with an independent formulation in µSv and h for the current inputs. B: that formulation reproduces the reference cases of the source workbook v6 (restriction 3 d from discharge, 6 cycles, fast phase ending at 24 h). «REVIEW» means a formula has been altered.':
      'A: el resultado se recalcula con una formulación independiente en µSv y h para las entradas actuales. B: esa formulación reproduce los casos de referencia del libro de origen v6 (restricción de 3 d desde el alta, 6 ciclos, fase rápida que termina a las 24 h). «REVISAR» significa que se ha alterado una fórmula.',
    'Check': 'Comprobación',
    'Value': 'Valor',
    'Status': 'Estado',
    'REVIEW': 'REVISAR',
    'reference cases OK — current case not checked (inputs rejected)': 'casos de referencia OK — caso actual no comprobado (entradas rechazadas)',
    'reference cases OK; current case not checked (inputs rejected)': 'casos de referencia OK; caso actual no comprobado (entradas rechazadas)',
    'Method — formulas, assumptions, profiles, criteria and references': 'Método — fórmulas, hipótesis, perfiles, criterios y referencias',
    'Integration in SI (Sv/s, s, Sv); the interface uses µSv/h, h, d and mSv.': 'Integración en SI (Sv/s, s, Sv); la interfaz usa µSv/h, h, d y mSv.',
    'Assumptions': 'Hipótesis',
    'Proximity profiles and provenance': 'Perfiles de proximidad y procedencia',
    'Profile': 'Perfil',
    'Source': 'Fuente',
    'Nature': 'Naturaleza',
    'entered': 'introducido',
    'rate / rate at 1 m': 'tasa / tasa a 1 m',
    'Criteria per category': 'Criterios por categoría',
    'Category': 'Categoría',
    'Criterion (mSv / treatment)': 'Criterio (mSv / tratamiento)',
    'References': 'Referencias',
    'Treatment dose vs restriction (mSv)': 'Dosis del tratamiento frente a la restricción (mSv)',
    'Treatment dose (mSv)': 'Dosis del tratamiento (mSv)',
    // Cohabitation scenarios and preset spread (v1.17.0)
    "Cohabitation scenario":
      "Escenario de convivencia",
    "See":
      "Véase",
    "Method › Cohabitation conditions":
      "Método › Condiciones de convivencia",
    "Fills the hours and distances of both rows and proposes the category; the restriction days are not changed.":
      "Rellena las horas y distancias de las dos filas y propone la categoría; no cambia los días de restricción.",
    "Free scenario: hours, distances and row names entered by hand; the category is not checked against the Forum.":
      "Escenario libre: horas, distancias y nombres de fila introducidos a mano; la categoría no se contrasta con el Foro.",
    "Row name (free scenario)":
      "Nombre de la fila (escenario libre)",
    "Spread in the source:":
      "Dispersión en la fuente:",
    "Cohabitation conditions — Foro (2011), Table 3.B 1":
      "Condiciones de convivencia — Foro (2011), tabla 3.B 1",
    "Person":
      "Persona",
    "Normal cohabitation":
      "Convivencia normal",
    "During the restriction":
      "Durante la restricción",
    "Row in the app":
      "Fila en la app",
    "During (h / m)":
      "Durante (h / m)",
    "After (h / m)":
      "Después (h / m)",
    "Category (first: proposed)":
      "Categoría (la primera, propuesta)",
    "Spread in the source":
      "Dispersión en la fuente",
    "not applicable (kinetics entered by hand)":
      "no aplicable (cinética introducida a mano)",
    "Scenario":
      "Escenario",
    // js/caregiver.js
    'Missing data: discharge rate, discharge time, end of the fast phase, slow half-life or number of cycles': 'Faltan datos: tasa en el alta, momento del alta, final de la fase rápida, periodo lento o número de ciclos',
    'Invalid rate, times, half-life or number of cycles': 'Tasa, tiempos, periodo o número de ciclos no válidos',
    'Invalid minimum restriction of the product information: leave it empty or enter a number ≥ 0': 'Restricción mínima de la ficha técnica no válida: déjela vacía o introduzca un número ≥ 0',
    'Select a proximity profile': 'Seleccione un perfil de proximidad',
    'Missing fast half-life: discharge precedes the end of the fast phase': 'Falta el periodo rápido: el alta es anterior al final de la fase rápida',
    'Check the fast phase: 0 < T fast ≤ T slow': 'Revise la fase rápida: 0 < T rápida ≤ T lenta',
    'A restriction is shorter than the minimum of the product information (SmPC).': 'Una restricción es más corta que el mínimo de la ficha técnica.',
    'Contact during the restriction is greater than after it (spatial factor × hours): restricting increases the dose. Check the cohabitation table.':
      'El contacto durante la restricción es mayor que después (factor espacial × horas): restringir aumenta la dosis. Revise la tabla de convivencia.',
    'Discharge after the end of the fast phase: the discharge rate must already be measured in the slow phase.': 'Alta posterior al final de la fase rápida: la tasa en el alta debe medirse ya en la fase lenta.',
    'Cohabitation exceeds 24 hours/day in some period': 'La convivencia supera 24 horas/día en algún periodo',
    'Dose calculated; a positive dose criterion is missing': 'Dosis calculada; falta un criterio de dosis positivo',
    'Within the applied criterion': 'Dentro del criterio aplicado',
    'Exceeds the applied criterion': 'Supera el criterio aplicado',
    'The cohabitation table uses fewer days than the adopted restriction': 'La tabla de convivencia usa menos días que la restricción adoptada',
    'The cohabitation table covers the adopted restriction': 'La tabla de convivencia cubre la restricción adoptada',
    "Restriction days not entered: the minimum and adopted restriction do not depend on them. Enter the days, or use the adopted restriction, to get the dose of the table and the maximum rate.":
      "Días de restricción no introducidos: la restricción mínima y la adoptada no dependen de ellos. Introduzca los días, o use la restricción adoptada, para obtener la dosis de la tabla y la tasa máxima.",
    "Restriction days not entered in the cohabitation table":
      "Días de restricción no introducidos en la tabla de convivencia",
    'Does not depend on the restriction: criterion met': 'No depende de la restricción: criterio cumplido',
    'Unattainable: reduce contact': 'Inalcanzable: reduzca el contacto',
    'Unattainable: with more contact during the restriction than after it, any restriction increases the dose — reduce contact':
      'Inalcanzable: con más contacto durante la restricción que después, cualquier restricción aumenta la dosis; reduzca el contacto',
    'Unattainable: reduce contact during the restriction': 'Inalcanzable: reduzca el contacto durante la restricción',
    'Not applicable: with the same restriction in both rows the hours during the restriction exceed 24 h/day': 'No aplicable: con la misma restricción en las dos filas, las horas durante la restricción superan 24 h/día',
    'Direct calculation (dose per cycle)': 'Cálculo directo (dosis por ciclo)',
    'Inverse calculation: minimum restriction': 'Cálculo inverso: restricción mínima',
    'Inverse calculation: maximum rate': 'Cálculo inverso: tasa máxima',
    // Caregiver report
    'Caregiver Dose after Discharge': 'Dosis a acompañantes tras el alta',
    'Kinetics': 'Cinética',
    'Entered by hand (no preset)': 'Introducida a mano (sin cinética predefinida)',
    'Case data': 'Datos del caso',
    'Category / criterion': 'Categoría / criterio',
    'not entered': 'no introducida',
    'not used': 'no se usa',
    'Cohabitation': 'Convivencia',
    'Warnings': 'Avisos',
    'Maximum rate at 1 m at discharge': 'Tasa máxima a 1 m en el alta',
    'Adopted restriction': 'Restricción adoptada',
    'Self-check': 'Autocomprobación',
    'Overall': 'Global',
    'Screening estimate of the external dose to one person from a discharged radionuclide-therapy patient, for radiation protection planning. The criteria per category are evaluation criteria adopted by the department, not values fixed by regulation for this treatment. Literature factors are not an individual validation of the patient. Results must be reviewed by a qualified radiation protection expert before use. Generated by NM Radionuclide Planner, an open-source reference tool provided without warranty of any kind.':
      'Estimación de cribado de la dosis externa a una persona debida a un paciente dado de alta tras una terapia con radionucleidos, para la planificación de la protección radiológica. Los criterios por categoría son criterios de evaluación adoptados por el servicio, no valores fijados por la normativa para este tratamiento. Los factores de la literatura no son una validación individual del paciente. Los resultados deben ser revisados por un experto cualificado en protección radiológica antes de su uso. Generado por NM Radionuclide Planner, herramienta de referencia de código abierto proporcionada sin garantía de ningún tipo.',
    // Caregiver data texts (data/caregiver.json)
    "Port of the author's workbook Dosis_acompanantes_simple_v2.1.xlsx (sheets Dosis, Curva and Comprobación).":
      "Adaptación del libro del autor Dosis_acompanantes_simple_v2.1.xlsx (hojas Dosis, Curva y Comprobación).",
    "A preset fills the radiopharmaceutical, the end of the fast phase, the effective half-lives, the number of cycles and the proximity profile. It never changes the measured discharge rate, the discharge time, the category or the cohabitation table. Literature values describe a cohort, not the patient. Under each preset, «Spread in the source» gives the dispersion the source publishes, with its statistic named (mean ± SD, median with quartiles and range, or spread of literature values). It describes the cohort, not an interval for the patient: mean + 2 SD is only a reference high value. No SD is derived here from ranges or quartiles.":
      "Una cinética predefinida rellena el radiofármaco, el final de la fase rápida, los periodos efectivos, el número de ciclos y el perfil de proximidad. Nunca cambia la tasa en el alta medida, el momento del alta, la categoría ni la tabla de convivencia. Los valores de la literatura describen una cohorte, no al paciente. Bajo cada cinética, «Dispersión en la fuente» da la dispersión que publica la fuente, con el estadístico indicado (media ± DE, mediana con cuartiles y extremos, o dispersión de los valores de la literatura). Describe la cohorte, no un intervalo para el paciente: media + 2 DE es solo un valor alto de referencia. Aquí no se deduce ninguna DE a partir de intervalos o cuartiles.",
    "Evaluation criteria adopted by the department, not values fixed by regulation for this treatment. Scope: one person, the whole treatment (all cycles together) — the ICRP «episode» (the duration of a given release after therapy) is applied to the complete treatment, which is the more restrictive reading. Carers are people who, outside their occupation, knowingly and voluntarily help in the care of the patient (RD 601/2019, art. 7.1); children and pregnant women are assessed with the public category. The criterion only changes the comparison and the inverse calculations, never the calculated dose.":
      "Criterios de evaluación adoptados por el servicio, no valores fijados por la normativa para este tratamiento. Alcance: una persona, el tratamiento completo (todos los ciclos juntos); el «episodio» de ICRP (la duración de una liberación concreta tras la terapia) se aplica al tratamiento completo, que es la lectura más restrictiva. Las personas cuidadoras son las que, fuera de su ocupación, ayudan consciente y voluntariamente en la atención del paciente (RD 601/2019, art. 7.1); los niños y las embarazadas se evalúan con la categoría de público. El criterio solo cambia la comparación y los cálculos inversos, nunca la dosis calculada.",
    "Maximum rate: the discharge rate that exactly exhausts the criterion with the restrictions of the table (the dose is proportional to the rate). Minimum restriction: days that exhaust the criterion applying the same duration to both rows; \"Unattainable\" = not met however long it lasts: contact during the restriction must be reduced. To apply it, enter the adopted restriction in the days column of the cohabitation table.":
      "Tasa máxima: la tasa en el alta que agota exactamente el criterio con las restricciones de la tabla (la dosis es proporcional a la tasa). Restricción mínima: días que agotan el criterio aplicando la misma duración a las dos filas; «Inalcanzable» = no se cumple por larga que sea: hay que reducir el contacto durante la restricción. Para aplicarla, introduzca la restricción adoptada en la columna de días de la tabla de convivencia.",
    "Own-measurement protocol to record: radiopharmaceutical, distance reference, posture, orientation and time of measurement.":
      "Protocolo de medida propia que debe registrarse: radiofármaco, referencia de distancia, postura, orientación y momento de la medida.",
    "The intermediate distances of the approximate profiles [2], [3] are model evaluations, not measurements, and 6.25 is not a measured ratio: the spatial ratios measured by Demir [4] vary with time. The d^-1.5 approximation of IAEA SRS-63 [10] is not adopted as a universal profile.":
      "Las distancias intermedias de los perfiles aproximados [2], [3] son evaluaciones del modelo, no medidas, y 6,25 no es un cociente medido: los cocientes espaciales medidos por Demir [4] varían con el tiempo. La aproximación d^-1,5 de IAEA SRS-63 [10] no se adopta como perfil universal.",
    "Reference cases of workbook v6 (Comprobación sheet B): restriction 3 d from discharge, 6 cycles, fast phase ending at 24 h. Carer: 6 h/d at 1 m during the restriction; afterwards 6 h/d at 1 m and 8 h/d in contact (factor 6.25) → fr = 0.25, fn = 2.3333. Non-carer adult: 6 h/d at 1 m with no shared rest → fr = fn = 0.25. Expected values rounded to 2 decimals.":
      "Casos de referencia del libro v6 (hoja Comprobación B): restricción de 3 d desde el alta, 6 ciclos, fase rápida que termina a las 24 h. Persona cuidadora: 6 h/d a 1 m durante la restricción; después, 6 h/d a 1 m y 8 h/d en contacto (factor 6,25) → fr = 0,25, fn = 2,3333. Adulto no cuidador: 6 h/d a 1 m sin descanso compartido → fr = fn = 0,25. Valores esperados redondeados a 2 decimales.",
    "I-131 (NaI) — thyroid remnant ablation, Foro (2011)":
      "I-131 (NaI) — ablación de restos tiroideos, Foro (2011)",
    "I-131 (NaI) — thyroid cancer metastases, Foro (2011)":
      "I-131 (NaI) — metástasis de cáncer de tiroides, Foro (2011)",
    "I-131 (NaI) — hyperthyroidism, Foro (2011)":
      "I-131 (NaI) — hipertiroidismo, Foro (2011)",
    "Source-workbook default. T fast 16.4 h is consistent with the mean dose rates at 1 m of Demir et al. (2016) Table 1, 15 µSv/h at 6 h and 7 µSv/h at 24 h: 18 h · ln 2 / ln(15/7) = 16.37 h. T slow 40.5 h: mean effective half-life after 48 h, Kurth et al. (2018) (cohort range 21.7–85.7 h). 6 cycles as in Gayol Vilorio et al. (2025).":
      "Valor por defecto del libro de origen. T rápida 16,4 h es coherente con las tasas de dosis medias a 1 m de Demir et al. (2016), tabla 1, 15 µSv/h a las 6 h y 7 µSv/h a las 24 h: 18 h · ln 2 / ln(15/7) = 16,37 h. T lenta 40,5 h: periodo efectivo medio después de 48 h, Kurth et al. (2018) (intervalo de la cohorte 21,7–85,7 h). 6 ciclos, como en Gayol Vilorio et al. (2025).",
    "Gayol Vilorio et al. (2025), Tables 4 and 6: Tef,1 = 22 h (median of the early mono-exponential fits, 12–24 h post-infusion, Table 2), Tef,2 = 42 h (median of the late values), 6 cycles; fast phase until 24 h post-infusion.":
      "Gayol Vilorio et al. (2025), tablas 4 y 6: Tef,1 = 22 h (mediana de los ajustes monoexponenciales tempranos, 12–24 h tras la infusión, tabla 2), Tef,2 = 42 h (mediana de los valores tardíos), 6 ciclos; fase rápida hasta 24 h tras la infusión.",
    "Gayol Vilorio et al. (2025), Tables 3 and 5: Tef,1 = 25 h (median of the early mono-exponential fits, Table 2), Tef,2 = 55 h (median of the late values), 4 cycles; fast phase until 24 h post-infusion.":
      "Gayol Vilorio et al. (2025), tablas 3 y 5: Tef,1 = 25 h (mediana de los ajustes monoexponenciales tempranos, tabla 2), Tef,2 = 55 h (mediana de los valores tardíos), 4 ciclos; fase rápida hasta 24 h tras la infusión.",
    "Monserrat Fuertes et al. (2023), Table 2, 20 patients: median Teff from the 6 h and 24 h values 25 h (range 12–92 h); median Teff from the 24, 48 and 168 h values 58 h (range 35–119 h); 4 cycles of 7.4 GBq. In that cohort patients were discharged at 24 h with a median rate at 1 m of 5.4 µSv/h.":
      "Monserrat Fuertes et al. (2023), tabla 2, 20 pacientes: mediana del Tef de los valores a 6 h y 24 h, 25 h (intervalo 12–92 h); mediana del Tef de los valores a 24, 48 y 168 h, 58 h (intervalo 35–119 h); 4 ciclos de 7,4 GBq. En esa cohorte los pacientes recibían el alta a las 24 h con una tasa mediana a 1 m de 5,4 µSv/h.",
    "Foro CSN-SEPR-SEFM (2011), Annex 3.B, Table 3.B 3: «Tef (vida media efectiva) = 3 días», single exponential. In the Forum's equations Tef = 1/λ (mean life), so the effective half-life is 3 d · ln 2 = 49.9 h; with this reading the app reproduces Tables 3.B 3 and 3.B 4 (partner < 60 years, 2 mSv), with the half-life reading it does not. In-patients for 48–72 h.":
      "Foro CSN-SEPR-SEFM (2011), anexo 3.B, tabla 3.B 3: «Tef (vida media efectiva) = 3 días», una sola exponencial. En las ecuaciones del Foro Tef = 1/λ (vida media), por lo que el periodo efectivo es 3 d · ln 2 = 49,9 h; con esta lectura la app reproduce las tablas 3.B 3 y 3.B 4 (pareja < 60 años, 2 mSv), y con la lectura como periodo no. Ingreso de 48–72 h.",
    "Foro CSN-SEPR-SEFM (2011), Annex 3.B, Table 3.B 4: «T.ef. (vida media efectiva) = 5 días» = 1/λ, i.e. effective half-life 5 d · ln 2 = 83.2 h. Single exponential.":
      "Foro CSN-SEPR-SEFM (2011), anexo 3.B, tabla 3.B 4: «T.ef. (vida media efectiva) = 5 días» = 1/λ, es decir, periodo efectivo 5 d · ln 2 = 83,2 h. Una sola exponencial.",
    "Foro CSN-SEPR-SEFM (2011), Annex 3.C, Table 3.C 2: «T.ef. (vida media efectiva) = 7,2 días», computed with the equation of Annex 3.B, where Tef = 1/λ: effective half-life 7.2 d · ln 2 = 119.8 h. Single exponential from discharge; the thyroid uptake peaks at 24–48 h, so early urinary excretion of an out-patient is not modelled. Usually out-patient; the Forum gives this table by administered activity (185–800 MBq), the app needs the rate measured at 1 m.":
      "Foro CSN-SEPR-SEFM (2011), anexo 3.C, tabla 3.C 2: «T.ef. (vida media efectiva) = 7,2 días», calculado con la ecuación del anexo 3.B, en la que Tef = 1/λ: periodo efectivo 7,2 d · ln 2 = 119,8 h. Una sola exponencial desde el alta; la captación tiroidea alcanza su máximo a las 24–48 h, por lo que no se modela la excreción urinaria temprana de un paciente ambulatorio. Habitualmente ambulatorio; el Foro da esta tabla por actividad administrada (185–800 MBq), la app necesita la tasa medida a 1 m.",
    "Dose rate at 1 m — Demir et al. (2016), Table 1, 23 patients, 7.4 GBq: 15 ± 4 µSv/h at 6 h and 7 ± 2 µSv/h at 24 h after infusion. Table 1 does not name the statistic after ±; the paper uses mean ± SD in its Table 3.":
      "Tasa de dosis a 1 m — Demir et al. (2016), tabla 1, 23 pacientes, 7,4 GBq: 15 ± 4 µSv/h a las 6 h y 7 ± 2 µSv/h a las 24 h tras la infusión. La tabla 1 no indica el estadístico tras ±; el artículo usa media ± DE en su tabla 3.",
    "T fast: no dispersion published; 16.4 h is derived from the mean rates. With mean + 2 SD at both times (23 and 11 µSv/h): 18 h · ln 2 / ln(23/11) = 16.9 h, the «high» case of the source workbook v6.":
      "T rápida: no se publica dispersión; 16,4 h se deduce de las tasas medias. Con media + 2 DE en ambos momentos (23 y 11 µSv/h): 18 h · ln 2 / ln(23/11) = 16,9 h, el caso «alto» del libro de origen v6.",
    "T slow — Kurth et al. (2018), Table 3, measurement at 48 h: 40.5 ± 15.8 h (mean ± SD), minimum 21.7 h, maximum 85.7 h; the maximum is the T slow of the «high» case of workbook v6. The abstract prints «40.5 ± 9.6 h»: 9.6 h is the SD of the 72 h column (38.4 ± 9.6 h, 25.7–74.5 h, 25 patients), an erratum of the source; Table 3 is followed. At 24 h: 26.0 ± 12.4 h (11.0–73.5 h).":
      "T lenta — Kurth et al. (2018), tabla 3, medida a las 48 h: 40,5 ± 15,8 h (media ± DE), mínimo 21,7 h, máximo 85,7 h; el máximo es la T lenta del caso «alto» del libro v6. El resumen imprime «40.5 ± 9.6 h»: 9,6 h es la DE de la columna de 72 h (38,4 ± 9,6 h, 25,7–74,5 h, 25 pacientes), errata de la fuente; se sigue la tabla 3. A las 24 h: 26,0 ± 12,4 h (11,0–73,5 h).",
    "No SD published: Tef,1 = 22 h is the median of two literature values, Gayol Vilorio et al. (2025), Table 2: early mono-exponential 18.5 h (Parlak) and 26 h (Kurth).":
      "No se publica DE: Tef,1 = 22 h es la mediana de dos valores de la literatura, Gayol Vilorio et al. (2025), tabla 2: monoexponencial temprano 18,5 h (Parlak) y 26 h (Kurth).",
    "Tef,2 = 42 h is the median of seven literature values from five studies (late mono-exponential or slow bi-exponential), spread 38.4–54 h. Table 2 labels the 26 and 38.4 h of Kurth as medians; in Kurth et al. (2018), Table 3, they are means (24 h and 72 h). For the cohort SD see the workbook preset.":
      "Tef,2 = 42 h es la mediana de siete valores de la literatura de cinco estudios (monoexponencial tardío o componente lenta biexponencial), con dispersión 38,4–54 h. La tabla 2 presenta los 26 y 38,4 h de Kurth como medianas; en Kurth et al. (2018), tabla 3, son medias (24 h y 72 h). Para la DE de la cohorte, véase la cinética del libro de trabajo.",
    "No SD published: Tef,1 = 25 h is the only early value in Gayol Vilorio et al. (2025), Table 2 (Monserrat); its cohort spread is given under the Monserrat preset.":
      "No se publica DE: Tef,1 = 25 h es el único valor temprano de Gayol Vilorio et al. (2025), tabla 2 (Monserrat); su dispersión en la cohorte figura en la cinética de Monserrat.",
    "Tef,2 = 55 h is the median of five literature values (late mono-exponential or slow bi-exponential), spread 49.5–58 h.":
      "Tef,2 = 55 h es la mediana de cinco valores de la literatura (monoexponencial tardío o componente lenta biexponencial), con dispersión 49,5–58 h.",
    "Teff from the 6 and 24 h values — Monserrat Fuertes et al. (2023), Table 2, 20 patients: 25 (12, 21, 36, 92) h, median (minimum, Q1, Q3, maximum).":
      "Tef de los valores a 6 y 24 h — Monserrat Fuertes et al. (2023), tabla 2, 20 pacientes: 25 (12; 21; 36; 92) h, mediana (mínimo; Q1; Q3; máximo).",
    "Teff from the 24, 48 and 168 h values: 58 (35, 47, 67, 119) h, median (minimum, Q1, Q3, maximum).":
      "Tef de los valores a 24, 48 y 168 h: 58 (35; 47; 67; 119) h, mediana (mínimo; Q1; Q3; máximo).",
    "Dose rate at 1 m at discharge (24 h): 5.4 (2.4, 3.7, 6.5, 19.5) µSv/h. The distributions are not normal (Shapiro–Wilk) and no SD is given; the ± of each patient in Table 2 is the uncertainty of the fit, not a cohort dispersion.":
      "Tasa de dosis a 1 m en el alta (24 h): 5,4 (2,4; 3,7; 6,5; 19,5) µSv/h. Las distribuciones no son normales (Shapiro–Wilk) y no se da DE; el ± de cada paciente en la tabla 2 es la incertidumbre del ajuste, no una dispersión de la cohorte.",
    "No dispersion published: the source gives a single fixed value.":
      "No se publica dispersión: la fuente da un único valor fijo.",
    "Partner":
      "Pareja",
    "Child under 1 year":
      "Niño menor de 1 año",
    "Child 1 to 2 years":
      "Niño de 1 a 2 años",
    "Child 2 to 5 years":
      "Niño de 2 a 5 años",
    "Child 5 to 11 years":
      "Niño de 5 a 11 años",
    "Child over 11 years":
      "Niño mayor de 11 años",
    "Work with children (nurseries, childminders)":
      "Trabajo con niños (guarderías, cuidadores de niños)",
    "Free scenario (not in the Forum)":
      "Escenario libre (no recogido en el Foro)",
    "6 hours at 1 metre, 8 hours at 0.1 m":
      "6 horas a 1 metro, 8 horas a 0,1 m",
    "Sleeping alone":
      "Dormir sin compañía",
    "6 periods of 30 minutes at 0.1 metre and 3 hours at 0.5 metres":
      "6 periodos de 30 minutos a 0,1 metro y 3 horas a 0,5 metros",
    "3 hours at 1.5 metres or not living in the same home":
      "3 horas a 1,5 metros o no convivir en el mismo domicilio",
    "4 periods of 25 minutes at 0.1 metre and 3 hours at 0.5 metres":
      "4 periodos de 25 minutos a 0,1 metro y 3 horas a 0,5 metros",
    "2 hours at 0.1 metre and 5 hours at 1 metre":
      "2 horas a 0,1 metro y 5 horas a 1 metro",
    "5 hours at 1.5 metres or not living in the same home":
      "5 horas a 1,5 metros o no convivir en el mismo domicilio",
    "1 hour at 0.1 metre and 5 hours at 1 metre":
      "1 hora a 0,1 metro y 5 horas a 1 metro",
    "5 hours at 1.5 metres":
      "5 horas a 1,5 metros",
    "1 hour at 0.1 metre and 4 hours at 1 metre":
      "1 hora a 0,1 metro y 4 horas a 1 metro",
    "3 hours at 1.5 metres":
      "3 horas a 1,5 metros",
    "8 hours at 1 metre from the co-worker":
      "8 horas a un metro del compañero",
    "Not going to work":
      "No acudir al trabajo",
    "3 hours at 1 metre, 3 hours at 0.1 m":
      "3 horas a 1 metro, 3 horas a 0,1 m",
    "Close contact":
      "Contacto cercano",
    "Nearby":
      "Cerca",
    "At work":
      "En el trabajo",
    "Not used":
      "Sin uso",
    "Close contact at work":
      "Contacto cercano en el trabajo",
    "Contact 1":
      "Contacto 1",
    "Contact 2":
      "Contacto 2",
    "Day-time contact continues during the restriction.":
      "El contacto diurno continúa durante la restricción.",
    "Not living in the same home: enter 0 h during the restriction in both rows.":
      "No convivir en el mismo domicilio: introduzca 0 h durante la restricción en las dos filas.",
    "4 × 25 min = 1.667 h. Not living in the same home: enter 0 h during the restriction in both rows.":
      "4 × 25 min = 1,667 h. No convivir en el mismo domicilio: introduzca 0 h durante la restricción en las dos filas.",
    "Category proposed from Table 2 of the Forum (children over 10 years and adults up to 60: 3 mSv per treatment). The Forum's own Tables 3.B 3 and 3.B 4 are not reproduced with 3 mSv for this column; the public criterion (1 mSv) is the more conservative choice.":
      "Categoría propuesta a partir de la tabla 2 del Foro (niños de más de 10 años y adultos hasta 60 años: 3 mSv por tratamiento). Las propias tablas 3.B 3 y 3.B 4 del Foro no se reproducen con 3 mSv para esta columna; el criterio del público (1 mSv) es la opción más conservadora.",
    "A pregnant co-worker is assessed individually (distances and times): use the free scenario.":
      "Una compañera embarazada se valora de forma particularizada (distancias y tiempos): use el escenario libre.",
    "Criterion for the children cared for: the Forum applies the co-worker constraint (0.3 mSv), which is below the public one.":
      "Criterio para los niños atendidos: el Foro aplica la restricción de los compañeros de trabajo (0,3 mSv), inferior a la del público.",
    "A scenario fills the hours and distances of both rows and proposes the category; it never changes the restriction days. The free scenario keeps the table as it is and lets you name the rows, for cases the Forum does not cover (a pregnant co-worker, other timetables or other people). Source: Foro CSN-SEPR-SEFM (2011), Annex 3.B, Table 3.B 1 and the paragraph «Para compañeros de trabajo» (p. 29); the 0.3 mSv for co-workers comes from its section 4.6.":
      "Un escenario rellena las horas y distancias de las dos filas y propone la categoría; nunca cambia los días de restricción. El escenario libre conserva la tabla tal como está y permite dar nombre a las filas, para casos que el Foro no recoge (una compañera embarazada, otros horarios u otras personas). Fuente: Foro CSN-SEPR-SEFM (2011), anexo 3.B, tabla 3.B 1 y el párrafo «Para compañeros de trabajo» (p. 29); los 0,3 mSv para compañeros de trabajo proceden de su apartado 4.6.",
    "Foro CSN-SEPR-SEFM (2011), Annex 3.B, Table 3.B 1 «Condiciones de convivencia sin y con restricciones para familiares y personas que cuidan al paciente (periodos diarios)» and the paragraph that follows it (p. 29). Daily periods.":
      "Foro CSN-SEPR-SEFM (2011), anexo 3.B, tabla 3.B 1 «Condiciones de convivencia sin y con restricciones para familiares y personas que cuidan al paciente (periodos diarios)» y el párrafo que la sigue (p. 29). Periodos diarios.",
    "For co-workers, a stay of 8 hours at one metre from the co-worker is assumed. If a co-worker is pregnant, the conditions (distances and times) are assessed individually when the restriction period is calculated.":
      "Para compañeros de trabajo se supone una permanencia de 8 horas a un metro del compañero. Si hay alguna compañera embarazada, se valorarán las condiciones de forma particularizada (distancias y tiempos) a la hora de calcular el periodo de restricciones.",
    "Work with children (nurseries, childminders): 3 hours at 1 metre, 3 hours at 0.1 m.":
      "Trabajo con niños (guarderías, cuidadores de niños): 3 horas a 1 metro, 3 horas a 0,1 m.",
    "Since the inverse square law does not hold at short distances, for the calculation the dose rate at 0.1 m, which would be contact, is taken as the one at 0.4 m. The restriction in this case consists in not going to work during the period indicated.":
      "Puesto que a distancias cortas no se cumple el inverso del cuadrado de la distancia, a efectos de cálculo la tasa de dosis a 0,1 m, que sería la de estar en contacto, se considera la que corresponde a 0,4 m. La restricción en este caso consiste en no acudir al trabajo durante el periodo indicado.",
    "Co-workers should not exceed the dose constraint of 0.3 mSv (section 4.6). Food handlers (Table 3.B 2) are an internal-contamination pathway of consumers and are not modelled here.":
      "Los compañeros de trabajo no deberían superar la restricción de dosis de 0,3 mSv (apartado 4.6). Los manipuladores de alimentos (tabla 3.B 2) son una vía de contaminación interna de los consumidores y no se modelan aquí.",
    "Check with the app (I-131 presets, Tef = 1/λ, contact at 0.4 m, days rounded to the nearest integer): with the conditions of Table 3.B 1 it reproduces all 16 cells of Tables 3.B 3 and 3.B 4 for the partner under 60 (2 mSv), children under 1, 2–5 and 5–11 years (1 mSv) and general work (0.3 mSv). It does not reproduce, as printed, the columns over 11 years (2 cells differ with 1 mSv, 5 with 3 mSv), 1–2 years (8 cells) and work with children (1 cell: 6.49 d against 7 at 40 µSv/h, Tef 3 d). The tables state «condiciones en Rivas 2002», which may differ from Table 3.B 1; with several free parameters no other set of conditions can be identified conclusively, so Table 3.B 1 is used as printed.":
      "Comprobación con la app (cinéticas de I-131, Tef = 1/λ, contacto a 0,4 m, días redondeados al entero más próximo): con las condiciones de la tabla 3.B 1 reproduce las 16 celdas de las tablas 3.B 3 y 3.B 4 para la pareja menor de 60 años (2 mSv), los niños menores de 1 año, de 2–5 y de 5–11 años (1 mSv) y el trabajo en general (0,3 mSv). No reproduce, tal como están impresas, las columnas de mayores de 11 años (difieren 2 celdas con 1 mSv y 5 con 3 mSv), de 1–2 años (8 celdas) y de trabajo con niños (1 celda: 6,49 d frente a 7 con 40 µSv/h, Tef 3 d). Las tablas indican «condiciones en Rivas 2002», que pueden diferir de la tabla 3.B 1; con varios parámetros libres no puede identificarse de forma concluyente otro conjunto de condiciones, por lo que se usa la tabla 3.B 1 tal como está impresa.",
    "Carer ≤ 60 years":
      "Persona cuidadora ≤ 60 años",
    "Carer > 60 years":
      "Persona cuidadora > 60 años",
    "Public (adult, child or pregnant woman)":
      "Público (adulto, niño o embarazada)",
    "Co-worker":
      "Compañero de trabajo",
    "Other criterion":
      "Otro criterio",
    "EC RP 97 (1998), table 1, and Foro CSN-SEPR-SEFM (2011), table 2: 3 mSv for adults up to 60 years — more restrictive than the international 5 mSv per episode (ICRP 103 [7], para. 351). RD 601/2019, arts. 6.2, 7 and 8, requires carer constraints but sets no value":
      "EC RP 97 (1998), tabla 1, y Foro CSN-SEPR-SEFM (2011), tabla 2: 3 mSv para adultos de hasta 60 años, más restrictivo que los 5 mSv internacionales por episodio (ICRP 103 [7], párr. 351). El RD 601/2019, arts. 6.2, 7 y 8, exige restricciones para las personas cuidadoras pero no fija ningún valor",
    "ICRP 103 (2007), para. 351, and ICRP 94 (2004): 5 mSv per episode for carers; IAEA SSG-46 (2018), para. 2.49: usually 5 mSv per episode for adult carers, less severe constraints allowed for elderly people. Adopted by Gayol Vilorio et al. (2025) instead of the 15 mSv of EC RP 97 and the Forum":
      "ICRP 103 (2007), párr. 351, e ICRP 94 (2004): 5 mSv por episodio para personas cuidadoras; IAEA SSG-46 (2018), párr. 2.49: normalmente 5 mSv por episodio para personas cuidadoras adultas, con restricciones menos severas permitidas para personas mayores. Adoptado por Gayol Vilorio et al. (2025) en lugar de los 15 mSv de EC RP 97 y del Foro",
    "RD 1029/2022, art. 15: public annual limit, applied to the whole treatment; ICRP 94 (2004) and ICRP 103, para. 351: the public limit applies to infants, children and casual visitors":
      "RD 1029/2022, art. 15: límite anual del público, aplicado al tratamiento completo; ICRP 94 (2004) e ICRP 103, párr. 351: el límite del público se aplica a lactantes, niños y visitantes ocasionales",
    "EC RP 97 (1998) and Foro CSN-SEPR-SEFM (2011), table 2 (p. 13): 0.3 mSv for third persons":
      "EC RP 97 (1998) y Foro CSN-SEPR-SEFM (2011), tabla 2 (p. 13): 0,3 mSv para terceras personas",
    "Value entered as manual criterion":
      "Valor introducido como criterio manual",
    "EC RP 97 [9] and Foro [2]":
      "EC RP 97 [9] y Foro [2]",
    "value entered":
      "valor introducido",
    "Time model: two consecutive, continuous exponentials. At the end of the fast phase the rate reached is kept. It is not a simultaneous sum of components.":
      "Modelo temporal: dos exponenciales consecutivas y continuas. Al final de la fase rápida se conserva la tasa alcanzada. No es una suma simultánea de componentes.",
    "Occupancy h/24 is a daily average, not an exact timetable. Single trips and contacts concentrated during the fast phase require a specific time-resolved assessment.":
      "La ocupación h/24 es una media diaria, no un horario exacto. Los viajes puntuales y los contactos concentrados durante la fase rápida requieren una evaluación específica con resolución temporal.",
    "Spatial factors are taken as constant in both phases. Body redistribution can change them: justify their use for the time of discharge and the case.":
      "Los factores espaciales se consideran constantes en las dos fases. La redistribución corporal puede cambiarlos: justifique su uso para el momento del alta y el caso.",
    "Equal cycles: same discharge rate, kinetics and cohabitation. Multiplying by the number of cycles assumes the pattern repeats with no relevant change from overlapping cycles.":
      "Ciclos iguales: misma tasa en el alta, cinética y convivencia. Multiplicar por el número de ciclos supone que el patrón se repite sin cambios relevantes por solapamiento de ciclos.",
    "Distances: keep the same origin, posture and orientation as the profile or measurement protocol. Do not confuse the separation between surfaces with the distance to a geometric centre.":
      "Distancias: mantenga el mismo origen, postura y orientación que el perfil o el protocolo de medida. No confunda la separación entre superficies con la distancia a un centro geométrico.",
    "Approximate profiles: published conventions, not universal measured factors. No automatic interpolation or extrapolation: the distance is chosen from the profile list.":
      "Perfiles aproximados: convenciones publicadas, no factores medidos universales. Sin interpolación ni extrapolación automáticas: la distancia se elige de la lista del perfil.",
    "Own measurements: enter distances and the rates at those distances, measured at the same time as the 1 m reading. Record the protocol. Do not repeat distances.":
      "Medidas propias: introduzca las distancias y las tasas a esas distancias, medidas al mismo tiempo que la lectura a 1 m. Registre el protocolo. No repita distancias.",
    "Discharge time and end of the fast phase are counted from administration. With the Kurth and Demir model the fast phase ends at 24 h. If discharge is later (or the end is 0) only the slow half-life is used, and the discharge rate must already belong to the slow phase.":
      "El momento del alta y el final de la fase rápida se cuentan desde la administración. Con el modelo de Kurth y Demir la fase rápida termina a las 24 h. Si el alta es posterior (o el final es 0) solo se usa el periodo lento, y la tasa en el alta debe pertenecer ya a la fase lenta.",
    "Each cycle is integrated to infinity: with several weeks between cycles, practically the whole dose of a cycle is received before the next one.":
      "Cada ciclo se integra hasta el infinito: con varias semanas entre ciclos, prácticamente toda la dosis de un ciclo se recibe antes del siguiente.",
    "DOTATATE measured":
      "DOTATATE medido",
    "I-131 approximate":
      "I-131 aproximado",
    "Lu-177 approximate":
      "Lu-177 aproximado",
    "Own measurements":
      "Medidas propias",
    "own protocol":
      "protocolo propio",
    "Empirical":
      "Empírico",
    "Approximation":
      "Aproximación",
    "Measured":
      "Medido",
    "Measured DOTATATE profile applied to another radiopharmaceutical.":
      "Perfil medido con DOTATATE aplicado a otro radiofármaco.",
    "I-131 profile applied to Lu-177.":
      "Perfil de I-131 aplicado a Lu-177.",
    "Lu-177 profile applied to I-131.":
      "Perfil de Lu-177 aplicado a I-131.",
    "Distances: 0.1, 0.5, 1 m (measured with DOTATATE).":
      "Distancias: 0,1, 0,5, 1 m (medidas con DOTATATE).",
    "Distances: 0.1 (contact, factor of 0.4 m), 0.5, 1, 1.5, 2, 3 m.":
      "Distancias: 0,1 (contacto, factor de 0,4 m), 0,5, 1, 1,5, 2, 3 m.",
    "Complete the own-measurement table (1 m row fixed by the discharge rate).":
      "Complete la tabla de medidas propias (la fila de 1 m la fija la tasa en el alta).",
    "DOTATATE cohort":
      "cohorte DOTATATE",
    "Contact (0.1 m): the factor of 0.4 m is assigned (Forum convention), (1/0.4)²":
      "Contacto (0,1 m): se asigna el factor de 0,4 m (convención del Foro), (1/0,4)²",
    "Inverse square":
      "Inverso del cuadrado de la distancia",
    "Carer ≤ 60, central, discharge at 6 h":
      "Persona cuidadora ≤ 60, central, alta a las 6 h",
    "Carer ≤ 60, central, discharge at 24 h":
      "Persona cuidadora ≤ 60, central, alta a las 24 h",
    "Carer ≤ 60, high, discharge at 6 h":
      "Persona cuidadora ≤ 60, alto, alta a las 6 h",
    "Carer ≤ 60, high, discharge at 24 h":
      "Persona cuidadora ≤ 60, alto, alta a las 24 h",
    "Non-carer adult, central, discharge at 6 h":
      "Adulto no cuidador, central, alta a las 6 h",
    "Non-carer adult, central, discharge at 24 h":
      "Adulto no cuidador, central, alta a las 24 h",
    "v6 exercise, case 1: 10.65 d (14 µSv/h, high, discharge at 6 h) must exceed 3 mSv":
      "Ejercicio v6, caso 1: 10,65 d (14 µSv/h, alto, alta a las 6 h) debe superar 3 mSv",
    "Same with 10.75 d: must be below 3 mSv (minimum restriction 10.7 d)":
      "Igual con 10,75 d: debe quedar por debajo de 3 mSv (restricción mínima 10,7 d)",
    "Maximum discharge rate, carer ≤ 60, high, discharge at 6 h (µSv/h)":
      "Tasa máxima en el alta, persona cuidadora ≤ 60, alto, alta a las 6 h (µSv/h)",

    // Example applications (data/nuclides.json, clinical_use)
    'PET: [¹¹C]-choline, [¹¹C]-methionine, neurological tracers': 'PET: [¹¹C]-colina, [¹¹C]-metionina, trazadores neurológicos',
    'PET: [¹³N]-ammonia cardiac perfusion': 'PET: [¹³N]-amoniaco, perfusión cardiaca',
    'PET: [¹⁵O]-water cerebral blood flow': 'PET: [¹⁵O]-agua, flujo sanguíneo cerebral',
    'PET: [¹⁸F]-FDG (oncology, neurology, cardiology); [¹⁸F]-NaF bone; [¹⁸F]-PSMA': 'PET: [¹⁸F]-FDG (oncología, neurología, cardiología); [¹⁸F]-NaF óseo; [¹⁸F]-PSMA',
    'Research; rare diagnostic use (electrolyte studies)': 'Investigación; uso diagnóstico poco frecuente (estudios de electrolitos)',
    'Research applications': 'Aplicaciones de investigación',
    'Diagnostic tracer (non-imaging): labelled red cells for erythrocyte studies; ⁵¹Cr-EDTA for glomerular filtration rate':
      'Trazador diagnóstico (sin imagen): hematíes marcados para estudios eritrocitarios; ⁵¹Cr-EDTA para la tasa de filtración glomerular',
    'Flood source / calibration phantom for gamma cameras': 'Fuente plana (flood) / maniquí de calibración para gammacámaras',
    'Research; positron emission': 'Investigación; emisión de positrones',
    'Ferrokinetics; iron metabolism studies': 'Ferrocinética; estudios del metabolismo del hierro',
    'Radiotherapy (teletherapy); calibration sources': 'Radioterapia (teleterapia); fuentes de calibración',
    'PET/therapy: [⁶⁴Cu]-DOTATATE, theranostics': 'PET/terapia: [⁶⁴Cu]-DOTATATE, teranóstica',
    'SPECT: ⁶⁷Ga-citrate (infection, lymphoma); largely replaced by ¹⁸F-FDG PET': 'SPECT: citrato de ⁶⁷Ga (infección, linfoma); sustituido en gran parte por la PET con ¹⁸F-FDG',
    'PET: [⁶⁸Ga]-DOTATATE/DOTATOC (NET), [⁶⁸Ga]-PSMA (prostate cancer), [⁶⁸Ga]-FAPI': 'PET: [⁶⁸Ga]-DOTATATE/DOTATOC (TNE), [⁶⁸Ga]-PSMA (cáncer de próstata), [⁶⁸Ga]-FAPI',
    'Selenomethionine pancreas/parathyroid imaging (historical)': 'Selenometionina, imagen de páncreas y paratiroides (histórico)',
    'SPECT: bone, cardiac (MIBI), renal, lung, thyroid, hepatobiliary, sentinel node. Most widely used radionuclide in nuclear medicine.':
      'SPECT: óseo, cardiaco (MIBI), renal, pulmonar, tiroideo, hepatobiliar, ganglio centinela. Radionucleido más utilizado en medicina nuclear.',
    '⁹⁹Mo/⁹⁹ᵐTc generator: source of ⁹⁹ᵐTc. Values correspond to equilibrium mixture.': 'Generador de ⁹⁹Mo/⁹⁹ᵐTc: fuente de ⁹⁹ᵐTc. Los valores corresponden a la mezcla en equilibrio.',
    'Brachytherapy: permanent prostate seed implants. Constants include Rh-103m (T½ 56 min) in equilibrium, as in Cornejo et al. (2015).':
      'Braquiterapia: implantes permanentes de semillas en próstata. Las constantes incluyen el Rh-103m (T½ 56 min) en equilibrio, como en Cornejo et al. (2015).',
    'SPECT: ¹¹¹In-pentetreotide (Octreoscan, NET), ¹¹¹In-labelled leukocytes (infection); ¹¹¹In-ibritumomab for imaging/dosimetry before ⁹⁰Y-ibritumomab radioimmunotherapy (not the treatment itself)':
      'SPECT: ¹¹¹In-pentetreotida (Octreoscan, TNE), leucocitos marcados con ¹¹¹In (infección); ¹¹¹In-ibritumomab para imagen y dosimetría previas a la radioinmunoterapia con ⁹⁰Y-ibritumomab (no el tratamiento en sí)',
    'SPECT: ¹²³I-NaI thyroid, ¹²³I-MIBG (pheo, neuroblastoma), ¹²³I-DaTSCAN': 'SPECT: ¹²³I-NaI tiroides, ¹²³I-MIBG (feocromocitoma, neuroblastoma), ¹²³I-DaTSCAN',
    'Brachytherapy: permanent prostate seed implants; RIA laboratory assays': 'Braquiterapia: implantes permanentes de semillas en próstata; ensayos de laboratorio RIA',
    'Therapy: differentiated thyroid cancer, hyperthyroidism, ¹³¹I-MIBG. Imaging: diagnostic and post-therapy scintigraphy':
      'Terapia: cáncer diferenciado de tiroides, hipertiroidismo, ¹³¹I-MIBG. Imagen: gammagrafía diagnóstica y postratamiento',
    'SPECT: ¹³³Xe ventilation lung studies': 'SPECT: estudios de ventilación pulmonar con ¹³³Xe',
    'Calibration sources; brachytherapy (historical); radiation protection reference source': 'Fuentes de calibración; braquiterapia (histórico); fuente de referencia en protección radiológica',
    'Therapy: ¹⁵³Sm-EDTMP bone pain palliation (metastatic bone disease)': 'Terapia: ¹⁵³Sm-EDTMP, paliación del dolor óseo (enfermedad ósea metastásica)',
    'Brachytherapy sources; research': 'Fuentes de braquiterapia; investigación',
    'Brachytherapy (low gamma yield); predominantly beta emitter': 'Braquiterapia (bajo rendimiento gamma); emisor predominantemente beta',
    'Therapy: [¹⁷⁷Lu]-DOTATATE (NETs/Lutathera), [¹⁷⁷Lu]-PSMA-617 (prostate cancer)': 'Terapia: [¹⁷⁷Lu]-DOTATATE (TNE/Lutathera), [¹⁷⁷Lu]-PSMA-617 (cáncer de próstata)',
    'Therapy: ¹⁸⁶Re-HEDP bone pain palliation; ¹⁸⁶Re-MAb RIT': 'Terapia: ¹⁸⁶Re-HEDP, paliación del dolor óseo; RIT con ¹⁸⁶Re-AcMo',
    'Therapy: ¹⁸⁸Re-HEDP bone pain palliation; ¹⁸⁸Re-generator from ¹⁸⁸W': 'Terapia: ¹⁸⁸Re-HEDP, paliación del dolor óseo; generador de ¹⁸⁸Re a partir de ¹⁸⁸W',
    'Brachytherapy: HDR/LDR (breast, cervix, prostate, lung, biliary)': 'Braquiterapia: HDR/LDR (mama, cérvix, próstata, pulmón, vía biliar)',
    'Brachytherapy (historical): ¹⁹⁸Au grain implants; research': 'Braquiterapia (histórico): implantes de granos de ¹⁹⁸Au; investigación',
    'SPECT: myocardial perfusion imaging (largely replaced by ⁹⁹ᵐTc-MIBI)': 'SPECT: imagen de perfusión miocárdica (sustituido en gran parte por ⁹⁹ᵐTc-MIBI)',
    'Therapy: ⁹⁰Y-microspheres (SIRT/radioembolization), ⁹⁰Y-ibritumomab (RIT), ⁹⁰Y-DOTATATE': 'Terapia: microesferas de ⁹⁰Y (SIRT/radioembolización), ⁹⁰Y-ibritumomab (RIT), ⁹⁰Y-DOTATATE',
    'Immuno-PET: ⁸⁹Zr-labelled monoclonal antibodies (e.g. trastuzumab, atezolizumab); long-lived PET tracer.':
      'Inmuno-PET: anticuerpos monoclonales marcados con ⁸⁹Zr (p. ej., trastuzumab, atezolizumab); trazador PET de periodo largo.',
    'Radioimmunotherapy and theranostics (pairs with Cu-64); β⁻ emitter with imageable gammas.': 'Radioinmunoterapia y teranóstica (pareja del Cu-64); emisor β⁻ con gammas aptos para imagen.',
    'Targeted radionuclide therapy (e.g. ¹⁶¹Tb-PSMA, ¹⁶¹Tb-DOTATOC); β⁻ + conversion/Auger electrons; Lu-177-like.':
      'Terapia dirigida con radionucleidos (p. ej., ¹⁶¹Tb-PSMA, ¹⁶¹Tb-DOTATOC); β⁻ más electrones de conversión y Auger; similar al Lu-177.',
    'Radioembolization (¹⁶⁶Ho microspheres, liver), radiosynovectomy; high-energy β⁻ with 80.6 keV gamma.':
      'Radioembolización (microesferas de ¹⁶⁶Ho, hígado), radiosinovectomía; β⁻ de alta energía con gamma de 80,6 keV.',
    'Targeted alpha therapy of bone metastases (²²³RaCl₂, Xofigo). Constants assume that all progeny are retained in the source and in secular equilibrium (Rn-219, Po-215, Pb-211, Bi-211, Tl-207).':
      'Terapia alfa dirigida de metástasis óseas (²²³RaCl₂, Xofigo). Las constantes suponen que toda la progenie queda retenida en la fuente y en equilibrio secular (Rn-219, Po-215, Pb-211, Bi-211, Tl-207).',
    'Targeted alpha therapy (e.g. ²²⁵Ac-PSMA-617, ²²⁵Ac-DOTATATE). Constants assume that all progeny are retained in the source and in secular equilibrium (Fr-221, At-217, Bi-213, Po-213/Tl-209, Pb-209).':
      'Terapia alfa dirigida (p. ej., ²²⁵Ac-PSMA-617, ²²⁵Ac-DOTATATE). Las constantes suponen que toda la progenie queda retenida en la fuente y en equilibrio secular (Fr-221, At-217, Bi-213, Po-213/Tl-209, Pb-209).',
  },

  patterns: [
    // ---- Citations: only the access date wording ----
    [/^([\s\S]+) \(consulted (\d{4}-\d\d-\d\d)\)$/, '$1 (consultado el $2)'],
    // ---- Properties ----
    [/^(\d+) nuclides$/, '$1 nucleidos'],
    [/^1 nuclide$/, '1 nucleido'],
    [/^(?:K-air|H\*\/H′)[\s\S]*ICRP 107 \(2008\) \+ ICRP 74 \(1996\), A\.21[\s\S]*$/, m => esSource(m)],
    [/^Γ source — ([\s\S]+)$/, (m, rest) => 'Fuente de Γ — ' + esSource(rest)],
    [/^Recalculated using the stated nuclear data and conversion coefficients; difference not reconciled: ([+−-]?[\d.,]+)% from the published Cornejo et al\. \(2015\) value \(([^)]+)\)$/,
      'Recalculada con los datos nucleares y coeficientes de conversión indicados; diferencia no conciliada: $1 % respecto del valor publicado por Cornejo et al. (2015) ($2)'],
    [/^Includes the short-lived progeny in equilibrium: (.+)$/, 'Incluye la progenie de periodo corto en equilibrio: $1'],
    [/^Example applications: ([\s\S]+)$/, (m, use) => 'Aplicaciones de ejemplo: ' + esText(use)],
    [/^MeV — highest endpoint over all β branches, ICRP 107((?:; [^;]+)*)$/, (m, rest) => 'MeV — máximo punto final de todas las ramas β, ICRP 107' + rest
      .replace('; from progeny in the decay chain', '; de la progenie de la cadena de desintegración')
      .replace(/; minor β branch: ([^;]+) % of decays/, '; rama β minoritaria: $1 % de las desintegraciones')
      .replace(/; ([^;]+) β per decay/, '; $1 β por desintegración')],
    [/^kBq\/kg · RD 1217\/2024 Annex IV Table A1 · progeny (.+)$/, 'kBq/kg · RD 1217/2024, anexo IV, tabla A1 · progenie $1'],
    [/^Exemption ≤ 1000 kg, Table B (\([a-z]\))$/, 'Exención ≤ 1000 kg, tabla B $1'],
    [/^column 2 \(concentration\) · column 3 \(total activity\) (\([a-z]\))$/, 'columna 2 (concentración) · columna 3 (actividad total) $1'],
    [/^Photon spectrum((?:, parent \+ progeny in equilibrium \(.+\))?) \(E ≥ 20 keV, yield ≥ 0\.01%\)$/, (m, prog) =>
      'Espectro de fotones' + prog.replace(', parent + progeny in equilibrium', ', padre + progenie en equilibrio') + ' (E ≥ 20 keV, rendimiento ≥ 0,01 %)'],
    [/^Parent-only photon spectrum; dose constants include the stated progeny \(E ≥ 20 keV, yield ≥ 0\.01%\)$/,
      'Espectro de fotones solo del padre; las constantes de dosis incluyen la progenie indicada (E ≥ 20 keV, rendimiento ≥ 0,01 %)'],
    [/^Photon spectrum of (\S+): energy against yield or dose share; the table below lists the same lines$/,
      'Espectro de fotones de $1: energía frente a rendimiento o fracción de dosis; la tabla de debajo recoge las mismas líneas'],
    [/^Line table \((\d+) lines?\)$/, (m, n) => `Tabla de líneas (${n} ${n === '1' ? 'línea' : 'líneas'})`],
    [/^(\d+) lines?$/, (m, n) => `${n} ${n === '1' ? 'línea' : 'líneas'}`],
    [/^Energies to 0\.1 keV, as stored in the ICRP 107 index\. Type — G: gamma; X: X-ray; AQ: annihilation photons\. Yield: photons emitted per 100 decays( of the parent \(progeny lines scaled by their equilibrium activity per parent decay\))?\.$/,
      (m, par) => 'Energías a 0,1 keV, tal como figuran en el índice de ICRP 107. Tipo — G: gamma; X: rayos X; AQ: fotones de aniquilación. Rendimiento: fotones emitidos por 100 desintegraciones' +
        (par ? ' del padre (las líneas de la progenie se escalan con su actividad de equilibrio por desintegración del padre)' : '') + '.'],
    [/^(Gamma|X-ray|Annihilation): yield (.+) % · share of Γ H\*\(10\) (.+) %$/, (m, ty, y, s) =>
      `${{ Gamma: 'Gamma', 'X-ray': 'Rayos X', Annihilation: 'Aniquilación' }[ty]}: rendimiento ${y} % · fracción de Γ H*(10) ${s} %`],
    [/^Each line's share of Γ H\*\(10\), n·h\*\(10\)\(E\) with ICRP 74 Table A\.21; the bars add up to 100 %\.( Share of the parent's lines only; the stored Γ includes the progeny\.)?$/,
      (m, ch) => 'Fracción de Γ H*(10) de cada línea, n·h*(10)(E) con la tabla A.21 de ICRP 74; las barras suman 100 %.' + (ch ? ' Fracción de las líneas del padre solamente; la Γ almacenada incluye la progenie.' : '')],
    [/^Adult ingestion e\(g\): RD 783\/2001 Annex III table a\)\.((?: Tabulated forms: [\s\S]+? The most restrictive governs the level shown\.)?) Discharge level = \(1 mSv \/ e\(g\)\) \/ 600 L — one IS-28 II\.A\.4 condition only \(see the reference notes\)\.$/,
      (m, forms) => 'Ingestión de adulto e(g): RD 783/2001, anexo III, tabla a).' +
        forms.replace(' Tabulated forms: ', ' Formas tabuladas: ').replace(' The most restrictive governs the level shown.', ' La más restrictiva determina el nivel mostrado.') +
        ' Nivel de vertido = (1 mSv / e(g)) / 600 L — solo una de las condiciones de la IS-28 II.A.4 (véanse las notas de referencia).'],
    [/^Table (A1|B) (\S+)((?: \([a-z0-9]\))?): ([\s\S]+?)(?: Progeny: ([\s\S]+)\.)?$/, (m, tb, id, note, text, prog) =>
      `Tabla ${tb} ${id}${note}: ${esText(text)}${prog ? ` Progenie: ${prog}.` : ''}`],
    [/^⚠ Table (A1|B) (\S+): As printed in the BOE: ([\s\S]+)$/, (m, tb, id, rest) => `⚠ Tabla ${tb} ${id}: tal como figura en el BOE: ${rest}`],
    [/^(selected|no) γ, X or annihilation lines( of the parent)? with E ≥ 20 keV and yield ≥ 0\.01% — ICRP 107$/, (m, sel, par) =>
      `${sel === 'no' ? 'ninguna línea' : 'líneas seleccionadas'} γ, X o de aniquilación${par ? ' del padre' : ''} con E ≥ 20 keV y rendimiento ≥ 0,01 % — ICRP 107`],
    [/^(.+) — one of the IS-28 II\.A\.4 conditions \(see the notes below\)$/, '$1 — una de las condiciones de la IS-28 II.A.4 (véanse las notas más abajo)'],
    [/^with progeny in equilibrium · parent only: (.+)$/, 'con progenie en equilibrio · solo el padre: $1'],
    [/^Equilibrium after ≈ (.+) \(10 half-lives of the longest-lived one\)\. App criterion: T½ ≤ 1\/10 of the parent's and ≤ 30 d$/,
      'Equilibrio tras ≈ $1 (10 periodos del de vida más larga). Criterio de la app: T½ ≤ 1/10 del del padre y ≤ 30 d'],
    [/^Sv\/Bq · RD 783\/2001 Annex III table a\)( · most restrictive of (\d+) forms)?$/, (m, f, n) =>
      'Sv/Bq · RD 783/2001, anexo III, tabla a)' + (f ? ` · la más restrictiva de ${n} formas` : '')],
    [/^H\*\/H′: ICRP 107 \(2008\) \+ ICRP 74 \(1996\), A\.21(, incl\. [^()]+)? \(not manually validated\)$/, m => esSource(m)],
    [/^⚠ (\S+) appears in the regulatory tables \(RD 1217\/2024 Annex IV and\/or RD 783\/2001 Annex III table a\)\) but has no nuclear data in this app \(neither the curated database nor ICRP 107\): half-life, emissions and dose-rate constants are not available, so the Decay and Dose calculators are disabled for it\. The identifier is shown as printed and is not mapped to a similar one \(e\.g\. Nb-98 is not treated as Nb-98m or as the "Nb-98s" printed in ICRP 119\)\.$/,
      '⚠ $1 figura en las tablas reglamentarias (anexo IV del RD 1217/2024 y/o tabla a) del anexo III del RD 783/2001), pero no tiene datos nucleares en esta app (ni en la base revisada ni en ICRP 107): no se dispone de periodo de semidesintegración, emisiones ni constantes de tasa de dosis, por lo que las calculadoras de Decaimiento y Dosis están desactivadas para él. El identificador se muestra tal como figura impreso y no se asimila a otro parecido (p. ej., Nb-98 no se trata como Nb-98m ni como el «Nb-98s» impreso en ICRP 119).'],

    // ---- Nuclide names (headers of Decay, Dose and the reports) ----
    [/^(\S+ — )([A-Z][a-z]+-\d+m?[\s\S]*)$/, (m, sym, name) => sym + esNames(name)],
    [/^— ([\s\S]+) \(T½ = (.+)\)$/, (m, name, hl) => `— ${esNames(name)} (T½ = ${hl})`],

    // ---- Decay ----
    [/^Read as (.+) \(decimal separator\)\. For (\d+), type \2 without a separator\.$/, 'Leído como $1 (separador decimal). Para $2, escriba $2 sin separador.'],
    [/^at t = (.+)$/, 'en t = $1'],
    [/^\((.+) × value\)$/, '($1 × valor)'],
    [/^Reached after ~ (.+)$/, 'Se alcanza tras ~ $1'],
    [/^a\) Total activity — column 3((?: \([a-z0-9]\))?)$/, 'a) Actividad total — columna 3$1'],
    [/^b\) Moderate quantity — column 2((?: \([a-z0-9]\))?)$/, 'b) Cantidad moderada — columna 2$1'],
    [/^(\S+) decay curve \(([^)]+)\)(: [\s\S]+)?$/, (m, sym, u, val) => `Curva de decaimiento de ${sym} (${u})${val || ''}`],
    [/^Elapsed time: (.+)$/, 'Tiempo transcurrido: $1'],
    [/^Time \((.+)\)$/, 'Tiempo ($1)'],
    [/^RD 1217\/2024 clearance level: (.+)$/, 'Nivel de desclasificación RD 1217/2024: $1'],
    [/^Table A1 level reached: (.+)$/, 'Nivel de la tabla A1 alcanzado: $1'],
    [/^ⓘ Chain entry \((\d+) members\): the curve follows the parent T½, with progeny in secular equilibrium scaling proportionally\. Valid once equilibrium is established \(source aged ≳ 10 daughter half-lives\)\.$/,
      'ⓘ Entrada de cadena ($1 miembros): la curva sigue el T½ del padre, con la progenie en equilibrio secular escalada proporcionalmente. Válida una vez establecido el equilibrio (antigüedad de la fuente ≳ 10 periodos del descendiente).'],
    [/^Time to reach (.+?):?$/, (m, what) => `Tiempo hasta alcanzar ${what}${m.endsWith(':') ? ':' : ''}`],
    [/^→ (.+) \(local time\)$/, '→ $1 (hora local)'],
    [/^A target of zero is never reached in finite time \(exponential decay\)\.$/, 'Un objetivo nulo no se alcanza en un tiempo finito (decaimiento exponencial).'],
    [/^Target already reached at t = 0: the target equals the initial activity \((.+)\)\.$/, 'Objetivo ya alcanzado en t = 0: el objetivo es igual a la actividad inicial ($1).'],
    [/^Target exceeds A₀ and cannot be reached by decay \((.+)\)\.$/, 'El objetivo supera A₀ y no se puede alcanzar por decaimiento ($1).'],
    [/^(.+) — as entered; state whether it includes the container$/, '$1 — tal como se ha introducido; indique si incluye el contenedor'],
    [/^A\(t\) \/ mass \(t = (.+)\)$/, 'A(t) / masa (t = $1)'],
    [/^Status at t = (.+)$/, 'Situación en t = $1'],
    [/^(.+) × Table A1 level$/, '$1 × nivel de la tabla A1'],
    [/^(\S+?)((?: \([a-z0-9]\))?): any quantity, any type of solid material; Annex IV Table A1([\s\S]*)$/, (m, id, note, rest) =>
      `${id}${note}: cualquier cantidad, cualquier tipo de material sólido; anexo IV, tabla A1` +
      rest.replace(/^\. ([\s\S]*?) Progeny: /, (x, t) => `. ${esText(t)} Progenie: `).replace(' ⚠ As printed in the BOE: ', ' ⚠ Tal como figura en el BOE: ')],
    // Reports
    [/^☢ NM Radionuclide Planner — (.+)$/, (m, title) => `☢ NM Radionuclide Planner — ${esText(title)}`],
    [/^ICRP 107 extended index \(the curated nuclides\.json (v\S+) is not used for this nuclide\)$/, 'Índice ampliado de ICRP 107 (la base revisada nuclides.json $1 no se usa para este nucleido)'],
    [/^(.+) \((.+) kg\) — mass basis as entered by the user; the app does not record whether the container is included$/,
      '$1 ($2 kg) — masa tal como la introduce el usuario; la app no registra si incluye el contenedor'],
    [/^Specific activity at t = (.+)$/, 'Actividad específica en t = $1'],
    [/^(ABOVE|AT OR BELOW) the individual Table A1 level \((.+) × level\)$/, (m, s, r) =>
      `${s === 'ABOVE' ? 'POR ENCIMA DEL' : 'EN O POR DEBAJO DEL'} nivel individual de la tabla A1 (${r} × nivel)`],
    [/^(.+ kBq\/kg) \((\S+), note \((\w)\); progeny ([^)]+)\)([\s\S]*)$/, (m, v, id, n, p, rest) =>
      `${v} (${id}, nota (${n}); progenie ${p})${rest.replace(' — As printed in the BOE: ', ' — Tal como figura en el BOE: ')}`],
    [/^a\) Total activity, column 3((?: \([a-z0-9]\))?)$/, 'a) Actividad total, columna 3$1'],
    [/^b\) Moderate quantity \(≤ 1000 kg\), column 2((?: \([a-z0-9]\))?)$/, 'b) Cantidad moderada (≤ 1000 kg), columna 2$1'],
    [/^(.+ (?:Bq|kBq\/kg); t = 0: [\s\S]+ × value)$/, m => m.split(' × value').join(' × valor')],
    [/^(\S+): (Not in Table (?:A1|B)\.[\s\S]+)$/, (m, id, t) => `${id}: ${esText(t)}`],

    // ---- Dose ----
    [/^(Lead \(Pb\)|Iron \(Fe\)|Concrete, normal-weight|Concrete, light-weight) — ρ = (.+)$/, (m, mat, rho) => `${ES_MATERIALS[mat]} — ρ = ${rho}`],
    [/^\| T½ = [\s\S]+ \| Γ$/, m => m.replace(' h/admin', ' h/admin.').replace(' admin/y', ' admin./a').replace('patient Tx', 'Tx paciente')],
    [/^\(incl\. (.+) in equilibrium\)$/, '(incl. $1 en equilibrio)'],
    [/^\(parent only — (.+) excluded\)$/, '(solo el padre — $1 excluida)'],
    [/^Dose-equivalent rate at t = 0, at (.+)$/, 'Tasa de equivalente de dosis en t = 0, a $1'],
    [/^Rate after physical decay over t = (.+), at (.+)$/, 'Tasa tras el decaimiento físico durante t = $1, a $2'],
    [/^⚠ d = (.+): at short distances the point-source model \(1\/d²\) depends on the real size of the source and shield and can be far off — at contact it is not valid\. Use a contact or extremity method for these geometries\.$/,
      '⚠ d = $1: a distancias cortas el modelo de fuente puntual (1/d²) depende del tamaño real de la fuente y del blindaje y puede alejarse mucho; en contacto no es válido. Use un método de contacto o de extremidades para estas geometrías.'],
    [/^spectrum-weighted \(rep\. (.+)\)$/, 'ponderada por el espectro (repr. $1)'],
    [/^at (\S+ keV)$/, 'a $1'],
    [/^— first half-value layer \(HVL, (Archer fit|H\*\(10\))\) =$/, (m, b) => `— primera capa hemirreductora (CHR, ${b === 'Archer fit' ? 'ajuste de Archer' : b}) =`],
    [/^Narrow beam · (\d+)-line spectrum \+ build-up$/, 'Haz estrecho · espectro de $1 líneas + acumulación'],
    [/^Archer transmission from Oumano et al\. \(2025\), based on dose at 1 cm depth in tissue\. Applied here as an approximation to both operational quantities([\s\S]*)$/, (m, rest) =>
      'Transmisión de Archer según Oumano et al. (2025), basada en la dosis a 1 cm de profundidad en tejido. Se aplica aquí como aproximación a las dos magnitudes operacionales' + ({
        " (the same transmission is used in the H*(10) and H'(0.07) rows)": " (se usa la misma transmisión en las filas de H*(10) y H'(0,07))",
        " (broad-beam Monte Carlo fit to the full photon spectrum; not an explicit H*(10) or H'(0.07) fit).": " (ajuste Monte Carlo de haz amplio al espectro de fotones completo; no es un ajuste explícito de H*(10) ni de H'(0,07)).",
      }[rest] ?? rest)],
    [/^First (HVL|TVL) for (the Archer fit|H\*\(10\))$/, (m, l, b) => `Primera ${l === 'HVL' ? 'CHR' : 'CDR'} ${b === 'the Archer fit' ? 'del ajuste de Archer' : 'para H*(10)'}`],
    [/^(.+ mm) — first half-value layer \(later layers are thicker as the beam hardens\)$/, '$1 — primera capa hemirreductora (las siguientes son más gruesas a medida que el haz se endurece)'],
    [/^(.+ mm) — first tenth-value layer$/, '$1 — primera capa decimorreductora'],
    [/^Attenuation factor: (.+)$/, 'Factor de atenuación: $1'],
    [/^(?:[\s\S]*of the dose weight[\s\S]*|OUT OF VALIDATED RANGE — [\s\S]*|⚠ Shielding out of validated range: [\s\S]*|the transmitted dose[\s\S]*)$/, m => esShield(m)],
    [/^Dose-equivalent rate vs distance \((.+), (.+ cm)((?: — .+)?)\)$/, (m, mat, th, meth) => `Tasa de equivalente de dosis frente a la distancia (${ES_MATERIALS[mat] || mat}, ${th}${({
      ' — Archer': ' — Archer', ' — narrow beam, spectrum + build-up': ' — haz estrecho, espectro + acumulación', ' — narrow beam + build-up': ' — haz estrecho + acumulación' })[meth] ?? meth})`],
    [/^H\*\(10\), ambient: (.+)$/, 'H*(10), ambiental: $1'],
    [/^H'\(0\.07\), directional: (.+)$/, "H'(0,07), direccional: $1"],
    [/^Annual dose from (\d+) administrations?\/y × (.+) h\/admin:$/, (m, n, t) => `Dosis anual de ${n} administraci${n === '1' ? 'ón' : 'ones'}/a × ${t} h/admin.:`],
    [/^\(screened with (H\*\(10\)|H'\(0\.07\))\): (.+) —$/, (m, q, v) => `(cribado con ${q.replace("0.07", "0,07")}): ${esPerYear(v)} —`],
    [/^[−\-]?[\d.,]+(?:×10[⁰-⁹⁻]+)? (?:[nμm]?Sv|[kMGT]?Bq)\/y$/, esPerYear],
    // Y-90
    [/^Dose rate at (.+) \((H\*\(10\)|H'\(0\.07\)), bremsstrahlung only\):$/, (m, d, q) => `Tasa de dosis a ${d} (${q.replace('0.07', '0,07')}, solo radiación de frenado):`],
    [/^\(after (.+?) ?h decay\)$/, '(tras $1 h de decaimiento)'],
    [/^Annual dose \((H\*\(10\)|H'\(0\.07\)), bremsstrahlung only\):$/, (m, q) => `Dosis anual (${q.replace('0.07', '0,07')}, solo radiación de frenado):`],
    [/^(Lead|Tungsten) raises bremsstrahlung ~(.+)× vs PMMA in this experimental scenario\.$/, (m, mat, f) =>
      `${mat === 'Lead' ? 'El plomo' : 'El wolframio'} aumenta la radiación de frenado ~${f}× respecto del PMMA en este escenario experimental.`],
    [/^(\S+) is predominantly a β⁻ emitter; its photon contribution is not evaluated by this model\.$/, '$1 es un emisor predominantemente β⁻; este modelo no evalúa su contribución de fotones.'],
    [/^Experimental bremsstrahlung component only; direct beta dose is excluded(\. [\s\S]+)$/, (m, rest) => esText('Experimental bremsstrahlung component only; direct beta dose is excluded') + esText(rest)],
    [/^Scenario result — annual dose from (\d+) administrations?\/y × (.+) h\/admin:$/, (m, n, t) => `Resultado del escenario — dosis anual de ${n} administraci${n === '1' ? 'ón' : 'ones'}/a × ${t} h/admin.:`],
    [/^Y-90 bremsstrahlung container: (.+)$/, (m, c) => `Contenedor de Y-90 (radiación de frenado): ${esText(c)}`],
    // Nuclides without a photon line
    [/^(\S+) is an ICRP 107 entry with no photon line passing the app's filter \(≥ 20 keV, yield ≥ 0\.01%\)\. This is not evidence that there is no external hazard\. Decay modes?:$/,
      '$1 es una entrada de ICRP 107 sin ninguna línea de fotones que pase el filtro de la app (≥ 20 keV, rendimiento ≥ 0,01 %). Esto no demuestra que no haya riesgo externo. Modo de desintegración:'],
    [/^((?:α|β−|β\+|electron capture|electron capture \/ β\+|isomeric transition|spontaneous fission)(?: \+ (?:α|β−|β\+|electron capture|electron capture \/ β\+|isomeric transition|spontaneous fission))+)$/, esModes],
    [/^\(minor branches < 0\.01%: (.+)\)$/, (m, l) => `(ramas minoritarias < 0,01 %: ${esModes(l)})`],
    [/^\. ((?:Direct beta|Not a pure)[\s\S]+)$/, (m, rest) => '. ' + esText(rest)],
    [/^(\S+) has β⁻ as its only recorded decay mode; no photon line passes the app's filter\.$/, '$1 tiene β⁻ como único modo de desintegración registrado; ninguna línea de fotones pasa el filtro de la app.'],
    [/^(\S+) decays by β⁻ \(minor branches < 0\.01%: (.+)\); no photon line passes the app's filter\.$/, (m, s, l) =>
      `${s} se desintegra por β⁻ (ramas minoritarias < 0,01 %: ${esModes(l)}); ninguna línea de fotones pasa el filtro de la app.`],
    [/^(\S+) has no photon emission above the selection filter \(decay: (.+)\)\.$/, (m, s, d) => `${s} no tiene emisión de fotones por encima del filtro de selección (desintegración: ${esModes(d)}).`],
    [/^([\s\S]+)\. Equilibrium is reached after about 10 half-lives of the longest-lived one \(≈ (.+)\); before that, "include" overestimates\. App criterion: progeny with T½ ≤ 1\/10 of the parent's and ≤ 30 d\.$/,
      '$1. El equilibrio se alcanza tras unos 10 periodos del de vida más larga (≈ $2); antes, «incluir» sobrestima. Criterio de la app: progenie con T½ ≤ 1/10 del del padre y ≤ 30 d.'],
    // Dose report
    [/^Curated entry, cross-checked against (.+?): published Γ\^H\*\(10\) = (.+), stored (.+) \((.+)%\)( — difference not reconciled)?$/, (m, src, p, s, d, nr) =>
      `Entrada revisada, contrastada con ${src}: Γ^H*(10) publicada = ${p}, almacenada ${s} (${d} %)${nr ? ' — diferencia no conciliada' : ''}`],
    [/^ICRP 107 \(photon data[\s\S]*$/, esSource],
    [/^Γ\(H\*\(10\)\) = (.+); Γ\((H'\(0\.07\)|H\*\(10\) fallback)\) = (.+)$/, (m, a, q, b) =>
      `Γ(H*(10)) = ${a}; Γ(${q === 'H*(10) fallback' ? 'H*(10), sustitución' : "H'(0,07)"}) = ${b}`],
    [/^included in secular equilibrium \(curated chain\): (.+)$/, 'incluida en equilibrio secular (cadena revisada): $1'],
    [/^included in equilibrium \(app criterion: T½ ≤ 1\/10 of the parent and ≤ 30 d\): (.+)$/, 'incluida en equilibrio (criterio de la app: T½ ≤ 1/10 del padre y ≤ 30 d): $1'],
    [/^EXCLUDED — parent only, as selected: (.+)$/, 'EXCLUIDA — solo el padre, según lo seleccionado: $1'],
    [/^(H'\(0\.07\)|H'\(0\.07\) row \(H\*\(10\) value\)) rate at d, t = 0$/, (m, q) => `Tasa de ${q === "H'(0.07)" ? "H'(0,07)" : "H'(0,07) (valor de H*(10))"} a d, t = 0`],
    [/^Annual integrated (H'\(0\.07\)|H'\(0\.07\) row \(H\*\(10\) value\))$/, (m, q) => `${q === "H'(0.07)" ? "H'(0,07)" : "H'(0,07) (valor de H*(10))"} integrada anual`],
    [/^(.+)\/y — (.+) % of 20 mSv\/y \(exposed workers\); (.+) % of 1 mSv\/y \(public\)$/, '$1/a — $2 % de 20 mSv/a (trabajadores expuestos); $3 % de 1 mSv/a (público)'],
    [/^(.+) % of 50 mSv in one year; (.+) % of 100 mSv in 5 consecutive years, assuming this annual dose in each of the 5 years$/,
      '$1 % de 50 mSv en un único año oficial; $2 % de 100 mSv a lo largo de cinco años oficiales consecutivos, suponiendo esta dosis anual en cada uno de los 5 años'],
    [/^(.+)\/y — (.+) % of 500 mSv\/y$/, '$1/a — $2 % de 500 mSv/a'],
    [/^Skin \/ extremities \(screened with (H'\(0\.07\)|H\*\(10\) — no H'\(0\.07\) constant)\)$/, (m, q) =>
      `Piel / extremidades (cribado con ${q === "H'(0.07)" ? "H'(0,07)" : "H*(10); sin constante H'(0,07)"})`],
    [/^H\*\(10\) and H'\(0\.07\) are area-monitoring quantities\. These operational-quantity estimates do not establish compliance\. Apply the dose-assessment and monitoring methods required for the exposure situation\. (The limit screening in this report is indicative only\.|No limit screening is made for this experimental scenario\.)$/,
      (m, tail) => "H*(10) y H'(0,07) son magnitudes de vigilancia radiológica de áreas. Estas estimaciones con magnitudes operacionales no demuestran el cumplimiento. Aplique los métodos de evaluación de dosis y de vigilancia que exija la situación de exposición. " +
        (tail.startsWith('The limit') ? 'La comparación con límites de este informe es solo un cribado orientativo.' : 'No se hace comparación con límites para este escenario experimental.')],
    [/^Patient attenuation applied: transmission (.+)%\.$/, 'Atenuación del paciente aplicada: transmisión $1 %.'],
    [/^Spectrum-weighted narrow-beam transmission over (\d+) ICRP 107 photon lines with point-isotropic exposure build-up \(ANSI\/ANS-6\.4\.3 reference data\); accounts for beam hardening and scatter build-up\. Infinite-medium build-up applied to a finite barrier: the deviation is not universally conservative — treat results as estimates, not shielding-design values\.$/,
      'Transmisión de haz estrecho ponderada por el espectro sobre $1 líneas de fotones de ICRP 107 con acumulación de exposición para fuente puntual isótropa (datos de referencia ANSI/ANS-6.4.3); tiene en cuenta el endurecimiento del haz y la acumulación por dispersión. Acumulación de medio infinito aplicada a una barrera finita: la desviación no es conservadora en todos los casos; trate los resultados como estimaciones, no como valores de diseño de blindajes.'],

    // ---- Effluent ----
    [/^(.+?) \((m³\/h|mSv\/y|GBq\/y|m³\/y|kg\/m³|–|h\/y|h|%|t\/y|d)\)$/, (m, label, u) => {
      const t = esText(label);
      return t === label ? m : `${t} (${esUnit(u)})`;
    }],
    [/^(Hospital|Clinic) — (.+) m³\/y$/, (m, f, v) => `${f === 'Clinic' ? 'Clínica' : 'Hospital'} — ${v} m³/a`],
    [/^Sc\. ([12]) \((.+)\)$/, (m, n, u) => `Esc. ${n} (${esUnit(u)})`],
    [/^Include (\S+)$/, 'Incluir $1'],
    [/^(\S+) (patients per y|cycles per patient|activity per cycle GBq|fraction in hospital|controlled in decay tanks)$/, (m, id, w) => `${id}: ${({
      'patients per y': 'pacientes por año', 'cycles per patient': 'ciclos por paciente', 'activity per cycle GBq': 'actividad por ciclo, GBq',
      'fraction in hospital': 'fracción en el hospital', 'controlled in decay tanks': 'controlado en depósitos de decaimiento' })[w]}`],
    [/^⚠ ([\s\S]+)$/, (m, rest) => { const t = esText(rest); return t === rest ? m : '⚠ ' + t; }],
    [/^: ([\s\S]+)$/, (m, rest) => { const t = esText(rest); return t === rest ? m : ': ' + t; }],
    [/^(Common|Scenario 1|Scenario 2) — (.+)$/, (m, sc, label) => {
      const t = esText(label);
      return t === label ? m : `${sc === 'Common' ? 'Común' : esText(sc)} — ${t}`;
    }],
    [/^\(default (.+?)\): ([\s\S]+)$/, (m, v, src) => `(por defecto ${esPerYear(v).replace(/ h\/y$/, ' h/a').replace(/ t\/y$/, ' t/a').replace(/ m³\/y$/, ' m³/a').replace(/^(\d+)\.(\d+)/, '$1,$2')}): ${esText(src)}`],
    [/^(Water slab [^.]+? surface)\. ([\s\S]+)$/, (m, a, b) => `${esText(a)}. ${esText(b)}`],
    [/^Decay tanks: (.+) GBq\/y excreted into the tanks by the controlled nuclides; (.+) GBq\/y discharged, shared in proportion \(factor (.+)\)\.$/,
      'Depósitos de decaimiento: $1 GBq/a excretados a los depósitos por los nucleidos controlados; $2 GBq/a vertidos, repartidos en proporción (factor $3).'],
    [/^Decay tanks: (.+) GBq\/y excreted into the tanks, below the (.+) GBq\/y discharge — all of it is assumed discharged \(no decay credit\)\.$/,
      'Depósitos de decaimiento: $1 GBq/a excretados a los depósitos, por debajo del vertido de $2 GBq/a; se supone que se vierte todo (sin crédito por decaimiento).'],
    [/^mSv\/y — (at least )?(.+) % of the criterion((?: — EXCEEDS IT)?)((?: — PARTIAL SUM, missing: .+)?)$/, (m, al, p, ex, part) =>
      `mSv/a — ${al ? 'al menos el ' : ''}${p} % del criterio${ex ? ' — LO SUPERA' : ''}${part ? part.replace(' — PARTIAL SUM, missing: ', ' — SUMA PARCIAL, falta: ').replace(/ external$/, ' externa') : ''}`],
    [/^Criterion: (.+) mSv\/y, user-defined — the app attributes no regulatory basis to it\.$/, 'Criterio: $1 mSv/a, definido por el usuario; la app no le atribuye base reglamentaria.'],
    [/^Sc\. 1: ([\s\S]+)$/, m => m.replace(/Sc\. /g, 'Esc. ').replace('Sc. 2: no coefficient', 'Esc. 2: sin coeficiente').replace('Esc. 2: no coefficient', 'Esc. 2: sin coeficiente').replace('one-sided model envelope', 'envolvente unilateral del modelo')],
    [/^(P20P21-G9-FINAL-1\.0\.0[\s\S]*|Tc-99m Scenario 2 report [\s\S]*|INF-I131-S2-RESULTADOS-1\.1\.0, §X\.5 \(air domain accepted with DEV-05\))$/, m => esReport(m)],
    [/^This model \((L10|L45)\)$/, 'Este modelo ($1)'],
    [/^([\d.,]+) µSv\/GBq at the NUREG reference plant, scaled by dry sludge mass, solids fraction, density, transit decay, t$/,
      '$1 µSv/GBq en la planta de referencia del NUREG, escalado por la masa de lodo seco, la fracción de sólidos, la densidad, el decaimiento en tránsito, t'],
    [/^\. (NUREG\/CR-5814 Table B\.7: [\s\S]+)$/, (m, rest) => '. ' + esText(rest)],
    [/^(\S+) \(rescaled: (\S+)\)$/, '$1 (reescalado: $2)'],
    [/^(IAEA SRS-19 \(2001\) Table I–IV: [\s\S]+? Indicative only\.) (Rescaled value: [\s\S]+)$/, (m, a, b) => `${esText(a)} ${esText(b)}`],
    [/^\(nSv\/h\)\/\(Bq\/m³\)\. ([\s\S]+)$/, (m, rest) => '(nSv/h)/(Bq/m³). ' + esText(rest)],
    [/^"(.+)" must be (a number|greater than 0)$/, (m, f, w) => `«${esText(f)}» ${w === 'a number' ? 'debe ser un número' : 'debe ser mayor que 0'}`],
    [/^(\S+): fraction excreted in hospital must be ≤ 1$/, '$1: la fracción excretada en el hospital debe ser ≤ 1'],
    // Effluent report
    [/^effluent-scenarios\.json (v\S+) \((.+)\)\. External coefficients from own PHITS calculations, not from a published table\.$/,
      'effluent-scenarios.json $1 ($2). Coeficientes externos de cálculos PHITS propios, no de una tabla publicada.'],
    [/^A_adm = ([\s\S]+)$/, m => m.replace(' patients/y × ', ' pacientes/a × ').replace(' cycles × ', ' ciclos × ').split(' GBq/y').join(' GBq/a')
      .replace('; excreted in hospital ', '; excretado en el hospital ').replace(' into decay tanks', ' a depósitos de decaimiento')
      .replace('; leaves hospital ', '; sale del hospital ').replace(' (Scenario 1)', ' (escenario 1)').replace('; at home ', '; en el domicilio ')
      .replace(' % catchment; to STP ', ' % de zona servida; a la depuradora ').replace(' (Scenario 2)', ' (escenario 2)')],
    [/^(.+) GBq\/y; sharing factor (.+)$/, '$1 GBq/a; factor de reparto $2'],
    [/^(\S+) half-life$/, 'Periodo de semidesintegración del $1'],
    [/^(\S+) k Scenario ([12])((?: \((?:L10|L45)\))?)$/, 'k del $1, escenario $2$3'],
    [/^(\S+) e\(inh\)$/, 'e(inh) del $1'],
    [/^([\d.,]+ d) — ([\s\S]+)$/, (m, v, src) => `${v} — ${esText(src)}`],
    [/^(.+) \(nSv\/h\)\/\(Bq\/m³\), u = (.+) % — ([\s\S]+)$/, (m, v, u, rep) => `${v} (nSv/h)/(Bq/m³), u = ${u} % — ${esReport(rep)}`],
    [/^(.+) \(nSv\/h\)\/\(Bq\/m³\), u = (.+) %$/, '$1 (nSv/h)/(Bq/m³), u = $2 %'],
    [/^(.+) Sv\/Bq, type ([FMS])$/, '$1 Sv/Bq, tipo $2'],
    [/^(\S+ GBq\/y; DF [\s\S]+)$/, m => esEffRow(m)],
    [/^(\S+) \(PARTIAL\)$/, '$1 (PARCIAL)'],
    [/^PARTIAL SUM \(pathways missing: (.+)\)$/, (m, l) => `SUMA PARCIAL (vías que faltan: ${l.replace(/ external/g, ' externa')})`],
    [/^(≥ )?(.+) mSv\/y = (at least )?(.+) % of the user-defined criterion of (.+) mSv\/y$/, (m, ge, v, al, p, c) =>
      `${ge || ''}${v} mSv/a = ${al ? 'al menos el ' : ''}${p} % del criterio definido por el usuario de ${c} mSv/a`],
    [/^(.+) mSv\/y — no comparison \(criterion ≤ 0\)$/, '$1 mSv/a — sin comparación (criterio ≤ 0)'],

    // ---- Caregiver ----
    [/^(.+) — ((?:[\d.,]+) mSv)$/, (m, label, v) => { const t = esText(label); return t === label ? m : `${t} — ${v}`; }],
    [/^Basis: (.+) — see$/, (m, b) => `Base: ${esText(b)} — véase`],
    [/^— (fast phase until (.+?) h, T fast (.+?) h|single exponential), T slow (.+?) h, (\d+) cycle\(s\), profile (.+?)\. ([\s\S]+)$/, (m, ph, end, tf, ts, n, prof, src) =>
      `— ${ph.startsWith('single') ? 'una sola exponencial' : `fase rápida hasta ${end} h, T rápida ${tf} h`}, T lenta ${ts} h, ${n} ciclo(s), perfil ${esText(prof)}. ${esText(src)}`],
    [/^Own measurement (\d+) (distance \(m\)|rate \(µSv\/h\))$/, (m, n, w) => `Medida propia ${n}: ${w.startsWith('distance') ? 'distancia (m)' : 'tasa (µSv/h)'}`],
    [/^(.+) (restriction days|hours per day during|distance during|hours per day after|distance after)$/, (m, row, w) =>
      `${esText(row)}: ${({ 'restriction days': 'días de restricción', 'hours per day during': 'horas al día durante', 'distance during': 'distancia durante',
        'hours per day after': 'horas al día después', 'distance after': 'distancia después' })[w]}`],
    [/^(.+): (missing days or hours|invalid days or hours|distance without a valid factor in the profile)$/, (m, row, w) =>
      `${({ Sleeping: 'Dormir', 'Day-time': 'Diurna' })[row] || esText(row)}: ${({ 'missing days or hours': 'faltan días u horas', 'invalid days or hours': 'días u horas no válidos',
        'distance without a valid factor in the profile': 'distancia sin factor válido en el perfil' })[w]}`],
    [/^mSv — (\d+) cycle\(s\)$/, 'mSv — $1 ciclo(s)'],
    [/^The proximity profile does not list (.+): choose an approximate profile or enter the distances by hand\.$/,
      'El perfil de proximidad no incluye $1: elija un perfil aproximado o introduzca las distancias a mano.'],
    [/^(⚠ )?Category «(.+)» is not the one the Forum assigns to the scenario «(.+)» \((.+)\): check the criterion\.$/, (m, w, c, sc, ok) =>
      `${w || ''}La categoría «${esText(c)}» no es la que el Foro asigna al escenario «${esText(sc)}» (${ok.split(' or ').map(esText).join(' o ')}): revise el criterio.`],
    [/^(.+) — Foro CSN-SEPR-SEFM \(2011\), Annex 3\.B, Table 3\.B 1$/, (m, l) => `${esText(l)} — Foro CSN-SEPR-SEFM (2011), anexo 3.B, tabla 3.B 1`],
    [/^mSv — (.+)$/, (m, label) => { const t = esText(label); return t === label ? m : `mSv — ${t}`; }],
    [/^([\s\S]+) — with this restriction the treatment dose EXCEEDS the criterion$/, (m, a) => `${esText(a)} — con esta restricción la dosis del tratamiento SUPERA el criterio`],
    [/^Criterion — (.+)$/, 'Criterio — $1'],
    [/^(Floor|Upper asymptote) — indefinite restriction — (.+)$/, (m, k, v) => `${k === 'Floor' ? 'Suelo' : 'Asíntota superior'} — restricción indefinida — ${v}`],
    [/^Indefinite restriction — (.+)$/, 'Restricción indefinida — $1'],
    [/^Adopted restriction — (.+)$/, 'Restricción adoptada — $1'],
    [/^This table — (.+)$/, 'Esta tabla — $1'],
    [/^This table \(restrictions (.+)\) — (.+)$/, 'Esta tabla (restricciones $1) — $2'],
    [/^Treatment dose vs restriction \(mSv\): (.+) at (.+) d$/, 'Dosis del tratamiento frente a la restricción (mSv): $1 a $2 d'],
    // Caregiver report
    [/^Preset «(.+)»\. ([\s\S]+)$/, (m, label, src) => `Cinética predefinida «${esText(label)}». ${esText(src)}`],
    [/^caregiver\.json (v\S+) \((.+)\)\. ([\s\S]+)$/, (m, v, d, o) => `caregiver.json ${v} (${d}). ${esText(o)}`],
    [/^(.+?): (.+) mSv per treatment \(([\s\S]+)\)$/, (m, label, v, basis) => `${esText(label)}: ${v} mSv por tratamiento (${esText(basis)})`],
    [/^(DOTATATE measured|I-131 approximate|Lu-177 approximate|Own measurements) (\S+(?: protocol)?) — (Empirical|Approximation|Measured)$/, (m, l, r, n) =>
      `${esText(l)} ${esText(r)} — ${esText(n)}`],
    [/^Own measurement (.+) m$/, 'Medida propia a $1 m'],
    [/^(.+) µSv\/h → factor (.+)$/, '$1 µSv/h → factor $2'],
    [/^restriction days not entered; during ([\s\S]+)$/, (m, rest) => `días de restricción no introducidos; durante ${rest
      .replace(/ h\/d at /g, ' h/d a ').replace('; after ', '; después ').replace(/\(factor none\)/g, '(sin factor)').replace('; dose/cycle ', '; dosis/ciclo ')}`],
    [/^(.+) d restriction; during ([\s\S]+)$/, (m, d, rest) => `${d} d de restricción; durante ${rest
      .replace(/ h\/d at /g, ' h/d a ').replace('; after ', '; después ').replace(/\(factor none\)/g, '(sin factor)').replace('; dose/cycle ', '; dosis/ciclo ')}`],
    [/^(.+) d — ([\s\S]+)$/, (m, d, note) => { const t = esText(note.replace(/ — with this restriction the treatment dose EXCEEDS the criterion$/, ''));
      return note.endsWith('EXCEEDS the criterion') ? `${d} d — ${t} — con esta restricción la dosis del tratamiento SUPERA el criterio` : (t === note ? m : `${d} d — ${t}`); }],
  ],
};
