# Auditoría Completa Ronda 9 — Estado Actual del Proyecto

**Fecha**: 2026-05-23  
**Totalwrote hallazgos encontrados**: 11  
**Críticos**: 0 | **Altos**: 3 | **Medios**: 5 | **Bajos**: 3

---

## Tabla de Hallazgos

| ID | Gravedad | Ubicación | Explicación | Propuesta de Corrección |
|---|---|---|---|---|
| AUD-601 | **Alta** | `decay.html:707` `dose.html:694,707` | **XSS via toLocaleString() en innerHTML**. Las fechas generadas por `Date.toLocaleString()` se insertan en `innerHTML` sin escapar. Aunque toLocaleString() es generalmente seguro, violar el principio de no usar innerHTML para contenido dinámico. Ocurre en 3 lugares: decay.html (líneas 394, 594, 707) y dose.html (líneas 694, 707) | Usar `textContent` en lugar de `innerHTML` para fechas, o envolver en `<div>` con `textContent` seguro. Ejemplo: crear span con textContent: `const dateEl = document.createElement('div'); dateEl.textContent = d.toLocaleString();` |
| AUD-602 | **Alta** | `custom.html:470-479` | **Validación insuficiente de ID de nuclide**. El campo `customId` permite cualquier combinación de caracteres (línea 476 acepta `/^[A-Za-z0-9\-+:.\s]+$/` pero no restricción de longitud ni caracteres especiales como paréntesis o Unicode). Podría permitir IDs conflictivos que no se detecten correctamente | Endurecervalidación: `^[A-Za-z0-9][A-Za-z0-9\-]*$` (máx 20 caracteres). Agregar verificación de duplicados contra DB.getAll() antes de crear. |
| AUD-603 | **Alta** | `js/icrp107-loader.js:102-110` | **Performance: búsqueda lineal sin límite en ICRP 107**. La función `search()` itera sobre 1252 nuclides sin optimización. Con muchos usuarios, esto consume CPU. No hay paginación ni límite en resultados. | Agregar `head_limit` parámetro (default 50). Implementar búsqueda por prefijo primero: si el query tiene 3+ caracteres, solo mostrar primeros 50 matches exactos. |
| AUD-604 | **Medio** | `decay.html:323-328` `dose.html:464-469` | **Validación numérica débil**: `parseFloat(elapsedVal)` en línea 323-324 de decay.html. Si el usuario ingresa "1.5.3" o "1e1000", parseFloat devolverá un número (1 y Infinity respectivamente), pero después `Number.isFinite()` puede no capturar todos los casos. | Validación explícita: `if (!/^[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?$/.test(elapsedVal))` antes de parseFloat. |
| AUD-605 | **Medio** | `js/csv-parser.js:42` | **Manejo de BOM no documentado**: Línea 42 remueve explícitamente BOM UTF-8 (`replace(/^﻿/, '')`), pero no hay comentario explicando el por qué. Si el usuario sube CSV sin BOM pero el código asume que existe, podría haber confusión. | Agregar comentario: `// Remove UTF-8 BOM (U+FEFF) if present — required for file:// protocol compatibility` |
| AUD-606 | **Medio** | `index.html:145,275,282,301,330` `decay.html:215,616` `dose.html:279,604,653` | **innerHTML sin sanitización en algunos caminos HTML**. Ejemplos: `index.html:145` `document.getElementById('nuclideBody').innerHTML = rows` donde `rows` se construye sin garantía de que todos los valores estén escapados (algunos sí usan `UTILS.escapeHtml` pero no todos). Las búsquedas usan `n.id.toLowerCase().includes(q)` sin re-escapar. | Auditar cada construcción de `innerHTML`. Verificar que todo valor dinámico esté escapado con `UTILS.escapeHtml()` o use `textContent`. Crear función `safeHTML()` que enforce esto. |
| AUD-607 | **Medio** | `decay.html:766` `dose.html:959` | **Event listeners no cleanup en destrucción de DOM**: Los event listeners en combobox (línea 303-334 en dose.html) permanecen incluso si el elemento se reemplaza. Si el usuario cambia de página y vuelve, se duplican los listeners. | Agregar `removeEventListener` en cleanup o usar event delegation on document. O destruir combobox completamente antes de reinicializar. |
| AUD-608 | **Bajo** | `js/data.js:40` | **Constante GAMMA_FACTOR sin validación**. El valor 28.648 se calcula como `1/(4π) × 3.6×10¹⁸ × 10⁻¹⁶` pero no hay test que verifique esta constante es correcta. Si alguien edita accidentalmente, no hay alerta. | Agregar test en `validate-constants.js`: `PHYSICS.GAMMA_FACTOR` debe estar dentro de ±0.1% de 28.648. |
| AUD-609 | **Bajo** | `js/db.js:183-189` | **Manejo implícito de densidad de hormigón**: Si `material` no es 'Pb', 'concrete', 'concrete_NW', ni 'concrete_LW', la función asume 'concrete' (densidad 2.35 g/cm³) sin advertencia. Esto podría causar errores silenciosos si se agrega un nuevo material. | Agregar validación: `if (!['Pb', 'concrete', 'concrete_NW', 'concrete_LW'].includes(material)) throw new Error(...)` o log warning. |
| AUD-610 | **Bajo** | `js/utils.js:30` | **Falta documentación en formato numérico**. La función `fmt()` implementa la convención de redondeo pero sin comentarios sobre los umbrales (10000, 0.0001). Si alguien necesita cambiar estos valores, no sabrá el impacto completo. | Agregar comentario en cabeza de `fmt()` explicando todos los umbrales y por qué existen (ej: 10000 es 10^4 para separar notación científica). |
| AUD-611 | **Bajo** | `custom.html:330-331` | **Potencial pérdida de precisión en display de H10/H007**: Los valores se formatean con `UTILS.fmt()` pero en el resultado se muestran sin unidades claras. H10 y H007 se muestran sin contexto de qué es cada uno. | Agregar tooltips: `<span title="H*(10) dose constant [μSv·h⁻¹·GBq⁻¹·m²]">${UTILS.fmt(gammaH10)}</span>`. |

---

## Resumen de Verificación de Hallazgos Anteriores

✅ **AUD-001 a AUD-012**: RESUELTOS (Rondas 1-3)  
✅ **NEW-001 a NEW-006**: RESUELTOS (Ronda 4-5)  
✅ **Round 6-8 hallazgos de presentación**: RESUELTOS

---

## Categorización por Área

### Seguridad (XSS/Validación)
- **AUD-601** (Alta): XSS en toLocaleString()
- **AUD-606** (Medio): innerHTML sin sanitización selectiva
- **AUD-604** (Medio): Validación numérica débil

### Robustez
- **AUD-603** (Alta): Performance search ICRP 107
- **AUD-607** (Medio): Event listener cleanup
- **AUD-605** (Medio): BOM handling undocumented

### Usabilidad/Mantenibilidad
- **AUD-609** (Bajo): Manejo implícito de material
- **AUD-610** (Bajo): Documentación de umbrales fmt()
- **AUD-611** (Bajo): Contexto en display de constantes
- **AUD-602** (Alta): Validación de ID de nuclide

---

## Próximos Pasos

1. **Verificar si hallazgos anteriores fueron realmente resueltos** — cotejar contra commits
2. **Validar que los 11 hallazgos NO sean duplicados de auditorías previas**
3. **Priorizar por impacto**: AUD-601 (XSS real) > AUD-603 (perf) > AUD-602 (validación)
4. **No proponer nuevos hallazgos hasta que estos sean resueltos**
