# Contexto: Data Stage SAT — Comercio Exterior México

Este proyecto trabaja con archivos Data Stage SAT del SAT de México
(solicitudes de información aduanal). Hay dos scripts disponibles en este directorio:

- `convert_script.py` — Un solo zip → un Excel mensual
- `consolidar.py`     — Dos o más zips → un Excel multi-mes consolidado

---

## Dominio

Los archivos Data Stage son solicitudes de información aduanal del SAT de México.
Cada zip contiene ~26 archivos `.asc` con registros de pedimentos, separados por
pipe (`|`), codificación `latin-1`, terminaciones de línea Windows (`\r\n`).

**Tipos de archivo .asc** (patrón: `{folio}_{tipo}.asc`):
`501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 520,`
`551, 552, 553, 554, 555, 556, 557, 558, 701, 702, Inci, Resumen, Sel`

Hojas vacías (solo header, sin datos) son normales: `508`, `552`, `555` suelen estarlo.

---

## Columna A: Pedimento_Unificado

En **todas las hojas** de cualquier Excel generado, la columna A debe ser
`Pedimento_Unificado` con el formato:

```
AA-AAA-PPPP-PPPPPPP
```

| Segmento | Campo fuente    | Long | Ejemplo    |
|----------|-----------------|------|------------|
| AA       | Año (2 dígitos) | 2    | `26`       |
| AAA      | SeccionAduanera | 3    | `640`      |
| PPPP     | Patente         | 4    | `1690`     |
| PPPPPPP  | Pedimento       | 7    | `6001103`  |

Ejemplo: `26-640-1690-6001103`

El año se lee de `Fecha_Inicial` en `{folio}_Resumen.asc`.
Las columnas originales del `.asc` quedan a partir de la columna B. No se modifica ningún dato original.

---

## Bugs conocidos — leer antes de escribir cualquier código nuevo

### Bug 1: Pipe final → columna fantasma
Cada línea termina en `|`, lo que genera una columna extra vacía (`Unnamed`).
```python
df = df.loc[:, ~df.columns.str.startswith('Unnamed')]
```

### Bug 2: Pandas toma Patente como índice → desfase de columnas
Siempre leer con `index_col=False` y escribir con `df.values` (nunca `itertuples`):
```python
df = pd.read_csv(path, sep='|', dtype=str, encoding='latin-1', index_col=False)
```

### Bug 3: Zip anidado (archivos generados en macOS)
Buscar `.asc` recursivamente ignorando la carpeta `__MACOSX`.

### Bug 4: Campo Anio con 4 dígitos
El campo puede venir como `2026`. Tomar solo los últimos 2:
```python
s.str[-2:]
```

### Bug 5: Campos con ".0" por pandas
Limpiar antes de aplicar zfill:
```python
s.str.replace(r'\.0$', '', regex=True)
```

---

## Script 1: Un solo zip → Excel mensual

**Archivo:** `convert_script.py`

**Uso:**
```bash
python convert_script.py <directorio_con_asc> <salida.xlsx>
# Si el zip todavía no está descomprimido:
unzip folio_Solicitudes.zip -d ./tmp_asc/
python convert_script.py ./tmp_asc/ 1875724_Solicitudes.xlsx
```

**Flujo interno:**
1. Detecta el directorio con los `.asc` (maneja zips anidados y carpetas `__MACOSX`)
2. Lee `{folio}_Resumen.asc` para extraer el año (2 dígitos) de `Fecha_Inicial`
3. Por cada `.asc`: lee con `index_col=False`, elimina columna fantasma, construye `Pedimento_Unificado`
4. Escribe una hoja por `.asc`, columna A = `Pedimento_Unificado`, filtros automáticos
5. Llama a `verify_output()` — debe mostrar `✅ Verificación OK`

**Nombre de salida sugerido:** `{folio}_Solicitudes.xlsx`

---

## Script 2: Múltiples zips → Excel consolidado multi-mes

**Archivo:** `consolidar.py`

**Uso:**
```bash
python consolidar.py <salida.xlsx> <zip1> <zip2> [<zip3> ...]
# Ejemplo con 4 meses:
python consolidar.py RFC_2026_ENE-MAY_Solicitudes.xlsx \
    1834331_solicitudes.zip \
    1865168_Solicitudes.zip \
    1875890_Solicitudes.zip \
    1896625_Solicitudes.zip
```

**Comportamiento:**
- Acepta los zips directamente (no hace falta descomprimirlos antes)
- Cada hoja del Excel resultante contiene los datos de **todos los meses apilados** en orden cronológico
- La columna `Pedimento_Unificado` usa el año correcto por fila (cada mes puede tener su propio año)
- Hojas vacías conservan el header y los filtros aunque no tengan datos
- Al final llama a `verify_output()` — debe mostrar `✅ Verificación OK`

**Nombre de salida sugerido:** `{RFC}_{año}_{mes_inicio}-{mes_fin}_Solicitudes.xlsx`
Ejemplo: `TMM120927FL0_2026_ENE-MAY_Solicitudes.xlsx`

---

## Verificación de integridad

Ambos scripts verifican automáticamente al finalizar. Para verificar manualmente:

```python
from openpyxl import load_workbook
import re

wb = load_workbook('output.xlsx')
pattern = re.compile(r'^\d{2}-\d{3}-\d{4}-\d{7}$')

for sheet in wb.sheetnames:
    ws = wb[sheet]
    if ws.max_row < 2:
        continue
    a1 = ws['A1'].value
    a2 = str(ws['A2'].value or '').strip()
    ok = a1 == 'Pedimento_Unificado' and pattern.match(a2)
    print(f"{'✅' if ok else '❌'} {sheet}: A1={a1} | A2={a2}")
```

---

## Dependencias

```bash
pip install pandas openpyxl
```

---

## Notas de dominio

- `dtype=str` es obligatorio en todo `read_csv` para preservar ceros a la izquierda
- El folio es el número al inicio del nombre de cada `.asc` (ej. `1875724` en `1875724_501.asc`)
- Los archivos `.msg` / `.eml` que acompañan los zips son los correos de entrega del SAT — no contienen datos aduanales procesables
- El Excel adicional que a veces viene en el zip del SAT (`Data stage RFC YYYY.xlsx`) es un resumen pre-procesado por el SAT, distinto a los `.asc`
