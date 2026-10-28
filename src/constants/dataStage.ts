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

/** El identificador generado ocupa siempre la primera columna. */
export const PEDIMENTO_UNIFICADO_INDEX = 0;
