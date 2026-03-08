

# Plan: Tabla 554 (Casos de la Partida) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['554']` (lines 306-310) with 12 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave de Pedimento, Tipo de Pedimento, Fecha de Pago Real,
Fracción arancelaria, Secuencia de la fracción arancelaria,
Clave de caso, Descripción del Identificador,
Identificador del caso, Complemento del caso
```

### 2. `src/services/pedimentoService.ts`
New `transform554Row(row, lookup501)`:
- **Pedimento**: `AA(año idx8)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
- Inyectar Tipo de Operación, Clave de Pedimento, Tipo de Pedimento desde lookup 501
- Fecha de Pago Real: idx 8 → DD/MM/YYYY
- Fracción arancelaria: idx 3
- Secuencia: idx 4
- Clave de caso: idx 5
- Descripción del Identificador: idx 5 (valor crudo, sin catálogo)
- Identificador del caso: idx 6
- Complemento del caso: idx 7
- Add `fileKey === '554'` block in `enrichWithPedimentoUnificado`
- Handle empty file case

### Alcance
Solo tabla 554. Patrón idéntico a tablas anteriores.

