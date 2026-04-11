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
  'Inci': 'Inci - Incidencias / Reconocimiento',
  'Sel': 'Sel - Selección Automatizada / Semáforo Fiscal',
  'Resumen': 'Resumen - Control de Extracción',
};

export const CRITICAL_FILES = ['501', '551'];

/** Nombres limpios para exportación (sin prefijos basura). */
export const CLEAN_FILE_NAMES: Record<string, string> = {
  '501': '501_DatosGenerales',
  '502': '502_Transporte',
  '503': '503_Guias',
  '504': '504_Contenedores',
  '505': '505_Facturas',
  '506': '506_Fechas',
  '507': '507_Casos',
  '508': '508_CtasAduaneras',
  '509': '509_Tasas',
  '510': '510_Contribuciones',
  '511': '511_Observaciones',
  '512': '512_Descargos',
  '520': '520_Destinatarios',
  '551': '551_Partidas',
  '552': '552_Mercancias',
  '553': '553_Permisos',
  '554': '554_CasosPartida',
  '555': '555_CtasPartida',
  '556': '556_TasasPartida',
  '557': '557_ContribPartida',
  '558': '558_ObsPartida',
  '701': '701_Rectificaciones',
  '702': '702_DifContrib',
  'Inci': 'Inci_Incidencias',
  'Sel': 'Sel_Seleccion',
  'Resumen': 'Resumen',
};

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Regex para validar formato de pedimento unificado: AA-AAA-AAAA-AAAAAAA
export const PEDIMENTO_REGEX = /^\d{2}-\d{3}-\d{4}-\d{7}$/;

// Archivos a nivel pedimento
export const PEDIMENTO_LEVEL_FILES = ['501', '502', '503', '504', '505', '506', '507', '508', '509', '510', '511', '512', '520', '701', '702', 'Inci', 'Sel'];

// Archivos a nivel partida
export const PARTIDA_LEVEL_FILES = ['551', '552', '553', '554', '555', '556', '557', '558'];

/** Índice de la columna PedimentoUnificado (Índice 5 = 6ta columna) */
export const PEDIMENTO_UNIFICADO_INDEX = 5;

/** Columnas prefijo estándar para todas las tablas (excepto Resumen) */
const STD_PREFIX = ['Mes', 'Anio', 'Patente', 'Pedimento', 'SeccionAduanera', 'PedimentoUnificado'];

export const COLUMN_HEADERS: Record<string, string[]> = {
  '501': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaRecepcion', 'FechaPago',
    'CurpContribuyente', 'RFC', 'CurpAgente',
    'TipoCambio', 'Fletes', 'Seguros', 'Embalajes', 'OtrosIncrementales', 'OtrosDeducibles',
    'PesoBrutoMercancia',
    'MedioTransporteSalida', 'MedioTransporteArribo', 'MedioTransporteEntradaSalida',
    'DestinoMercancia', 'SeccionAduaneraEntrada', 'NombreContribuyente',
    'Calle', 'NumInterior', 'NumExterior', 'CodigoPostal', 'Municipio', 'EntidadFederativa', 'Pais',
    'TransporteDecrementables', 'SeguroDecrementables', 'CargaDecrementables', 'DescargaDecrementables', 'OtrosDecrementables',
  ],
  '502': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPago',
    'RfcTransportista', 'CurpTransportista', 'NombreTransportista', 'PaisTransporte', 'IdentificadorTransporte',
  ],
  '503': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPago',
    'NumeroGuia', 'TipoGuia',
  ],
  '504': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPago',
    'NumeroContenedor', 'TipoContenedor',
  ],
  '505': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaRecepcion', 'FechaPago',
    'NumeroFactura', 'FechaFacturacion', 'TerminoFacturacion',
    'ValorDolares', 'MonedaFacturacion', 'ValorMonedaExtranjera', 'PaisFacturacion',
    'Proveedor', 'IdFiscalProveedor',
    'CodigoPostalProveedor', 'CalleProveedor', 'NumInteriorProveedor', 'NumExteriorProveedor', 'MunicipioProveedor', 'PaisProveedor',
  ],
  '506': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPago',
    'TipoFecha', 'FechaOperacion', 'FechaPagoReal',
  ],
  '507': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPago',
    'IdentificadorCaso', 'Complemento1', 'Complemento2', 'Complemento3',
  ],
  '508': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPago',
    'InstitucionEmisora', 'NumeroCuenta', 'FolioConstancia', 'FechaConstancia',
    'TipoCuenta', 'ClaveGarantia', 'ValorUnitarioTitulo', 'TotalGarantia',
    'CantidadUMPrecioEstimado', 'TitulosAsignados',
  ],
  '509': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPago',
    'ClaveContribucion', 'TasaContribucion', 'ClaveTipoTasa',
  ],
  '510': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPago',
    'ClaveContribucion', 'ClaveFormaPago', 'ImportePago',
  ],
  '511': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPago',
    'SecuenciaObservacion', 'Observaciones', 'FechaPagoReal',
  ],
  '512': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPago',
    'PedimentoOriginalUnificado', 'ClavePedimentoOriginal', 'FechaOperacionOriginal',
    'FraccionArancelariaOriginal', 'ClaveUMOriginal', 'CantidadDescargada',
  ],
  '520': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPago',
    'IdFiscalDestinatario', 'NombreDestinatario',
    'CalleDestinatario', 'NumInteriorDestinatario', 'NumExteriorDestinatario',
    'CodigoPostalDestinatario', 'MunicipioDestinatario', 'PaisDestinatario',
  ],
  '551': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPagoReal',
    'FraccionArancelaria', 'SecuenciaFraccion', 'SubdivisionFraccion', 'DescripcionMercancia',
    'PrecioUnitarioMN', 'ValorAduanaMN', 'ValorComercialMN', 'ValorDolares',
    'CantidadUMComercial', 'ClaveUMComercial',
    'CantidadUMTarifa', 'ClaveUMTarifa',
    'ValorAgregado', 'ClaveVinculacion', 'ClaveMetodoValorizacion',
    'CodigoMercancia', 'MarcaMercancia', 'ModeloMercancia',
    'PaisOrigenDestino', 'PaisCompradorVendedor',
    'EntidadFederativaOrigen', 'EntidadFederativaDestino', 'EntidadFederativaComprador', 'EntidadFederativaVendedor',
    'PrecioUnitarioUSD',
  ],
  '552': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPagoReal',
    'FraccionArancelaria', 'SecuenciaFraccion', 'VIN', 'Kilometraje',
  ],
  '553': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPagoReal',
    'FraccionArancelaria', 'SecuenciaFraccion',
    'ClavePermiso', 'FirmaDescargo', 'NumeroPermiso', 'ValorComercialDolares', 'CantidadUMTarifa',
  ],
  '554': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPagoReal',
    'FraccionArancelaria', 'SecuenciaFraccion',
    'ClaveCaso', 'IdentificadorCaso', 'ComplementoCaso',
  ],
  '555': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPagoReal',
    'FraccionArancelaria', 'SecuenciaFraccion',
    'InstitucionEmisora', 'NumeroCuenta', 'FolioConstancia', 'FechaConstancia',
    'ClaveGarantia', 'ValorUnitarioTitulo', 'TotalGarantia',
    'CantidadUMPrecioEstimado', 'TitulosAsignados',
  ],
  '556': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPagoReal',
    'FraccionArancelaria', 'SecuenciaFraccion',
    'ClaveContribucion', 'TasaContribucion', 'ClaveTipoTasa',
  ],
  '557': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPagoReal',
    'FraccionArancelaria', 'SecuenciaFraccion',
    'ClaveContribucion', 'ClaveFormaPago', 'ImportePago',
  ],
  '558': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPagoReal',
    'FraccionArancelaria', 'SecuenciaFraccion',
    'SecuenciaObservacion', 'Observaciones',
  ],
  '701': [
    ...STD_PREFIX,
    'TipoOperacion', 'TipoPedimento',
    'FechaPagoReal', 'ClaveDocumento', 'FechaPago',
    'PedimentoAnteriorUnificado', 'DocumentoAnterior', 'FechaOperacionAnterior',
    'PedimentoOriginalCrudo', 'PatenteOriginal', 'SeccionAduaneraOriginal',
    'NumPedimentoAnteriorCrudo', 'PatenteAnterior',
  ],
  '702': [
    ...STD_PREFIX,
    'TipoOperacion', 'Clave', 'TipoPedimento', 'FechaPagoReal',
    'ClaveContribucion', 'ClaveFormaPago', 'ImportePago',
  ],
  'Inci': [
    ...STD_PREFIX,
    'TipoOperacion', 'ClaveDocumento', 'ConsecutivoRemesa', 'NumeroSeleccion',
    'FechaInicioReconocimiento', 'HoraInicioReconocimiento', 'FechaFinReconocimiento', 'HoraFinReconocimiento',
    'FraccionArancelaria', 'SecuenciaFraccion', 'GradoIncidencia', 'FechaSeleccion', 'PatenteOriginalCruda',
  ],
  'Sel': [
    ...STD_PREFIX,
    'TipoOperacion', 'ClaveDocumento', 'ConsecutivoRemesa', 'NumeroSeleccion',
    'FechaSeleccion', 'HoraSeleccion', 'ResultadoSemaforoFiscal', 'PatenteOriginalCruda',
  ],
  'Resumen': [
    'FolioExtraccion', 'RfcPatenteConsultada', 'FechaInicialConsulta', 'FechaFinalConsulta',
    'FechaEjecucionSAT', 'TotalFraccionesExtraidas', 'TotalContribucionesExtraidas',
  ],
};

/**
 * Genera encabezados genéricos para archivos sin definición oficial.
 */
export const generateFallbackHeaders = (columnCount: number, _fileKey: string): string[] => {
  const headers = ['Mes', 'Anio', 'Patente', 'Pedimento', 'SeccionAduanera', 'PedimentoUnificado'];
  for (let i = headers.length; i < columnCount; i++) {
    headers.push(`Campo${i - 5}`);
  }
  return headers;
};
