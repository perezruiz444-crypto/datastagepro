

# Plan: Tabla 701 (Rectificaciones y Pedimentos Anteriores) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['701']` (lines 381-385) with 15 columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Tipo de Pedimento, Fecha de pago real, Clave de documento,
Fecha de pago, Pedimento Anterior Unificado, Documento Anterior,
Fecha de Operación Anterior, Pedimento Original Crudo,
Patente Original, Sección Aduanera Original,
Número de Pedimento Anterior Crudo, Patente Anterior
```

### 2. `src/services/pedimentoService.ts`

**New `transform701Row(row, lookup501)`:**
- **Pedimento (Llave A)**: `AA(año idx13)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
- **Pedimento Anterior Unificado (Llave B)**: `AA(año idx9)-AAA(idx7)-AAAA(idx6)-AAAAAAA(idx5)` — blank if idx 9 is empty
- JOIN con 501: solo 2 campos (Tipo de Operación, Tipo de Pedimento) — nota: no Clave de Pedimento
- Fecha de pago real: idx 13 → DD/MM/YYYY
- Fecha de pago: idx 4 → DD/MM/YYYY
- Fecha de Operación Anterior: idx 9 → DD/MM/YYYY
- Clave de documento: idx 3
- Documento Anterior: idx 8
- Pedimento Original Crudo: idx 10
- Patente Original: idx 11
- Sección Aduanera Original: idx 12
- Número de Pedimento Anterior Crudo: idx 5
- Patente Anterior: idx 6

**New `fileKey === '701'` block** in `enrichWithPedimentoUnificado`, same pattern as 558, placed after it. Handles empty file case.

### Alcance
Solo tabla 701. Diferencias clave vs tablas anteriores: dos llaves de pedimento (A y B), solo 2 campos del JOIN (no 3), tres campos de fecha, y llave B condicional (vacía si idx 9 vacío).

