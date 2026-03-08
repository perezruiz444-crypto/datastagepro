

# Plan: Tabla 508 (Garantía del Pedimento) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Add `COLUMN_HEADERS['508']` with 16 columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave, Tipo de Pedimento, Fecha de pago, Clave de institución emisora,
Número de cuenta, Folio de la constancia, Fecha de la constancia,
Clave de tipo de cuenta, Clave de garantía, Valor unitario del título,
Total de la garantía, Cantidad en unidades de medida del precio estimado,
Títulos asignados
```

### 2. `src/services/pedimentoService.ts`
- New `transform508Row(row, lookup501)`:
  - Pedimento: `AA(año idx13)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
  - Inyectar Tipo de Operación, Clave, Tipo de Pedimento desde lookup 501
  - Fecha de pago: idx 13 → DD/MM/YYYY
  - Clave institución emisora: idx 3
  - Número de cuenta: idx 4
  - Folio constancia: idx 5
  - Fecha constancia: idx 6 → DD/MM/YYYY
  - Clave tipo cuenta: idx 7
  - Clave garantía: idx 8
  - Valor unitario título: idx 9
  - Total garantía: idx 10
  - Cantidad unidades: idx 11
  - Títulos asignados: idx 12
- Add `fileKey === '508'` block in `enrichWithPedimentoUnificado` (same pattern as 502-507)
- Must produce headers even with empty data rows

### Alcance
Solo tabla 508. Patrón idéntico a tablas anteriores.

