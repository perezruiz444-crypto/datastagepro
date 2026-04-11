

## Plan: Eliminar módulo "Consolidado por Tabla"

### Cambios

1. **`src/types/dataStage.ts`** — Eliminar `CONSOLIDATED_TABLE` del enum `ReportMode`

2. **`src/pages/Processor.tsx`** — Eliminar import de `ConsolidatedTableUploadSection`, eliminar función `handleConsolidatedTableProcess`, cambiar grid de tabs de 4 a 3 columnas, eliminar tab trigger y content del consolidado

3. **`src/components/processor/ResultsSection.tsx`** — Simplificar `hasHeaders` a siempre `true`, eliminar condicional `reportMode !== ReportMode.CONSOLIDATED_TABLE` del botón ZIP

4. **Eliminar archivo** `src/components/processor/ConsolidatedTableUploadSection.tsx`

