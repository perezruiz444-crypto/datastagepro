

# Plan: Tabla 552 (Mercancías / Vehículos) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['552']` (lines 278-281) with 10 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave de Pedimento, Tipo de Pedimento, Fecha de pago real,
Fracción arancelaria, Secuencia de la fracción arancelaria,
VIN o número de serie, Kilometraje del vehículo
```

### 2. `src/services/pedimentoService.ts`
New `transform552Row(row, lookup501)`:
- **Pedimento**: `AA(año idx7)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
- Inyectar Tipo de Operación, Clave de Pedimento, Tipo de Pedimento desde lookup 501
- Fecha de pago real: idx 7 → DD/MM/YYYY
- Fracción arancelaria: idx 3
- Secuencia de la fracción arancelaria: idx 4
- VIN o número de serie: idx 5
- Kilometraje del vehículo: idx 6
- Add `fileKey === '552'` block in `enrichWithPedimentoUnificado`
- Handle empty file case (only headers, no data rows) — return empty array with correct column structure

### Alcance
Solo tabla 552. Patrón idéntico a tablas anteriores, con manejo de archivo vacío.

