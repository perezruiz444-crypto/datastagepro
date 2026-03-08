

# Plan: Tabla 555 (Cuentas Aduaneras de Garantía de la Partida) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Add `COLUMN_HEADERS['555']` (between entries '554' and '556', after line 319) with 17 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave de Pedimento, Tipo de Pedimento, Fecha de pago real,
Fracción arancelaria, Secuencia de la fracción arancelaria,
Clave de institución emisora, Número de cuenta,
Folio de la constancia, Fecha de la constancia,
Clave de garantía, Valor unitario del título,
Total de la garantía, Cantidad en unidades de medida del precio estimado,
Títulos asignados
```

### 2. `src/services/pedimentoService.ts`
New `transform555Row(row, lookup501)`:
- **Pedimento**: `AA(año idx14)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
- Inyectar Tipo de Operación, Clave de Pedimento, Tipo de Pedimento desde lookup 501
- Fecha de pago real: idx 14 → DD/MM/YYYY
- Fracción arancelaria: idx 3
- Secuencia: idx 4
- Clave de institución emisora: idx 5
- Número de cuenta: idx 6
- Folio de la constancia: idx 7
- Fecha de la constancia: idx 8 → DD/MM/YYYY
- Clave de garantía: idx 9
- Valor unitario del título: idx 10
- Total de la garantía: idx 11
- Cantidad en unidades de medida del precio estimado: idx 12
- Títulos asignados: idx 13
- Add `fileKey === '555'` block in `enrichWithPedimentoUnificado`
- Handle empty file case

### Alcance
Solo tabla 555. Patrón idéntico a tablas anteriores. Nota: dos campos de fecha (idx 14 y idx 8) ambos formateados a DD/MM/YYYY.

