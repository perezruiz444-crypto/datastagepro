

## Plan: Fix Monthly Report File Naming

### Problem
For monthly reports, `reportTitle` is set to `"Enero 2026"` (month + year). The export filename is built as:
```
Data_Stage_${title}_${year}.xlsx
```
This produces **`Data_Stage_Enero_2026_2026.xlsx`** — the year is duplicated.

### Fix

**`src/services/fileService.ts`** (line 327-329):

Change the monthly filename to use the title directly (which already contains month + year), producing a clean name like `Data_Stage_Enero_2026.xlsx`:

```typescript
if (reportMode === ReportMode.MONTHLY) {
  fileName = `Data_Stage_${title.replace(/\s/g, '_')}.xlsx`;
}
```

Same fix for `generateIndividualExcelFiles` ZIP name — remove the redundant `_${year}` suffix for monthly mode.

**`src/components/processor/ResultsSection.tsx`** (line 35):

Set the default `customFileName` input to show a cleaner suggestion. Currently it mirrors `reportTitle` raw (e.g. "Enero 2026"). Improve to prefix it:

```typescript
const [customFileName, setCustomFileName] = useState(`Data_Stage_${reportTitle.replace(/\s/g, '_')}`);
```

This way the user sees `Data_Stage_Enero_2026` in the input field and the final `.xlsx` extension is appended automatically.

### Files Modified
| File | Change |
|------|--------|
| `src/services/fileService.ts` | Remove redundant `_${year}` from monthly filename; keep historical as `Data_Stage_Historico.xlsx` |
| `src/components/processor/ResultsSection.tsx` | Improve default `customFileName` to show clean suggested name |

