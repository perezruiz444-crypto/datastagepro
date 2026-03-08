

# Plan: Tabla 520 (Destinatarios de la Mercancía) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['520']` (lines 231-234) with 9 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave, Tipo de Pedimento, Fecha de pago,
Identificación fiscal del destinatario,
Nombre del destinatario de la mercancía, Dirección Destinatario
```

### 2. `src/services/pedimentoService.ts`
- New `transform520Row(row, lookup501)`:
  - **Pedimento**: `AA(año idx11)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
  - Inyectar Tipo de Operación, Clave, Tipo de Pedimento desde lookup 501
  - Fecha de pago: idx 11 → DD/MM/YYYY
  - Identificación fiscal del destinatario: idx 3
  - Nombre del destinatario de la mercancía: idx 4
  - **Dirección Destinatario**: Concatenar con espacios (filtrando nulos/vacíos): idx 5 (Calle) + idx 7 (NumExt) + idx 6 (NumInt) + idx 8 (CP) + idx 9 (Municipio) + idx 10 (País)
- Add `fileKey === '520'` block in `enrichWithPedimentoUnificado` (same pattern as 502-512)

### Alcance
Solo tabla 520. Patrón idéntico a tablas anteriores.

