# Hoja de prueba de aceptación — NM Radionuclide Planner

**Candidato que se valida (copiar literalmente de `PACKAGE-INFO.txt`):**

Aplicación: v__________ · Build: ____________________ · Base de datos: v__________<br>
Commit fuente completo: ________________________________________ · SHA-256 del ZIP: ________________________________________
**Objeto:** validación independiente, por un radiofísico o especialista en protección radiológica distinto del desarrollador, previa a su uso profesional.
**Instrucciones:** cada caso A comprueba un modelo de cálculo con un número que se contrasta a mano o en una tabla publicada. Introduzca las entradas indicadas (el resto, por defecto), anote el valor obtenido, haga el contraste y marque ✓/✗. Las comprobaciones de estados, avisos y entradas no válidas no se repiten a mano: las cubre la evidencia automática (B1). Los números se escriben con coma decimal; la app los muestra con el separador elegido en la cabecera.

**Criterios de aceptación:**
- «Valor app esperado»: lo que la aplicación debe mostrar (reproducibilidad). Desviación admisible: ±1 dígito de redondeo.
- Contraste con la fuente independiente: desviación ≤ 5 % → ✓ | 5–15 % → revisar y justificar | > 15 % → ✗ (detener la adopción y abrir incidencia).

---

## A. Casos de cálculo

| # | Modelo | Entradas | Valor app esperado | Valor obtenido | Contraste independiente | ✓/✗ |
|---|--------|----------|--------------------|----------------|-------------------------|-----|
| A1 | **Constantes Γ** (Properties) | Tc-99m e I-125 (panel de detalle) | Tc-99m: Γ^H\*(10) = 21,7 μSv·h⁻¹·GBq⁻¹·m². I-125: Γ^H'(0,07) = 42,5 | | Cornejo et al. (2015), *Radioprotección* 83, tabla III: 21,7 (0 %) y 40,9 (+3,9 %) | |
| A2 | **Decaimiento** (Decay) | F-18, A₀ = 1000 MBq, tiempo transcurrido 2 h | A(t) = 468,7 MBq (46,9 %) | | A mano: 1000 · 2^(−120 / 109,77) = 468,7 MBq (T½ = 109,77 min, mostrado en la app) | |
| A3 | **Tasa de dosis sin blindaje** (Dose) | I-131, 1 GBq, 1 m, sin blindaje | Ḣ\*(10) = 65,8 μSv/h | | Γ^H\*(10) de Cornejo (2015), tabla III, = 65,7 → 65,7 μSv/h a 1 GBq y 1 m (+0,2 %) | |
| A4 | **Blindaje Archer** (Dose) | Tc-99m, 1 GBq, 0,5 m, Pb 2 mm | Método «Archer broad-beam»; primera capa hemirreductora 0,24 mm; T = 0,56 %; Ḣ\*(10) = 482,8 nSv/h | | Oumano et al. (2025), *J. Appl. Clin. Med. Phys.*, tabla 3 (p. 9): capa hemirreductora de Pb para Tc-99m según Smith y Stabin = 0,234 mm (+2,6 %) | |
| A5 | **Blindaje espectral con build-up** (Dose) | Cs-137, 1 GBq, 1 m, Pb 6,5 mm | Método «Narrow beam · 9-line spectrum + build-up»; T = 54,1 % (H\*(10)); primera capa hemirreductora 7,3 mm; aviso «Out of tabulated range» por el 1,7 % del peso de dosis | | NCRP 155 (2006), tabla 4.1 (p. 75): capa hemirreductora de Pb para Cs-137 = 6,5 mm → T = 50 % con 6,5 mm. **Desviación +8 %: revisar y justificar.** Justificación prevista: el factor de acumulación de exposición en medio infinito (ANS-6.4.3) da más transmisión que una capa de referencia (sentido conservador para la dosis tras el blindaje); el aviso corresponde a los rayos X del Ba de unos 32 keV, que superan 40 recorridos libres medios y apenas pesan en la dosis | |
| A6 | **Desclasificación** (Decay) | Lu-177, A₀ = 2 GBq, sin tiempo, masa del material 10 kg | 200 MBq/kg (200 000 kBq/kg); nivel de la tabla A1 = 100 kBq/kg; alcanzado en ≈ 72,9 d | | RD 1217/2024, anexo IV, tabla A1 (BOE-A-2024-25205): Lu-177 = 100 kBq/kg. A mano: 6,6443 d · log₂(200 000 / 100) = 72,9 d (T½ DDEP) | |
| A7 | **Nivel de vertido IS-28** (Properties) | I-131 (panel de detalle) | Nivel individual de concentración = 75,8 Bq/L | | A mano: (1 mSv / e(g)) / 600 L con e(g) = 2,2 × 10⁻⁸ Sv/Bq (adulto, RD 783/2001, anexo III, tabla a) → 75,8 Bq/L | |
| A8 | **Efluentes** (Effluent) | Valores por defecto (solo Lu-177); pulsar «Show intermediate values» | Esc. 1: 1499 GBq/a que salen del hospital; FD = 0,01147 µSv/GBq; E = 0,01718 mSv/a. Esc. 2: 3330 GBq/a a la depuradora; FD = 1,065 µSv/GBq; E = 3,546 mSv/a | | A mano: actividad administrada 75 · 6 · 7,4 = 3330 GBq/a; sale del hospital 3330 · 0,45 = 1498,5; a la depuradora 1498,5 + 3330 · 0,55 · 100 % = 3330; E = A · FD. Los coeficientes externos PHITS no tienen contraste independiente (revisión técnica externa pendiente): el caso comprueba el término fuente y la aritmética | |
| A9 | **Acompañantes** (Caregiver) | Cinética «I-131 (NaI) — thyroid remnant ablation, Foro (2011)»; categoría «Other criterion» con criterio propio 2 mSv; convivencia por defecto (pareja); tasa a 1 m 15, 25 y 40 µSv/h | Restricción mínima 0,79 / 2,65 / 4,63 d → adoptada 1 / 3 / 5 d | | Foro CSN-SEPR-SEFM (2011), tabla 3.B 3, pareja menor de 60 años: 1 / 3 / 5 d (su «Tef = 3 días» es 1/λ: semiperiodo 49,9 h) | |

## B. Comprobaciones

| # | Comprobación | Resultado esperado | ✓/✗ |
|---|--------------|--------------------|-----|
| B1 | **Evidencia automática.** Desde el repositorio: `node test/validate-math.js`, `validate-data.js`, `validate-constants.js`, `validate-app.js` y `node tools/browser-smoke.js` (con `--base` apuntando a la copia extraída del paquete) | Todas con «0 failed»; anotar las líneas «Total». Cubren, entre otros: entradas no válidas o extremas (mensaje en la página, campo marcado y resultados ocultos), estados sin datos, avisos del Y-90 y de las entradas ICRP 107 ampliadas, H\*(10) y H'(0,07) siempre juntas, separador decimal, gráficas, CSV, hierro elemental, β E<sub>max</sub>, búsqueda en español y recarga sin conexión en un navegador sin interfaz | |
| B2 | **Informe** (Dose, caso A3, «Report / PDF») | Cabecera con versión de la aplicación, build, versión de la base de datos y fecha; método, descargo y línea de firma; el valor coincide con la pantalla (65,8 μSv/h) | |
| B3 | **Dispositivo real** (HTTPS) | El navegador ofrece instalar la aplicación; se abre como aplicación independiente con su icono; tras la primera visita, Properties y Dose recargan sin conexión | |
| B4 | **Modo oscuro** | Tablas, gráficas, tooltips y avisos legibles | |
| B5 | **Pantallas en español** (botón «EN» → «ES») | Caso A3: el mismo resultado (65,8 μSv/h) y el mismo CSV que en inglés; los textos se entienden; las referencias y las licencias quedan como se publicaron | |

## C. Límites conocidos (leer y aceptar)

El validador confirma que conoce y acepta estas limitaciones documentadas:

- [ ] Geometría de fuente puntual, sin distribución de fuente. No se modela la dispersión en el entorno (paciente, sala, aire, suelo y techo); la dispersión en la barrera solo entra de forma aproximada, mediante el factor de acumulación (build-up) o el ajuste Archer de haz ancho.
- [ ] El modelo espectral incluye **build-up de exposición** (ANSI/ANS-6.4.3, fuente puntual isótropa en medio infinito); con coeficientes de atenuación que incluyen la dispersión coherente y aplicado a barreras finitas, su desviación no es universalmente conservadora. NO usar para diseño de blindajes estructurales (las memorias ante el CSN requieren capas decimorreductoras publicadas o un cálculo dedicado).
- [ ] Y-90: los valores de radiación de frenado de cada contenedor son **hipotéticos**, sin derivación documentada ni medida; el cálculo es ilustrativo, excluye la dosis beta directa y queda fuera de esta validación.
- [ ] Cristalino estimado con H\*(10).
- [ ] Decaimiento entre administraciones no modelado (cada administración es independiente).
- [ ] Entradas ICRP 107 ampliadas: constantes calculadas automáticamente, no validadas manualmente.
- [ ] Efluentes: se supone excretada toda la actividad administrada; la fracción excretada en el hospital sale por su acometida (o, si el nucleido está en depósitos, su parte del vertido anual, 1 GBq/a por defecto) y el resto se excreta en el domicilio. Los valores por defecto del término fuente y de la planta son ilustrativos y propios del emplazamiento. Los coeficientes externos son cálculos PHITS del autor, pendientes de revisión técnica externa; los del escenario 1 son solo fotónicos, sin radiación de frenado (más relevante en F-18 e I-131). Los escenarios 1 y 2 son receptores distintos y no se suman.
- [ ] Efluentes (escenario 2): cribado con todo el vertido retenido en el lodo; los coeficientes externos solo valen para la geometría PHITS declarada y ninguno cubre la losa infinita de NUREG/CR-5814; no es una evaluación completa del vertido (las condiciones de la IS-28 II.A.4 y las mezclas se evalúan aparte).
- [ ] Acompañantes: una persona y ciclos iguales; la integral de la magnitud operacional medida se usa como estimador de la exposición externa (no es dosis efectiva ni fetal); los criterios por categoría son criterios de evaluación adoptados en esta aplicación, no valores normativos para este tratamiento; las cinéticas predefinidas son de cohorte, no del paciente.
- [ ] La herramienta es de apoyo: no sustituye el juicio del experto ni el cálculo regulatorio formal.

---

## Resultado

| | |
|---|---|
| Casos A superados | ____ / 9 (A5 con desviación justificada, si se acepta) |
| Comprobaciones B superadas | ____ / 5 |
| Incidencias abiertas | |
| **Veredicto** | ☐ APTA para uso profesional ☐ APTA con restricciones: ____________ ☐ NO APTA |

**Validador (nombre y firma):** ______________________________
**Fecha:** ____________
**Candidato validado:** aplicación v__________ — build: ____________________ — commit completo: ________________________________________
