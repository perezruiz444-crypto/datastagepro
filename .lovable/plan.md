

## Plan: Eliminar bloqueo por detección de año

Dado que la refactorización ya extrae Mes y Año **por fila** desde la fecha de pago real en los datos, la detección previa del año ya no es necesaria como requisito para generar reportes.

### Cambios

#### 1. `src/components/processor/AnnualUploadSection.tsx`
- Cambiar `onProcess: (detectedYear: number) => void` a `onProcess: () => void`
- Eliminar `disabled={... || !detectedYear}` del botón — solo mantener `disabled={uploadedFilesCount === 0}`
- Mantener la detección de año como **informativa** (badge) pero no bloqueante
- Eliminar el mensaje de error "No se pudo detectar el año"

#### 2. `src/pages/Processor.tsx`
- Cambiar `handleAnnualProcess` para no requerir `detectedYear` como parámetro
- Usar un título genérico como `"Anual"` o derivar el año del resultado procesado

#### 3. `src/components/processor/UploadSection.tsx` (mensual)
- Eliminar la condición `finalYear` de `canContinue` — solo requerir `selectedFile` y `finalMonth`
- Eliminar el fallback manual de año
- Mantener detección de mes como requisito (ya que se usa para el título del reporte)

