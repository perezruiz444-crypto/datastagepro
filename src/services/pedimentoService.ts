import { ProcessedData } from '@/types/dataStage';
import { PEDIMENTO_REGEX, PEDIMENTO_UNIFICADO_INDEX } from '@/constants/dataStage';

export const normalizeColumn = (name: string): string => name.trim().toLowerCase().replace(/[_\s-]/g, '');

export const findPedimentoUnificadoCol = (header: string[]): number =>
  header.findIndex(name => normalizeColumn(name) === 'pedimentounificado');

/** Solo normaliza las partes de la clave; nunca modifica los datos originales. */
export const buildPedimentoUnificado = (
  patente: string, pedimento: string, seccion: string, year: string,
): string => {
  const pad = (value: string, width: number) => value.trim().replace(/\.0$/, '').padStart(width, '0');
  return `${pad(year.slice(-2), 2)}-${pad(seccion, 3)}-${pad(patente, 4)}-${pad(pedimento, 7)}`;
};

/** Año canónico del ZIP: Fecha_Inicial de Resumen, nunca la fecha de pago. */
export const getYearFromResumen = (data: ProcessedData): string | undefined => {
  const rows = data['Resumen'];
  if (!rows?.length) return undefined;
  const index = rows[0].findIndex(name => ['fechainicial', 'fechainicialconsulta'].includes(normalizeColumn(name)));
  const match = index >= 0 ? rows[1]?.[index]?.trim().match(/^(\d{4})/) : undefined;
  return match?.[1];
};

/** Añade una sola columna y conserva encabezados, orden y valores originales. */
export const enrichWithPedimentoUnificado = (
  data: ProcessedData,
  onLog: (message: string) => void,
  year = getYearFromResumen(data) ?? String(new Date().getFullYear()),
): ProcessedData => {
  const enriched: ProcessedData = {};
  for (const [key, rows] of Object.entries(data)) {
    if (!rows.length) continue;
    const [header, ...records] = rows;
    const existing = findPedimentoUnificadoCol(header);
    if (existing >= 0) {
      const indices = header.map((_, i) => i).filter(i => i !== existing);
      enriched[key] = [
        ['Pedimento_Unificado', ...indices.map(i => header[i])],
        ...records.map(row => [row[existing] ?? '', ...indices.map(i => row[i] ?? '')]),
      ];
      continue;
    }
    const indexOf = (name: string) => header.findIndex(h => normalizeColumn(h) === name);
    const patente = indexOf('patente');
    const pedimento = indexOf('pedimento');
    const seccion = indexOf('seccionaduanera');
    enriched[key] = [
      ['Pedimento_Unificado', ...header],
      ...records.map(row => [
        buildPedimentoUnificado(row[patente] ?? '', row[pedimento] ?? '', row[seccion] ?? '', year),
        ...header.map((_, i) => row[i] ?? ''),
      ]),
    ];
    onLog(`✅ ${key}: ${records.length} registros; columnas originales conservadas`);
  }
  return enriched;
};

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
