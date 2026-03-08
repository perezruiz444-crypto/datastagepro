

# Plan: Auto-detectar periodo en Mensual y eliminar selectores de fecha

## Cambios

### 1. `src/components/processor/UploadSection.tsx`
- Eliminar props `selectedMonth`, `selectedYear`, `onMonthChange`, `onYearChange`
- Eliminar la sección completa de "Periodo del Reporte" (selectores de mes y año)
- Mantener la auto-detección con `detectPeriodFromZipFile` al cargar archivo
- Guardar mes/año detectados en estado local del componente
- Mostrar el periodo detectado como badge junto al nombre del archivo (ej. "Enero 2025 - Detectado automáticamente")
- Cambiar la firma de `onFileSelect` a `onFileSelect(file: File, month: string, year: number)` para pasar el periodo detectado al padre

### 2. `src/pages/Processor.tsx`
- Actualizar `handleMonthlyFileSelect` para recibir `(file, month, year)` en lugar de usar `selectedMonth`/`selectedYear`
- Generar `reportTitle` con el mes y año detectados del archivo: `${month} ${year}`
- Eliminar `selectedMonth`/`setSelectedMonth` del estado (ya no se usa en mensual; verificar si anual aún lo necesita — no lo usa, solo usa `selectedYear`)
- Limpiar props pasados a `UploadSection`

### 3. Limpieza
- Eliminar import de `MONTH_NAMES` en UploadSection si ya no se usa
- Eliminar imports de `Select` components en UploadSection

