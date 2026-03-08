

# Plan: Tabla 511 (Observaciones del Pedimento) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['511']` with 9 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave, Tipo de Pedimento, Fecha de pago, Secuencia de la observación,
Observaciones, Fecha de validación o de pago real
```

### 2. `src/services/pedimentoService.ts`
- New `transform511Row(row, lookup501)`:
  - Pedimento: `AA(año idx6)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
  - Inyectar Tipo de Operación, Clave, Tipo de Pedimento desde lookup 501
  - Fecha de pago: idx 6 → DD/MM/YYYY
  - Secuencia de la observación: idx 3
  - Observaciones: idx 4
  - Fecha de validación o de pago real: idx 6 → DD/MM/YYYY
- Add `fileKey === '511'` block in `enrichWithPedimentoUnificado` (same pattern as 502-510)

### Alcance
Solo tabla 511. Patrón idéntico a tablas anteriores.

