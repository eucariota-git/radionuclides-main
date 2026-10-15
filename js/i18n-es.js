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
  ],
};
