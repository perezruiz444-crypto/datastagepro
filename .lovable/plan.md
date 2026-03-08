

# Plan: Tabla 512 (Descargo de Mercancías) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['512']` (lines 216-221) with 13 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave, Tipo de Pedimento, Fecha de pago, Pedimento original,
Clave de pedimento original, Fecha de la operación original,
Fracción arancelaria original, Clave de unidad de medida original,
Unidad de medida original, Cantidad de mercancía descargada
```

### 2. `src/services/pedimentoService.ts`
- New `transform512Row(row, lookup501)`:
  - **Llave A (Pedimento)**: `AA(año idx12)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
  - **Llave B (Pedimento original)**: `AA(año idx7)-AAA(idx5)-AAAA(idx3)-AAAAAAA(idx4)`
  - Inyectar Tipo de Operación, Clave, Tipo de Pedimento desde lookup 501
  - Fecha de pago: idx 12 → DD/MM/YYYY
  - Clave de pedimento original: idx 6
  - Fecha de la operación original: idx 7 → DD/MM/YYYY
  - Fracción arancelaria original: idx 8
  - Clave de unidad de medida original: idx 9
  - Unidad de medida original: idx 9 (valor crudo, sin catálogo)
  - Cantidad de mercancía descargada: idx 10
- Add `fileKey === '512'` block in `enrichWithPedimentoUnificado` (same pattern as 502-511)

### Alcance
Solo tabla 512. Patrón idéntico a tablas anteriores, con la adición de una segunda llave construida (Pedimento original).

