import { ProcessedData } from '@/types/dataStage';
import { COLUMN_HEADERS, PEDIMENTO_REGEX, generateFallbackHeaders } from '@/constants/dataStage';
import {
  TIPO_OPERACION,
  TIPO_PEDIMENTO,
  MEDIO_TRANSPORTE,
  DESTINO_MERCANCIA,
  TIPO_GUIA,
  TIPO_FECHA,
  formatDateYYYYMMDD,
  extractYearFromDateField,
} from '@/constants/catalogs';

/**
 * Construye el Pedimento Unificado en formato AA-AAA-AAAA-AAAAAAA
 * AA = últimos 2 dígitos del año de Fecha de Pago (Índice 30)
 * AAA = sección aduanera (Índice 2)
 * AAAA = patente (Índice 0)
 * AAAAAAA = número de pedimento (Índice 1)
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
 * Transforma una fila cruda del archivo 501 en la fila de salida de 31 columnas.
 * Mapeo estricto por índice de columna del .asc.
 */
const transform501Row = (row: string[]): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  // Construir Pedimento: AA(year de idx30)-AAA(idx2)-AAAA(idx0)-AAAAAAA(idx1)
  const fechaPago = get(30);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  return [
    pedimento,                                                      // Pedimento
    get(2),                                                         // Clave de sección aduanera de despacho
    TIPO_OPERACION[get(3)] || get(3),                               // Tipo de Operación
    get(4),                                                         // Clave
    TIPO_PEDIMENTO[get(28)] || get(28),                             // Tipo de Pedimento
    formatDateYYYYMMDD(get(29)),                                    // Fecha de recepción de pedimento
    formatDateYYYYMMDD(get(30)),                                    // Fecha de pago
    get(9),                                                         // Tipo de cambio
    get(10),                                                        // Fletes
    get(11),                                                        // Seguros
    get(12),                                                        // Embalajes
    get(13),                                                        // Otros incrementales
    get(14),                                                        // Otros deducibles
    get(15),                                                        // Peso bruto de la mercancía
    get(16),                                                        // Clave de medio de transporte de salida
    MEDIO_TRANSPORTE[get(16)] || get(16),                           // Descripción medio transporte salida
    get(17),                                                        // Clave de medio de transporte de arribo
    MEDIO_TRANSPORTE[get(17)] || get(17),                           // Descripción medio transporte arribo
    get(18),                                                        // Clave de medio de transporte entrada/salida
    MEDIO_TRANSPORTE[get(18)] || get(18),                           // Descripción medio transporte entrada/salida
    get(19),                                                        // Clave de destino de la mercancía
    DESTINO_MERCANCIA[get(19)] || get(19),                          // Descripción destino mercancía
    get(5),                                                         // Clave de sección aduanera de entrada
    get(8),                                                         // CURP del agente o apoderado aduanal
    get(20),                                                        // Nombre del contribuyente
    [get(21), get(23), get(22), get(24), get(25), get(26), get(27)] // Dirección del contribuyente
      .filter(Boolean).join(' '),
    '0',                                                            // Transporte (Decrementables)
    '0',                                                            // Seguro (Decrementables)
    '0',                                                            // Carga (Decrementables)
    '0',                                                            // Descarga (Decrementables)
    '0',                                                            // Otros Decrementables
  ];
};

/** Contexto inyectable desde la tabla 501 */
interface Context501 {
  tipoOperacion: string;
  clave: string;
  tipoPedimento: string;
  fechaRecepcion: string;
}

/**
 * Transforma una fila cruda del archivo 502 en la fila de salida de 11 columnas.
 */
const transform502Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(8);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  return [
    pedimento,
    get(2),                        // Clave de sección aduanera de despacho
    ctx.tipoOperacion,             // Tipo de Operación (desde 501)
    ctx.clave,                     // Clave (desde 501)
    ctx.tipoPedimento,             // Tipo de Pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago), // Fecha de pago
    get(3),                        // RFC del transportista
    get(4),                        // CURP del transportista
    get(5),                        // Nombre del transportista
    get(6),                        // Clave de país del transporte
    get(7),                        // Identificador del transporte
  ];
};

/**
 * Transforma una fila cruda del archivo 503 en la fila de salida de 8 columnas.
 */
const transform503Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(5);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  return [
    pedimento,
    get(2),                        // Clave de sección aduanera de despacho
    ctx.tipoOperacion,             // Tipo de Operación (desde 501)
    ctx.clave,                     // Clave (desde 501)
    ctx.tipoPedimento,             // Tipo de Pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago), // Fecha de pago
    get(3),                        // Número de guía o manifiesto
    TIPO_GUIA[get(4)] || get(4),   // Clave de tipo de guía (H→HOUSE, M→MASTER)
  ];
};

/**
 * Transforma una fila cruda del archivo 504 en la fila de salida de 9 columnas.
 */
const transform504Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(5);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  return [
    pedimento,
    get(2),                        // Clave de sección aduanera de despacho
    ctx.tipoOperacion,             // Tipo de Operación (desde 501)
    ctx.clave,                     // Clave (desde 501)
    ctx.tipoPedimento,             // Tipo de Pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago), // Fecha de pago
    get(3),                        // Número del contenedor
    get(4),                        // Clave de tipo de contenedor
    get(4),                        // Descripción del contenedor (valor crudo, sin traducción)
  ];
};

/**
 * Transforma una fila cruda del archivo 505 en la fila de salida de 17 columnas.
 */
const transform505Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(18);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  // Dirección: concatenar idx 13 + 15 + 14 + 17 + 10 + 16 (filter nulls)
  const direccion = [get(13), get(15), get(14), get(17), get(10), get(16)]
    .filter(Boolean).join(' ');

  return [
    pedimento,
    get(2),                        // Clave de sección aduanera de despacho
    ctx.tipoOperacion,             // Tipo de Operación (desde 501)
    ctx.clave,                     // Clave (desde 501)
    ctx.tipoPedimento,             // Tipo de Pedimento (desde 501)
    ctx.fechaRecepcion,            // Fecha de recepción de pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago), // Fecha de pago
    get(4),                        // Número de la factura
    formatDateYYYYMMDD(get(3)),    // Fecha de facturación
    get(5),                        // Clave de término de facturación
    get(7),                        // Valor en dólares
    get(6),                        // Clave de moneda de facturación
    get(8),                        // Valor en moneda extranjera
    get(9),                        // Clave de país de facturación
    get(12),                       // Proveedor de la mercancía
    get(11),                       // Identificación fiscal del proveedor
    direccion,                     // Dirección
  ];
};

/**
 * Transforma una fila cruda del archivo 506 en la fila de salida de 9 columnas.
 */
const transform506Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(5);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  return [
    pedimento,
    get(2),                        // Clave de sección aduanera de despacho
    ctx.tipoOperacion,             // Tipo de Operación (desde 501)
    ctx.clave,                     // Clave (desde 501)
    ctx.tipoPedimento,             // Tipo de Pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago), // Fecha de pago
    TIPO_FECHA[get(3)] || get(3),  // Tipo de fecha (traducido vía Apéndice 21)
    formatDateYYYYMMDD(get(4)),    // Fecha de operación
    formatDateYYYYMMDD(fechaPago), // Fecha de validación o de pago real
  ];
};

/**
 * Construye lookup de contexto desde la tabla 501 ya enriquecida.
 */
const buildContext501Lookup = (enriched501: string[][]): Map<string, Context501> => {
  const map = new Map<string, Context501>();
  for (let i = 1; i < enriched501.length; i++) {
    const row = enriched501[i];
    if (row[0]) {
      map.set(row[0], {
        tipoOperacion: row[2] || '',
        clave: row[3] || '',
        tipoPedimento: row[4] || '',
        fechaRecepcion: row[5] || '',
      });
    }
  }
  return map;
};

/**
 * Enriquece los datos procesados: aplica transformación por tabla y agrega encabezados.
 * Para tabla 501: mapeo por índice con transformaciones especiales.
 * Para otras tablas: lógica legacy (prepend Pedimento Unificado).
 */
export const enrichWithPedimentoUnificado = (
  data: ProcessedData,
  onLog: (message: string) => void
): ProcessedData => {
  const enrichedData: ProcessedData = {};

  // Detect year from 501 for legacy tables that still need it
  let detectedYear = 2020;
  if (data['501'] && data['501'].length > 0) {
    for (let i = 0; i < Math.min(data['501'].length, 20); i++) {
      const row = data['501'][i];
      if (row.length > 30) {
        const fechaPago = row[30].trim();
        if (fechaPago.length === 8 && /^\d{8}$/.test(fechaPago)) {
          detectedYear = parseInt(fechaPago.substring(0, 4), 10);
          break;
        }
        if (fechaPago.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(fechaPago)) {
          detectedYear = parseInt(fechaPago.substring(0, 4), 10);
          break;
        }
      }
    }
  }
  onLog(`📋 Año detectado para Pedimento Unificado: ${detectedYear}`);

  // === PHASE 1: Process 501 first (needed for context injection) ===
  if (data['501']) {
    const rows = data['501'];
    const dataRows = rows.length > 0 && rows[0].length >= 3 &&
      (!/^\d+$/.test(rows[0][0].trim()) || !/^\d+$/.test(rows[0][1].trim()) || !/^\d+$/.test(rows[0][2].trim()))
      ? (onLog(`🔄 501: Encabezado original detectado y reemplazado`), rows.slice(1))
      : rows;

    const headers = COLUMN_HEADERS['501'];
    const enrichedRows: string[][] = [headers];
    let validCount = 0;
    let invalidCount = 0;

    for (const row of dataRows) {
      if (row.length < 3) { invalidCount++; continue; }
      try {
        enrichedRows.push(transform501Row(row));
        validCount++;
      } catch (e) { invalidCount++; }
    }

    enrichedData['501'] = enrichedRows;
    onLog(`✅ 501: ${validCount} registros transformados (${invalidCount} inválidos)`);
  }

  // Build context lookup from enriched 501
  const context501 = enrichedData['501'] ? buildContext501Lookup(enrichedData['501']) : new Map<string, Context501>();

  // === PHASE 2: Process all other tables ===
  for (const [fileKey, rows] of Object.entries(data)) {
    if (fileKey === '501' || rows.length === 0) {
      if (fileKey !== '501') enrichedData[fileKey] = rows;
      continue;
    }

    const dataRows = rows.length > 0 && rows[0].length >= 3 &&
      (!/^\d+$/.test(rows[0][0].trim()) || !/^\d+$/.test(rows[0][1].trim()) || !/^\d+$/.test(rows[0][2].trim()))
      ? (onLog(`🔄 ${fileKey}: Encabezado original detectado y reemplazado`), rows.slice(1))
      : rows;

    if (fileKey === '502') {
      const headers = COLUMN_HEADERS['502'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform502Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 502: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '503') {
      const headers = COLUMN_HEADERS['503'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform503Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 503: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '504') {
      const headers = COLUMN_HEADERS['504'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform504Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 504: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '505') {
      const headers = COLUMN_HEADERS['505'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform505Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 505: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }
    if (fileKey === '506') {
      const headers = COLUMN_HEADERS['506'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform506Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 506: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    const sampleColCount = rows[0].length + 1;
    const headers = COLUMN_HEADERS[fileKey] || generateFallbackHeaders(sampleColCount, fileKey);
    const enrichedRows: string[][] = [headers];

    let pedimentosBuild = 0;
    let pedimentosInvalid = 0;

    for (const row of dataRows) {
      if (row.length < 3) {
        enrichedRows.push(['', ...row]);
        pedimentosInvalid++;
        continue;
      }

      const patente = row[0].trim();
      const indice = row[1].trim();
      const seccion = row[2].trim();

      if (patente && indice && seccion && /^\d+$/.test(patente) && /^\d+$/.test(indice) && /^\d+$/.test(seccion)) {
        const yy = String(detectedYear % 100).padStart(2, '0');
        const pedimento = buildPedimentoUnificado(patente, indice, seccion, yy);
        enrichedRows.push([pedimento, ...row]);
        pedimentosBuild++;
      } else {
        enrichedRows.push(['', ...row]);
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
    for (let i = 1; i < enrichedData['501'].length; i++) {
      const ped = enrichedData['501'][i][0];
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

  for (const [fileKey, rows] of Object.entries(data)) {
    if (rows.length <= 1) continue;

    let invalidCount = 0;
    let emptyCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const pedimento = rows[i][0];
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
      if (data['501'][i][0]) pedimentos501.add(data['501'][i][0]);
    }

    let orphanCount = 0;
    for (let i = 1; i < data['551'].length; i++) {
      const ped = data['551'][i][0];
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
