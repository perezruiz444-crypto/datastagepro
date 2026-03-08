import { ProcessedData } from '@/types/dataStage';
import { COLUMN_HEADERS, PEDIMENTO_REGEX, generateFallbackHeaders } from '@/constants/dataStage';

/**
 * Construye el Pedimento Unificado en formato AA-AAA-AAAA-AAAAAAA
 * AA = año (2 dígitos)
 * AAA = sección aduanera (3 dígitos) 
 * AAAA = patente (4 dígitos)
 * AAAAAAA = número de pedimento/índice (7 dígitos)
 */
export const buildPedimentoUnificado = (
  patente: string,
  indice: string,
  seccion: string,
  year: number
): string => {
  const yy = String(year % 100).padStart(2, '0');
  const sec = seccion.padStart(3, '0');
  const pat = patente.padStart(4, '0');
  const idx = indice.padStart(7, '0');
  return `${yy}-${sec}-${pat}-${idx}`;
};

/**
 * Intenta detectar el año a partir de un campo de fecha YYYYMMDD o DD/MM/YYYY en los datos del 501.
 * Si no puede, usa el año proporcionado como fallback.
 */
const detectYearFromData = (data501: string[][] | undefined, fallbackYear: number): number => {
  if (!data501 || data501.length === 0) return fallbackYear;

  // Revisar las primeras filas del 501 buscando campos de fecha de 8 dígitos (YYYYMMDD)
  for (let i = 0; i < Math.min(data501.length, 20); i++) {
    const row = data501[i];
    for (const field of row) {
      const trimmed = field.trim();
      if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
        const year = parseInt(trimmed.substring(0, 4), 10);
        if (year >= 2010 && year <= 2099) {
          return year;
        }
      }
    }
  }

  return fallbackYear;
};

/**
 * Enriquece los datos procesados con la columna Pedimento Unificado y encabezados oficiales.
 * 
 * Para cada archivo:
 * 1. Prepende la columna "Pedimento" (YY-AAA-AAAA-AAAAAAA) construida desde cols 0,1,2
 * 2. Agrega fila de encabezados oficiales como primera fila
 * 
 * Estructura de cada archivo .asc (pipe-delimited):
 * - Col 0: Patente aduanal (4 chars)
 * - Col 1: Índice / Número de pedimento (7 chars) 
 * - Col 2: Clave de sección aduanera de despacho (3 chars)
 * - Col 3+: Campos específicos del archivo
 */
export const enrichWithPedimentoUnificado = (
  data: ProcessedData,
  fallbackYear: number,
  onLog: (message: string) => void
): ProcessedData => {
  const year = detectYearFromData(data['501'], fallbackYear);
  onLog(`📋 Año detectado para Pedimento Unificado: ${year}`);

  const enrichedData: ProcessedData = {};

  for (const [fileKey, rows] of Object.entries(data)) {
    if (rows.length === 0) {
      enrichedData[fileKey] = rows;
      continue;
    }

    // Determine column count (including the new Pedimento column)
    const sampleColCount = rows[0].length + 1;

    // Get official headers or generate fallback
    const headers = COLUMN_HEADERS[fileKey] || generateFallbackHeaders(sampleColCount, fileKey);

    // Build enriched rows: prepend Pedimento Unificado
    const enrichedRows: string[][] = [headers];

    // Detect if first row is a raw header (non-numeric patente/indice/seccion)
    const dataRows = rows.length > 0 && rows[0].length >= 3 &&
      (!/^\d+$/.test(rows[0][0].trim()) || !/^\d+$/.test(rows[0][1].trim()) || !/^\d+$/.test(rows[0][2].trim()))
      ? (onLog(`🔄 ${fileKey}: Encabezado original detectado y reemplazado`), rows.slice(1))
      : rows;

    let pedimentosBuild = 0;
    let pedimentosInvalid = 0;

    for (const row of dataRows) {
      if (row.length < 3) {
        // Row too short to extract pedimento components
        enrichedRows.push(['', ...row]);
        pedimentosInvalid++;
        continue;
      }

      const patente = row[0].trim();
      const indice = row[1].trim();
      const seccion = row[2].trim();

      // Validate components
      if (patente && indice && seccion && /^\d+$/.test(patente) && /^\d+$/.test(indice) && /^\d+$/.test(seccion)) {
        const pedimento = buildPedimentoUnificado(patente, indice, seccion, year);
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

  // Check for critical files
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

  // Validate pedimento format in all files
  for (const [fileKey, rows] of Object.entries(data)) {
    if (rows.length <= 1) continue; // Only header or empty

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

  // Cross-validate: check pedimentos in partidas exist in datos generales
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
