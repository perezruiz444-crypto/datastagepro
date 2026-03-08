/**
 * Catálogos oficiales para resolución de descripciones en tablas SAAI M3.
 * Basados en los catálogos de la ANAM / SAT de México.
 */

/** Tipo de Operación (Índice 3 del 501) */
export const TIPO_OPERACION: Record<string, string> = {
  '1': 'Importación',
  '2': 'Exportación',
};

/** Tipo de Pedimento (Índice 28 del 501) */
export const TIPO_PEDIMENTO: Record<string, string> = {
  '1': 'Pedimento Normal',
  '2': 'Pedimento de Rectificación',
};

/** Medios de Transporte (Índices 16, 17, 18 del 501) */
export const MEDIO_TRANSPORTE: Record<string, string> = {
  '1': 'Marítimo.',
  '2': 'Ferroviario.',
  '3': 'Autotransporte.',
  '4': 'Aéreo.',
  '5': 'Postal.',
  '6': 'Fluvial.',
  '7': 'Carretero.',
  '8': 'Ductos.',
  '9': 'Otros.',
};

/** Destino de la Mercancía (Índice 19 del 501) */
export const DESTINO_MERCANCIA: Record<string, string> = {
  '1': 'Importación definitiva.',
  '2': 'Importación temporal.',
  '3': 'Depósito fiscal.',
  '4': 'Tránsito de mercancías.',
  '5': 'Elaboración, transformación o reparación en recinto fiscalizado.',
  '6': 'Recinto fiscalizado estratégico.',
  '7': 'Exportación definitiva.',
  '8': 'Exportación temporal.',
  '9': 'Interior del país',
};

/** Tipo de Guía (Índice 4 del 503) */
export const TIPO_GUIA: Record<string, string> = {
  'H': 'HOUSE',
  'M': 'MASTER',
};

/** Tipo de Fecha (Apéndice 21) */
export const TIPO_FECHA: Record<string, string> = {
  '1': 'ENTRADA',
  '2': 'PAGO',
  '3': 'EXTRACCIÓN',
  '5': 'PRESENTACIÓN',
  '6': 'IMPEX',
  '7': 'ORIGINAL',
};

/**
 * Formatea una fecha de YYYYMMDD a DD/MM/YYYY.
 * Si el formato no es válido, retorna el valor original.
 */
export const formatDateYYYYMMDD = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
    const yyyy = trimmed.substring(0, 4);
    const mm = trimmed.substring(4, 6);
    const dd = trimmed.substring(6, 8);
    return `${dd}/${mm}/${yyyy}`;
  }
  // Try ISO format YYYY-MM-DD
  if (trimmed.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [yyyy, mm, dd] = trimmed.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  return trimmed;
};

/**
 * Extrae los últimos 2 dígitos del año desde un campo de fecha.
 * Soporta: YYYYMMDD, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
 */
export const extractYearFromDateField = (value: string): string => {
  const trimmed = value.trim();
  let result = '00';

  // YYYYMMDD → year = primeros 4 caracteres
  if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
    result = trimmed.substring(0, 4).slice(-2);
  }
  // YYYY-MM-DD
  else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    result = trimmed.substring(0, 4).slice(-2);
  }
  // DD/MM/YYYY o DD-MM-YYYY
  else {
    const dmyMatch = trimmed.match(/^\d{2}[\/\-]\d{2}[\/\-](\d{4})$/);
    if (dmyMatch) {
      result = dmyMatch[1].slice(-2);
    }
  }

  // Debug: log primeros 5 valores para verificar
  if (!extractYearFromDateField._logged) extractYearFromDateField._logged = 0;
  if (extractYearFromDateField._logged < 5) {
    console.log(`[extractYear] input="${trimmed}" → year="${result}"`);
    extractYearFromDateField._logged++;
  }

  return result;
};
// Propiedad para limitar logs
(extractYearFromDateField as any)._logged = 0;
  const trimmed = value.trim();

  // YYYYMMDD → year = primeros 4 caracteres
  if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
    const year = trimmed.substring(0, 4);
    return year.substring(2, 4);
  }

  // YYYY-MM-DD → year = primeros 4 caracteres
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const year = trimmed.substring(0, 4);
    return year.substring(2, 4);
  }

  // DD/MM/YYYY o DD-MM-YYYY → year = últimos 4 caracteres
  const dmyMatch = trimmed.match(/^\d{2}[\/\-]\d{2}[\/\-](\d{4})$/);
  if (dmyMatch) {
    const year = dmyMatch[1];
    return year.substring(2, 4);
  }

  return '00';
};
