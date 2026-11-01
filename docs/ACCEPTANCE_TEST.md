# Hoja de prueba de aceptación — NM Radionuclide Planner

**Candidato que se valida (copiar literalmente de `PACKAGE-INFO.txt`):**

Aplicación: v__________ · Build: ____________________ · Base de datos: v__________<br>
Commit fuente completo: ________________________________________ · SHA-256 del ZIP: ________________________________________
**Objeto:** validación independiente por un radiofísico / especialista en PR distinto del desarrollador, previa a la adopción de la herramienta en el servicio.
**Instrucciones:** ejecute cada caso en la aplicación, anote el valor obtenido y contraste con su fuente independiente (Delacroix et al. 2002 *Radionuclide and Radiation Protection Data Handbook*, Smith & Stabin 2012, ficha técnica del radiofármaco, o cálculo propio). Marque ✓/✗ y firme al final.

**Criterios de aceptación:**
- Columna "Valor app esperado": el valor que la aplicación debe mostrar (reproducibilidad). Desviación admisible: ±1 dígito de redondeo.
- Contraste con fuente independiente: desviación ≤ 5% → ✓ | 5–15% → revisar y justificar | > 15% → ✗ (detener adopción, abrir incidencia).
- A10 (Y-90) es un **escenario experimental**: solo se comprueba la reproducibilidad del valor y la presencia de los avisos. El contraste con fuente independiente no es aplicable y superar A10 **no valida** las constantes de contenedor.

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
| A7 | **Directional H'(0.07)** (Dose) | I-125, 500 MBq, d = 10 cm | Ḣ'(0.07) = 2127 μSv/h ≈ 2.13 mSv/h (fila H'(0.07), constante real Γ^H'(0.07) = 42.53) | | Cornejo Γ^H'(0.07) = 40.9 (±5%) | |
| A8 | **Desclasificación** (Decay) | Lu-177, A₀ = 2 GBq, peso = 10 kg | 200 000 kBq/kg inicial; nivel 100 kBq/kg; alcanza desclasificación tras ≈ 72.9 d (T½ DDEP 6.6443 d) | | RD 1217/2024 Anexo IV Tabla A1 (Lu-177 = 1E+02 Bq/g) | |
| A9 | **Efluente líquido** (Properties) | I-131 | 75.8 Bq/L; e(g) = 2.2×10⁻⁸ Sv/Bq | | RD 783/2001 anexo III tabla a), adulto (transcripción numérica: ICRP 119 tabla F.1); IS-28 | |
| A10 | **Y-90 bremsstrahlung — escenario experimental** (Dose) | Y-90, 2 GBq, d = 0.30 m, contenedor PMMA | Ḣ\*(10) = 0.200 μSv/h (solo reproducibilidad); rótulo de escenario experimental y nota «direct beta dose is excluded»; aviso al seleccionar Pb (3–4× más bremsstrahlung) | | No aplicable: las constantes de contenedor son ESTIMACIONES sin fuente primaria (no tabuladas en Zanzonico 1999). Reproducir el valor no las valida; una medida o el criterio experto se anotan como observación | |
| A11 | **Efluente — operador de lodos de EDAR** (Effluent, escenario 2) | Valores por defecto (zona servida 100 %), I-131 incluido con 0.8 GBq por tratamiento introducidos, geometría 45 × 45 × 3 m, sin depósitos | Lu-177: 3330 GBq/a (1498.5 del hospital + 1831.5 domiciliaria × 100 %); FD = 1.065 µSv/GBq; E = 3.55 mSv/a. I-131: 40 GBq/a; FD = 13.10 µSv/GBq; E = 0.524 mSv/a. Con Lu-177 e I-131 en depósitos: 2.21 mSv/a | | Cálculo a mano: A = A_hosp + A_adm × (1 − f_hosp) × zona servida; E = A × FD (columna FD con «Show intermediate values») | |
| A12 | **Efluente — inspector de alcantarillado** (Effluent, escenario 1) | Valores por defecto (hospital, 20 000 m³/a), I-131 incluido con 0.8 GBq, sin depósitos | Lu-177: 1498.5 GBq/a; FD = 0.01147 µSv/GBq; E = 0.0172 mSv/a. I-131: 20 GBq/a; FD = 0.1354 µSv/GBq; E = 0.00271 mSv/a. Total esc. 1: 0.0199 mSv/a (no se suma al esc. 2). Con ambos en depósitos sale 1 GBq/a en total | | Cálculo a mano con las fórmulas de *Method*: C_agua = A · DF / V; E_ext = C_agua · k₁ · t_ext · g; E_inh = C_aire · BR · t_inh · e(inh) | |
| A13 | **Desclasificación y exención de nucleido extendido** (Decay) | Na-22, A₀ = 1 MBq, masa del material = 10 kg | A1 = 0.1 kBq/kg (antes «not in Table A.1», corregido); B: col. 3 = 1E6 Bq, col. 2 = 10 kBq/kg evaluados por separado; Mo-99 y Mo-99+Tc-99m dan el mismo A1 (10 kBq/kg, progenie Tc-99m) | | RD 1217/2024 Anexo IV Tablas A1 y B (BOE-A-2024-25205) | |
| A14 | **Textos y estados** (auditoría de textos, 3-oct-2026) | a) Dose, Y-90, 1 GBq, 0,30 m: informe y CSV. b) Dose, Tc-99m, Pb 0,5 cm. c) Decay, Tc-99m, A₀ = 1000 MBq, objetivo 1000 MBq y 2000 MBq. d) Cambiar un dato con resultados en pantalla; después escribir un valor no válido (p. ej. «x» en A₀) | a) «Model validity: Experimental container estimates; validity not established; no regulatory assessment» y nota «direct beta dose is excluded»; nunca «within range». b) Método «Archer… based on dose at 1 cm depth in tissue»; validez «Published fit; applicability range not checked by the app». c) «Target already reached at t = 0» y «Target exceeds A₀ and cannot be reached by decay», iguales en pantalla e informe (nunca 0 h). d) Los resultados se recalculan al momento (no hay botón Calcular ni aviso de recalcular); con el valor no válido, error en el recuadro de la página, campo marcado y resultados ocultos (sin informe ni CSV) | | Oumano et al. (2025) §2 (dosis a 1 cm en tejido); RD 1029/2022 (vigente) art. 34 | |
| A15 | **Entradas no válidas o extremas** (auditoría de 4-oct-2026) | Decay, Tc-99m, A₀ = 1000 MBq: a) objetivo 0; b) objetivo −5; c) objetivo vacío. d) Decay y Dose con A₀ = 1e308 Ci | a) Aviso «A target of zero is never reached in finite time (exponential decay)», igual en pantalla e informe. b) Error «Target activity must be a non-negative number.» en el recuadro de la página, campo marcado y resultados ocultos (sin informe ni CSV); al corregir el objetivo vuelven. c) Sin bloque de objetivo. d) Alerta «Activity is outside the representable range», sin resultados, CSV ni informe nuevos | | Cálculo propio: A(t) = A₀·e^(−λt) > 0 para todo t finito | |
| A16 | **Acompañantes — caso por defecto** (Caregiver) | Valores por defecto (Lu-177-PSMA-617, 15 µSv/h a 1 m, alta a 6 h, 16,4 / 40,5 h, 6 ciclos, cuidador ≤ 60 años). Al abrir, días de restricción vacíos: aviso, restricción mínima 2,92 d → adoptada 3 d, sin dosis de tabla. Después pulsar «Use the adopted restriction in the table» (3 d en ambas filas) | Dosis por administración 0,488 mSv; tratamiento 2,93 mSv; tasa máxima 15,36 µSv/h; suelo 0,898 mSv; restricción mínima 2,92 d → adoptada 3 d; autocomprobación OK | | Libro `Dosis_acompanantes_simple_v2.1.xlsx`, hoja Dosis (D5, D6, D37–D41) | |
| A17 | **Acompañantes — I-131 ablación frente al Foro** (Caregiver) | Perfil «I-131 (NaI) — thyroid remnant ablation»; criterio «Other» = 2 mSv; tasas 15, 25 y 40 µSv/h; resto por defecto | Restricción mínima ≈ 0,8 / 2,7 / 4,6 d (redondeadas: 1 / 3 / 5 d) | | Foro CSN-SEPR-SEFM (2011), tabla 3.B 3, pareja < 60 años: 1 / 3 / 5 d. Su «Tef = 3 d» es 1/λ (semiperiodo 49,9 h) | |
| A18 | **Acompañantes — restricción común imposible** (Caregiver) | Tasa 10 µSv/h; diurna 0 d, 20 h/d a 1 m durante, 0 h después; dormir 3 d, 8 h/d a 1 m durante, 8 h/d a 0,1 m después | Estado «Within the applied criterion»; restricción mínima «Not applicable…» (20 + 8 h/d); sin suelo ni curva, con nota | | Cálculo propio: 28 h/d > 24 h/d | |
| A19 | **Acompañantes — solución válida de 0 días** (Caregiver) | Igual que A18 con tasa 2 µSv/h | Restricción mínima 0 d; adoptada 0 d; dosis con la adoptada 0,998 mSv (no se rechaza: las horas «durante» no llegan a aplicarse) | | Cálculo propio: fn · I∞ · ciclos < criterio | |
| A20 | **Acompañantes — días vacíos y estados de error** (Caregiver) | a) A19 con los días de restricción vacíos. b) Valores por defecto, pulsar «Use the adopted restriction in the table» y escribir «oops» en la tasa; después volver a 15. c) Valores por defecto con criterio «Other» vacío | a) Restricción mínima 0 d y adoptada 0 d (no se rechaza por las 28 h/d «durante»), autocomprobación OK. b) Error en el recuadro, resultados ocultos y dosis de las dos filas en «—»; al volver a 15, 0,150 / 0,339 mSv por ciclo. c) Estado «…a positive dose criterion is missing…»; autocomprobación «current case not checked», nunca OK | | Auditoría externa 22-10-2026 (A-01…A-03); cálculo propio de A19 | |

## B. Comprobaciones funcionales

| # | Comprobación | Resultado esperado | ✓/✗ |
|---|--------------|--------------------|-----|
| B1 | Las cuatro suites de tests (`node test/validate-app.js`, `validate-math.js`, `validate-data.js`, `validate-constants.js`) | Todas en verde (0 failed) | |
| B2 | Nucleido ICRP 107 (p. ej. Na-22) buscado en Properties y abierto en Dose | Constantes Γ calculadas mostradas; la comparación con Cornejo la cubre `validate-constants.js` (B1) | |
| B3 | Informe 📄 Report / PDF (Dose, Decay, Effluent y Caregiver) | Cabecera con versión de aplicación, build, versión de base de datos y fecha; método declarado, disclaimer y línea de firma | |
| B4 | Nucleido ICRP 107 extendido (p. ej. Na-22) en Dose | Aviso "NOT manually validated" visible en los resultados | |
| B5 | Funcionamiento offline | Abrir vía `file://` y, en HTTPS, recargar sin conexión tras primera visita (service worker) | |
| B6 | Instalación PWA (Android/desktop, HTTPS) | El navegador ofrece "Instalar"; icono trébol; arranca standalone | |
| B7 | Modo oscuro | Tablas, gráficas, tooltips y avisos legibles en ambos modos | |
| B8 | Magnitudes en Dose | H\*(10) y H'(0.07) se muestran SIEMPRE las dos (magnitudes de área); sin cambio automático por distancia; la comparación con límites se rotula "cribado indicativo" (cumplimiento = dosimetría personal Hp) | |
| B9 | Export CSV (Decay y Dose) | Fichero descarga con valores coherentes con pantalla | |
| B10 | Búsqueda en español (Properties) | "tecnecio", "lutecio", "radio" encuentran Tc-99m, Lu-177, Ra-223 | |
| B11 | Hierro elemental en Dose | El selector ofrece “Iron (Fe) — ρ=7.874”; el cálculo usa el modelo espectral + build-up y no lo presenta como acero ni como modelo Archer | |
| B12 | Gráficas de Decay y Dose | La curva de Decay llega al final del intervalo (Lu-177, 1000 MBq: ≈ 33 d) y el marcador de tiempo transcurrido está en el tiempo exacto; en Dose el marcador «d = X m» está en esa distancia exacta (probar 0,33 m y 7 m) | |
| B15 | Pantallas en español | a) Botón «EN» de la cabecera → «ES»: menú, formularios, resultados, gráficas e informe en español; las referencias quedan como se publicaron. b) Dose, Lu-177, 1 GBq, 0,3 m: el mismo resultado (69,8 μSv/h) y el mismo CSV, en inglés, en EN y en ES. c) «Acerca de» muestra la guía en español; las licencias siguen en inglés. d) «ES» → «EN» devuelve el texto inglés | |
| B14 | Separador decimal | a) Dose, Lu-177, 1 GBq: distancia «0,3» y «0.3» dan 69,8 μSv/h, también con el navegador en inglés; «1.000,5» se rechaza. b) Botón «1,5» de la cabecera: resultados, ejes, leyendas e informe con coma; el CSV conserva el punto. c) «1.500» en A₀ muestra «Read as 1,5…» | |
| B13 | β E<sub>max</sub> en Properties | Lu-177 0,4978 MeV; Y-90 2,28 MeV; Tc-99m indica «minor β branch: 0.0037 % of decays»; Ra-223 indica «from progeny in the decay chain» | |

## C. Límites conocidos (leer y aceptar)

El validador confirma que conoce y acepta estas limitaciones documentadas:

- [ ] Geometría de fuente puntual, sin distribución de fuente. No se modela la dispersión en el entorno (paciente, sala, aire, suelo y techo); la dispersión en la barrera solo entra de forma aproximada, mediante el factor de acumulación (build-up) o el ajuste Archer de haz ancho (punto siguiente).
- [ ] El narrow-beam espectral incluye **build-up de exposición** (ANSI/ANS-6.4.3, fuente puntual isótropa en medio infinito); combinado con coeficientes de atenuación que incluyen dispersión coherente y aplicado a barreras finitas, su desviación no es universalmente conservadora. NO usar para diseño de blindajes estructurales (memorias ante el CSN requieren TVLs publicados o cálculo dedicado).
- [ ] Valores de contenedor Y-90 son estimaciones (metodología Zanzonico 1999, no tabuladas en esa publicación).
- [ ] Cristalino estimado con H\*(10).
- [ ] Decaimiento entre administraciones no modelado (cada administración independiente).
- [ ] Entradas ICRP 107 extendidas: constantes calculadas automáticamente, no validadas manualmente.
- [ ] Efluente: se supone excretada toda la actividad administrada; la fracción excretada en el hospital sale por su acometida (o, si el nucleido está en depósitos, su parte del vertido anual, 1 GBq/a por defecto, sin crédito por decaimiento) y el resto se excreta en domicilio. Escenario 1: solo lo que sale del hospital; coeficientes PHITS solo fotónicos, sin bremsstrahlung (más relevante en F-18 e I-131). Los escenarios 1 y 2 son receptores distintos y no se suman.
- [ ] Efluente (escenario 2): cribado con todo el vertido retenido en el lodo; los coeficientes externos solo valen para la geometría PHITS declarada y ninguno cubre la losa infinita de NUREG/CR-5814; no es una evaluación completa del vertido (IS-28 II.A.4 y mezclas aparte).
- [ ] Acompañantes: una persona y ciclos iguales; la integral de la magnitud operacional medida se usa como estimador de la exposición externa (no es dosis efectiva ni fetal); los criterios por categoría son criterios del área, no valores normativos para este tratamiento; los perfiles cinéticos son de cohorte, no del paciente.
- [ ] La herramienta es de apoyo: no sustituye el juicio del experto ni el cálculo regulatorio formal.

---

## Resultado

| | |
|---|---|
| Casos A superados | ____ / 20 (A10 solo reproducibilidad) |
| Comprobaciones B superadas | ____ / 15 |
| Incidencias abiertas | |
| **Veredicto** | ☐ APTA para uso en el servicio ☐ APTA con restricciones: ____________ ☐ NO APTA |

**Validador (nombre y firma):** ______________________________
**Fecha:** ____________
**Candidato validado:** aplicación v__________ — build: ____________________ — commit completo: ________________________________________
