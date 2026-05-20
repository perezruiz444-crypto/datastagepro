# Plan: Restaurar contenido de las pestañas Mensual y Anual

## Problema

En `src/pages/Processor.tsx`, el `TabsList` declara 4 pestañas (Mensual, Anual, Histórico, Multi-Año), pero solo existen `TabsContent` para Histórico y Multi-Año. Al seleccionar Mensual o Anual no se renderiza nada — la UI aparece vacía.

## Cambios

### `src/pages/Processor.tsx`
Agregar los `TabsContent` faltantes dentro del `<Tabs>`:

- `TabsContent` para `ReportMode.MONTHLY` → renderiza `<UploadSection onFileSelect={handleMonthlyFileSelect} />`
- `TabsContent` para `ReportMode.ANNUAL` → renderiza `<AnnualUploadSection annualFiles={annualFiles} setAnnualFiles={setAnnualFiles} onProcess={handleAnnualProcess} />`

Mantener intactos los contenidos existentes de Histórico y Multi-Año.

## Verificación

Revisar las firmas reales de `UploadSection` y `AnnualUploadSection` antes de implementar, para pasar los props correctos.
