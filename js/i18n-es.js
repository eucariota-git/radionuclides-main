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
  ],
};
