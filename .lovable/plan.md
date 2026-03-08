

# Plan: Tabla Sel (Selección Automatizada / Semáforo Fiscal)

## Cambios

### 1. `src/constants/dataStage.ts`
- Add `'Sel': 'Sel - Selección Automatizada / Semáforo Fiscal'` to `FILE_NAMES`
- Add `'Sel'` to `PEDIMENTO_LEVEL_FILES`
- Define `COLUMN_HEADERS['Sel']` with 10 columns:
  ```
  Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
  Clave de Documento, Consecutivo de Remesa, Número de Selección,
  Fecha de Selección, Hora de Selección, Resultado del Semáforo Fiscal,
  Patente Original Cruda
  ```

### 2. `src/services/pedimentoService.ts`

**New `transformSelRow(row)`** (after `transformInciRow`, same pattern — no JOIN):
- Pedimento: `AA(año idx5)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)` — year from FechaSeleccion (idx 5)
- No JOIN with 501 — Tipo de Operación from idx 9 directly
- Fecha de Selección: idx 5 → DD/MM/YYYY
- Hora de Selección: idx 6 (raw text)
- Resultado del Semáforo Fiscal: idx 7 (raw, no catalog)
- Clave de Documento: idx 8
- Consecutivo de Remesa: idx 3
- Número de Selección: idx 4
- Patente Original Cruda: idx 0

**New `fileKey === 'Sel'` block** in `enrichWithPedimentoUnificado`, after Inci block. Same pattern as Inci (no lookup501). Handles empty file.

### Alcance
Solo tabla Sel. Similar a Inci: sin JOIN con 501, llave desde FechaSeleccion. 10 columnas vs 15 de Inci.

