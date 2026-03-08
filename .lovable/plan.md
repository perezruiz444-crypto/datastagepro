

# Plan: Tabla 502 — Mapeo por Índice + Inyección de Contexto desde 501

## Cambios

### 1. `src/constants/dataStage.ts`
Reemplazar `COLUMN_HEADERS['502']` con las 11 columnas exactas:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación, 
Clave, Tipo de Pedimento, Fecha de pago, RFC del transportista, 
CURP del transportista, Nombre del transportista, 
Clave de país del transporte, Identificador del transporte
```

### 2. `src/services/pedimentoService.ts`

**Nueva función `transform502Row`:**
- Construir Pedimento: `AA(año de idx8)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)`
- Mapear idx 2 → Sección, idx 3-7 → RFC, CURP, Nombre, País, Identificador
- Formatear idx 8 → Fecha de pago (DD/MM/YYYY)
- Las columnas 0, 1, 2 originales NO pasan al output

**Nuevo concepto: Lookup de contexto 501:**
- Después de procesar la tabla 501, construir un `Map<string, {tipoOperacion, clave, tipoPedimento}>` indexado por pedimento unificado
- La función `transform502Row` recibe este lookup y busca por pedimento para inyectar las 3 columnas de contexto
- Si no hay match, inyectar cadenas vacías

**Flujo en `enrichWithPedimentoUnificado`:**
1. Procesar 501 primero (ya existe)
2. Construir lookup del 501 enriched (fila[2]=TipoOp, fila[3]=Clave, fila[4]=TipoPed)
3. Al procesar 502, usar `transform502Row` con el lookup
4. Las demás tablas siguen con lógica legacy sin cambios

### Alcance
Solo tabla 502. Las demás tablas legacy no se modifican.

