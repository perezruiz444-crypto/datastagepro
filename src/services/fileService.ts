import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { ProgressState, ProcessedData, ReportMode, ExportFormat } from '@/types/dataStage';
import { MONTH_NAMES } from '@/constants/dataStage';
import { enrichWithPedimentoUnificado, getYearFromResumen, normalizeColumn, validateProcessedData } from './pedimentoService';

export { enrichWithPedimentoUnificado, validateProcessedData };

const isValidAscEntry = (name: string): boolean => {
  const basename = name.split('/').pop() ?? '';
  return /\.asc$/i.test(name) && !name.split('/').includes('__MACOSX') && !basename.startsWith('._');
};

const decodeBytes = (bytes: Uint8Array): string => {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return new TextDecoder('iso-8859-1').decode(bytes); }
};

/** Valida el calendario completo para evitar normalizar 31 de febrero a marzo. */
export const parseDateOnly = (value: string): Date | null => {
  const text = (value ?? '').trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]\d{2}:\d{2}:\d{2})?$/);
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  const dmy = text.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  const match = iso ?? compact;
  if (!match && !dmy) return null;
  const [year, month, day] = match
    ? [Number(match[1]), Number(match[2]), Number(match[3])]
    : [Number(dmy![3]), Number(dmy![2]), Number(dmy![1])];
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2})?$/;

/** Mismo muestreo que la habilidad; los códigos de ocho dígitos siguen siendo texto. */
export const detectDateColumns = (rows: string[][]): Set<number> => {
  const result = new Set<number>();
  for (let col = 0; col < (rows[0]?.length ?? 0); col++) {
    let nonEmpty = 0, matches = 0;
    for (let row = 1; row < rows.length && nonEmpty < 200; row++) {
      const value = (rows[row][col] ?? '').trim();
      if (!value) continue;
      nonEmpty++;
      if (ISO_DATE.test(value) && parseDateOnly(value)) matches++;
    }
    if (nonEmpty && matches / nonEmpty >= 0.9) result.add(col);
  }
  return result;
};

/** Rechaza esquemas incompatibles antes de apilar; no elimina ninguna fila. */
const appendTables = (target: ProcessedData, source: ProcessedData, label: string): void => {
  for (const [key, rows] of Object.entries(source)) {
    if (!rows.length) continue;
    const previous = target[key];
    if (previous && (previous[0].length !== rows[0].length || previous[0].some((h, i) => h !== rows[0][i]))) {
      throw new Error(`${label}: los encabezados de la hoja ${key} no coinciden en nombre y orden. No se pueden combinar estos archivos.`);
    }
    if (!previous) target[key] = [rows[0].slice()];
    for (let i = 1; i < rows.length; i++) target[key].push(rows[i].slice());
  }
};

const parseAsc = (content: string, name: string): string[][] => {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim() !== '');
  if (!lines.length) return [];
  if (!lines[0].includes('|')) throw new Error(`${name}: no contiene encabezados separados por pipes '|'.`);
  const header = lines[0].split('|');
  const indices = header.map((_, i) => i).filter(i => header[i] !== '' && !header[i].startsWith('Unnamed'));
  const names = indices.map(i => header[i]);
  if (new Set(names).size !== names.length) throw new Error(`${name}: contiene encabezados duplicados.`);
  return [names, ...lines.slice(1).map((line, index) => {
    const fields = line.split('|');
    if (fields.slice(header.length).some(value => value !== '')) {
      throw new Error(`${name}: la fila ${index + 2} tiene más valores que encabezados.`);
    }
    if (fields.some((value, i) => i < header.length && !indices.includes(i) && value !== '')) {
      throw new Error(`${name}: la fila ${index + 2} contiene datos en una columna sin encabezado.`);
    }
    return indices.map(i => fields[i] ?? '');
  })];
};

const fileKeyFromAsc = (name: string): string => {
  const basename = name.split('/').pop()!.replace(/\.asc$/i, '');
  const token = basename.slice(basename.lastIndexOf('_') + 1);
  return ['Resumen', 'Inci', 'Sel'].find(key => key.toLowerCase() === token.toLowerCase()) ?? token;
};

const readZipTables = async (file: File, onProgress: (progress: ProgressState) => void, signal: { current: boolean }): Promise<ProcessedData> => {
  const zip = await JSZip.loadAsync(file);
  const files = Object.keys(zip.files).filter(name => !zip.files[name].dir && isValidAscEntry(name));
  if (!files.length) throw new Error('No se encontraron archivos .asc en el ZIP.');
  const data: ProcessedData = {};
  for (let i = 0; i < files.length; i++) {
    if (signal.current) throw new Error('Operation cancelled by user.');
    const name = files[i];
    const rows = parseAsc(decodeBytes(await zip.file(name)!.async('uint8array')), name);
    if (rows.length) appendTables(data, { [fileKeyFromAsc(name)]: rows }, name);
    onProgress({ total: Math.round(((i + 1) / files.length) * 100), file: 100, fileName: name });
  }
  if (!Object.keys(data).length) throw new Error('Los archivos .asc no contienen encabezados ni datos.');
  return data;
};

export const buildZipFromAscFiles = async (files: File[]): Promise<File> => {
  const zip = new JSZip();
  for (const file of files) zip.file(file.name, file);
  const buffer = await zip.generateAsync({ type: 'arraybuffer' });
  return new File([buffer], files.length === 1 ? files[0].name.replace(/\.asc$/i, '.zip') : 'archivos_asc.zip', { type: 'application/zip' });
};

export const detectPeriodFromZipFile = async (file: File): Promise<{ month: string | null; year: number | null }> => {
  try {
    const data = await readZipTables(file, () => {}, { current: false });
    const resumen = data['Resumen'];
    const index = resumen?.[0].findIndex(name => ['fechainicial', 'fechainicialconsulta'].includes(normalizeColumn(name))) ?? -1;
    const summaryDate = index >= 0 ? parseDateOnly(resumen[1]?.[index] ?? '') : null;
    const counts = new Map<string, { month: string; year: number; count: number }>();
    const tables = [data['501'], ...Object.entries(data).filter(([key]) => key !== '501' && key !== 'Resumen').map(([, rows]) => rows)];
    for (const rows of tables) {
      if (!rows) continue;
      const dateIndices = rows[0].map((name, i) => /fecha/i.test(name) ? i : -1).filter(i => i >= 0);
      for (const row of rows.slice(1, 201)) {
        for (const index of dateIndices) {
          const value = row[index] ?? '';
          const date = parseDateOnly(value);
          if (!date || date.getFullYear() < 2000 || date.getFullYear() > 2099) continue;
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          const entry = counts.get(key) ?? { month: MONTH_NAMES[date.getMonth()], year: date.getFullYear(), count: 0 };
          entry.count++;
          counts.set(key, entry);
        }
      }
      if (counts.size) break;
    }
    const best = [...counts.values()].sort((a, b) => b.count - a.count)[0];
    return { month: best?.month ?? (summaryDate ? MONTH_NAMES[summaryDate.getMonth()] : null), year: Number(getYearFromResumen(data)) || best?.year || null };
  } catch {
    return { month: null, year: null };
  }
};

export const processZipFile = async (
  file: File, onLog: (message: string) => void, onProgress: (progress: ProgressState) => void,
  cancellationSignal: { current: boolean }, year?: number,
): Promise<ProcessedData> => {
  const raw = await readZipTables(file, onProgress, cancellationSignal);
  const canonicalYear = getYearFromResumen(raw) ?? String(year ?? new Date().getFullYear());
  onLog(`📅 Año del ZIP: ${canonicalYear}`);
  const data = enrichWithPedimentoUnificado(raw, onLog, canonicalYear);
  validateProcessedData(data, onLog);
  return data;
};

export const consolidateAnnualData = (
  monthlyData: { month: string; data: ProcessedData }[], onLog: (message: string) => void,
): ProcessedData => {
  const data: ProcessedData = {};
  for (const source of monthlyData) appendTables(data, source.data, source.month);
  onLog(`✅ Consolidación: ${monthlyData.length} periodos en el orden recibido`);
  return data;
};

export const processHistoricalData = async (
  files: File[], onLog: (message: string) => void, onProgress: (progress: ProgressState) => void,
  cancellationSignal: { current: boolean },
): Promise<{ data: ProcessedData; yearRange: string }> => {
  const data: ProcessedData = {};
  const years = new Set<string>();
  for (const file of files) {
    const source = await processZipFile(file, onLog, onProgress, cancellationSignal);
    appendTables(data, source, file.name);
    const year = getYearFromResumen(source);
    if (year) years.add(year);
    else {
      for (const row of source['501']?.slice(1) ?? []) years.add(`20${row[0].slice(0, 2)}`);
    }
  }
  const sorted = [...years].sort();
  const yearRange = !sorted.length ? '' : sorted[0] === sorted[sorted.length - 1] ? sorted[0] : `${sorted[0]}-${sorted[sorted.length - 1]}`;
  return { data, yearRange };
};

const normalizeSheetNameToFileKey = (name: string): string => {
  const type = name.match(/_(\d{3})$/) ?? name.match(/^(\d{3})(?:$|[_\s-])/);
  if (type) return type[1];
  return ['Resumen', 'Inci', 'Sel'].find(key => name.toLowerCase().includes(key.toLowerCase())) ?? name;
};

const readExcelToProcessedData = async (file: File): Promise<ProcessedData> => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const data: ProcessedData = {};
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false });
    if (!rows.length) continue;
    // Normaliza fechas de Excel a ISO para la detección por contenido y deja vacíos como vacíos.
    const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
    for (let row = 1; row < rows.length; row++) {
      rows[row] = rows[0].map((_, col) => {
        const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r + row, c: range.s.c + col })];
        if (cell?.t === 'd' && cell.v instanceof Date) {
          const date = cell.v;
          return `${date.getFullYear().toString().padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }
        return String(rows[row][col] ?? '');
      });
    }
    appendTables(data, { [normalizeSheetNameToFileKey(name)]: rows }, file.name);
  }
  if (!Object.keys(data).length) throw new Error(`${file.name}: no contiene hojas con encabezados.`);
  return enrichWithPedimentoUnificado(data, () => {});
};

/** Apila las fuentes completas, incluidas partidas repetidas del mismo pedimento. */
export const mergeExcelAndZips = async (
  excelFiles: File[], zipFiles: File[], onLog: (message: string) => void,
  onProgress: (progress: ProgressState) => void, cancellationSignal: { current: boolean },
): Promise<{ data: ProcessedData; stats: { excels: number; zips: number; duplicatesRemoved: number; rowsAdded: number } }> => {
  if (!excelFiles.length && !zipFiles.length) throw new Error('Debes subir al menos un Excel previo o un ZIP nuevo.');
  const data: ProcessedData = {};
  for (const file of excelFiles) {
    if (cancellationSignal.current) throw new Error('Operation cancelled by user.');
    if (!/\.xlsx$/i.test(file.name)) throw new Error(`${file.name}: solo se aceptan archivos .xlsx`);
    appendTables(data, await readExcelToProcessedData(file), file.name);
  }
  for (const file of zipFiles) appendTables(data, await processZipFile(file, onLog, onProgress, cancellationSignal), file.name);
  const rowsAdded = Object.values(data).reduce((sum, rows) => sum + rows.length - 1, 0);
  onLog(`✅ ${rowsAdded} filas conservadas, sin eliminar partidas por pedimento`);
  return { data, stats: { excels: excelFiles.length, zips: zipFiles.length, duplicatesRemoved: 0, rowsAdded } };
};

/** El modo numérico es opcional; los identificadores y las fechas siguen protegidos. */
const isIdentifier = (header: string): boolean => /pedimento|patente|aduana|fraccion|subdivision|codigo|clave|rfc|curp|guia|folio|secuencia|cuenta|permiso|^cp|^id|^numero/i.test(normalizeColumn(header));

const createReportSheet = (rows: string[][], format: ExportFormat): XLSX.WorkSheet => {
  const dates = detectDateColumns(rows);
  const values: (string | number)[][] = rows.map((row, r) => row.map((value, col) => {
    if (r === 0 || format === ExportFormat.TEXT || isIdentifier(rows[0][col]) || dates.has(col)) return value;
    if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) && value.replace(/\D/g, '').length <= 15) return Number(value);
    return value;
  }));
  const sheet = XLSX.utils.aoa_to_sheet(values);
  for (let r = 1; r < rows.length; r++) {
    for (let col = 0; col < rows[0].length; col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c: col })];
      if (!cell) continue;
      if (cell.t === 's') cell.z = '@';
      if (dates.has(col)) {
        const date = parseDateOnly(rows[r][col] ?? '');
        if (date) {
          // Excel guarda días, sin zona horaria. Evita el desfase histórico
          // de SheetJS al convertir Date locales contra su época de 1899.
          const utc = new Date(0);
          utc.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
          utc.setUTCHours(0, 0, 0, 0);
          let serial = (utc.getTime() - Date.UTC(1899, 11, 30)) / 86400000;
          if (serial > 0 && serial < 61) serial--; // Calendario Excel anterior al 1/3/1900.
          cell.t = 'n'; cell.v = serial; cell.z = 'dd/mm/yyyy';
        }
      }
    }
  }
  if (rows[0]?.length) {
    sheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(rows[0].length - 1)}1` };
    sheet['!cols'] = rows[0].map((header, col) => {
      let width = header.length;
      let sampled = 0;
      for (let r = 1; r < rows.length && (col === 0 || sampled < 500); r++) {
        const value = rows[r][col] ?? '';
        if (value !== '') { width = Math.max(width, String(value).length); sampled++; }
      }
      return { wch: Math.max(10, Math.min(60, width + 2)) };
    });
  }
  return sheet;
};

const sortedSections = (data: ProcessedData): string[] => Object.keys(data).sort((a, b) => {
  const diff = (/^\d+$/.test(a) ? Number(a) : Infinity) - (/^\d+$/.test(b) ? Number(b) : Infinity);
  return Number.isNaN(diff) || diff === 0 ? (a < b ? -1 : a > b ? 1 : 0) : diff;
});

export const createReportWorkbook = (data: ProcessedData, format = ExportFormat.TEXT): XLSX.WorkBook => {
  const workbook = XLSX.utils.book_new();
  for (const section of sortedSections(data)) {
    if (!data[section].length) continue;
    const name = section.replace(/[:\\/?*[\]]/g, '_').slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, createReportSheet(data[section], format), name);
  }
  return workbook;
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

export const generateSeparateSheetsExcelReport = (
  data: ProcessedData, title: string, year: number, reportMode: ReportMode, format = ExportFormat.TEXT,
): void => {
  const workbook = createReportWorkbook(data, format);
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const name = title.trim().replace(/\.xlsx$/i, '') || `Data_Stage_${reportMode}_${year}`;
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${name}.xlsx`);
};

export const generateIndividualExcelFiles = async (
  data: ProcessedData, title: string, year: number, reportMode: ReportMode, format = ExportFormat.TEXT,
): Promise<void> => {
  const zip = new JSZip();
  for (const section of sortedSections(data)) {
    const workbook = createReportWorkbook({ [section]: data[section] }, format);
    zip.file(`${section}.xlsx`, XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }));
  }
  const name = title.trim().replace(/\.(?:xlsx|zip)$/i, '') || `Data_Stage_${reportMode}_${year}`;
  downloadBlob(await zip.generateAsync({ type: 'blob' }), `${name}_Individual.zip`);
};
