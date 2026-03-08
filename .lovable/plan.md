

# Plan: Tabla 510 (Contribuciones del Pedimento) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['510']` (lines 192-195) with 11 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave, Tipo de Pedimento, Fecha de pago, Clave de contribución,
Descripción de la contribución, Clave de forma de pago,
Descripción forma de pago, Importe del pago
```

### 2. `src/services/pedimentoService.ts`
- New `transform510Row(row, lookup501)`:
  - Pedimento: `AA(año idx7)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
  - Inyectar Tipo de Operación, Clave, Tipo de Pedimento desde lookup 501
  - Fecha de pago: idx 7 → DD/MM/YYYY
  - Clave de contribución: idx 3
  - Descripción de la contribución: idx 3 (valor crudo, sin catálogo)
  - Clave de forma de pago: idx 4
  - Descripción forma de pago: idx 4 (valor crudo, sin catálogo)
  - Importe del pago: idx 5
- Add `fileKey === '510'` block in `enrichWithPedimentoUnificado` (same pattern as 502-509)

### Alcance
Solo tabla 510. Patrón idéntico a tablas anteriores.

