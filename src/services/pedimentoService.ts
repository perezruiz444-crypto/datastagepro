import { ProcessedData } from '@/types/dataStage';
import { COLUMN_HEADERS, PEDIMENTO_REGEX, PEDIMENTO_UNIFICADO_INDEX, MONTH_NAMES, generateFallbackHeaders } from '@/constants/dataStage';
import { extractYearFromDateField } from '@/constants/catalogs';

// ===========================
// HELPERS
// ===========================

/** Extrae Mes (nombre) y Año (4 dígitos) de un string de fecha crudo por fila */
const extractMesAnioFromFecha = (fecha: string): { mes: string; anio: string } => {
  if (!fecha || !fecha.trim()) return { mes: '', anio: '' };
  const trimmed = fecha.trim();

  // YYYYMMDD
  if (trimmed.length >= 8 && /^\d{8}/.test(trimmed)) {
    const yyyy = trimmed.substring(0, 4);
    const mm = parseInt(trimmed.substring(4, 6), 10);
    if (mm >= 1 && mm <= 12) return { mes: MONTH_NAMES[mm - 1], anio: yyyy };
  }

  // YYYY-MM-DD (with optional time)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const mm = parseInt(isoMatch[2], 10);
    if (mm >= 1 && mm <= 12) return { mes: MONTH_NAMES[mm - 1], anio: isoMatch[1] };
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^\d{2}[\/\-](\d{2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const mm = parseInt(dmyMatch[1], 10);
    if (mm >= 1 && mm <= 12) return { mes: MONTH_NAMES[mm - 1], anio: dmyMatch[2] };
  }

  return { mes: '', anio: '' };
};

/**
 * Construye el Pedimento Unificado en formato AA-AAA-AAAA-AAAAAAA
 */
export const buildPedimentoUnificado = (
  patente: string,
  indice: string,
  seccion: string,
  yearTwoDigits: string
): string => {
  const sec = seccion.padStart(3, '0');
  const pat = patente.padStart(4, '0');
  const idx = indice.padStart(7, '0');
  return `${yearTwoDigits}-${sec}-${pat}-${idx}`;
};

/**
 * Construye las 6 columnas prefijo estándar:
 * [Mes, Anio, Patente, Pedimento(crudo), SeccionAduanera, PedimentoUnificado]
 */
const buildPrefix = (patente: string, pedCrudo: string, seccion: string, fecha: string): string[] => {
  const { mes, anio } = extractMesAnioFromFecha(fecha);
  const yy = extractYearFromDateField(fecha);
  const pedUnificado = buildPedimentoUnificado(patente, pedCrudo, seccion, yy);
  return [mes, anio, patente, pedCrudo, seccion, pedUnificado];
};

// ===========================
// CONTEXT 501
// ===========================

interface Context501 {
  tipoOperacion: string;
  clave: string;
  tipoPedimento: string;
  fechaRecepcion: string;
}

const emptyCtx: Context501 = { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

/** Construye lookup de contexto desde la tabla 501 enriquecida. */
const buildContext501Lookup = (enriched501: string[][]): Map<string, Context501> => {
  const map = new Map<string, Context501>();
  const pidx = PEDIMENTO_UNIFICADO_INDEX;
  for (let i = 1; i < enriched501.length; i++) {
    const row = enriched501[i];
    if (row[pidx]) {
      map.set(row[pidx], {
        tipoOperacion: row[6] || '',
        clave: row[7] || '',
        tipoPedimento: row[8] || '',
        fechaRecepcion: row[9] || '',
      });
    }
  }
  return map;
};

// ===========================
// TRANSFORM FUNCTIONS (raw data, no translations, no date formatting)
// ===========================

const transform501Row = (row: string[]): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const prefix = buildPrefix(get(0), get(1), get(2), get(30));
  return [
    ...prefix,
    get(3),                  // TipoOperacion (crudo)
    get(4),                  // Clave
    get(28),                 // TipoPedimento (crudo)
    get(29),                 // FechaRecepcion (crudo)
    get(30),                 // FechaPago (crudo)
    get(6),                  // CurpContribuyente
    get(7),                  // RFC
    get(8),                  // CurpAgente
    get(9),                  // TipoCambio
    get(10),                 // Fletes
    get(11),                 // Seguros
    get(12),                 // Embalajes
    get(13),                 // OtrosIncrementales
    get(14),                 // OtrosDeducibles
    get(15),                 // PesoBrutoMercancia
    get(16),                 // MedioTransporteSalida (crudo)
    get(17),                 // MedioTransporteArribo (crudo)
    get(18),                 // MedioTransporteEntradaSalida (crudo)
    get(19),                 // DestinoMercancia (crudo)
    get(5),                  // SeccionAduaneraEntrada
    get(20),                 // NombreContribuyente
    get(21),                 // Calle
    get(22),                 // NumInterior
    get(23),                 // NumExterior
    get(24),                 // CodigoPostal
    get(25),                 // Municipio
    get(26),                 // EntidadFederativa
    get(27),                 // Pais
    '0',                     // TransporteDecrementables
    '0',                     // SeguroDecrementables
    '0',                     // CargaDecrementables
    '0',                     // DescargaDecrementables
    '0',                     // OtrosDecrementables
  ];
};

const transform502Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(8);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4), get(5), get(6), get(7),
  ];
};

const transform503Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(5);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4),
  ];
};

const transform504Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(5);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4),
  ];
};

const transform505Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(18);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, ctx.fechaRecepcion, fechaPago,
    get(4), get(3), get(5),
    get(7), get(6), get(8), get(9),
    get(12), get(11),
    get(10), get(13), get(14), get(15), get(16), get(17),
  ];
};

const transform506Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(5);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4), fechaPago,
  ];
};

const transform507Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(7);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4), get(5), get(6),
  ];
};

const transform508Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(13);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4), get(5), get(6), get(7), get(8), get(9), get(10), get(11), get(12),
  ];
};

const transform509Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(7);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4), get(5),
  ];
};

const transform510Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(7);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4), get(5),
  ];
};

const transform511Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(6);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4), fechaPago,
  ];
};

const transform512Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(12);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;

  // Pedimento Original Unificado
  const fechaOpOrig = get(7);
  const yyB = extractYearFromDateField(fechaOpOrig);
  const pedOriginal = buildPedimentoUnificado(get(3), get(4), get(5), yyB);

  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    pedOriginal, get(6), fechaOpOrig, get(8), get(9), get(10),
  ];
};

const transform520Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(11);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4),
    get(5), get(6), get(7), get(8), get(9), get(10),
  ];
};

const transform551Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(29);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;

  // Precio Unitario USD = ValorDolares (idx10) / CantidadUMComercial (idx11)
  const valorDolares = parseFloat(get(10)) || 0;
  const cantComercial = parseFloat(get(11)) || 0;
  const precioUnitarioUSD = cantComercial !== 0 ? (valorDolares / cantComercial).toString() : '0';

  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4), get(5), get(6),
    get(7), get(8), get(9), get(10),
    get(11), get(12),
    get(13), get(14),
    get(15), get(16), get(17),
    get(18), get(19), get(20),
    get(21), get(22),
    get(23), get(24), get(25), get(26),
    precioUnitarioUSD,
  ];
};

const transform552Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(7);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4), get(5), get(6),
  ];
};

const transform553Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(10);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4),
    get(5), get(6), get(7), get(8), get(9),
  ];
};

const transform554Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(8);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4),
    get(5), get(6), get(7),
  ];
};

const transform555Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(14);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4),
    get(5), get(6), get(7), get(8),
    get(9), get(10), get(11),
    get(12), get(13),
  ];
};

const transform556Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(8);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4),
    get(5), get(6), get(7),
  ];
};

const transform557Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(8);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4),
    get(5), get(6), get(7),
  ];
};

const transform558Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPago = get(7);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPago);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  const observaciones = 6 < row.length ? row[6] : '';
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, ctx.tipoPedimento, fechaPago,
    get(3), get(4),
    get(5), observaciones,
  ];
};

const transform701Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPagoReal = get(13);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPagoReal);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;

  const fechaOpAnterior = get(9);
  let pedAnterior = '';
  if (fechaOpAnterior) {
    const yyB = extractYearFromDateField(fechaOpAnterior);
    pedAnterior = buildPedimentoUnificado(get(6), get(5), get(7), yyB);
  }

  return [
    ...prefix,
    ctx.tipoOperacion, ctx.tipoPedimento,
    fechaPagoReal, get(3), get(4),
    pedAnterior, get(8), fechaOpAnterior,
    get(10), get(11), get(12), get(5), get(6),
  ];
};

const transform702Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaPagoReal = get(7);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaPagoReal);
  const ctx = lookup501.get(prefix[5]) || emptyCtx;
  return [
    ...prefix,
    ctx.tipoOperacion, ctx.clave, get(6), fechaPagoReal,
    get(3), get(4), get(5),
  ];
};

const transformInciRow = (row: string[]): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaSeleccion = get(14);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaSeleccion);
  return [
    ...prefix,
    get(12), get(11), get(3), get(4),
    get(5), get(6), get(7), get(8),
    get(9), get(10), get(13), fechaSeleccion, get(0),
  ];
};

const transformSelRow = (row: string[]): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  const fechaSeleccion = get(5);
  const prefix = buildPrefix(get(0), get(1), get(2), fechaSeleccion);
  return [
    ...prefix,
    get(9), get(8), get(3), get(4),
    fechaSeleccion, get(6), get(7), get(0),
  ];
};

const transformResumenRow = (row: string[]): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');
  return [get(0), get(1), get(2), get(3), get(4), get(5), get(6)];
};

// ===========================
// ENRICHMENT ENGINE
// ===========================

/** Helper: procesa una tabla con su transformador */
const processTable = (
  fileKey: string,
  dataRows: string[][],
  transformer: (row: string[]) => string[],
  onLog: (msg: string) => void,
  minFields: number = 3
): string[][] => {
  const headers = COLUMN_HEADERS[fileKey];
  if (!headers) return [[`Error: No headers for ${fileKey}`]];
  const enrichedRows: string[][] = [headers];
  let validCount = 0;
  let invalidCount = 0;
  for (const row of dataRows) {
    if (row.length < minFields) { invalidCount++; continue; }
    try {
      enrichedRows.push(transformer(row));
      validCount++;
    } catch (e) { invalidCount++; }
  }
  onLog(`✅ ${fileKey}: ${validCount} registros transformados (${invalidCount} inválidos)`);
  return enrichedRows;
};

/** Helper: detecta y salta fila de encabezado original si existe */
const skipHeaderRow = (rows: string[][], onLog: (msg: string) => void, fileKey: string): string[][] => {
  if (rows.length > 0 && rows[0].length >= 3 &&
    (!/^\d+$/.test(rows[0][0].trim()) || !/^\d+$/.test(rows[0][1].trim()) || !/^\d+$/.test(rows[0][2].trim()))) {
    onLog(`🔄 ${fileKey}: Encabezado original detectado y reemplazado`);
    return rows.slice(1);
  }
  return rows;
};

// Mapas de transformadores con contexto 501
const ctxTransformers: Record<string, (row: string[], ctx: Map<string, Context501>) => string[]> = {
  '502': transform502Row,
  '503': transform503Row,
  '504': transform504Row,
  '505': transform505Row,
  '506': transform506Row,
  '507': transform507Row,
  '508': transform508Row,
  '509': transform509Row,
  '510': transform510Row,
  '511': transform511Row,
  '512': transform512Row,
  '520': transform520Row,
  '551': transform551Row,
  '552': transform552Row,
  '553': transform553Row,
  '554': transform554Row,
  '555': transform555Row,
  '556': transform556Row,
  '557': transform557Row,
  '558': transform558Row,
  '701': transform701Row,
  '702': transform702Row,
};

// Transformadores sin contexto 501
const noCtxTransformers: Record<string, (row: string[]) => string[]> = {
  'Inci': transformInciRow,
  'Sel': transformSelRow,
  'Resumen': transformResumenRow,
};

/**
 * Enriquece los datos procesados: aplica transformación por tabla y agrega encabezados.
 * Mes y Año se extraen dinámicamente de la fecha de pago de CADA fila.
 * Valores crudos: sin traducciones de catálogos, sin formateo de fechas.
 */
export const enrichWithPedimentoUnificado = (
  data: ProcessedData,
  onLog: (message: string) => void
): ProcessedData => {
  const enrichedData: ProcessedData = {};

  onLog(`📋 Extracción de Mes/Año: modo per-row desde fecha de pago de cada registro`);

  // === PHASE 1: Process 501 first (needed for context injection) ===
  if (data['501']) {
    const dataRows = skipHeaderRow(data['501'], onLog, '501');
    enrichedData['501'] = processTable('501', dataRows, transform501Row, onLog);
  }

  // Build context lookup from enriched 501
  const context501 = enrichedData['501'] ? buildContext501Lookup(enrichedData['501']) : new Map<string, Context501>();

  // === PHASE 2: Process all other tables ===
  for (const [fileKey, rows] of Object.entries(data)) {
    if (fileKey === '501' || rows.length === 0) {
      if (fileKey !== '501') enrichedData[fileKey] = rows;
      continue;
    }

    const dataRows = skipHeaderRow(rows, onLog, fileKey);

    if (ctxTransformers[fileKey]) {
      enrichedData[fileKey] = processTable(
        fileKey, dataRows,
        (row) => ctxTransformers[fileKey](row, context501),
        onLog
      );
      continue;
    }

    if (noCtxTransformers[fileKey]) {
      enrichedData[fileKey] = processTable(
        fileKey, dataRows,
        noCtxTransformers[fileKey],
        onLog,
        fileKey === 'Resumen' ? 1 : 3
      );
      continue;
    }

    // === FALLBACK: archivos sin transformador dedicado ===
    onLog(`ℹ️ ${fileKey}: Usando transformación genérica (sin mapeo específico)`);
    const sampleRow = dataRows[0] || [];
    const totalCols = 6 + Math.max(sampleRow.length - 3, 0);
    const headers = COLUMN_HEADERS[fileKey] || generateFallbackHeaders(totalCols, fileKey);
    const enrichedRows: string[][] = [headers];

    let pedimentosBuild = 0;
    let pedimentosInvalid = 0;

    for (const row of dataRows) {
      if (row.length < 3) {
        enrichedRows.push(['', '', '', '', '', '', ...row]);
        pedimentosInvalid++;
        continue;
      }

      const patente = row[0].trim();
      const indice = row[1].trim();
      const seccion = row[2].trim();

      if (patente && indice && seccion && /^\d+$/.test(patente) && /^\d+$/.test(indice) && /^\d+$/.test(seccion)) {
        // Extract date per-row for Mes/Año
        let fechaCandidate = '';
        for (const field of row) {
          const candidate = field.trim();
          if (candidate.length >= 8 && /^\d{4}/.test(candidate)) {
            fechaCandidate = candidate;
            break;
          }
          if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(candidate)) {
            fechaCandidate = candidate;
            break;
          }
        }
        const prefix = buildPrefix(patente, indice, seccion, fechaCandidate);
        enrichedRows.push([...prefix, ...row.slice(3)]);
        pedimentosBuild++;
      } else {
        enrichedRows.push(['', '', patente, indice, seccion, '', ...row.slice(3)]);
        pedimentosInvalid++;
      }
    }

    enrichedData[fileKey] = enrichedRows;

    if (pedimentosInvalid > 0) {
      onLog(`⚠️ ${fileKey}: ${pedimentosInvalid} registros sin pedimento válido (${pedimentosBuild} correctos)`);
    }
  }

  const totalPedimentos = new Set<string>();
  if (enrichedData['501']) {
    const pidx = PEDIMENTO_UNIFICADO_INDEX;
    for (let i = 1; i < enrichedData['501'].length; i++) {
      const ped = enrichedData['501'][i][pidx];
      if (ped) totalPedimentos.add(ped);
    }
  }
  onLog(`📊 Total pedimentos únicos en 501: ${totalPedimentos.size}`);

  return enrichedData;
};

/**
 * Valida los datos procesados y retorna advertencias.
 */
export const validateProcessedData = (
  data: ProcessedData,
  onLog: (message: string) => void
): string[] => {
  const warnings: string[] = [];
  const pidx = PEDIMENTO_UNIFICADO_INDEX;

  if (!data['501']) {
    const w = 'Falta archivo crítico: 501 - Datos generales';
    warnings.push(w);
    onLog(`⚠️ ${w}`);
  }
  if (!data['551']) {
    const w = 'Falta archivo crítico: 551 - Partidas';
    warnings.push(w);
    onLog(`⚠️ ${w}`);
  }

  const NO_PEDIMENTO_FILES = new Set(['Resumen']);

  for (const [fileKey, rows] of Object.entries(data)) {
    if (rows.length <= 1) continue;
    if (NO_PEDIMENTO_FILES.has(fileKey)) continue;

    let invalidCount = 0;
    let emptyCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const pedimento = rows[i][pidx];
      if (!pedimento) {
        emptyCount++;
      } else if (!PEDIMENTO_REGEX.test(pedimento)) {
        invalidCount++;
      }
    }

    if (invalidCount > 0) {
      const w = `${fileKey}: ${invalidCount} pedimentos con formato inválido`;
      warnings.push(w);
      onLog(`⚠️ ${w}`);
    }
    if (emptyCount > 0) {
      const w = `${fileKey}: ${emptyCount} registros sin pedimento unificado`;
      warnings.push(w);
      onLog(`⚠️ ${w}`);
    }
  }

  if (data['501'] && data['551']) {
    const pedimentos501 = new Set<string>();
    for (let i = 1; i < data['501'].length; i++) {
      if (data['501'][i][pidx]) pedimentos501.add(data['501'][i][pidx]);
    }

    let orphanCount = 0;
    for (let i = 1; i < data['551'].length; i++) {
      const ped = data['551'][i][pidx];
      if (ped && !pedimentos501.has(ped)) orphanCount++;
    }

    if (orphanCount > 0) {
      const w = `${orphanCount} partidas (551) con pedimentos no encontrados en datos generales (501)`;
      warnings.push(w);
      onLog(`⚠️ ${w}`);
    }
  }

  if (warnings.length === 0) {
    onLog('✅ Validación completada: Sin advertencias.');
  } else {
    onLog(`⚠️ Validación completada: ${warnings.length} advertencia(s) encontrada(s).`);
  }

  return warnings;
};
