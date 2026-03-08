

# Plan: Nombre de archivo personalizable + Auto-detección de periodo + Sección de Reviews

## 1. Nombre de archivo de salida personalizable

**Dónde:** `ResultsSection.tsx`

Agregar un campo de texto editable arriba de los botones de descarga donde el usuario pueda cambiar el nombre del archivo de salida. Se pre-llena con el nombre generado automáticamente (ej. "Data Stage Enero 2025"). Las funciones `generateSeparateSheetsExcelReport` y `generateIndividualExcelFiles` ya reciben `title` — solo hay que exponer ese valor como editable.

**Cambios:**
- `ResultsSection.tsx`: Agregar `Input` con estado local `customFileName`, pre-llenado con `reportTitle`. Pasar a las funciones de exportación.
- `fileService.ts`: Usar el nombre personalizado si se proporciona.

## 2. Auto-detección de mes y año del ZIP

**Dónde:** `UploadSection.tsx` + `fileService.ts`

Ya existe `detectMonthFromZipFile` que detecta el mes. Extender para detectar también el año (buscar campos de fecha YYYYMMDD y extraer los primeros 4 dígitos). Al seleccionar un archivo ZIP:

- Ejecutar detección automática
- Si detecta mes/año, actualizar los selectores automáticamente
- Mostrar un badge "Detectado automáticamente" junto a los selectores

**Cambios:**
- `fileService.ts`: Nueva función `detectYearFromZipFile` o extender `detectMonthFromZipFile` para retornar `{ month, year }`.
- `UploadSection.tsx`: Al seleccionar archivo, llamar a la detección y actualizar `selectedMonth`/`selectedYear` vía callbacks.

## 3. Sección de Reviews / Encuesta de opinión

**Backend:** Nueva tabla `reviews` en la base de datos con campos: `id`, `user_id` (nullable para anónimos), `rating` (1-5 estrellas), `comment`, `created_at`. RLS: todos pueden insertar, solo los propios pueden ver/editar.

**Frontend:**
- Nuevo componente `src/components/landing/Reviews.tsx` con:
  - Formulario: rating con estrellas clicables + textarea para comentario
  - Lista de reviews recientes (públicas)
  - Promedio de rating como KPI
- Agregar a `Index.tsx` entre FAQ y CTA

**Cambios:**
- Migración SQL: crear tabla `reviews` con RLS
- `src/components/landing/Reviews.tsx`: Nuevo componente
- `src/pages/Index.tsx`: Importar y agregar Reviews

## Archivos a crear/modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/processor/ResultsSection.tsx` | Campo editable para nombre de archivo |
| `src/services/fileService.ts` | Extender detección a mes+año, aceptar nombre custom |
| `src/components/processor/UploadSection.tsx` | Auto-detectar periodo al seleccionar ZIP |
| `src/components/landing/Reviews.tsx` | Nuevo: sección de reviews con estrellas y comentarios |
| `src/pages/Index.tsx` | Agregar sección Reviews |
| Migración SQL | Tabla `reviews` con RLS |

