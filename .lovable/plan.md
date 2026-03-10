

## Plan: Refactorización Estricta del Data Stage (SAAI M3)

Este es un refactorización mayor que afecta 2 archivos principales: `src/services/pedimentoService.ts` y `src/constants/dataStage.ts`, con ajustes menores en `src/services/fileService.ts` y `src/constants/catalogs.ts`.

---

### Problemas Identificados vs Reglas Solicitadas

| # | Problema Actual | Corrección |
|---|----------------|------------|
| 1 | **Año/Mes no se extraen por fila** — en modo anual/histórico se usa `detectPeriodFromZipFile` (muestreo) y fallback a `new Date().getFullYear()` (2026) | Extraer Año y Mes **de la fecha de pago real de cada fila** dentro del transform |
| 2 | **Faltan columnas clave al inicio** — las tablas empiezan con `Pedimento` (unificado) pero no incluyen `Patente`, `Pedimento` (crudo 7 dígitos), `SeccionAduanera`, `Mes`, `Año` por separado | Agregar 5 columnas iniciales: `Mes`, `Año`, `Patente`, `Pedimento` (crudo), `SeccionAduanera` a TODAS las tablas (excepto Resumen) |
| 3 | **501: RFC (idx 7) y CURP Contribuyente (idx 6) omitidos** | Restaurar `CurpContribuyente` (idx 6) y `RFC` (idx 7) como columnas individuales |
| 4 | **501 y 520: Domicilio concatenado en 1 campo** | Separar en: `Calle`, `NumInterior`, `NumExterior`, `CodigoPostal`, `Municipio`, `EntidadFederativa`, `Pais` |
| 5 | **Catálogos traducidos** — `TIPO_OPERACION["1"]` → `"Importación"`, `MEDIO_TRANSPORTE`, `DESTINO_MERCANCIA`, `TIPO_GUIA`, `TIPO_FECHA` | Eliminar TODAS las traducciones. Dejar valores crudos del .asc |
| 6 | **Fechas formateadas** — `formatDateYYYYMMDD` convierte `20181009` → `09/10/2018` | Dejar fechas en formato crudo del .asc (sin formatear) |
| 7 | **Headers estilo oración** — `"Peso bruto de la mercancía"` | Renombrar a estilo DB: `PesoBrutoMercancia`, `TotalFletes`, `TipoCambio`, etc. |
| 8 | **Columnas duplicadas innecesarias** — ej. 509 tiene `get(3)` 3 veces para "Clave", "Contribución", "Descripción" | Eliminar duplicados. Una columna por campo real del .asc |

---

### Arquitectura de la Solución

#### Función helper: `extractMesAnioFromFecha`

```typescript
// Extrae Mes (nombre) y Año (4 dígitos) de un string de fecha
// Soporta: YYYYMMDD, YYYY-MM-DD, DD/MM/YYYY
const extractMesAnioFromFecha = (fecha: string): { mes: string; anio: string } => { ... }
```

#### Estructura de columnas para TODAS las tablas (excepto Resumen)

Las primeras 5 columnas de cada tabla serán siempre:

```text
Mes | Anio | Patente | Pedimento | SeccionAduanera | PedimentoUnificado | ...campos específicos...
```

- `Mes`: nombre del mes extraído de FechaPago de ESA fila (ej. "Octubre")
- `Anio`: año real de ESA fila (ej. "2018")
- `Patente`: idx 0 crudo (ej. "3010")
- `Pedimento`: idx 1 crudo de 7 dígitos (ej. "8002648")
- `SeccionAduanera`: idx 2 crudo
- `PedimentoUnificado`: se mantiene calculado (AA-AAA-AAAA-AAAAAAA)

---

### Archivos a Modificar

#### 1. `src/constants/dataStage.ts` — Redefinir COLUMN_HEADERS

Reescribir TODOS los arrays de `COLUMN_HEADERS` con:
- 6 columnas iniciales fijas (Mes, Anio, Patente, Pedimento, SeccionAduanera, PedimentoUnificado)
- Nombres estilo DB (CamelCase sin espacios)
- Sin columnas de "Descripción" duplicadas
- 501: agregar RFC, CurpContribuyente, y separar domicilio en 7 columnas
- 520: separar domicilio en columnas individuales
- 505: separar dirección proveedor en columnas individuales

Ejemplo tabla 501 (antes 31 cols → ahora ~40 cols):
```text
Mes, Anio, Patente, Pedimento, SeccionAduanera, PedimentoUnificado,
TipoOperacion, Clave, TipoPedimento, FechaRecepcion, FechaPago,
CurpContribuyente, RFC, CurpAgente, TipoCambio, Fletes, Seguros,
Embalajes, OtrosIncrementales, OtrosDeducibles, PesoBrutoMercancia,
MedioTransporteSalida, MedioTransporteArribo, MedioTransporteEntradaSalida,
DestinoMercancia, SeccionAduaneraEntrada, NombreContribuyente,
Calle, NumInterior, NumExterior, CodigoPostal, Municipio, EntidadFederativa, Pais,
TransporteDecrementables, SeguroDecrementables, CargaDecrementables,
DescargaDecrementables, OtrosDecrementables
```

#### 2. `src/services/pedimentoService.ts` — Reescribir transforms

**Cada función `transformXXXRow`** se modifica para:
1. Calcular `mes` y `anio` de la fecha de pago de esa fila
2. Emitir `Patente` (idx 0), `Pedimento` crudo (idx 1), `SeccionAduanera` (idx 2) como columnas individuales
3. Emitir `PedimentoUnificado` calculado
4. NO traducir catálogos (eliminar imports de `TIPO_OPERACION`, `MEDIO_TRANSPORTE`, etc.)
5. NO formatear fechas (eliminar uso de `formatDateYYYYMMDD`)
6. NO concatenar direcciones (emitir cada campo por separado)
7. 501: restaurar `get(6)` (CURP Contribuyente) y `get(7)` (RFC)

**Context501**: se simplifica — ahora pasa valores crudos sin traducción.

#### 3. `src/constants/catalogs.ts` — Limpieza

Eliminar las constantes de traducción que ya no se usan: `TIPO_OPERACION`, `TIPO_PEDIMENTO`, `MEDIO_TRANSPORTE`, `DESTINO_MERCANCIA`, `TIPO_GUIA`, `TIPO_FECHA`. Mantener solo `formatDateYYYYMMDD` y `extractYearFromDateField` como utilidades (por si se necesitan en el futuro), pero dejar de invocarlas en los transforms.

#### 4. `src/services/fileService.ts` — Ajustes menores

- `consolidateAnnualData`: Ya no necesita inyectar columna "Mes" — viene incluida en cada fila. Eliminar `header.splice(1, 0, 'Mes')` y el `row.splice(1, 0, month)`.
- `processHistoricalData`: Ya no necesita inyectar "Año" ni "Mes" — vienen en cada fila. Eliminar `header.splice(1, 0, 'Año', 'Mes')` y `r.splice(1, 0, ...)`. Eliminar fallback `new Date().getFullYear()`.

---

### Impacto en UI

- `ResultsSection.tsx`: Sin cambios necesarios — consume `ProcessedData` genéricamente
- Las tablas en el Excel tendrán más columnas pero estructura más limpia
- Los KPIs se recalcularán automáticamente desde los nuevos índices

### Riesgo

Este es un cambio breaking: los reportes generados serán estructuralmente diferentes. Los clientes que dependan de posiciones de columna específicas necesitarán ajustar sus procesos downstream.

