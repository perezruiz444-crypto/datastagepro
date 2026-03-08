

# Plan: Tabla 556 (Tasas de la Partida) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace existing `COLUMN_HEADERS['556']` with 13 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave de Pedimento, Tipo de Pedimento, Fecha de pago real,
Fracción arancelaria, Secuencia de la fracción arancelaria,
Clave de contribución, Descripción de la contribución,
Tasa de la contribución, Clave de tipo de la tasa,
Descripción de la tasa
```

### 2. `src/services/pedimentoService.ts`
New `transform556Row(row, lookup501)`:
- **Pedimento**: `AA(año idx8)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
- Inyectar Tipo de Operación, Clave de Pedimento, Tipo de Pedimento desde lookup 501
- Fecha de pago real: idx 8 → DD/MM/YYYY
- Fracción arancelaria: idx 3
- Secuencia: idx 4
- Clave de contribución: idx 5
- Descripción de la contribución: idx 5 (valor crudo, sin catálogo)
- Tasa de la contribución: idx 6
- Clave de tipo de la tasa: idx 7
- Descripción de la tasa: idx 7 (valor crudo, sin catálogo)
- Add `fileKey === '556'` block in `enrichWithPedimentoUnificado`
- Handle empty file case

### Alcance
Solo tabla 556. Patrón idéntico a tablas anteriores. Dos pares de campos duplicados (idx 5 y idx 7) preservando valor crudo.

