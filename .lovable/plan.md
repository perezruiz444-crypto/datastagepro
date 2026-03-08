

# Fix: Duplicate Column Headers in Export

## Problem
The `.asc` files inside the ZIP already contain a header row as their first line (e.g., "Patente|Pedimento|SeccionAduanera|TipoOperacion..."). The enrichment function `enrichWithPedimentoUnificado` then adds the official SAAI M3 headers as a new first row, resulting in two header rows in the output.

## Solution

In `src/services/pedimentoService.ts`, inside `enrichWithPedimentoUnificado`:

- Before processing rows, detect if the first row is a header (check if columns 0-2 contain non-numeric values — real data rows have numeric patente/indice/seccion)
- If the first row is detected as a header, skip it (start data processing from row index 1)
- The official `COLUMN_HEADERS` row replaces the raw header

## Files to modify

| File | Change |
|------|--------|
| `src/services/pedimentoService.ts` | Add header detection logic before the row loop — skip first row if it contains non-numeric patente/indice/seccion fields |

Single, focused change — no other files affected.

