

# Plan: Tabla 506 (Fechas del Pedimento) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/catalogs.ts`
Add new catalog for Tipo de Fecha (Apéndice 21):
```ts
export const TIPO_FECHA: Record<string, string> = {
  '1': 'ENTRADA',
  '2': 'PAGO',
  '3': 'EXTRACCIÓN',
  '5': 'PRESENTACIÓN',
  '6': 'IMPEX',
  '7': 'ORIGINAL',
};
```

### 2. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['506']` with 9 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave, Tipo de Pedimento, Fecha de pago, Tipo de fecha,
Fecha de operación, Fecha de validación o de pago real
```

### 3. `src/services/pedimentoService.ts`
- Import `TIPO_FECHA` from catalogs
- New `transform506Row(row, lookup501)`:
  - Pedimento: `AA(año idx5)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
  - Inyectar Tipo de Operación, Clave, Tipo de Pedimento desde lookup 501
  - Fecha de pago: idx 5 → DD/MM/YYYY
  - Tipo de fecha: idx 3 → traducir via `TIPO_FECHA`
  - Fecha de operación: idx 4 → DD/MM/YYYY
  - Fecha de validación o de pago real: idx 5 → DD/MM/YYYY
- Add `fileKey === '506'` block in `enrichWithPedimentoUnificado` (same pattern as 502-505)

### Alcance
Solo tabla 506. Patrón idéntico a tablas anteriores.

