

# Plan: Auto-detectar año en Anual y alertar meses faltantes

## Cambios

### 1. `src/components/processor/AnnualUploadSection.tsx`
- Eliminar el selector manual de "Año del Reporte" y los props `selectedYear`/`onYearChange`
- Al detectar el periodo de cada ZIP, extraer también el año con `detectPeriodFromZipFile`
- Guardar el año detectado en estado local (usar el año más frecuente entre los archivos subidos)
- Mostrar el año detectado como badge/label informativo
- Después de subir archivos, mostrar alerta amarilla si faltan meses (ej. "Faltan: Marzo, Julio, Noviembre") y alerta verde si están los 12 completos
- Cambiar `onProcess` para pasar también el año detectado: `onProcess(detectedYear: number)`

### 2. `src/pages/Processor.tsx`
- Eliminar `selectedYear`/`setSelectedYear` del estado
- Actualizar `handleAnnualProcess` para recibir el año detectado como parámetro
- Generar `reportTitle` con el año detectado: `Anual ${detectedYear}`
- Limpiar props pasados a `AnnualUploadSection`

