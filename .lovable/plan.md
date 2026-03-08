

# Plan: Tabla 503 (Guías) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/catalogs.ts`
Add new catalog for Tipo de Guía:
```ts
export const TIPO_GUIA: Record<string, string> = {
  'H': 'HOUSE',
  'M': 'MASTER',
};
```

### 2. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['503']` with 8 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave, Tipo de Pedimento, Fecha de pago, Número de guía o manifiesto,
Clave de tipo de guía
```

### 3. `src/services/pedimentoService.ts`
- New `transform503Row(row, lookup501)` function:
  - Pedimento: `AA(año idx5)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
  - Inyectar Tipo de Operación, Clave, Tipo de Pedimento desde lookup 501
  - Fecha de pago: idx 5 → DD/MM/YYYY
  - Número de guía: idx 3
  - Tipo de guía: idx 4 → traducir H/M
- Add `fileKey === '503'` block in `enrichWithPedimentoUnificado` (same pattern as 502, reusing `context501` lookup)

