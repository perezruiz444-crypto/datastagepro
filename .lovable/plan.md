

# Plan: Redefinir Tabla 501 — Mapeo por Índice con Diccionario Exacto

## Cambios Requeridos

### 1. Nuevo archivo: `src/constants/catalogs.ts`
Catálogos hardcodeados para resolución de descripciones:
- **Medios de transporte** (Índices 16, 17, 18): `{1: 'Marítimo.', 4: 'Aéreo.', 7: 'Carretero.', ...}`
- **Destino de mercancía** (Índice 19): `{9: 'Interior del país', ...}`
- **Tipo de Operación** (Índice 3): `{1: 'Importación', 2: 'Exportación'}`
- **Tipo de Pedimento** (Índice 28): `{1: 'Pedimento Normal', 2: 'Pedimento de Rectificación'}`

### 2. Actualizar `src/constants/dataStage.ts`
Reemplazar `COLUMN_HEADERS['501']` con las 31 columnas exactas del diccionario:
```
Pedimento, Clave de sección aduanera de despacho, Tipo de Operación, Clave, 
Tipo de Pedimento, Fecha de recepción de pedimento, Fecha de pago, Tipo de cambio, 
Fletes, Seguros, Embalajes, Otros incrementales, Otros deducibles, 
Peso bruto de la mercancía, Clave de medio de transporte de salida, 
Descripción Clave de medio de transporte de salida, ... (31 total)
```

Agregar nuevo objeto `COLUMN_MAPPING_501` que define para cada columna de salida:
- Índice de origen en el .asc
- Transformación (ninguna, formateo fecha, lookup catálogo, concatenación, valor fijo)

### 3. Reescribir lógica en `src/services/pedimentoService.ts`

**Construcción de Pedimento (Regla 1 nueva)**:
- Extraer año de Índice 30 (Fecha de Pago): últimos 2 dígitos del año
- Formato: `AA-AAA-AAAA-AAAAAAA` = `año(idx30)-idx2-idx0-idx1`
- Las columnas originales 0, 1, 2 NO se pasan al output

**Mapeo por índice para 501**:
- Cada fila se transforma usando el mapeo posicional definido
- Campos de fecha (idx 29, 30): formato `YYYYMMDD` → `DD/MM/YYYY`
- Campos de catálogo (idx 3, 16, 17, 18, 19, 28): lookup en catálogos
- Dirección (nueva col): concatenar idx 21+23+22+24+25+26+27 con espacios
- Decrementables (5 cols): inyectar valor `'0'`

**Estructura del output**: Exactamente 31 columnas, fila 0 = encabezados del diccionario, filas 1+ = datos transformados.

### 4. Ajuste menor en `src/services/fileService.ts`
- Pasar a `enrichWithPedimentoUnificado` sin el parámetro `year` (ya no se necesita, el año se extrae del Índice 30 de cada fila)

### Alcance
Solo tabla 501 en este paso. Las demás tablas se redefinirán una por una en mensajes posteriores.

