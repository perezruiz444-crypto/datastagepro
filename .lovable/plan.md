

# Plan: Tabla 507 (Casos del Pedimento) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['507']` (lines 148-151) with 10 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave, Tipo de Pedimento, Fecha de pago, Identificador del caso,
Descripción del Identificador, Complemento 1, Complemento 2
```

### 2. `src/services/pedimentoService.ts`
- New `transform507Row(row, lookup501)`:
  - Pedimento: `AA(año idx7)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
  - Inyectar Tipo de Operación, Clave, Tipo de Pedimento desde lookup 501
  - Fecha de pago: idx 7 → DD/MM/YYYY
  - Identificador del caso: idx 3
  - Descripción del Identificador: idx 3 (valor crudo, sin traducción)
  - Complemento 1: idx 4
  - Complemento 2: idx 6
- Add `fileKey === '507'` block in `enrichWithPedimentoUnificado` (same pattern as 502-506)

### Alcance
Solo tabla 507. Patrón idéntico a tablas anteriores.

