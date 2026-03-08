

# Plan: Tabla 558 (Observaciones de la Partida) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace existing `COLUMN_HEADERS['558']` (currently has 9 columns from old definition) with 10 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave de Pedimento, Tipo de Pedimento, Fecha de pago real,
Fracción arancelaria, Secuencia de la fracción arancelaria,
Secuencia de la observación, Observaciones
```

Note: The current `'558'` entry does not appear in the visible range (lines 354-378 jump from 557 to 701), so it will be inserted between `'557'` and `'701'`.

### 2. `src/services/pedimentoService.ts`
New `transform558Row(row, lookup501)`:
- **Pedimento**: `AA(año idx7)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
- Inyectar Tipo de Operación, Clave de Pedimento, Tipo de Pedimento desde lookup 501
- Fecha de pago real: idx 7 → DD/MM/YYYY
- Fracción arancelaria: idx 3
- Secuencia de la fracción arancelaria: idx 4
- Secuencia de la observación: idx 5
- Observaciones: idx 6 (sin alteración, truncamiento ni limpieza)
- Add `fileKey === '558'` block in `enrichWithPedimentoUnificado`
- Handle empty file case

### Alcance
Solo tabla 558. Última tabla del modelo. Patrón idéntico a tablas anteriores. Fecha en idx 7 (no idx 8). Observaciones preservadas íntegras.

