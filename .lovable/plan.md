

## Plan: Fix Year Extraction, Clean Naming, and Memory Optimization

### 3 Mandatory Changes

---

### 1. `src/constants/catalogs.ts` — Harden `extractYearFromDateField`

**Problem**: Doesn't handle null/empty input, datetime with time component (`"2026-01-27 19:14:02"`), or bare 4-digit years.

**Fix**: Rewrite to:
- Guard against null/empty → return `'00'`
- Support `YYYY-MM-DD HH:MM:SS` (datetime with time) — extract first 4 chars, return `substring(2,4)`
- Keep existing support for `YYYYMMDD`, `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY`
- Add support for bare `YYYY` (4-digit year)

---

### 2. `src/services/pedimentoService.ts` — Kill `detectedYear` hack

**Problem**: Lines 884-901 detect a single year from file 501 and use it globally at line 1436 as `detectedYear % 100` for all unknown file types. This is wrong — each row must extract its own year.

**Fix**:
- **Delete** lines 884-902 (the `detectedYear` detection block and log)
- **Replace** legacy fallback (lines 1424-1443): Instead of `detectedYear % 100`, scan each row's fields for a date pattern and call `extractYearFromDateField` on the first match. Logic:
  ```typescript
  let yy = '00';
  for (const field of row) {
    const candidate = field.trim();
    if (candidate.length >= 8 && /^\d{4}/.test(candidate)) {
      yy = extractYearFromDateField(candidate);
      if (yy !== '00') break;
    }
    // Also check DD/MM/YYYY pattern
    if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(candidate)) {
      yy = extractYearFromDateField(candidate);
      if (yy !== '00') break;
    }
  }
  const pedimento = buildPedimentoUnificado(patente, indice, seccion, yy);
  ```

---

### 3. `src/services/fileService.ts` + `src/constants/dataStage.ts` — Clean Naming + Memory

#### 3a. Add `CLEAN_FILE_NAMES` map to `src/constants/dataStage.ts`

Short, pure names — no prefixes like "Historico_" or "Data Stage":
```
'501': '501_DatosGenerales'
'502': '502_Transporte'
'503': '503_Guias'
'504': '504_Contenedores'
'505': '505_Facturas'
'506': '506_Fechas'
'507': '507_Casos'
'508': '508_CtasAduaneras'
'509': '509_Tasas'
'510': '510_Contribuciones'
'511': '511_Observaciones'
'512': '512_Descargos'
'520': '520_Destinatarios'
'551': '551_Partidas'
'552': '552_Mercancias'
'553': '553_Permisos'
'554': '554_CasosPartida'
'555': '555_CtasPartida'
'556': '556_TasasPartida'
'557': '557_ContribPartida'
'558': '558_ObsPartida'
'701': '701_Rectificaciones'
'702': '702_DifContrib'
'Inci': 'Inci_Incidencias'
'Sel': 'Sel_Seleccion'
'Resumen': 'Resumen'
```

#### 3b. Use `CLEAN_FILE_NAMES` everywhere in `src/services/fileService.ts`

- **Sheet names** (line 325-326 and 382-383): Replace `FILE_NAMES[section]` with `CLEAN_FILE_NAMES[section]`
- **Individual file names** (line 387): `${CLEAN_FILE_NAMES[section] || section}.xlsx` instead of `Reporte_${section}.xlsx`
- **Consolidated file name** (lines 334-339): `Data_Stage_${title}_${year}.xlsx` for monthly, `Data_Stage_Historico.xlsx` for historical (no zip name)
- **Individual ZIP name** (lines 393-396): `Data_Stage_Individual_${title}_${year}.zip`

#### 3c. Memory optimization in `processHistoricalData` (lines 210-274)

Refactor to process-and-merge in one loop instead of storing all data first:
- Remove `allMonthlyData` array
- For each ZIP: process → enrich → merge directly into `consolidated` → discard per-ZIP data
- Track years/months separately for sorting and year range calculation

---

### Files Modified

| File | Change |
|------|--------|
| `src/constants/catalogs.ts` | Harden `extractYearFromDateField` (null guard, datetime+time, bare year) |
| `src/services/pedimentoService.ts` | Delete `detectedYear` hack; per-row year extraction in legacy fallback |
| `src/constants/dataStage.ts` | Add `CLEAN_FILE_NAMES` map |
| `src/services/fileService.ts` | Use `CLEAN_FILE_NAMES` for all output naming; memory-optimized historical processing |

