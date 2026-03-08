

# Plan: Tabla 504 (Contenedores) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['504']` with 9 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave, Tipo de Pedimento, Fecha de pago, Número del contenedor,
Clave de tipo de contenedor, Descripción del contenedor
```

### 2. `src/services/pedimentoService.ts`
- New `transform504Row(row, lookup501)` function:
  - Pedimento: `AA(año idx5)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
  - Inyectar Tipo de Operación, Clave, Tipo de Pedimento desde lookup 501
  - Fecha de pago: idx 5 → DD/MM/YYYY
  - Número del contenedor: idx 3
  - Clave de tipo de contenedor: idx 4
  - Descripción del contenedor: idx 4 (valor crudo, sin traducción)
- Add `fileKey === '504'` block in `enrichWithPedimentoUnificado` (same pattern as 502/503, reusing `context501` lookup)

### Alcance
Solo tabla 504. Patrón idéntico a 502/503.

