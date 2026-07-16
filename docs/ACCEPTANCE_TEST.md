# Hoja de prueba de aceptación — NM Radionuclide Planner

**Versión de la aplicación:** v1.2 (base de datos `nuclides.json` v1.2; blindaje narrow-beam con build-up ANS-6.4.3; espectros de blindaje regenerados sin corte espectral, 2026-07)
**Objeto:** validación independiente por un radiofísico / especialista en PR distinto del desarrollador, previa a la adopción de la herramienta en el servicio.
**Instrucciones:** ejecute cada caso en la aplicación, anote el valor obtenido y contraste con su fuente independiente (Delacroix et al. 2002 *Radionuclide and Radiation Protection Data Handbook*, Smith & Stabin 2012, ficha técnica del radiofármaco, o cálculo propio). Marque ✓/✗ y firme al final.

**Criterios de aceptación:**
- Columna "Valor app esperado": el valor que la aplicación debe mostrar (reproducibilidad). Desviación admisible: ±1 dígito de redondeo.
- Contraste con fuente independiente: desviación ≤ 5% → ✓ | 5–15% → revisar y justificar | > 15% → ✗ (detener adopción, abrir incidencia).

---

## A. Casos de cálculo

| # | Caso | Entradas | Valor app esperado | Valor obtenido | Fuente independiente y valor | ✓/✗ |
|---|------|----------|--------------------|----------------|------------------------------|-----|
| A1 | **Constante Γ — SPECT** (Properties) | Tc-99m | Γ^H\*(10) = 21.72 μSv·h⁻¹·GBq⁻¹·m² (Cornejo publicado: 21.7) | | | |
| A2 | **Constante Γ — terapia α en cadena** (Properties) | Ra-223 | Γ^H\*(10) = 52.86 (incluye progenie en equilibrio) ≈ 0.053 μSv·h⁻¹·MBq⁻¹·m² | | p. ej. ficha Xofigo / literatura ~0.05 | |
| A3 | **Decaimiento** (Decay) | F-18, A₀ = 1000 MBq, t = 2 h | A(t) = 468.7 MBq (46.87%) | | cálculo manual con T½ = 109.77 min | |
| A4 | **Dosis sin blindaje** (Dose) | I-131, 1 GBq, d = 1 m | Ḣ\*(10) = 65.78 μSv/h | | Delacroix: ~66 μSv·h⁻¹·GBq⁻¹ a 1 m | |
| A5 | **Blindaje Archer** (Dose) | Tc-99m, 1 GBq, d = 0.5 m, Pb 2 mm | T = 0.56%; Ḣ = 0.48 μSv/h; HVL(Pb) = 0.24 mm (badge "Archer") | | Oumano 2025 / HVL publicado ~0.25 mm | |
| A6 | **Blindaje espectral multi-línea + build-up** (Dose) | Ga-67, 1 GBq, d = 0.30 m, Pb 5 mm | T = 8.65%; Ḣ\*(10) = 25.8 μSv/h (badge "Narrow beam · 10-line spectrum + build-up"; μ NIST XAAMDI) | | Delacroix curvas de transmisión Ga-67/Pb (contrastar orden de magnitud; el build-up de medio infinito no es universalmente conservador para barreras finitas — véase NUREG/CR-5740) | |
| A7 | **Directional H'(0.07)** (Dose) | I-125, 500 MBq, d = 10 cm | Ḣ'(0.07) = 2126 μSv/h ≈ 2.13 mSv/h (fila H'(0.07), constante real Γ^H'(0.07) = 42.52) | | Cornejo Γ^H'(0.07) = 40.9 (±5%) | |
| A8 | **Desclasificación** (Decay) | Lu-177, A₀ = 2 GBq, peso = 10 kg | 200 000 kBq/kg inicial; nivel 100 kBq/kg; alcanza desclasificación tras ≈ 72.8 d | | RD 1217/2024 Anexo IV Tabla A.1 (Lu-177 = 1E+02 Bq/g) | |
| A9 | **Efluente líquido** (Properties) | I-131 | 75.8 Bq/L; e(g) = 2.2×10⁻⁸ Sv/Bq | | ICRP 119 Anexo F Tabla F.1 (adulto); IS-28 | |
| A10 | **Y-90 bremsstrahlung** (Dose) | Y-90, 2 GBq, d = 0.30 m, contenedor PMMA | Ḣ\*(10) = 0.200 μSv/h; aviso al seleccionar Pb (3–4× más bremsstrahlung) | | ⚠ valores de contenedor son ESTIMACIONES (no tabuladas en Zanzonico 1999) — contrastar con medida o criterio experto | |

## B. Comprobaciones funcionales

| # | Comprobación | Resultado esperado | ✓/✗ |
|---|--------------|--------------------|-----|
| B1 | Las cuatro suites de tests (`node test/validate-app.js`, `validate-math.js`, `validate-data.js`, `validate-constants.js`) | Todas en verde (0 failed) | |
| B2 | Nucleido ICRP 107 (p. ej. Na-22) buscado en Properties y abierto en Dose | Constantes Γ calculadas mostradas; la comparación con Cornejo la cubre `validate-constants.js` (B1) | |
| B3 | Informe 📄 Report / PDF (Dose y Decay) | Cabecera con fecha y "nuclides.json v1.2", método de blindaje declarado, disclaimer y línea de firma | |
| B4 | Nucleido ICRP 107 extendido (p. ej. Na-22) en Dose | Aviso "NOT manually validated" antes de calcular | |
| B5 | Funcionamiento offline | Abrir vía `file://` y, en HTTPS, recargar sin conexión tras primera visita (service worker) | |
| B6 | Instalación PWA (Android/desktop, HTTPS) | El navegador ofrece "Instalar"; icono trébol; arranca standalone | |
| B7 | Modo oscuro | Tablas, gráficas, tooltips y avisos legibles en ambos modos | |
| B8 | Magnitudes en Dose | H\*(10) y H'(0.07) se muestran SIEMPRE las dos (magnitudes de área); sin cambio automático por distancia; la comparación con límites se rotula "cribado indicativo" (cumplimiento = dosimetría personal Hp) | |
| B9 | Export CSV (Decay y Dose) | Fichero descarga con valores coherentes con pantalla | |
| B10 | Búsqueda en español (Properties) | "tecnecio", "lutecio", "radio" encuentran Tc-99m, Lu-177, Ra-223 | |
| B11 | Hierro elemental en Dose | El selector ofrece “Iron (Fe) — ρ=7.874”; el cálculo usa el modelo espectral + build-up y no lo presenta como acero ni como modelo Archer | |

## C. Límites conocidos (leer y aceptar)

El validador confirma que conoce y acepta estas limitaciones documentadas:

- [ ] Geometría de fuente puntual; sin dispersión ni distribución de fuente.
- [ ] El narrow-beam espectral incluye **build-up de exposición** (ANSI/ANS-6.4.3, fuente puntual isótropa en medio infinito); combinado con coeficientes de atenuación que incluyen dispersión coherente y aplicado a barreras finitas, su desviación no es universalmente conservadora. NO usar para diseño de blindajes estructurales (memorias ante el CSN requieren TVLs publicados o cálculo dedicado).
- [ ] Valores de contenedor Y-90 son estimaciones (metodología Zanzonico 1999, no tabuladas en esa publicación).
- [ ] Cristalino estimado con H\*(10).
- [ ] Decaimiento entre administraciones no modelado (cada administración independiente).
- [ ] Entradas ICRP 107 extendidas: constantes calculadas automáticamente, no validadas manualmente.
- [ ] La herramienta es de apoyo: no sustituye el juicio del experto ni el cálculo regulatorio formal.

---

## Resultado

| | |
|---|---|
| Casos A superados | ____ / 10 |
| Comprobaciones B superadas | ____ / 10 |
| Incidencias abiertas | |
| **Veredicto** | ☐ APTA para uso en el servicio ☐ APTA con restricciones: ____________ ☐ NO APTA |

**Validador (nombre y firma):** ______________________________
**Fecha:** ____________
**Versión validada:** v1.2 — commit: ____________
