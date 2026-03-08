

# Plan: Convertir "Multi-Anual" en "Histórico" con procesamiento de ZIPs crudos

## Resumen

Renombrar el modo "Multi-Anual" a "Histórico" y rediseñar su lógica: en lugar de fusionar archivos `.xlsx` ya procesados, ahora aceptará múltiples archivos `.zip` crudos (de cualquier cantidad de meses/años), los procesará desde cero con todas las transformaciones (501-Sel), y consolidará todas las tablas históricas con columnas "Año" y "Mes".

## Archivos a modificar

### 1. `src/types/dataStage.ts`
- `MULTI_YEAR = 'MULTI_YEAR'` → `HISTORICAL = 'HISTORICAL'`

### 2. Renombrar `MultiYearUploadSection.tsx` → `HistoricalUploadSection.tsx`
- Cambiar accept de `.xlsx` a `.zip`
- Título: "Histórico Multianual"
- Descripción: "Sube los archivos ZIP de todos los periodos que desees consolidar. El sistema procesará cada ZIP desde cero y generará un ecosistema histórico completo con todas las tablas."
- Auto-detectar periodo (mes/año) de cada ZIP con `detectPeriodFromZipFile` y mostrarlo junto al nombre
- Botón: "Generar Histórico"
- Icono: `FileArchive` en lugar de `FileSpreadsheet`

### 3. `src/services/fileService.ts`
- Reemplazar `mergeExcelFiles` con nueva función `processHistoricalData`:
  1. Itera cada ZIP, auto-detecta mes/año con `detectPeriodFromZipFile`
  2. Llama `processZipFile` para cada uno (transformaciones completas)
  3. Agrupa por fileKey concatenando verticalmente
  4. Inyecta columnas "Año" y "Mes" después de "Pedimento" en cada tabla
  5. Retorna `ProcessedData` con 19 tablas históricas consolidadas
- Actualizar `generateSeparateSheetsExcelReport` para usar `ReportMode.HISTORICAL` en el nombre: `Data_Stage_Historico_[rango].xlsx`

### 4. `src/pages/Processor.tsx`
- Tab label: `Multi-Anual` → `Histórico`
- `ReportMode.MULTI_YEAR` → `ReportMode.HISTORICAL`
- Renombrar `handleMultiYearProcess` → `handleHistoricalProcess`: recibe `File[]` de ZIPs, llama `processHistoricalData`
- Report title dinámico con rango de años detectado
- Actualizar imports

### 5. `src/components/landing/FAQ.tsx`
- Actualizar texto de "Multi-Anual" a "Histórico" con descripción correcta del nuevo comportamiento

