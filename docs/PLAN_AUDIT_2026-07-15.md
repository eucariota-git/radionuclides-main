# Plan revisado de corrección — auditoría 2026-07-15

## Decisión

Se corrigen los 3 hallazgos altos (A1–A3) y los 17 medios (B1–B17). Se incorporan
además dos controles baratos que pasan a formar parte de B5/B13: igualdad profunda
entre `nuclides.json` y su copia embebida, y documentación completa de las suites.

Cada corrección se entrega junto con una regresión que cubra la capa donde estaba el
defecto. Las pruebas matemáticas no se usarán como sustituto de pruebas del cableado
HTML, del service worker o de la salida de los informes.

## Bloque 1 — resultados numéricos e informes

1. **A1 — espectro H'(0,07) en la gráfica de dosis**
   - Usar `sp007` en la serie H'(0,07).
   - Conservar las pruebas físicas existentes de espectros separados.
   - Añadir una regresión estática del cableado de la tabla y la gráfica.
2. **A2 — alias de identificadores**
   - Centralizar la normalización en un helper puro compartido por DB e ICRP107.
   - Resolver primero la entrada curada normalizada y caer después a ICRP107.
   - Dar prioridad a Y-90 frente a `_icrp107` en el estado del informe.
   - Probar `177Lu`, `Lu177`, `99mTc`, `90Y`, `Y90`, espacios y cambios de caja.
3. **A3 — ratios de desclasificación en informes**
   - Usar `fmtRatio` en los dos ratios; mantener `fmt` para tiempos.
   - Probar valores inmediatamente por encima y por debajo del umbral.

## Bloque 2 — entradas y carga de datos

1. **B1** — el factor de transmisión del paciente solo se habilita y aplica cuando
   la selección es `Yes`; con `No`, el cálculo impone exactamente 1.
2. **B2** — se elimina `parseFloat(...) || 0`; el cálculo final rechaza espesores no
   numéricos y la vista previa de HVL se oculta mientras el campo sea inválido.
3. **B3** — una fecha objetivo exige fecha de referencia; una referencia sin objetivo
   sigue representando `t = 0`.
4. **B4** — el peso sigue siendo opcional, pero un valor introducido debe ser finito y
   estrictamente positivo.
5. **B5** — `DB.load()` valida la estructura, los registros y la coherencia con la
   copia embebida antes de aceptar el JSON. Una fuente inválida cae a la copia
   embebida; si ambas son inválidas, lanza un error visible.
6. **B6** — cada calculadora captura el fallo de carga y muestra un mensaje propio.

## Bloque 3 — PWA

1. **B7** — ninguna ruta de `respondWith` puede resolver a `undefined`; los fallos
   offline devuelven una respuesta explícita o la navegación precargada.
2. **B8** — los activos precargados usan cache-first real. Los recursos deliberadamente
   no precargados van a red y activan el fallback local cuando no hay conexión.
3. Actualizar documentación y subir `CACHE_VERSION` de v20 a v21 una sola vez, tras
   completar todos los cambios de activos.

## Bloque 4 — modo oscuro y accesibilidad

1. **B9** — definir tokens estables de fondo/texto para tooltips con contraste AA.
2. **B10** — los tooltips de las cabeceras dentro del contenedor con `overflow` se
   abren hacia abajo para no quedar recortados.
3. **B11** — todos los disparadores reciben foco de teclado y descripción accesible;
   el texto no depende únicamente de `data-tooltip`.
4. **B12** — las gráficas leen tokens CSS para series, texto y rejilla, y se actualizan
   también cuando el usuario cambia de tema con una gráfica ya creada.

## Bloque 5 — tests, documentación y avisos de terceros

1. **B13** — las comprobaciones ICRU57 leen `PHYSICS.ICRU57` real y conservan anclajes
   independientes para detectar errores de contenido.
2. **B14–B16** — corregir tolerancias, recuentos, estructura y troubleshooting offline,
   manteniendo sincronizados `docs/USER_GUIDE.md` y `about.html`.
3. **B17** — documentar `@kurkle/color v0.3.2`, con el aviso de copyright 2023 que
   figura en el bundle, conservando completo el aviso MIT.
4. Documentar las tres suites y la nueva suite de integración/estructura.

## Verificación

- Todas las suites deben terminar con código 0. Los recuentos finales se documentarán
  después de añadir las regresiones; no se conservarán cifras antiguas por contrato.
- Se verificará explícitamente:
  - tabla y gráfica H'(0,07) con `sp007`;
  - equivalencia de alias curados y precedencia de Y-90;
  - ratios de informe a ambos lados de 1;
  - fallback ante `{}`, array parcial y ausencia de red;
  - igualdad profunda JSON/JS;
  - service worker sin respuestas `undefined` y sin revalidación parcial de activos;
  - foco, descripción y visibilidad de tooltips;
  - tema inicial y cambio dinámico de ambas gráficas.
- Se hará una precomprobación interna de `docs/ACCEPTANCE_TEST.md`. La aceptación y
  firma formal quedan reservadas a un especialista independiente, como exige la hoja.

## Entrega

Los commits serán temáticos y cada uno incluirá corrección, pruebas y documentación
directamente asociada. El informe final se escribirá en `docs/AUDIT_2026-07-15.md` y
permanecerá local mediante la regla `docs/AUDIT_*.md` de `.gitignore`.
