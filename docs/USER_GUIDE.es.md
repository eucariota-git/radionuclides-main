# NM Radionuclide Planner — Guía de uso

Aplicación web con las propiedades de los radionucleidos de medicina nuclear, cálculos de decaimiento, estimación de dosis externa, cribado de efluentes líquidos (trabajadores de la red de alcantarillado y de planta depuradora) y dosis a acompañantes tras el alta de un paciente de terapia.

*Versión en español de `docs/USER_GUIDE.md`. Si las dos difieren, prevalece la inglesa, que es la que se mantiene con el código. Las referencias bibliográficas se citan tal como se publicaron.*

**Distribución local:** mantenga la carpeta suministrada completa y abra `index.html` en un navegador web actual.

---

## Inicio rápido

No hace falta instalación ni autenticación:

- **Directamente desde el disco**: abra `index.html`; la dirección empezará por `file://`.
- **Servidor web local (opcional)**: sirva la carpeta con cualquier servidor estático y abra su dirección `localhost`, por ejemplo `http://localhost:8000/`.
- **Navegadores**: Firefox, Chrome, Safari o Edge actuales, en ordenador o móvil.
- **Sin conexión**: las calculadoras funcionan sin conexión con la copia local completa (abierta desde `file://`, o desde la caché local de una copia cargada antes por HTTP(S)); las referencias externas necesitan conexión.
- **Instalar como aplicación (PWA)**: servida desde `localhost` o HTTPS, un navegador compatible ofrece «Instalar» / «Añadir a pantalla de inicio»; la aplicación funciona entonces de forma independiente y totalmente sin conexión.
- **Informes y CSV**: Decaimiento, Dosis, Efluentes y Acompañantes tienen un botón **Informe / PDF** (datos de entrada, resultados, método, fuentes, advertencia y línea de firma; use «Guardar como PDF» del navegador) y una exportación CSV en la que cada fila repite la versión de la aplicación, el build, la versión de los datos, la hora de exportación (UTC) y los datos de entrada necesarios para reproducir el resultado.
- **Punto o coma decimal**: todos los campos numéricos admiten los dos (`0.3` o `0,3`; también `1e-7`). Se rechaza un número con dos separadores o con separador de millares (`1.000,5`, `1 000`); un único separador seguido de exactamente tres cifras (`1.500`) se lee como decimal, y una nota bajo el campo dice cómo se ha leído. El botón **1.5 / 1,5** de la cabecera elige el separador de los resultados, gráficas e informes que se muestran; por defecto, el del idioma del navegador. Los archivos CSV usan siempre el punto decimal. Los nombres de magnitudes y las referencias conservan su forma habitual.
- **EN / ES**, en la cabecera, muestra las pantallas en español (por defecto, en inglés). Solo cambia el texto mostrado: los valores, los cálculos, los archivos CSV y el separador decimal no cambian. Los informes salen en el idioma de la pantalla; los CSV, siempre en inglés.
- **Los resultados se actualizan mientras escribe** en las cuatro calculadoras. Un dato no válido se nombra en un recuadro rojo bajo el formulario, el campo se resalta y los resultados se ocultan hasta que se corrige: el informe y el CSV describen siempre los datos que hay en pantalla.
- Cada página explica su método, fuentes y limitaciones en sus propios bloques *Método* y de notas (plegados: pulse el título marcado con ▸ para abrirlos); esta guía —**Guía** en el menú— da la finalidad, el uso y las limitaciones principales.

---

## Páginas principales

### 1. Propiedades (`index.html`)

**Finalidad**: periodos de semidesintegración, modos de desintegración, constantes de tasa de dosis y valores de la normativa española de los radionucleidos.

**Uso**:
1. **Busque** por nucleido (`Tc-99m`, `99mTc`), por nombre del elemento en inglés o en español («technetium», «tecnecio») o por aplicación. Los botones de modalidad filtran las 40 entradas revisadas. Si no hay coincidencias entre ellas, aparecen automáticamente los resultados ampliados de ICRP 107 (1252 nucleidos) y los identificadores que solo figuran en las tablas reglamentarias.
2. **Lea la tabla**: periodo de semidesintegración, desintegración, las constantes **Γ^K-air** (μGy·h⁻¹·GBq⁻¹·m²), **Γ^H\*(10)** y **Γ^H'(0,07)** (μSv·h⁻¹·GBq⁻¹·m²), energía fotónica representativa, el nivel individual de concentración de vertido (IS-28) y el valor de la tabla A1 del RD 1217/2024. Una celda sin valor dice por qué (*No figura en la tabla*, *No calculado*, *No aplicable*).
3. **Abra un nucleido** para ver el panel de detalle: periodo de semidesintegración y su fuente (ICRP 107 o DDEP), E<sub>máx</sub> β (el punto final más alto de todas las ramas β, con β por desintegración; se señalan las ramas menores y la progenie de la cadena), espectro fotónico (E ≥ 20 keV, rendimiento ≥ 0,01 %) en gráfica y tabla —la gráfica muestra el rendimiento de cada línea en escala logarítmica, o su parte de Γ^H\*(10), que indica qué líneas aportan la tasa de dosis—, las tablas A1 y B del RD 1217/2024 y el coeficiente de ingestión de adultos en que se basa el nivel de vertido.
4. **Exporte** la tabla en CSV, con la procedencia de cada constante.

**Limitaciones principales**: el nivel de vertido es solo una de las condiciones del apartado II.A.4 de la IS-28 (no se evalúan la suma de las fracciones de la mezcla ni los límites anuales); los valores del RD 1217/2024 son para un solo nucleido; las constantes ampliadas de ICRP 107 están calculadas, no validadas manualmente; las aplicaciones de ejemplo son ilustrativas y no indican autorización ni disponibilidad en España.

**Ejemplo** (resultado del modelo de la aplicación, no un valor de referencia validado): «Am-241»: T½ = 432,2 a, desintegración α; 21 líneas fotónicas seleccionadas (X y γ); Γ^H\*(10) calculada ≈ 7,0 μSv·h⁻¹·GBq⁻¹·m².

---

### 2. Calculadora de decaimiento (`decay.html`)

**Finalidad**: actividad de un nucleido aislado tras un tiempo, tiempo hasta alcanzar una actividad objetivo y comprobaciones de desclasificación y exención del RD 1217/2024 para un solo nucleido.

**Uso**:
1. Elija un nucleido (revisado o ampliado) e introduzca la **actividad inicial** (MBq, GBq, mCi, Ci, kBq).
2. Indique el tiempo como **fecha/hora de referencia y objetivo** (hora local del dispositivo) o como **tiempo transcurrido**, que prevalece si se rellena.
3. **Actividad objetivo** opcional: el tiempo hasta alcanzarla (un objetivo ≥ A₀ se indica como ya alcanzado o inalcanzable; cero, como nunca alcanzado en un tiempo finito).
4. **Masa del material evaluado** opcional, la masa que contiene la actividad (indique si incluye el contenedor). Habilita la comprobación de desclasificación de la tabla A1 y los criterios de exención de la tabla B, que el anexo II A.1 establece *por separado*: a) actividad total de una fuente frente a la columna 3; b) cantidad moderada (≤ 1000 kg) frente a la columna 2.
5. **Resultados** (se actualizan mientras escribe): A(t), fracción restante, la curva de decaimiento y una tabla de valores. Sin tiempo transcurrido ni fecha objetivo, los valores son los de t = 0, y una nota lo indica.

**Limitaciones principales**: un solo nucleido; no se evalúan mezclas ni sumas de varias fuentes; alcanzar el nivel de la tabla A1 no es por sí solo una desclasificación (se aplica el anexo III).

**Ejemplo** (periodo almacenado 6,007 h): 1000 MBq de Tc-99m → tras 6 horas ≈ 500 MBq; tiempo hasta 100 MBq ≈ 20,0 horas.

---

### 3. Estimador de dosis (`dose.html`)

**Finalidad**: tasa de equivalente de dosis y equivalente de dosis integrado a una distancia de una fuente puntual, con blindaje opcional.

**Uso**:
1. Elija el nucleido y la **actividad** (A₀ es la actividad al comienzo de cada exposición). Para un nucleido ampliado de ICRP 107 con progenie de periodo corto (Ge-68 → Ga-68, Sn-113 → In-113m, Mo-99 → Tc-99m…), **Progenie de periodo corto** permite elegir entre la progenie en equilibrio (por defecto, como en las cadenas revisadas) y el progenitor solo (fuente recién separada).
2. **Distancia** en m o cm (por debajo de 0,25 m el resultado lleva un aviso: ahí el modelo de fuente puntual depende del tamaño real de la fuente).
3. **Blindaje** opcional —plomo, hierro elemental (ρ = 7,874 g/cm³, no un acero genérico) u hormigón normal / ligero— y **transmisión del paciente** opcional en % (vacío = sin atenuación del paciente; no hay valor por defecto: depende de la energía, la anatomía y la geometría). *Detalles del blindaje* indica el método empleado: el ajuste de Archer de haz amplio de Oumano et al. (2025) para Tc-99m, F-18, I-131 y Lu-177 tras plomo u hormigón; en los demás casos, atenuación de haz estrecho ponderada por el espectro con factor de acumulación (*build-up*). Da la primera CHR/CDR y avisa cuando parte del espectro queda fuera del intervalo tabulado.
4. **Exposición**: tiempo por administración y administraciones por año; elija si se integra el decaimiento físico durante cada exposición.
5. **Resultados** (se actualizan mientras escribe): tasa en t = 0 y tras el decaimiento, tasa de referencia a 1 m, dosis anual integrada de **H\*(10)** (estimador de la dosis efectiva) y de **H'(0,07)** (indicador para piel y extremidades), y la tasa en función de la distancia.
6. **Comparación con los límites anuales** (solo cribado orientativo): porcentajes de los límites del Real Decreto 1029/2022: 20 mSv/a de dosis efectiva (trabajadores expuestos), 1 mSv/a (público), 500 mSv/a en piel y extremidades, y para el cristalino 100 mSv a lo largo de cinco años oficiales consecutivos con un máximo de 50 mSv en un único año oficial. No se emite ningún veredicto de «seguro». El informe incluye la misma comparación.

**Limitaciones principales**: fuente puntual; no se modelan la dispersión en la sala ni la distribución de la fuente. H\*(10) y H'(0,07) son magnitudes de vigilancia radiológica de áreas: estas estimaciones no demuestran el cumplimiento (las magnitudes personales son Hp(10), Hp(0,07) y Hp(3); el art. 34 del RD 1029/2022 permite estimar las dosis de los trabajadores de categoría B a partir de la vigilancia del lugar de trabajo). No se modela el decaimiento entre administraciones. El **Y-90** no tiene líneas fotónicas: Dosis ofrece solo un escenario experimental de radiación de frenado (*bremsstrahlung*) que depende del contenedor, sin la dosis beta directa y sin veredicto reglamentario. Para otros nucleidos sin líneas fotónicas no se hace ninguna estimación, lo que no prueba que no haya riesgo externo.

**Ejemplo**: 100 MBq de Tc-99m, fuente puntual a 50 cm, sin blindaje, 10 min por administración, 200 administraciones al año, decaimiento integrado:
- Ḣ\*(10) = Γ·A/r² = 21,72 × 0,100 / 0,50² ≈ 8,7 μSv/h
- H\*(10) anual integrado ≈ 0,29 mSv/a (200 × ≈ 1,43 μSv)
- Son resultados del modelo de fuente puntual de la aplicación para estos datos, no una dosis medida ni una declaración de seguridad o de cumplimiento.

---

### 4. Efluentes líquidos — trabajadores de alcantarillado y de depuradora (`effluent.html`)

**Finalidad**: dosis efectiva anual de cribado debida al Lu-177, I-131, Lu-177m, Tc-99m y F-18 excretados por pacientes de medicina nuclear, para dos receptores adaptados de NUREG/CR-5814 (1992), ambos miembros del público respecto al titular: **Escenario 1**, un trabajador de la red de alcantarillado (agua residual y aerosol), y **Escenario 2**, un trabajador de planta depuradora (EDAR) que manipula lodos (lodo deshidratado y polvo resuspendido). Son receptores distintos y sus dosis nunca se suman.

**Uso**:
1. **Término fuente**: marque los nucleidos; pacientes al año × ciclos × actividad administrada por ciclo, que se supone excretada en su totalidad; la fracción excretada en el hospital; *Depósitos* para los nucleidos retenidos en depósitos de decaimiento (entonces solo sale su parte del vertido anual de los depósitos). El escenario 1 recibe lo que sale del hospital; el escenario 2, además, la actividad excretada en el domicilio en la zona servida por la depuradora.
2. Parámetros del **escenario 1** y del **escenario 2**: cada dato tiene una breve explicación y su fuente por defecto en *Fuentes e hipótesis*. Los datos de la planta (volumen de agua, producción de lodos según PRTR-España) son propios de cada emplazamiento.
3. **Comunes**: tasa de respiración, vertido anual de los depósitos y un criterio de dosis **definido por el usuario** (no se le atribuye base reglamentaria).
4. Los resultados se actualizan mientras escribe: dosis por nucleido y por escenario, con los coeficientes usados y un contraste orientativo con los factores de NUREG/CR-5814 y del IAEA SRS-19.

**Limitaciones principales**:
- Es un modelo de cribado: vertido anual dividido entre el volumen anual de agua o la producción de lodos, con decaimiento solo durante el tránsito.
- Los coeficientes externos son cálculos PHITS propios, válidos solo para sus geometrías de modelo y solo de fotones en el escenario 1. Ninguno cubre la lámina infinita de NUREG/CR-5814.
- El F-18 no tiene coeficiente externo para el escenario 2, de modo que ese total es una suma parcial (≥).
- El valor por defecto de 0,8 GBq de I-131 es la actividad en el alta del libro de cálculo, no la actividad administrada: sustitúyalo.
- **No es una evaluación completa del vertido**: las condiciones del apartado II.A.4 de la IS-28 y la desclasificación de mezclas se evalúan aparte.

**Ejemplo** (valores por defecto, Lu-177 e I-131 incluidos, sin depósitos de decaimiento, geometría de 45 × 45 × 3 m):
- Escenario 1: Lu-177 1498,5 GBq/a → 0,0172 mSv/a; I-131 20 GBq/a → 0,0027 mSv/a; total 0,0199 mSv/a
- Escenario 2 (40 % de zona servida): Lu-177 2231,1 GBq/a → 2,38 mSv/a; I-131 28 GBq/a → 0,367 mSv/a; total 2,74 mSv/a
- Con los dos nucleidos en depósitos de decaimiento (1 GBq/a en total), el escenario 2 baja a 0,886 mSv/a

---

### 5. Dosis a acompañantes tras el alta (`caregiver.html`)

**Finalidad**: dosis externa a una persona cuidadora, familiar o tercera persona debida a un paciente tratado con Lu-177 o I-131 tras el alta, con la tasa máxima en el alta y el periodo mínimo de restricción que cumplen un criterio. Adaptación del libro de cálculo del autor *Dosis_acompanantes_simple_v2.1.xlsx*.

**Uso**:
1. **Cinética predefinida** opcional (Lu-177-PSMA-617, Lu-177-DOTATATE o I-131 NaI según la indicación, de la bibliografía citada en la página): rellena el radiofármaco, la fase rápida, los periodos efectivos, los ciclos y el perfil, nunca la tasa medida ni la convivencia.
2. **Datos del caso**: tasa de dosis medida a 1 m en el alta, momento del alta y final de la fase rápida (ambos desde la administración), periodos efectivos, ciclos, categoría de la persona expuesta, restricción mínima opcional de la ficha técnica y el **perfil de proximidad** (factores medidos de DOTATATE, las aproximaciones de I-131 / Lu-177 con el contacto tomado a 0,4 m, o medidas propias). Las distancias se eligen de la lista del perfil; no se interpola.
3. **Convivencia**: filas de convivencia diurna y de dormir en la misma habitación, cada una con los días de restricción desde el alta y las horas al día y la distancia durante y después de la restricción.
4. Los resultados se actualizan mientras escribe:
   - la dosis por administración y por tratamiento frente al criterio;
   - los cálculos inversos: tasa máxima, restricción mínima y adoptada, y dosis con restricción indefinida (un suelo; o una asíntota superior cuando hay más contacto durante la restricción que después, y entonces restringir solo aumenta la dosis);
   - la curva de dosis frente a la restricción;
   - una autocomprobación.

**Criterios por categoría**: se aplican por tratamiento, con todos los ciclos juntos. Son criterios del servicio, no valores fijados por la normativa para este tratamiento: el RD 601/2019 exige restricciones de dosis para las personas cuidadoras, pero no fija ningún valor.
- Persona cuidadora ≤ 60 años: 3 mSv (EC RP 97, Foro 2011).
- Persona cuidadora > 60 años: 5 mSv (ICRP 103 párr. 351, ICRP 94, IAEA SSG-46).
- Público: 1 mSv (art. 15 del RD 1029/2022).
- Compañero de trabajo: 0,3 mSv (RP 97, Foro).

El criterio nunca cambia la dosis calculada.

**Limitaciones principales**: una sola persona y ciclos iguales; la integral de la magnitud operacional medida estima la exposición externa, no la dosis efectiva individual ni la dosis fetal; no se incluyen la contaminación interna ni la dosis antes del alta; la ocupación es una media diaria.

**Ejemplo**:
- Datos (valores por defecto): Lu-177-PSMA-617, 15 µSv/h a 1 m a las 6 h, persona cuidadora ≤ 60 años; convivencia diurna de 6 h/d a 1 m; dormir aparte 3 d y después 8 h/d en contacto.
- Resultados: dosis por administración 0,488 mSv; tratamiento 2,93 mSv frente a 3 mSv; tasa máxima en el alta 15,4 µSv/h; restricción mínima 2,92 d → adoptada 3 d.

---

## Modo oscuro

Si no se ha guardado ninguna elección, la aplicación sigue el modo claro u oscuro del dispositivo. El **botón de luna / sol** de la esquina superior derecha lo cambia; esa elección se guarda en el navegador y desde entonces prevalece.

## Atajos de teclado

| Tecla | Acción |
|-----|--------|
| `/` | Propiedades: situar el cursor en la barra de búsqueda |
| `Escape` | Propiedades: borrar la búsqueda y cerrar el panel de detalle. Decaimiento y Dosis: cerrar la lista de nucleidos |
| `↑` `↓` `Enter` | Decaimiento y Dosis: recorrer la lista de nucleidos y seleccionar |
| `Alt+D` | Activar o desactivar el modo oscuro (todas las páginas) |

---

## Calidad de los datos y limitaciones

- **Base de datos revisada (40 nucleidos)**:
  - 32 tienen valores publicados de comparación en Cornejo et al. (2015). Su Γ^K-air es el valor que se muestra.
  - Γ^H\*(10) y Γ^H'(0,07) se recalculan con los datos fotónicos de ICRP 107 (2008) y la tabla A.21 de ICRP 74 (1996). 23 de los 32 quedan dentro de ±2 % de los valores publicados; las diferencias se indican, no se concilian.
  - Ga-68, Zr-89, Cu-67, Tb-161, Ho-166, Ra-223 y Ac-225 no tienen comparación publicada. En las cadenas alfa se supone toda la progenie retenida y en equilibrio.
  - El Pd-103 incluye el Rh-103m, y el Cs-137 y el Mo-99+Tc-99m incluyen sus descendientes, también en equilibrio. La Γ^H'(0,07) de estos dos últimos está calculada: Cornejo no publica ninguna para ellos.
  - El Y-90 no tiene constantes fotónicas.
- **Periodos de semidesintegración**: cada uno indica su fuente, ICRP 107 (2008) o el valor recomendado del DDEP (LNHB/CEA).
- **Coeficientes de conversión y filtro de fotones**: tabla A.21 de ICRP 74, 25 energías impresas, interpolación log-log (a 1,5 MeV se conserva el valor impreso de 6,90 pSv·cm² aunque las propias columnas de la tabla dan 7,04); líneas fotónicas con E ≥ 20 keV y rendimiento ≥ 0,01 % (un rendimiento exactamente igual a 0,01 % se conserva).
- **Base de datos ampliada (1252 nucleidos, ICRP 107)**:
  - Las constantes se calculan con el mismo método, pero no están validadas manualmente.
  - La progenie de periodo corto (T½ ≤ 1/10 del progenitor y ≤ 30 d, criterio de la aplicación) se incluye por defecto en equilibrio y se marca con «+».
  - No se incluyen los espectros beta continuos ni la radiación de frenado.
  - Solo sirve de referencia y estimación; no está validada para uso clínico.
- **Blindaje**: factores de acumulación de fuente puntual isótropa en medio infinito (ANSI/ANS-6.4.3) aplicados a barreras finitas; la desviación no es conservadora en todos los casos; no sustituye al diseño del blindaje estructural.
- **H'(0,07)**: indicador de vigilancia radiológica de áreas para piel y extremidades, solo fotones; no se calcula la dosis directa de partículas beta o electrones.
- **Uso**: estimaciones de protección radiológica; contraste con las fuentes primarias antes de cualquier presentación reglamentaria.

---

## Solución de problemas

**La búsqueda no da resultados**: compruebe la grafía («Tc-99m») o busque por nombre del elemento (en inglés o en español) o por aplicación; la base de datos de ICRP 107 se consulta automáticamente.

**No cargan los datos de ICRP 107**: la base de datos va incluida en la copia local y no necesita conexión. Busque en la consola del navegador (F12) si falta `data/icrp107-data.js`. En una PWA instalada, borre los datos del sitio de esta aplicación o anule el registro de su *service worker* y recargue una vez con conexión. Con `file://`, mantenga la carpeta completa.

**La dosis calculada parece demasiado alta o baja**: compruebe la unidad de actividad (MBq o GBq), que la distancia introducida corresponde a la unidad elegida (m o cm), y recuerde que las constantes ampliadas de ICRP 107 están calculadas, no validadas.

**¿Puedo usar los valores de ICRP 107 en documentación reglamentaria?** No sin una verificación independiente; use valores publicados y revisados por pares cuando existan.

---

## Referencias

- **Cornejo Díaz N., Brosed Serreta A., Ruiz Manzano P.** (2015). "Constantes de tasa de kerma en aire y de tasa de equivalente de dosis ambiental de algunos radionucleidos utilizados en aplicaciones médicas." *Radioprotección* (SEPR), Nº 83, 39–42.
- **ICRP Publication 74** (1996). "Conversion Coefficients for Use in Radiological Protection against External Radiation."
- **ICRP Publication 107** (2008). "Nuclear Decay Data for Dosimetric Calculations." Endo & Eckerman.
- **DDEP — Decay Data Evaluation Project**. LNHB/CEA *Table de Radionucléides*, periodos recomendados (consultada el 14 de octubre de 2026); Mougeot X. et al., *Metrologia* 62 (2025) 029001/029002 y 63 (2026) 019001 para las evaluaciones recientes; *Table of Radionuclides*, Monographie BIPM-5 (Bureau International des Poids et Mesures), recopilación de las evaluaciones del DDEP.
- **ICRP Publication 116** (2010). "Conversion Coefficients for Radiological Protection Quantities for External Radiation Exposures." Con las correcciones de ICRP Publication 129 (2015).
- **ICRP Publication 119** (2012). "Compendium of Dose Coefficients based on ICRP Publication 60." Transcripción numérica de las tablas a) y b) del anexo III del RD 783/2001.
- **Real Decreto 783/2001**, Anexo III, tablas a) y b) (coeficientes de dosis para el público). Derogado por el RD 1029/2022, cuya disposición transitoria tercera —y la Resolución del CSN de 3 de abril de 2024— mantienen en vigor estos coeficientes para los miembros del público.
- **[Real Decreto 1029/2022](https://www.boe.es/buscar/act.php?id=BOE-A-2022-21682)**, de 20 de diciembre, Reglamento sobre protección de la salud contra los riesgos derivados de la exposición a las radiaciones ionizantes. BOE-A-2022-21682.
- **[Real Decreto 1217/2024](https://www.boe.es/buscar/act.php?id=BOE-A-2024-25205)**, de 3 de diciembre, Reglamento sobre instalaciones nucleares y radiactivas, y otras actividades relacionadas con la exposición a las radiaciones ionizantes. BOE-A-2024-25205.
- **Instrucción IS-28** (CSN, 22 de septiembre de 2010). BOE nº 246, 11 de octubre de 2010 (BOE-A-2010-15594); errores corregidos por la Resolución del CSN de 11 de noviembre de 2010. El CSN ha abierto una consulta pública previa sobre una revisión 1: compruebe la versión vigente en la relación de instrucciones del CSN antes de basarse en el nivel del apartado II.A.4.
- **NIST XCOM / XAAMDI**. Coeficientes de atenuación másica de fotones del plomo, el hierro elemental y el hormigón ordinario.
- **Trubey D.K.** (1991). *New Gamma-Ray Buildup Factor Data for Point Kernel Calculations: ANS-6.4.3 Standard Reference Data*. NUREG/CR-5740 / ORNL/RSIC-49/R1, Table 3.
- **Oumano M. et al.** (2025). "Shielding resources for four common radiopharmaceuticals utilized for imaging and therapy: Tc-99m, F-18, I-131, and Lu-177." *J Appl Clin Med Phys* 26(5):e70084. DOI 10.1002/acm2.70084 (CC BY 4.0).
- **Zanzonico P.B. et al.** (1999). "Bremsstrahlung radiation exposure from pure beta-ray emitters." *J Nucl Med* 40(6):1024–1028. Solo como base metodológica; el artículo no tabula las constantes de contenedor.
- **Kennedy W.E. Jr. et al.** (1992). *Evaluation of Exposure Pathways to Man From Disposal of Radioactive Materials Into Sanitary Sewer Systems*. NUREG/CR-5814 / PNL-7892, U.S. NRC.
- **IAEA Safety Reports Series No. 19** (2001). "Generic Models for Use in Assessing the Impact of Discharges of Radioactive Substances to the Environment."
- **Monserrat Fuertes et al.** (2023). "Individualisation of radiation protection recommendations for patients treated with [177Lu]Lu-DOTA-TATE." *EJNMMI Physics* 10:50. DOI 10.1186/s40658-023-00570-7 (CC BY 4.0).
- **Gayol Vilorio et al.** (2025). "Periodo de restricciones tras el alta en terapia con 177Lu-DOTATATE y 177Lu-PSMA-617." *Rev. Fís. Méd.* 26(2):27–36.
- **Kurth J. et al.** (2018). "External radiation exposure, excretion and effective half-life in 177Lu-PSMA-targeted therapies." *EJNMMI Research* 8:32 (CC BY 4.0).
- **Demir M. et al.** (2016). "Evaluation of radiation safety in 177Lu-PSMA therapy and outpatient treatment protocol." *J. Radiol. Prot.* 36(2):269. DOI 10.1088/0952-4746/36/2/269.
- **Foro CSN-SEPR-SEFM** (2011). *Criterios de alta de pacientes y medidas para la protección radiológica del público después de tratamientos metabólicos con 131I*.
- **European Commission, Radiation Protection 97** (1998). *Radiation protection following iodine-131 therapy (exposures due to out-patients or discharged in-patients)*.
- **ICRP Publication 94** (2004). "Release of patients after therapy with unsealed radionuclides." **ICRP Publication 103** (2007), párr. 351.
- **IAEA SSG-46** (2018), párr. 2.49, e **IAEA Safety Reports Series No. 63** (2009), "Release of patients after radionuclide therapy."

---

## Soporte y comentarios

Para incidencias, preguntas o peticiones de mejora, diríjase a la persona u organización que le suministró su copia de la aplicación.

## Herramientas de desarrollo

Esta aplicación se ha desarrollado con la ayuda de herramientas de programación con IA —Anthropic **Claude Code** y OpenAI **Codex**— manejadas, revisadas y dirigidas por el autor, que sigue siendo el único autor y licenciante del código original. Estas herramientas no tienen ninguna autoría, derecho de autor ni interés de licencia sobre la aplicación; esta declaración es un aviso voluntario de transparencia, no una obligación de la licencia.

La corrección no depende de cómo se escribió el código:
- **Datos numéricos**: se toman de las fuentes citadas (ICRP, NIST, NUREG/ANS, DDEP, BOE y los artículos citados). Se transcriben donde la fuente los tabula y se calculan a partir de ellas donde se indica (por ejemplo, las constantes Γ operacionales, los espectros de blindaje ponderados por dosis y las estimaciones de contenedor del Y-90, explícitamente experimentales). Cada valor indica su estado.
- **Cálculos**: las baterías de pruebas automáticas los contrastan con referencias externas.
- **Uso profesional**: su adopción requiere la validación humana independiente descrita en la hoja de aceptación.

---

## Licencia

El código original de la aplicación se distribuye bajo la **Licencia Pública de la Unión Europea, versión 1.2 únicamente (EUPL-1.2)**. Puede usarse en entornos docentes, de investigación, reglamentarios, comerciales y sanitarios, con sujeción a los términos de la licencia, incluidos sus requisitos de *copyleft* y de disponibilidad del código fuente. La EUPL tiene [versión oficial en español](https://interoperable-europe.ec.europa.eu/collection/eupl/eupl-text-eupl-12), con el mismo valor que la inglesa.

Esta aplicación se suministra directamente en forma de código fuente legible por máquina. Los archivos HTML, CSS y JavaScript correspondientes, junto con los archivos de licencia y de atribución, acompañan a cada copia local; no se necesita ningún servicio externo de código fuente.

La EUPL no cambia la licencia del software y los datos de terceros incluidos. En particular, los datos de desintegración ICRP-07 conservan los términos educativos, de investigación y sin ánimo de lucro de `LICENSE.TXT`; las demás fuentes conservan los términos indicados en `THIRD_PARTY_NOTICES.md`. Los textos completos y el mapa de alcance figuran en **Acerca de, guía y licencias** dentro de la aplicación; esos textos se muestran en inglés.

Para uso reglamentario, contraste con las fuentes primarias y consulte a las autoridades de protección radiológica competentes.
