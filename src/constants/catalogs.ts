/**
 * Utilidades de fecha para el procesamiento SAAI M3.
 * Las constantes de traducción (TIPO_OPERACION, MEDIO_TRANSPORTE, etc.)
 * fueron eliminadas para preservar datos crudos del .asc.
 */

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
  if (!value || !value.trim()) return '00';
  const trimmed = value.trim();

  if (trimmed.length >= 8 && /^\d{4}/.test(trimmed)) {
    const yearStr = trimmed.substring(0, 4);
    const short = yearStr.substring(2, 4);
    return /^\d{2}$/.test(short) ? short : '00';
  }

  const dmyMatch = trimmed.match(/^\d{2}[\/\-]\d{2}[\/\-](\d{4})/);
  if (dmyMatch) {
    return dmyMatch[1].substring(2, 4);
  }

  if (/^\d{4}$/.test(trimmed)) {
    return trimmed.substring(2, 4);
  }

  console.warn(`[extractYear] Formato no reconocido: "${trimmed}"`);
  return '00';
};
