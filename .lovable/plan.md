

# Plan: Tabla 505 (Facturas) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['505']` with 17 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave, Tipo de Pedimento, Fecha de recepción de pedimento, Fecha de pago,
Número de la factura, Fecha de facturación, Clave de término de facturación,
Valor en dólares, Clave de moneda de facturación, Valor en moneda extranjera,
Clave de país de facturación, Proveedor de la mercancía,
Identificación fiscal del proveedor, Dirección
```

### 2. `src/services/pedimentoService.ts`

**Expand `Context501` interface** to include `fechaRecepcion: string` (extracted from enriched 501 row index 5). Update `buildContext501Lookup` accordingly.

**New `transform505Row(row, lookup501)`:**
- Pedimento: `AA(año idx18)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
- Inyectar desde 501: Tipo de Operación, Clave, Tipo de Pedimento, Fecha de recepción
- Fecha de pago: idx 18 → DD/MM/YYYY
- Número factura: idx 4
- Fecha facturación: idx 3 → DD/MM/YYYY
- Término facturación: idx 5
- Valor dólares: idx 7
- Moneda facturación: idx 6
- Valor moneda extranjera: idx 8
- País facturación: idx 9
- Proveedor: idx 12
- ID fiscal: idx 11
- Dirección: concatenar idx 13 + 15 + 14 + 17 + 10 + 16 (filter nulls, join with space)

**Add `fileKey === '505'` block** in `enrichWithPedimentoUnificado` (same pattern as 502-504).

### Alcance
Solo tabla 505. El cambio en `Context501` es backward-compatible (campo adicional).

