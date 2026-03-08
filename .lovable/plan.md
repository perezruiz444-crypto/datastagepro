

# Plan: Integrar Procesador Data Stage completo + Documento oficial de referencia

Ya tengo **toda la información necesaria** para la integración completa. Analicé el documento PDF oficial de la ANAM (Agencia Nacional de Aduanas de México) que describe los 24+ tipos de archivos Data Stage (501-702), sus campos, tipos de datos y relaciones entre tablas. Este documento valida que el procesador original maneja correctamente la estructura de archivos.

## Hallazgo clave del documento PDF

El documento confirma la estructura de archivos .asc separados por pipes `|` con archivos a **nivel pedimento** (501-520, 701-702) y a **nivel partida** (551-558). Las tablas base son 501 (Datos Generales) y 551 (Partidas), que coincide con los `CRITICAL_FILES` del código. Usaré esta info para mejorar las descripciones en la app y los nombres de archivos en `constants.ts`.

## Correcciones basadas en el documento oficial

Los nombres en `constants.ts` no coinciden exactamente con el documento oficial. Actualizaré:

| Archivo | Nombre actual (código) | Nombre oficial (PDF) |
|---------|----------------------|---------------------|
| 501 | Pedimentos | Datos generales |
| 502 | Transporte | Transporte de las mercancías |
| 503 | Agentes Aduanales | Guías |
| 504 | Contribuciones | Contenedores |
| 505 | Facturas | Facturas (correcto) |
| 506 | Documentos de transporte | Fechas del pedimento |
| 507 | Destinos | Casos del pedimento |
| 508 | Orígenes | Cuentas aduaneras de garantía |
| 509 | Sectores | Tasas del pedimento |
| 510 | Régimen | Contribuciones del pedimento |
| 511 | Destinatarios | Observaciones del pedimento |
| 512 | Remitentes | Descargos de mercancías |
| 520 | (falta) | Destinatarios de la mercancía |
| 551 | Partidas (correcto) | Partidas |
| 552 | Fracciones | Mercancías |
| 553 | Unidades | Permisos de la partida |
| 554 | Marcas | Casos de la partida |
| 555 | Embalajes | Cuentas aduaneras de garantía (partida) |
| 556 | (falta) | Tasas de contribuciones (partida) |
| 557 | (falta) | Contribuciones de la partida |
| 558 | Observaciones (correcto) | Observaciones de la partida |
| 701 | Rectificaciones (correcto) | Rectificaciones |
| 702 | Diferencias de contribuciones (correcto) | Diferencias de contribuciones |

## Implementación (10 archivos nuevos + 4 modificados)

### 1. Instalar dependencias
- `jszip` y `xlsx`

### 2. Crear archivos base
- **`src/types/dataStage.ts`** -- Enums y tipos (AppState, ReportMode, ExportFormat, ProgressState, ProcessedData)
- **`src/constants/dataStage.ts`** -- FILE_NAMES corregidos con nombres oficiales del documento, CRITICAL_FILES, MONTH_NAMES

### 3. Crear servicio
- **`src/services/fileService.ts`** -- Portar toda la lógica, reemplazando `declare const JSZip/XLSX` con imports npm

### 4. Crear componentes del procesador (`src/components/processor/`)
- **`UploadSection.tsx`** -- Drag & drop para .zip mensual
- **`ProcessingSection.tsx`** -- Progreso y logs
- **`ResultsSection.tsx`** -- Preview de datos, KPIs, descarga
- **`AnnualUploadSection.tsx`** -- 12 meses para reporte anual
- **`HistoricalUploadSection.tsx`** -- Carga por tipo de archivo
- **`MultiYearUploadSection.tsx`** -- Múltiples Excel
- **`ProcessorHeader.tsx`** -- Header con link a landing

Todos portados a Shadcn UI + Tailwind + Lucide React (sin Font Awesome).

### 5. Crear página principal
- **`src/pages/Processor.tsx`** -- State machine completa con tabs (Mensual/Anual/Histórico/Multi-Anual)

### 6. Actualizar existentes
- **`src/App.tsx`** -- Agregar ruta `/app`
- **`src/components/landing/Hero.tsx`** -- Botón apunta a `/app`
- **`src/components/landing/CTASection.tsx`** -- Botón apunta a `/app`
- **`src/components/landing/FAQ.tsx`** -- Actualizar respuestas que mencionan Google AI Studio

### Nota sobre el chatbot AI
Se omite por ahora (requiere API key de Google GenAI). Se puede agregar después.

