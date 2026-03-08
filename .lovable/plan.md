

# Plan: Tabla 509 (Tasas del Pedimento) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['509']` with 12 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave, Tipo de Pedimento, Fecha de pago, Clave de contribución,
Contribución, Descripción de la contribución, Tasa de la contribución,
Clave de tipo de la tasa, Descripción de la tasa
```

### 2. `src/services/pedimentoService.ts`
- New `transform509Row(row, lookup501)`:
  - Pedimento: `AA(año idx7)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
  - Inyectar Tipo de Operación, Clave, Tipo de Pedimento desde lookup 501
  - Fecha de pago: idx 7 → DD/MM/YYYY
  - Clave de contribución: idx 3
  - Contribución: idx 3 (valor crudo, sin catálogo)
  - Descripción de la contribución: idx 3 (valor crudo, sin catálogo)
  - Tasa de la contribución: idx 4
  - Clave de tipo de la tasa: idx 5
  - Descripción de la tasa: idx 5 (valor crudo, sin catálogo)
- Add `fileKey === '509'` block in `enrichWithPedimentoUnificado` (same pattern as 502-508)

### Alcance
Solo tabla 509. Patrón idéntico a tablas anteriores.

