

# Plan: Tabla 551 (Partidas) — Mapeo por Índice + JOIN con 501 + Cálculo Precio Unitario USD

## Cambios

### 1. `src/constants/dataStage.ts`
Replace `COLUMN_HEADERS['551']` (lines 242-254) with exactly 34 columns:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación,
Clave de Pedimento, Tipo de Pedimento, Fecha de Pago Real,
Fracción arancelaria, Secuencia de la fracción arancelaria,
Subdivisión de la fracción arancelaria, Descripción de la mercancía,
Precio Unitario MN, Valor Aduana MN Pedimento, Valor Comercial MN Pedimento,
Valor en dólares, Cantidad de mercancía en unidades de medida comercial,
Clave de unidad de medida comercial, Unidad de medida comercial,
Cantidad de mercancía en unidades de medida de la tarifa,
Clave de unidad de medida de la tarifa, Unidad de Tarifa,
Valor agregado, Clave de vinculación, Clave de método de valorización,
Descripción de método de valorización, Código de la mercancía o producto,
Marca de la mercancía o producto, Modelo de la mercancía o producto,
Clave de país origen / destino, Clave de país Comprador / vendedor,
Clave de entidad federativa de origen, Clave de entidad federativa de destino,
Clave de entidad federativa del comprador, Clave de entidad federativa del vendedor,
Precio Unitario USD
```

### 2. `src/services/pedimentoService.ts`
New `transform551Row(row, lookup501)`:
- **Pedimento**: `AA(año idx29)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
- Inyectar Tipo de Operación, Clave de Pedimento, Tipo de Pedimento desde lookup 501
- Fecha de Pago Real: idx 29 → DD/MM/YYYY
- Índices directos: 3,4,5,6,7,8,9,10,11,12(x2),13,14(x2),15,16,17(x2),18,19,20,21,22,23,24,25,26
- **Precio Unitario USD**: `parseFloat(idx10) / parseFloat(idx11)`, devolver `'0'` si idx11 es 0 o vacío
- Add `fileKey === '551'` block in `enrichWithPedimentoUnificado`

### Alcance
Solo tabla 551. Misma estructura que tablas anteriores, con el agregado del cálculo matemático.

