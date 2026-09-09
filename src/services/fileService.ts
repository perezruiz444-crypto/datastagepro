import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { ProgressState, ProcessedData, ReportMode, ExportFormat } from '@/types/dataStage';
import { FILE_NAMES, CRITICAL_FILES, MONTH_NAMES, COLUMN_HEADERS, generateFallbackHeaders, CLEAN_FILE_NAMES } from '@/constants/dataStage';
import { enrichWithPedimentoUnificado, validateProcessedData } from '@/services/pedimentoService';

export { enrichWithPedimentoUnificado, validateProcessedData };

const isValidAscEntry = (name: string): boolean => {
  if (!name.toLowerCase().endsWith('.asc')) return false;
  if (name.includes('__MACOSX/')) return false;
  const basename = name.split('/').pop() ?? '';
  if (basename.startsWith('._')) return false;
  return true;
};

/** Encoding adaptativo: UTF-8 estricto primero, ISO-8859-1 como fallback. */
const decodeBytes = (bytes: Uint8Array): string => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('iso-8859-1').decode(bytes);
  }
};

/** Junta fracciones partidas en 551/552 (ej. "12345678" + "99" → "1234567899"). */
const applyGlobalFractionRule = (fileNumber: string, parts: string[]): string[] => {
  if (fileNumber !== '551' && fileNumber !== '552') return parts;
  const result = [...parts];
  let fraccionIdx = -1;
  const commonIndices = [4, 5, 6, 7, 8, 9];
  for (const idx of commonIndices) {
    if (result[idx] && /^\d{8}$/.test(result[idx])) {
      fraccionIdx = idx;
      break;
    }
  }
  if (fraccionIdx === -1) {
    fraccionIdx = result.findIndex(p => /^\d{8}$/.test(p));
  }
  if (fraccionIdx !== -1) {
    if (result[fraccionIdx + 1] && /^\d{2}$/.test(result[fraccionIdx + 1])) {
      result[fraccionIdx] = result[fraccionIdx] + result[fraccionIdx + 1];
      result[fraccionIdx + 1] = '';
    } else {
      for (let k = result.length - 1; k > fraccionIdx; k--) {
        if (/^\d{2}$/.test(result[k])) {
          result[fraccionIdx] = result[fraccionIdx] + result[k];
          result[k] = '';
          break;
        }
      }
    }
  }
  return result;
};

/** Fuerza formato texto '@' a celdas con dígitos puros o ceros a la izquierda
 *  (fracciones, patentes, identificadores). Evita que Excel ampute ceros. */
const applyTextFormatToSheet = (ws: any) => {
  Object.keys(ws).forEach(key => {
    if (key.startsWith('!')) return;
    const cell = ws[key];
    if (cell && cell.t === 's' && typeof cell.v === 'string') {
      if (/^\d+$/.test(cell.v) || cell.v.startsWith('0')) {
        cell.z = '@';
      }
    }
  });
};

// ===========================
// FECHAS: detección por contenido y conversión a fecha real de Excel
// ===========================

/** Convierte un string de fecha (varios formatos del dominio) a Date (sin hora), o null si no matchea. */
export const parseDateOnly = (value: string): Date | null => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;

  // YYYYMMDD puro (8 dígitos)
  if (/^\d{8}$/.test(trimmed)) {
    const yyyy = parseInt(trimmed.substring(0, 4), 10);
    const mm = parseInt(trimmed.substring(4, 6), 10);
    const dd = parseInt(trimmed.substring(6, 8), 10);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return new Date(yyyy, mm - 1, dd);
    return null;
  }

  // YYYY-MM-DD, con o sin hora (ej. "2026-01-05 17:40:22")
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]\d{2}:\d{2}:\d{2})?$/);
  if (isoMatch) {
    const yyyy = parseInt(isoMatch[1], 10);
    const mm = parseInt(isoMatch[2], 10);
    const dd = parseInt(isoMatch[3], 10);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return new Date(yyyy, mm - 1, dd);
    return null;
  }

  // DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const dd = parseInt(dmyMatch[1], 10);
    const mm = parseInt(dmyMatch[2], 10);
    const yyyy = parseInt(dmyMatch[3], 10);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return new Date(yyyy, mm - 1, dd);
    return null;
  }

  return null;
};

/** Detecta qué columnas (por índice) son de fecha: ≥90% de valores no vacíos matchean un patrón de fecha.
 *  Por contenido, no por nombre — así "TipoFecha" (código numérico) no se confunde con una fecha real. */
export const detectDateColumns = (rows: string[][]): Set<number> => {
  const dateCols = new Set<number>();
  if (rows.length < 2) return dateCols;
  const numCols = rows[0].length;

  for (let col = 0; col < numCols; col++) {
    let nonEmpty = 0;
    let matches = 0;
    for (let r = 1; r < rows.length; r++) {
      const raw = (rows[r][col] ?? '').trim();
      if (!raw) continue;
      nonEmpty++;
      if (parseDateOnly(raw) !== null) matches++;
    }
    if (nonEmpty > 0 && matches / nonEmpty >= 0.9) dateCols.add(col);
  }
  return dateCols;
};

/** Aplica fecha real de Excel (sin hora, formato dd/mm/yyyy) a las columnas detectadas como fecha. */
const applyDateFormatToSheet = (ws: XLSX.WorkSheet, headerRow: string[], dateCols: Set<number>) => {
  if (dateCols.size === 0) return;
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:A1');
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    for (const col of dateCols) {
      const addr = XLSX.utils.encode_cell({ r, c: col });
      const cell = ws[addr];
      if (!cell || cell.t !== 's' || typeof cell.v !== 'string') continue;
      const parsed = parseDateOnly(cell.v);
      if (parsed) {
        cell.t = 'd';
        cell.v = parsed;
        cell.z = 'dd/mm/yyyy';
      }
    }
  }
};

/**
 * Empaqueta uno o más archivos .asc sueltos en un .zip en memoria, para reutilizar
 * el mismo pipeline (detección de periodo, processZipFile) sin duplicar lógica.
 */
export const buildZipFromAscFiles = async (files: File[]): Promise<File> => {
  const zip = new JSZip();
  for (const file of files) {
    // JSZip acepta un File/Blob directamente como contenido (lo resuelve internamente),
    // sin necesidad de convertirlo a ArrayBuffer manualmente.
    zip.file(file.name, file);
  }
  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const zipName = files.length === 1
    ? `${files[0].name.replace(/\.asc$/i, '')}.zip`
    : 'archivos_asc.zip';
  return new File([zipBuffer], zipName, { type: 'application/zip' });
};

export const detectPeriodFromZipFile = async (file: File): Promise<{ month: string | null; year: number | null }> => {
  try {
    const zip = await JSZip.loadAsync(file);
    const ascFiles = Object.keys(zip.files).filter(name => isValidAscEntry(name));
    if (ascFiles.length === 0) return { month: null, year: null };

    const file501 = ascFiles.find(name => name.includes('501'));
    const targetFiles = file501 ? [file501, ...ascFiles.filter(f => f !== file501)] : ascFiles;

    const monthCounts: Record<number, number> = {};
    const yearCounts: Record<number, number> = {};

    for (const ascFileName of targetFiles.slice(0, 5)) {
      const content = await zip.file(ascFileName)!.async('string');
      const lines = content.split(/\r?\n/).slice(0, 200);

      lines.forEach(line => {
        const parts = line.split('|');
        parts.forEach(field => {
          const trimmed = field.trim();
          if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
            const yr = parseInt(trimmed.substring(0, 4), 10);
            const mo = parseInt(trimmed.substring(4, 6), 10);
            if (mo >= 1 && mo <= 12 && yr >= 2000 && yr <= 2099) {
              monthCounts[mo] = (monthCounts[mo] || 0) + 1;
              yearCounts[yr] = (yearCounts[yr] || 0) + 1;
            }
          }
          const dateMatch = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
          if (dateMatch) {
            const mo = parseInt(dateMatch[2], 10);
            const yr = parseInt(dateMatch[3], 10);
            if (mo >= 1 && mo <= 12 && yr >= 2000 && yr <= 2099) {
              monthCounts[mo] = (monthCounts[mo] || 0) + 1;
              yearCounts[yr] = (yearCounts[yr] || 0) + 1;
            }
          }
          // YYYY-MM-DD, con o sin hora (ej. "2026-01-05 17:40:22") — formato real de FechaPago/FechaRecepcion
          const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s|$)/);
          if (isoMatch) {
            const yr = parseInt(isoMatch[1], 10);
            const mo = parseInt(isoMatch[2], 10);
            if (mo >= 1 && mo <= 12 && yr >= 2000 && yr <= 2099) {
              monthCounts[mo] = (monthCounts[mo] || 0) + 1;
              yearCounts[yr] = (yearCounts[yr] || 0) + 1;
            }
          }
        });
      });

      const totalCounts = Object.values(monthCounts).reduce((a, b) => a + b, 0);
      if (totalCounts >= 20) break;
    }

    let maxMonthCount = 0, detectedMonth: number | null = null;
    for (const [m, count] of Object.entries(monthCounts)) {
      if (count > maxMonthCount) { maxMonthCount = count; detectedMonth = parseInt(m, 10); }
    }
    let maxYearCount = 0, detectedYear: number | null = null;
    for (const [y, count] of Object.entries(yearCounts)) {
      if (count > maxYearCount) { maxYearCount = count; detectedYear = parseInt(y, 10); }
    }

    return {
      month: detectedMonth !== null ? MONTH_NAMES[detectedMonth - 1] : null,
      year: detectedYear,
    };
  } catch (e) {
    console.error("Error detectando periodo desde contenido:", e);
  }
  return { month: null, year: null };
};

export const processZipFile = async (
  file: File,
  onLog: (message: string) => void,
  onProgress: (progress: ProgressState) => void,
  cancellationSignal: { current: boolean },
  year?: number
): Promise<ProcessedData> => {
  onLog('Iniciando análisis del archivo ZIP...');
  const zip = await JSZip.loadAsync(file);

  const innerZips = Object.keys(zip.files).filter(
    name => !zip.files[name].dir
      && name.toLowerCase().endsWith('.zip')
      && !name.includes('__MACOSX/'),
  );
  if (innerZips.length > 0) {
    throw new Error(
      `Este ZIP contiene ${innerZips.length} ZIP(s) internos (${innerZips.slice(0, 3).map(n => n.split('/').pop()).join(', ')}${innerZips.length > 3 ? '...' : ''}). ` +
      `Extraiga los archivos ZIP internos y súbalos directamente.`,
    );
  }

  const files = Object.keys(zip.files).filter(name => !zip.files[name].dir && isValidAscEntry(name));

  onLog(`Archivos .asc encontrados en el ZIP (${files.length}): ${files.join(', ')}`);

  if (files.length === 0) {
    throw new Error('No se encontraron archivos .asc en el ZIP.');
  }

  const processedData: ProcessedData = {};
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const fileName = files[i];

    if (cancellationSignal.current) {
      onLog('Proceso cancelado por el usuario.');
      throw new Error('Operation cancelled by user.');
    }

    const nameWithoutExtension = fileName.split('.')[0];
    const parts = nameWithoutExtension.split('_');
    const fileNumber = parts[parts.length - 1];

    try {
      onProgress({ total: Math.round((i / totalFiles) * 100), file: 0, fileName });
      onLog(`[${i + 1}/${totalFiles}] Procesando ${fileName}...`);

      const contentAsUint8Array = await zip.file(fileName)!.async('uint8array');
      const content = decodeBytes(contentAsUint8Array);

      if (!content) {
        onLog(`Advertencia: ${fileName} está vacío - Saltando...`);
        continue;
      }

      const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

      if (lines.length > 0 && !lines[0].includes('|')) {
        onLog(`Error de formato: El archivo ${fileName} no parece estar separado por pipes '|'.`);
        continue;
      }
      onProgress({ total: Math.round((i / totalFiles) * 100), file: 50, fileName });

      const rawRows = lines.map(line => line.split('|').map(field => field.trim().replace(/\r/g, '')));
      const maxCols = rawRows.reduce((m, r) => Math.max(m, r.length), 0);
      const uniformRows = rawRows.map(r => {
        while (r.length < maxCols) r.push('');
        return applyGlobalFractionRule(fileNumber, r);
      });

      processedData[fileNumber] = uniformRows;

      onLog(`✅ ${fileName} procesado correctamente con ${lines.length} registros.`);
      onProgress({ total: Math.round(((i + 1) / totalFiles) * 100), file: 100, fileName });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      onLog(`❌ Error procesando ${fileName}: ${errorMessage}`);
      console.error(`Error processing ${fileName}:`, error);
    }
  }

  if (Object.keys(processedData).length === 0 && !cancellationSignal.current) {
    throw new Error('No se pudo procesar ningún archivo .asc correctamente.');
  }

  const missingCritical = CRITICAL_FILES.filter(id => !processedData[id]);
  if (missingCritical.length > 0) {
    onLog(`⚠️ ATENCIÓN: Faltan archivos críticos: ${missingCritical.map(id => `${id} (${FILE_NAMES[id] || 'N/A'})`).join(', ')}`);
  }

  // Extraer año del Resumen.asc como fallback canónico (referencia: CLAUDE.md Data stage)
  let yearFromResumen: string | undefined;
  if (processedData['Resumen'] && processedData['Resumen'].length > 0) {
    const resumenRow = processedData['Resumen'][1] ?? processedData['Resumen'][0];
    for (const field of resumenRow) {
      const trimmed = (field ?? '').trim();
      const m = trimmed.match(/^(\d{4})/);
      if (m) {
        const yr = parseInt(m[1], 10);
        if (yr >= 2000 && yr <= 2099) {
          yearFromResumen = m[1].substring(2, 4);
          break;
        }
      }
    }
    if (yearFromResumen) onLog(`📅 Año del Resumen.asc: 20${yearFromResumen}`);
  }
  if (!yearFromResumen && year) {
    yearFromResumen = String(year).slice(-2);
  }

  onLog('--- Enriqueciendo datos con Pedimento Unificado ---');
  const enrichedData = enrichWithPedimentoUnificado(processedData, onLog, yearFromResumen);
  onLog('--- Validando integridad de datos ---');
  validateProcessedData(enrichedData, onLog);
  return enrichedData;
};

/**
 * Consolidación anual: Mes y Año ya vienen incluidos en cada fila desde el transform.
 * Solo concatena datos de cada mes sin inyectar columnas adicionales.
 */
export const consolidateAnnualData = (
  monthlyData: { month: string; data: ProcessedData }[],
  onLog: (message: string) => void
): ProcessedData => {
  const consolidated: ProcessedData = {};

  const allFileKeys = new Set<string>();
  monthlyData.forEach(({ data }) => {
    Object.keys(data).forEach(key => allFileKeys.add(key));
  });

  onLog(`Iniciando consolidación anual. Tipos de archivos detectados: ${allFileKeys.size}`);

  const sortedMonthlyData = [...monthlyData].sort((a, b) => {
    return MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month);
  });

  sortedMonthlyData.forEach(({ month, data }) => {
    const monthFiles = Object.keys(data);

    const missingCritical = CRITICAL_FILES.filter(id => !monthFiles.includes(id));
    if (missingCritical.length > 0) {
      onLog(`⚠️ Mes ${month}: Faltan archivos CRÍTICOS: ${missingCritical.join(', ')}`);
    }

    Object.entries(data).forEach(([fileKey, records]) => {
      if (!consolidated[fileKey]) {
        consolidated[fileKey] = [];
        if (records.length > 0) {
          // Header row — Mes/Anio already in headers from transform
          consolidated[fileKey].push([...records[0]]);
        }
      }
      // Data rows already contain Mes/Anio from per-row extraction
      const dataRows = records.slice(1);
      consolidated[fileKey].push(...dataRows.map(r => [...r]));
    });
  });

  onLog(`Consolidación finalizada. Total de tipos de archivo: ${Object.keys(consolidated).length}`);
  return consolidated;
};

/**
 * Procesamiento histórico: Mes y Año ya vienen incluidos en cada fila desde el transform.
 * Solo concatena datos de cada ZIP sin inyectar columnas adicionales.
 */
export const processHistoricalData = async (
  files: File[],
  onLog: (msg: string) => void,
  onProgress: (prog: ProgressState) => void,
  cancellationSignal: { current: boolean }
): Promise<{ data: ProcessedData; yearRange: string }> => {
  const consolidated: ProcessedData = {};
  const yearsSet = new Set<number>();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onLog(`--- [${i + 1}/${files.length}] Procesando ZIP: ${file.name} ---`);
    onProgress({ total: Math.round((i / files.length) * 100), file: 0, fileName: file.name });

    const { year } = await detectPeriodFromZipFile(file);
    if (year) {
      yearsSet.add(year);
      onLog(`Año detectado: ${year}`);
    }

    // Process ZIP — Mes/Anio embedded per-row by transform
    const data = await processZipFile(file, onLog, onProgress, cancellationSignal, year || undefined);

    // Merge into consolidated
    Object.entries(data).forEach(([fileKey, records]) => {
      if (!consolidated[fileKey]) {
        consolidated[fileKey] = [];
        if (records.length > 0) {
          consolidated[fileKey].push([...records[0]]);
        }
      }
      const dataRows = records.slice(1);
      consolidated[fileKey].push(...dataRows.map(r => [...r]));
    });

    onLog(`♻️ ZIP ${file.name} procesado y liberado de memoria`);
  }

  const years = Array.from(yearsSet).sort();
  const minYear = years[0] || 0;
  const maxYear = years[years.length - 1] || 0;
  const yearRange = minYear === maxYear ? `${minYear}` : `${minYear}-${maxYear}`;

  onLog(`✅ Histórico generado: ${Object.keys(consolidated).length} tablas, rango ${yearRange}`);
  return { data: consolidated, yearRange };
};

// ===========================
// MERGE: Excel(s) previos + ZIP(s) nuevos con dedup por Pedimento_Unificado
// ===========================

/** Normaliza un nombre de hoja del Excel a la clave canónica (501, 551, Inci, etc.) */
const normalizeSheetNameToFileKey = (sheetName: string): string => {
  const cleaned = sheetName.trim();
  const numMatch = cleaned.match(/^(\d{3})/);
  if (numMatch) return numMatch[1];
  const tokens = ['Inci', 'Sel', 'Resumen'];
  for (const t of tokens) {
    if (cleaned.toLowerCase().includes(t.toLowerCase())) return t;
  }
  return cleaned.split(/[\s_-]/)[0];
};

/** Detecta el índice de la columna Pedimento_Unificado / PedimentoUnificado en un header.
 *  Devuelve -1 si la hoja viene en formato Gemini (sin esa columna). */
const findPedimentoUnificadoCol = (header: string[]): number => {
  return header.findIndex(h => {
    const norm = String(h ?? '').toLowerCase().replace(/[_\s-]/g, '');
    return norm === 'pedimentounificado';
  });
};

/** Lee un .xlsx y lo convierte a ProcessedData. Autodetecta formato Lovable/Gemini. */
const readExcelToProcessedData = async (
  file: File,
  onLog: (msg: string) => void,
): Promise<{ data: ProcessedData; format: 'lovable' | 'gemini' | 'unknown' }> => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const result: ProcessedData = {};
  let detectedFormat: 'lovable' | 'gemini' | 'unknown' = 'unknown';

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
      .map((r: any[]) => r.map(c => (c == null ? '' : String(c).trim())));
    if (rows.length === 0) continue;

    const fileKey = normalizeSheetNameToFileKey(sheetName);
    const puCol = findPedimentoUnificadoCol(rows[0]);
    if (puCol >= 0 && detectedFormat === 'unknown') detectedFormat = 'lovable';
    if (puCol < 0 && detectedFormat === 'unknown') detectedFormat = 'gemini';

    if (!result[fileKey]) {
      result[fileKey] = rows;
    } else {
      result[fileKey].push(...rows.slice(1));
    }
  }

  onLog(`📂 ${file.name}: ${Object.keys(result).length} hojas, formato detectado: ${detectedFormat}`);
  return { data: result, format: detectedFormat };
};

/**
 * Merge avanzado: combina N Excel previos + N ZIPs nuevos en un solo ProcessedData.
 * - Autodetecta formato Lovable (con Pedimento_Unificado) o Gemini (sin él).
 * - Si todas las fuentes tienen Pedimento_Unificado: dedup por esa columna.
 * - Si alguna fuente es formato Gemini: apila sin dedup y advierte.
 * - Los ZIPs nuevos siempre se enriquecen vía processZipFile (genera Pedimento_Unificado).
 */
export const mergeExcelAndZips = async (
  excelFiles: File[],
  zipFiles: File[],
  onLog: (msg: string) => void,
  onProgress: (prog: ProgressState) => void,
  cancellationSignal: { current: boolean },
): Promise<{ data: ProcessedData; stats: { excels: number; zips: number; duplicatesRemoved: number; rowsAdded: number } }> => {
  const totalSteps = excelFiles.length + zipFiles.length;
  let step = 0;
  const stats = { excels: excelFiles.length, zips: zipFiles.length, duplicatesRemoved: 0, rowsAdded: 0 };

  if (totalSteps === 0) {
    throw new Error('Debes subir al menos un Excel previo o un ZIP nuevo.');
  }

  const sources: { name: string; data: ProcessedData; format: 'lovable' | 'gemini' | 'unknown' }[] = [];

  // 1) Leer todos los Excels previos
  for (const file of excelFiles) {
    if (cancellationSignal.current) throw new Error('Operation cancelled by user.');
    onLog(`📥 Leyendo Excel previo: ${file.name}`);
    onProgress({ total: Math.round((step / totalSteps) * 100), file: 0, fileName: file.name });
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      throw new Error(`${file.name}: solo se aceptan archivos .xlsx`);
    }
    const { data, format } = await readExcelToProcessedData(file, onLog);
    sources.push({ name: file.name, data, format });
    step++;
    onProgress({ total: Math.round((step / totalSteps) * 100), file: 100, fileName: file.name });
  }

  // 2) Procesar todos los ZIPs nuevos (siempre formato Lovable porque pasan por enrichment)
  for (const file of zipFiles) {
    if (cancellationSignal.current) throw new Error('Operation cancelled by user.');
    onLog(`📦 Procesando ZIP nuevo: ${file.name}`);
    const data = await processZipFile(file, onLog, onProgress, cancellationSignal);
    sources.push({ name: file.name, data, format: 'lovable' });
    step++;
  }

  // 3) Determinar si podemos deduplicar (todas las fuentes deben tener Pedimento_Unificado)
  const allLovable = sources.every(s => s.format === 'lovable');
  if (!allLovable) {
    onLog(`⚠️ No todas las fuentes tienen Pedimento_Unificado. Apilando sin deduplicar.`);
  } else {
    onLog(`🔑 Todas las fuentes tienen Pedimento_Unificado. Dedup activo.`);
  }

  // 4) Consolidar
  const merged: ProcessedData = {};
  const seenByKey: Record<string, Set<string>> = {};

  for (const src of sources) {
    for (const [fileKey, rows] of Object.entries(src.data)) {
      if (rows.length === 0) continue;
      if (!merged[fileKey]) {
        merged[fileKey] = [rows[0]];
        seenByKey[fileKey] = new Set();
      }
      const header = merged[fileKey][0];
      const puCol = allLovable ? findPedimentoUnificadoCol(header) : -1;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (puCol >= 0) {
          const ped = (row[puCol] ?? '').trim();
          if (ped && seenByKey[fileKey].has(ped)) {
            stats.duplicatesRemoved++;
            continue;
          }
          if (ped) seenByKey[fileKey].add(ped);
        }
        merged[fileKey].push(row);
        stats.rowsAdded++;
      }
    }
  }

  onLog(`✅ Merge completo: ${stats.excels} Excel(s) + ${stats.zips} ZIP(s), ${stats.rowsAdded} filas nuevas, ${stats.duplicatesRemoved} duplicados omitidos.`);
  return { data: merged, stats };
};

const prepareDataForExcel = (data: string[][], format: ExportFormat) => {
  if (format === ExportFormat.TEXT) return data;

  return data.map((row, rowIndex) => {
    if (rowIndex === 0) return row;
    return row.map((cell, colIndex) => {
      // Proteger las 6 columnas llave (Mes, Anio, Patente, Pedimento, SeccionAduanera, PedimentoUnificado)
      if (colIndex <= 5) return cell;
      if (cell === '' || cell === null || cell === undefined) return '';
      const cellStr = String(cell).trim();
      if (/^-?\d*\.?\d+$/.test(cellStr)) {
        if (cellStr === '0') return 0;
        if (cellStr.startsWith('0') && !cellStr.startsWith('0.')) return cellStr;
        const num = parseFloat(cellStr);
        return isNaN(num) ? cellStr : num;
      }
      return cellStr;
    });
  });
};

export const generateSeparateSheetsExcelReport = (
  data: ProcessedData,
  title: string,
  year: number,
  reportMode: ReportMode,
  format: ExportFormat = ExportFormat.TEXT
) => {
  try {
    const exportWarnings = validateProcessedData(data, (msg) => console.log(`[export-validation] ${msg}`));
    if (exportWarnings.length > 0) {
      console.warn(`Excel export: ${exportWarnings.length} advertencias`, exportWarnings);
    }

    const wb = XLSX.utils.book_new();
    const sectionsToExport = Object.keys(data);

    sectionsToExport.forEach(section => {
      if (data[section]) {
        const preparedData = prepareDataForExcel(data[section], format);
        const headerRow = preparedData[0] ?? COLUMN_HEADERS[section] ?? [];
        const sheetData = preparedData.length > 0 ? preparedData : (headerRow.length > 0 ? [headerRow] : []);
        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        if (format === ExportFormat.TEXT) {
          applyTextFormatToSheet(ws);
        }

        const dateCols = detectDateColumns(data[section]);
        applyDateFormatToSheet(ws, headerRow, dateCols);

        if (headerRow.length > 0) {
          const lastCol = XLSX.utils.encode_col(headerRow.length - 1);
          ws['!autofilter'] = { ref: `A1:${lastCol}1` };
          ws['!cols'] = headerRow.map((header: any) => ({
            wch: Math.max(String(header).length + 2, 12)
          }));
        }

        const rawName = CLEAN_FILE_NAMES[section] || section;
        const sheetName = rawName.replace(/[:\\\/\?\*\[\]]/g, '_').substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    });

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    let fileName = `Reporte_Consolidado_${title.replace(/\s/g, '_')}_${year}.xlsx`;
    if (reportMode === ReportMode.MONTHLY) {
      fileName = `${title.replace(/\s/g, '_')}.xlsx`;
    } else if (reportMode === ReportMode.HISTORICAL) {
      fileName = `Data_Stage_Historico.xlsx`;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error generating consolidated report:', error);
    alert('Ocurrió un error al generar el reporte consolidado.');
  }
};

export const generateIndividualExcelFiles = async (
  data: ProcessedData,
  title: string,
  year: number,
  reportMode: ReportMode,
  format: ExportFormat = ExportFormat.TEXT
) => {
  try {
    const zip = new JSZip();
    const sectionsToExport = Object.keys(data);

    sectionsToExport.forEach(section => {
      if (data[section]) {
        const wb = XLSX.utils.book_new();
        const preparedData = prepareDataForExcel(data[section], format);
        const headerRow = preparedData[0] ?? COLUMN_HEADERS[section] ?? [];
        const sheetData = preparedData.length > 0 ? preparedData : (headerRow.length > 0 ? [headerRow] : []);
        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        if (format === ExportFormat.TEXT) {
          applyTextFormatToSheet(ws);
        }

        const dateCols = detectDateColumns(data[section]);
        applyDateFormatToSheet(ws, headerRow, dateCols);

        if (headerRow.length > 0) {
          const lastCol = XLSX.utils.encode_col(headerRow.length - 1);
          ws['!autofilter'] = { ref: `A1:${lastCol}1` };
          ws['!cols'] = headerRow.map((header: any) => ({
            wch: Math.max(String(header).length + 2, 12)
          }));
        }

        const rawName = CLEAN_FILE_NAMES[section] || section;
        const sheetName = rawName.replace(/[:\\\/\?\*\[\]]/g, '_').substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        zip.file(`${CLEAN_FILE_NAMES[section] || section}.xlsx`, excelBuffer);
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    let fileName = `Data_Stage_Individual_${title.replace(/\s/g, '_')}_${year}.zip`;
    if (reportMode === ReportMode.MONTHLY) {
      fileName = `${title.replace(/\s/g, '_')}_Individual.zip`;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error generating individual reports ZIP:', error);
    alert('Ocurrió un error al generar el archivo ZIP.');
  }
};
