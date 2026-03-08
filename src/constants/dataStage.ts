// Nombres oficiales basados en el documento de la ANAM (Agencia Nacional de Aduanas de México)
export const FILE_NAMES: Record<string, string> = {
  '501': '501 - Datos generales',
  '502': '502 - Transporte',
  '503': '503 - Guías',
  '504': '504 - Contenedores',
  '505': '505 - Facturas',
  '506': '506 - Fechas del pedimento',
  '507': '507 - Casos del pedimento',
  '508': '508 - Ctas aduaneras garantía',
  '509': '509 - Tasas del pedimento',
  '510': '510 - Contribuciones pedimento',
  '511': '511 - Observaciones pedimento',
  '512': '512 - Descargos de mercancías',
  '520': '520 - Destinatarios mercancía',
  '551': '551 - Partidas',
  '552': '552 - Mercancías',
  '553': '553 - Permisos de la partida',
  '554': '554 - Casos de la partida',
  '555': '555 - Ctas aduaneras (partida)',
  '556': '556 - Tasas contrib (partida)',
  '557': '557 - Contribuciones partida',
  '558': '558 - Observaciones partida',
  '701': '701 - Rectificaciones',
  '702': '702 - Diferencias contrib',
};

export const CRITICAL_FILES = ['501', '551'];

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Regex para validar formato de pedimento unificado: AA-AAA-AAAA-AAAAAAA
export const PEDIMENTO_REGEX = /^\d{2}-\d{3}-\d{4}-\d{7}$/;

// Archivos a nivel pedimento (relación por Patente + Índice + Sección)
export const PEDIMENTO_LEVEL_FILES = ['501', '502', '503', '504', '505', '506', '507', '508', '509', '510', '511', '512', '520', '701', '702'];

// Archivos a nivel partida (relación por Patente + Índice + Sección + Fracción + Secuencia)
export const PARTIDA_LEVEL_FILES = ['551', '552', '553', '554', '555', '556', '557', '558'];

/**
 * Encabezados oficiales por archivo, basados en "Descripción de Campos" de la ANAM.
 * La primera columna "Pedimento" se agrega automáticamente por el enriquecimiento.
 * Los campos corresponden a las columnas del archivo .asc original (pipe-delimited).
 * Ref: https://www.anam.gob.mx/wp-content/uploads/2022/08/Descripcion-de-Campos-1.pdf
 */
export const COLUMN_HEADERS: Record<string, string[]> = {
  '501': [
    'Pedimento',
    'Clave de sección aduanera de despacho',
    'Tipo de Operación',
    'Clave',
    'Tipo de Pedimento',
    'Fecha de recepción de pedimento',
    'Fecha de pago',
    'Tipo de cambio',
    'Fletes',
    'Seguros',
    'Embalajes',
    'Otros incrementales',
    'Otros deducibles',
    'Peso bruto de la mercancía',
    'Clave de medio de transporte de salida',
    'Descripción Clave de medio de transporte de salida',
    'Clave de medio de transporte de arribo',
    'Descripción Clave de medio de transporte de arribo',
    'Clave de medio de transporte de entrada o salida del país',
    'Descripción Clave de medio de transporte de entrada o salida del país',
    'Clave de destino de la mercancía',
    'Descripción destino de la mercancía',
    'Clave de sección aduanera de entrada',
    'CURP del agente o apoderado aduanal',
    'Nombre del contribuyente',
    'Dirección del contribuyente',
    'Transporte (Decrementables)',
    'Seguro (Decrementables)',
    'Carga (Decrementables)',
    'Descarga (Decrementables)',
    'Otros Decrementables',
  ],
  '502': [
    'Pedimento',
    'Clave de sección aduanera de despacho',
    'Tipo de Operación',
    'Clave',
    'Tipo de Pedimento',
    'Fecha de pago',
    'RFC del transportista',
    'CURP del transportista',
    'Nombre del transportista',
    'Clave de país del transporte',
    'Identificador del transporte',
  ],
  '503': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Tipo Guía', 'Número Guía', 'Fecha Pago',
  ],
  '504': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Tipo Contenedor', 'Número Contenedor', 'Fecha Pago',
  ],
  '505': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Fecha Facturación', 'Término Facturación', 'Moneda Facturación',
    'Valor Dólares', 'Valor Moneda Extranjera', 'País Facturación',
    'Entidad Federativa Facturación', 'Fecha Pago',
  ],
  '506': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Tipo Fecha', 'Fecha Operación', 'Fecha Pago',
  ],
  '507': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Clave Caso', 'Identificador Caso', 'Fecha Pago',
  ],
  '509': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Clave Contribución', 'Tasa Contribución', 'Tipo Tasa', 'Fecha Pago',
  ],
  '510': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Clave Contribución', 'Forma Pago', 'Importe Pago', 'Fecha Pago',
  ],
  '512': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Patente Original', 'Índice Original', 'Sección Original',
    'Clave Doc. Original', 'Fecha Op. Original', 'Fracción Original',
    'Unidad Medida Original', 'Cantidad Descargada', 'Fecha Pago',
  ],
  '520': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'País Destinatario', 'Fecha Pago',
  ],
  '551': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Fracción Arancelaria', 'Secuencia', 'Subdivisión',
    'Descripción Mercancía', 'Precio Unitario', 'Valor Aduana',
    'Valor Comercial', 'Valor Dólares',
    'Cant. Unidad Comercial', 'Unidad Medida Comercial',
    'Cant. Unidad Tarifa', 'Unidad Medida Tarifa',
    'Valor Agregado', 'Vinculación', 'Método Valoración',
    'Código Mercancía', 'Marca', 'Modelo',
    'País Origen/Destino', 'País Comprador/Vendedor',
    'Entidad Origen', 'Entidad Destino',
    'Entidad Comprador', 'Entidad Vendedor', 'Fecha Pago',
  ],
  '552': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Fracción Arancelaria', 'Secuencia', 'Kilometraje', 'Fecha Pago',
  ],
  '553': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Fracción Arancelaria', 'Secuencia', 'Clave Permiso',
    'Valor Comercial Dólares', 'Cant. Unidad Tarifa', 'Fecha Pago',
  ],
  '554': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Fracción Arancelaria', 'Secuencia', 'Clave Caso',
    'Identificador Caso', 'Fecha Pago',
  ],
  '556': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Fracción Arancelaria', 'Secuencia', 'Clave Contribución',
    'Tasa Contribución', 'Tipo Tasa', 'Fecha Pago',
  ],
  '557': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Fracción Arancelaria', 'Secuencia', 'Clave Contribución',
    'Forma Pago', 'Importe Pago', 'Fecha Pago',
  ],
  '701': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Patente Rectificada', 'Núm. Ped. Rectificado', 'Sección Rectificada',
    'Clave Documento Rectificado', 'Fecha Pago',
  ],
  '702': [
    'Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera',
    'Clave Contribución', 'Forma Pago Anterior', 'Importe Anterior',
    'Forma Pago Nuevo', 'Importe Nuevo', 'Fecha Pago',
  ],
};

/**
 * Genera encabezados genéricos para archivos sin definición oficial.
 * Siempre incluye "Pedimento" como primer campo.
 */
export const generateFallbackHeaders = (columnCount: number, fileKey: string): string[] => {
  const headers = ['Pedimento', 'Patente', 'Núm. Pedimento', 'Sección Aduanera'];
  for (let i = 4; i < columnCount; i++) {
    headers.push(`Campo ${i - 3}`);
  }
  return headers;
};
