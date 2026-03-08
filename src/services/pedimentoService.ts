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
 * Transforma una fila cruda del archivo 507 en la fila de salida de 10 columnas.
 */
const transform507Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(7);
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
    get(3),                        // Identificador del caso
    get(3),                        // Descripción del Identificador (valor crudo, sin traducción)
    get(4),                        // Complemento 1
    get(6),                        // Complemento 2
  ];
};

/**
 * Transforma una fila cruda del archivo 508 en la fila de salida de 16 columnas.
 */
const transform508Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(13);
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
    get(3),                        // Clave de institución emisora
    get(4),                        // Número de cuenta
    get(5),                        // Folio de la constancia
    formatDateYYYYMMDD(get(6)),    // Fecha de la constancia
    get(7),                        // Clave de tipo de cuenta
    get(8),                        // Clave de garantía
    get(9),                        // Valor unitario del título
    get(10),                       // Total de la garantía
    get(11),                       // Cantidad en unidades de medida del precio estimado
    get(12),                       // Títulos asignados
  ];
};

/**
 * Transforma una fila cruda del archivo 509 en la fila de salida de 12 columnas.
 */
const transform509Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(7);
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
    get(3),                        // Clave de contribución
    get(3),                        // Contribución (valor crudo, sin catálogo)
    get(3),                        // Descripción de la contribución (valor crudo, sin catálogo)
    get(4),                        // Tasa de la contribución
    get(5),                        // Clave de tipo de la tasa
    get(5),                        // Descripción de la tasa (valor crudo, sin catálogo)
  ];
};

/**
 * Transforma una fila cruda del archivo 510 en la fila de salida de 11 columnas.
 */
const transform510Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(7);
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
    get(3),                        // Clave de contribución
    get(3),                        // Descripción de la contribución (valor crudo, sin catálogo)
    get(4),                        // Clave de forma de pago
    get(4),                        // Descripción forma de pago (valor crudo, sin catálogo)
    get(5),                        // Importe del pago
  ];
};

/**
 * Transforma una fila cruda del archivo 511 en la fila de salida de 9 columnas.
 */
const transform511Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(6);
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
    get(3),                        // Secuencia de la observación
    get(4),                        // Observaciones
    formatDateYYYYMMDD(fechaPago), // Fecha de validación o de pago real
  ];
};

/**
 * Transforma una fila cruda del archivo 512 en la fila de salida de 13 columnas.
 * Construye dos llaves: Pedimento (llave A) y Pedimento original (llave B).
 */
/**
 * Transforma una fila cruda del archivo 520 en la fila de salida de 9 columnas.
 * Construye dirección concatenando múltiples campos.
 */
const transform520Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(11);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  // Dirección: idx 5 (Calle) + idx 7 (NumExt) + idx 6 (NumInt) + idx 8 (CP) + idx 9 (Municipio) + idx 10 (País)
  const direccion = [get(5), get(7), get(6), get(8), get(9), get(10)]
    .filter(Boolean).join(' ');

  return [
    pedimento,
    get(2),                        // Clave de sección aduanera de despacho
    ctx.tipoOperacion,             // Tipo de Operación (desde 501)
    ctx.clave,                     // Clave (desde 501)
    ctx.tipoPedimento,             // Tipo de Pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago), // Fecha de pago
    get(3),                        // Identificación fiscal del destinatario
    get(4),                        // Nombre del destinatario de la mercancía
    direccion,                     // Dirección Destinatario
  ];
};

/**
 * Transforma una fila cruda del archivo 551 en la fila de salida de 34 columnas.
 * Incluye cálculo de Precio Unitario USD = ValorDolares / CantidadUMComercial.
 */
const transform551Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(29);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  // Precio Unitario USD = ValorDolares (idx10) / CantidadUMComercial (idx11)
  const valorDolares = parseFloat(get(10)) || 0;
  const cantComercial = parseFloat(get(11)) || 0;
  const precioUnitarioUSD = cantComercial !== 0 ? (valorDolares / cantComercial).toString() : '0';

  return [
    pedimento,
    get(2),                        // Clave de sección aduanera de despacho
    ctx.tipoOperacion,             // Tipo de Operación (desde 501)
    ctx.clave,                     // Clave de Pedimento (desde 501)
    ctx.tipoPedimento,             // Tipo de Pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago), // Fecha de Pago Real
    get(3),                        // Fracción arancelaria
    get(4),                        // Secuencia de la fracción arancelaria
    get(5),                        // Subdivisión de la fracción arancelaria
    get(6),                        // Descripción de la mercancía
    get(7),                        // Precio Unitario MN
    get(8),                        // Valor Aduana MN Pedimento
    get(9),                        // Valor Comercial MN Pedimento
    get(10),                       // Valor en dólares
    get(11),                       // Cantidad de mercancía en unidades de medida comercial
    get(12),                       // Clave de unidad de medida comercial
    get(12),                       // Unidad de medida comercial (valor crudo, sin catálogo)
    get(13),                       // Cantidad de mercancía en unidades de medida de la tarifa
    get(14),                       // Clave de unidad de medida de la tarifa
    get(14),                       // Unidad de Tarifa (valor crudo, sin catálogo)
    get(15),                       // Valor agregado
    get(16),                       // Clave de vinculación
    get(17),                       // Clave de método de valorización
    get(17),                       // Descripción de método de valorización (valor crudo, sin catálogo)
    get(18),                       // Código de la mercancía o producto
    get(19),                       // Marca de la mercancía o producto
    get(20),                       // Modelo de la mercancía o producto
    get(21),                       // Clave de país origen / destino
    get(22),                       // Clave de país Comprador / vendedor
    get(23),                       // Clave de entidad federativa de origen
    get(24),                       // Clave de entidad federativa de destino
    get(25),                       // Clave de entidad federativa del comprador
    get(26),                       // Clave de entidad federativa del vendedor
    precioUnitarioUSD,             // Precio Unitario USD (calculado)
  ];
};

/**
 * Transforma una fila cruda del archivo 552 en la fila de salida de 10 columnas.
 * VIN y todos los campos se mantienen como texto.
 */
const transform552Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(7);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  return [
    pedimento,
    get(2),                        // Clave de sección aduanera de despacho
    ctx.tipoOperacion,             // Tipo de Operación (desde 501)
    ctx.clave,                     // Clave de Pedimento (desde 501)
    ctx.tipoPedimento,             // Tipo de Pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago), // Fecha de pago real
    get(3),                        // Fracción arancelaria
    get(4),                        // Secuencia de la fracción arancelaria
    get(5),                        // VIN o número de serie
    get(6),                        // Kilometraje del vehículo
  ];
};

/**
 * Transforma una fila cruda del archivo 553 en la fila de salida de 14 columnas.
 * Todos los campos se mantienen como texto. Descripción del permiso = valor crudo de idx 5.
 */
const transform553Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(10);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  return [
    pedimento,
    get(2),                        // Clave de sección aduanera de despacho
    ctx.tipoOperacion,             // Tipo de Operación (desde 501)
    ctx.clave,                     // Clave de Pedimento (desde 501)
    ctx.tipoPedimento,             // Tipo de Pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago), // Fecha de pago real
    get(3),                        // Fracción arancelaria
    get(4),                        // Secuencia de la fracción arancelaria
    get(5),                        // Clave del permiso
    get(5),                        // Descripción del permiso (valor crudo, sin catálogo)
    get(6),                        // Firma de descargo
    get(7),                        // Número del permiso
    get(8),                        // Valor comercial en dólares
    get(9),                        // Cantidad de mercancía en unidades de medida de la tarifa
  ];
};

/**
 * Transforma una fila cruda del archivo 554 en la fila de salida de 12 columnas.
 * Todos los campos se mantienen como texto. Descripción del Identificador = valor crudo de idx 5.
 */
const transform554Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(8);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  return [
    pedimento,
    get(2),                        // Clave de sección aduanera de despacho
    ctx.tipoOperacion,             // Tipo de Operación (desde 501)
    ctx.clave,                     // Clave de Pedimento (desde 501)
    ctx.tipoPedimento,             // Tipo de Pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago), // Fecha de Pago Real
    get(3),                        // Fracción arancelaria
    get(4),                        // Secuencia de la fracción arancelaria
    get(5),                        // Clave de caso
    get(5),                        // Descripción del Identificador (valor crudo, sin catálogo)
    get(6),                        // Identificador del caso
    get(7),                        // Complemento del caso
  ];
};

const transform512Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  // Llave A: Pedimento — año desde idx 12
  const fechaPago = get(12);
  const yyA = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yyA);

  // Llave B: Pedimento original — año desde idx 7
  const fechaOpOrig = get(7);
  const yyB = extractYearFromDateField(fechaOpOrig);
  const pedimentoOriginal = buildPedimentoUnificado(get(3), get(4), get(5), yyB);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  return [
    pedimento,                          // Pedimento (Llave A)
    get(2),                             // Clave de sección aduanera de despacho
    ctx.tipoOperacion,                  // Tipo de Operación (desde 501)
    ctx.clave,                          // Clave (desde 501)
    ctx.tipoPedimento,                  // Tipo de Pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago),      // Fecha de pago
    pedimentoOriginal,                  // Pedimento original (Llave B)
    get(6),                             // Clave de pedimento original
    formatDateYYYYMMDD(fechaOpOrig),    // Fecha de la operación original
    get(8),                             // Fracción arancelaria original
    get(9),                             // Clave de unidad de medida original
    get(9),                             // Unidad de medida original (valor crudo, sin catálogo)
    get(10),                            // Cantidad de mercancía descargada
  ];
};

/**
 * Transforma una fila cruda del archivo 555 en la fila de salida de 17 columnas.
 * Cuentas Aduaneras de Garantía de la Partida. Dos fechas: idx 14 y idx 8.
 */
const transform555Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(14);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  return [
    pedimento,
    get(2),                        // Clave de sección aduanera de despacho
    ctx.tipoOperacion,             // Tipo de Operación (desde 501)
    ctx.clave,                     // Clave de Pedimento (desde 501)
    ctx.tipoPedimento,             // Tipo de Pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago), // Fecha de pago real
    get(3),                        // Fracción arancelaria
    get(4),                        // Secuencia de la fracción arancelaria
    get(5),                        // Clave de institución emisora
    get(6),                        // Número de cuenta
    get(7),                        // Folio de la constancia
    formatDateYYYYMMDD(get(8)),    // Fecha de la constancia
    get(9),                        // Clave de garantía
    get(10),                       // Valor unitario del título
    get(11),                       // Total de la garantía
    get(12),                       // Cantidad en unidades de medida del precio estimado
    get(13),                       // Títulos asignados
  ];
};

/**
 * Construye lookup de contexto desde la tabla 501 ya enriquecida.

/**
 * Transforma una fila cruda del archivo 556 en la fila de salida de 13 columnas.
 * Tasas de la Partida. Campos idx 5 y idx 7 duplicados (clave + descripción cruda).
 */
const transform556Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(8);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  return [
    pedimento,
    get(2),                        // Clave de sección aduanera de despacho
    ctx.tipoOperacion,             // Tipo de Operación (desde 501)
    ctx.clave,                     // Clave de Pedimento (desde 501)
    ctx.tipoPedimento,             // Tipo de Pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago), // Fecha de pago real
    get(3),                        // Fracción arancelaria
    get(4),                        // Secuencia de la fracción arancelaria
    get(5),                        // Clave de contribución
    get(5),                        // Descripción de la contribución (valor crudo, sin catálogo)
    get(6),                        // Tasa de la contribución
    get(7),                        // Clave de tipo de la tasa
    get(7),                        // Descripción de la tasa (valor crudo, sin catálogo)
  ];
};

/**
 * Transforma una fila cruda del archivo 557 en la fila de salida de 13 columnas.
 * Contribuciones de la Partida. Campos idx 5 y idx 6 duplicados (clave + descripción cruda).
 */
const transform557Row = (row: string[], lookup501: Map<string, Context501>): string[] => {
  const get = (idx: number): string => (idx < row.length ? row[idx].trim() : '');

  const fechaPago = get(8);
  const yy = extractYearFromDateField(fechaPago);
  const pedimento = buildPedimentoUnificado(get(0), get(1), get(2), yy);

  const ctx = lookup501.get(pedimento) || { tipoOperacion: '', clave: '', tipoPedimento: '', fechaRecepcion: '' };

  return [
    pedimento,
    get(2),                        // Clave de sección aduanera de despacho
    ctx.tipoOperacion,             // Tipo de Operación (desde 501)
    ctx.clave,                     // Clave de Pedimento (desde 501)
    ctx.tipoPedimento,             // Tipo de Pedimento (desde 501)
    formatDateYYYYMMDD(fechaPago), // Fecha de pago real
    get(3),                        // Fracción arancelaria
    get(4),                        // Secuencia de la fracción arancelaria
    get(5),                        // Clave de contribución
    get(5),                        // Descripción de la contribución (valor crudo, sin catálogo)
    get(6),                        // Clave de forma de pago
    get(6),                        // Descripción forma de pago (valor crudo, sin catálogo)
    get(7),                        // Importe del pago
  ];
};

/** Construye el mapa de contexto desde la tabla 501 enriquecida. */
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

    if (fileKey === '507') {
      const headers = COLUMN_HEADERS['507'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform507Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 507: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '508') {
      const headers = COLUMN_HEADERS['508'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform508Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 508: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '509') {
      const headers = COLUMN_HEADERS['509'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform509Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 509: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '510') {
      const headers = COLUMN_HEADERS['510'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform510Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 510: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '511') {
      const headers = COLUMN_HEADERS['511'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform511Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 511: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '512') {
      const headers = COLUMN_HEADERS['512'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform512Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 512: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '551') {
      const headers = COLUMN_HEADERS['551'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform551Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 551: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '552') {
      const headers = COLUMN_HEADERS['552'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform552Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 552: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '553') {
      const headers = COLUMN_HEADERS['553'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform553Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 553: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '554') {
      const headers = COLUMN_HEADERS['554'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform554Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 554: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '555') {
      const headers = COLUMN_HEADERS['555'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform555Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 555: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '556') {
      const headers = COLUMN_HEADERS['556'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform556Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 556: ${validCount} registros transformados (${invalidCount} inválidos)`);
      continue;
    }

    if (fileKey === '520') {
      const headers = COLUMN_HEADERS['520'];
      const enrichedRows: string[][] = [headers];
      let validCount = 0;
      let invalidCount = 0;

      for (const row of dataRows) {
        if (row.length < 3) { invalidCount++; continue; }
        try {
          enrichedRows.push(transform520Row(row, context501));
          validCount++;
        } catch (e) { invalidCount++; }
      }

      enrichedData[fileKey] = enrichedRows;
      onLog(`✅ 520: ${validCount} registros transformados (${invalidCount} inválidos)`);
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
