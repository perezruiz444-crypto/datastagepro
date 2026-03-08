

# Plan: Tabla 553 (Permisos de la Partida) — Mapeo por Índice + JOIN con 501

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['553']` (lines 290-294) with 14 exact columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave de Pedimento, Tipo de Pedimento, Fecha de pago real,
Fracción arancelaria, Secuencia de la fracción arancelaria,
Clave del permiso, Descripción del permiso,
Firma de descargo, Número del permiso,
Valor comercial en dólares,
Cantidad de mercancía en unidades de medida de la tarifa
```

### 2. `src/services/pedimentoService.ts`
New `transform553Row(row, lookup501)`:
- **Pedimento**: `AA(año idx10)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
- Inyectar Tipo de Operación, Clave de Pedimento, Tipo de Pedimento desde lookup 501
- Fecha de pago real: idx 10 → DD/MM/YYYY
- Fracción arancelaria: idx 3
- Secuencia: idx 4
- Clave del permiso: idx 5
- Descripción del permiso: idx 5 (valor crudo, sin catálogo)
- Firma de descargo: idx 6
- Número del permiso: idx 7
- Valor comercial en dólares: idx 8
- Cantidad en unidades de medida de la tarifa: idx 9
- Add `fileKey === '553'` block in `enrichWithPedimentoUnificado`
- Handle empty file case

### Alcance
Solo tabla 553. Patrón idéntico a tablas anteriores.

