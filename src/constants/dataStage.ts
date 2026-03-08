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
