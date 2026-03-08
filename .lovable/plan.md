

# Plan: Encabezados oficiales + Pedimento Unificado + Validación

## Alcance (sin dashboard/análisis — eso va en versión de pago)

### 1. Encabezados oficiales por archivo (`src/constants/dataStage.ts`)

Agregar un mapa `COLUMN_HEADERS: Record<string, string[]>` con los nombres de columna oficiales del Anexo 22 para cada archivo (501 a 702). Las primeras 5 columnas contextuales serán consistentes:

```text
Pedimento | Sección Aduanera | Tipo Operación | Clave | Tipo Pedimento | ...columnas específicas
```

Cada archivo tendrá sus columnas específicas después del bloque contextual (ej. 501 tiene fechas, tipo de cambio, totales; 551 tiene fracción arancelaria, secuencia, etc.).

### 2. Columna Pedimento Unificado (`src/services/fileService.ts`)

En `processZipFile`:
- Al procesar el archivo 501, extraer de cada registro los campos: año (2 dígitos), aduana (3 dígitos), patente (4 dígitos), consecutivo (7 dígitos)
- Concatenar como `AA-AAA-AAAA-AAAAAAA` e insertarla como columna 1 en los datos procesados
- Construir un mapa `pedimentoMap` (por campos originales → pedimento unificado) para que los demás archivos (502-702) puedan referenciar la misma llave
- Para archivos subordinados, buscar sus campos correspondientes y mapear al pedimento unificado

### 3. Encabezados en exportación Excel (`src/services/fileService.ts`)

En `generateSeparateSheetsExcelReport` y `generateIndividualExcelFiles`:
- Si existe `COLUMN_HEADERS[section]`, insertar como primera fila antes de los datos
- Mantener autofiltros sobre la fila de encabezados
- Ajustar ancho de columnas automáticamente

### 4. Validación post-procesamiento (`src/services/fileService.ts`)

Agregar función `validateProcessedData(data: ProcessedData)` que retorne warnings:
- Verificar que todos los archivos tengan la columna Pedimento unificado
- Detectar pedimentos con formato incorrecto (no cumple `\d{2}-\d{3}-\d{4}-\d{7}`)
- Verificar que las 5 columnas contextuales estén presentes
- Los warnings se mostrarán en el log de procesamiento (ya existe el mecanismo `addLog`)

### 5. Ajustes en consolidación anual/histórica

- `consolidateAnnualData`: La columna "Mes" se inserta después del Pedimento unificado (columna 2)
- Modo histórico: La columna "Periodo" se inserta después del Pedimento unificado

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/constants/dataStage.ts` | Agregar `COLUMN_HEADERS`, `CONTEXTUAL_COLUMNS` |
| `src/services/fileService.ts` | Lógica pedimento unificado, encabezados en export, validación |
| `src/components/processor/ProcessingSection.tsx` | Sin cambios (ya muestra logs con warnings) |
| `src/components/processor/ResultsSection.tsx` | Mostrar warnings de validación si existen |

