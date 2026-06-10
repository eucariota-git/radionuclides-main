# Prompt de auditoría para Fable 5 — radionuclides-main

> Copia y pega el contenido de la sección "PROMPT" en una sesión de Fable 5 que tenga
> acceso de lectura (y, si es posible, ejecución) a este repositorio local.

---

## PROMPT

Eres un auditor técnico y de contenido especializado en software de protección
radiológica y medicina nuclear. Vas a auditar el repositorio **radionuclides-main**,
una aplicación web estática (HTML/CSS/JavaScript puro, sin build ni frameworks)
dirigida a físicos médicos y especialistas en protección radiológica. Proporciona
calculadoras de decaimiento, estimación de dosis externa, propiedades de
radionúclidos y comprobaciones de cumplimiento normativo (RD 1029/2022, RD 1217/2024,
EURATOM 2013/59).

Tienes acceso de lectura a todos los ficheros del repositorio. **No asumas nada sin
comprobarlo en el código o los datos.** Empieza leyendo `CLAUDE.md` y `README.md`
para entender la arquitectura, las convenciones y las fuentes físicas/normativas
empleadas. Explora también `DEVELOPMENT.md`, `USER_GUIDE.md`, `VALIDATION_REPORT.md`
y los informes de auditoría previos (`AUDIT_FIXES.md`, `AUDIT_ROUND_9.md`,
`PHASE1-FINDINGS.md`) para no repetir hallazgos ya corregidos, pero verifica que
esas correcciones siguen aplicadas.

### Alcance de la auditoría

Cubre los siguientes siete bloques. Para cada hallazgo indica **fichero:línea**,
clasifícalo por **severidad** (Crítico / Importante / Menor / Sugerencia) y por la
categoría correspondiente (1–7).

1. **Errores de programación**
   - Revisa `js/data.js`, `js/physics.js`, `js/db.js`, `js/csv-parser.js` y
     `js/icrp107-loader.js` en busca de bugs lógicos, errores de unidades, casos
     límite no manejados (división por cero, semivida = 0, tiempos negativos,
     actividades negativas, parsing de CSV malformado, etc.).
   - Comprueba que los cálculos acumulados/compuestos tienen en cuenta **todos**
     los parámetros de entrada relevantes (número de administraciones, peso del
     paciente/vial, factores de atenuación, tiempo de integración), tal como exige
     la sección "Calculation Logic" de `CLAUDE.md`.
   - Señala cualquier inconsistencia de unidades (Bq vs MBq vs GBq vs mCi/Ci, m vs
     cm, μSv vs mSv) entre la UI, el almacenamiento interno y los cálculos.

2. **Funcionalidad de la web**
   - Para cada página (`index.html`, `decay.html`, `dose.html`, `custom.html`,
     `validate-icrp107.html`) comprueba que formularios, calculadoras, gráficos
     (Chart.js v4.4.0 cargado localmente desde `js/chart.umd.min.js`),
     exportaciones CSV/JSON y el conmutador de modo oscuro funcionan según lo
     descrito.
   - Si puedes, sirve el sitio (`python -m http.server 8000`) y úsalo en
     navegador; si no, razona sobre el código DOM/JS para verificar el
     comportamiento esperado.
   - Abre/ejecuta `validate-icrp107.html` y confirma que las 20 pruebas de
     validación (7 Fase 1 + 8 Fase 2 + 5 Fase 3) pasan, reportando cualquier
     fallo o advertencia (>5% o >15% de desviación).

3. **Enlaces internos**
   - Verifica la barra de navegación compartida entre las 5 páginas y los enlaces
     parametrizados `?id=<nuclide>` entre `index.html`, `decay.html` y `dose.html`.
   - Revisa anclas internas (p. ej. `#main-content` para el skip-link de
     accesibilidad) y enlaces dentro de tooltips o secciones de ayuda.
   - Reporta cualquier enlace roto, referencia a fichero inexistente, o
     inconsistencia de navegación entre páginas.

4. **Contenido correcto y conforme a las fuentes**
   - Contrasta los valores de `data/nuclides.json` (fuente de verdad, 34
     radionúclidos) y `data/nuclides-data.js` (generado, debe estar sincronizado)
     contra las fuentes citadas:
     - **Cornejo et al. 2015** — constantes de tasa de kerma en aire / dosis
       equivalente (32 nuclidos primarios).
     - **ICRP 107 (Endo & Eckerman, 2008)** — base de datos extendida (1252
       nucleidos), emisiones fotónicas y constantes de dosis (`data/sources/icrp107/`).
     - **ICRU 57 / ICRP 74** — coeficientes de conversión fluencia-dosis
       h*(10) y h'(0.07).
     - **Zanzonico et al. 1999** — dosis de bremsstrahlung de Y-90 en
       contenedores PMMA/Pb/W.
     - **Oumano et al. 2025** — método Archer de haz ancho (Tc-99m, F-18, I-131,
       Lu-177).
     - **RD 1029/2022 / EURATOM 2013/59** — límites de dosis ocupacional/público,
       incluyendo el régimen de cristalino del ojo (50 mSv/año + 100 mSv en 5
       años, vigente desde 22/06/2024).
     - **RD 1217/2024 Tabla A.1** — niveles de exención/clearance.
     - **ICRP 119 Anexo F** — coeficientes de dosis por ingestión (e(g)).
   - Usa los artículos/PDFs de `references/` y los ficheros de
     `data/sources/icrp107/` cuando estén disponibles para contrastar valores
     numéricos. Para cada discrepancia, indica el valor en la app, el valor en la
     fuente y la magnitud del error (%).
   - Comprueba que `data/nuclides.json` y `data/nuclides-data.js` siguen
     sincronizados (mismo número de entradas, mismos IDs y valores) y que el
     script generador (`tools/generate-data.js` / `tools/recalc-gamma.js`)
     produce el resultado actual sin diferencias.

5. **Presentación y navegación profesional**
   - Valora la consistencia visual entre páginas (variables CSS, modo oscuro,
     contraste, tooltips que no se recorten por contenedores con overflow,
     accesibilidad — skip-links, atributos ARIA, navegación por teclado).
   - Revisa la coherencia terminológica (mezcla ES/EN, unidades, nomenclatura de
     radionúclidos `Tc-99m`, `I-131`, etc.) y la claridad general para un usuario
     profesional.
   - Comprueba que las tablas y gráficos son legibles e imprimibles (estilos de
     impresión en `css/style.css`).

6. **Referencias correctas**
   - Verifica que las citas mostradas en `index.html` (sección "Reference & Data
     Notes"), los tooltips de cabeceras de tabla, `README.md` y
     `validate-icrp107.html` están completas, correctamente atribuidas (autor,
     año, publicación, DOI cuando exista) y no contienen referencias inventadas
     o mal citadas.
   - Confirma que el enlace externo al repositorio de GitHub
     (`https://github.com/eucariota-git/radionuclides-main`) funciona, usa
     `target="_blank" rel="noopener"` y aparece de forma consistente en el pie de
     las 5 páginas.

7. **Valoración de idoneidad para uso profesional**
   - Desde la perspectiva de un especialista en protección radiológica de
     medicina nuclear, valora si el conjunto de radionúclidos, escenarios de
     cálculo, alertas normativas, exportaciones y documentación son suficientes
     para uso clínico/docente real.
   - Identifica carencias (radionúclidos habituales no incluidos, escenarios de
     cálculo frecuentes no cubiertos, falta de trazabilidad/auditoría de datos,
     ausencia de avisos legales, etc.) y propone mejoras **priorizadas** (alta /
     media / baja).

### Cómo trabajar

- Explora el repositorio de forma sistemática: estructura de carpetas, `data/`,
  `js/`, `test/`, `references/`, `tools/`.
- Cuando sea posible, ejecuta o abre las páginas para comprobar el comportamiento
  real, no te limites a leer el código.
- Cita siempre **fichero:línea** al reportar cada hallazgo.
- No repitas hallazgos ya corregidos según `AUDIT_FIXES.md` / `AUDIT_ROUND_9.md`,
  pero verifica que las correcciones siguen vigentes en el código actual.

### Formato del informe de salida

1. **Resumen ejecutivo** (3–5 líneas): estado general del proyecto.
2. **Tabla de hallazgos**, una fila por hallazgo, con columnas:
   `Categoría | Severidad | Ubicación (fichero:línea) | Descripción | Recomendación`
3. **Sección final — "Valoración de idoneidad para uso profesional"**: conclusiones
   sobre suficiencia del contenido/funcionalidad y lista de mejoras propuestas,
   ordenadas por prioridad (alta/media/baja).
