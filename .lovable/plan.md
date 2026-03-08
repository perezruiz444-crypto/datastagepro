

# Plan: Tabla 702 (Diferencias de Contribuciones) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['702']` (lines 398-402) with 11 columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave, Tipo de Pedimento, Fecha de pago real,
Clave de contribución, Descripción de la contribución,
Clave de forma de pago, Descripción forma de pago, Importe del pago
```

### 2. `src/services/pedimentoService.ts`

**New `transform702Row(row, lookup501)`:**
- **Pedimento**: `AA(año idx7)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
- JOIN con 501: 2 campos — Tipo de Operación y Clave (nota: Clave, no Clave de Pedimento)
- Tipo de Pedimento: idx 6 (del propio archivo, no del JOIN)
- Fecha de pago real: idx 7 → DD/MM/YYYY
- Clave de contribución + Descripción: idx 3 (duplicado, valor crudo)
- Clave de forma de pago + Descripción: idx 4 (duplicado, valor crudo)
- Importe del pago: idx 5

**New `fileKey === '702'` block** in `enrichWithPedimentoUnificado`, after 701 block. Same pattern, handles empty file.

### Alcance
Solo tabla 702. Diferencias vs tablas anteriores: Tipo de Pedimento viene del propio archivo (idx 6), no del JOIN. JOIN inyecta Tipo de Operación y Clave. Dos pares duplicados (idx 3, idx 4).

