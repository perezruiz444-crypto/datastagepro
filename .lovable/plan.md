

# Plan: Renombrar "Histórico" a "Consolidado por Tabla"

Cambio cosmético en 5 archivos. Sin cambios de lógica.

## Archivos a editar

### 1. `src/types/dataStage.ts`
- `HISTORICAL = 'HISTORICAL'` → `CONSOLIDATED_TABLE = 'CONSOLIDATED_TABLE'`

### 2. `src/pages/Processor.tsx`
- Tab trigger label: `Histórico` → `Consolidado por Tabla`
- Report title: `Histórico ${fileType}` → `Consolidado por Tabla - ${fileType}`
- Update all `ReportMode.HISTORICAL` → `ReportMode.CONSOLIDATED_TABLE`
- Rename handler `handleHistoricalProcess` → `handleConsolidatedTableProcess`

### 3. `src/components/processor/HistoricalUploadSection.tsx`
- Card title: `Generar Reporte Histórico` → `Generar Reporte Consolidado por Tabla`
- Rename file to `ConsolidatedTableUploadSection.tsx` (or keep filename, just update UI text)

### 4. `src/components/processor/ResultsSection.tsx`
- Update `ReportMode.HISTORICAL` references → `ReportMode.CONSOLIDATED_TABLE`

### 5. `src/components/landing/FAQ.tsx`
- Update FAQ text references from "Histórico" to "Consolidado por Tabla"

