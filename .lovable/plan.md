

# Plan: Tabla Resumen (Control de Extracción Data Stage)

## Cambios

### 1. `src/constants/dataStage.ts`
- Add `'Resumen': 'Resumen - Control de Extracción'` to `FILE_NAMES`
- Add `COLUMN_HEADERS['Resumen']` with 7 columns:
  ```
  Folio de Extracción, RFC o Patente Consultada,
  Fecha Inicial de Consulta, Fecha Final de Consulta,
  Fecha de Ejecución del SAT, Total de Fracciones Extraídas,
  Total de Contribuciones Extraídas
  ```
- Do NOT add `'Resumen'` to `PEDIMENTO_LEVEL_FILES` or `PARTIDA_LEVEL_FILES` (no pedimento key)

### 2. `src/services/pedimentoService.ts`
**New `transformResumenRow(row)`:**
- No pedimento key construction, no JOIN with 501
- Map 7 indices directly: idx 0-6
- Dates (idx 2, 3, 4): format to DD/MM/YYYY using existing `formatDateField`
- All other fields: raw text passthrough

**New `fileKey === 'Resumen'` block** in `enrichWithPedimentoUnificado` (Phase 2), placed before the legacy fallback. Skips header detection like other custom tables. Handles empty file.

### 3. `src/services/pedimentoService.ts` — `validateProcessedData`
- Skip pedimento format validation for `'Resumen'` file key since it has no Pedimento column (currently the validator iterates all file keys checking `rows[i][0]` against `PEDIMENTO_REGEX`).

### Alcance
Solo tabla Resumen. Diferencia fundamental: sin llave Pedimento, sin JOIN. Tabla de control/metadata con 7 columnas directas.

