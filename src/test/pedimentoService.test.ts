import { describe, it, expect } from 'vitest';
import { buildPedimentoUnificado, enrichWithPedimentoUnificado, validateProcessedData } from '@/services/pedimentoService';
import { ProcessedData } from '@/types/dataStage';

describe('buildPedimentoUnificado', () => {
  it('construye el formato AA-AAA-PPPP-PPPPPPP con padding correcto', () => {
    expect(buildPedimentoUnificado('3953', '6000098', '240', '26')).toBe('26-240-3953-6000098');
  });

  it('rellena Patente/Seccion/Pedimento con ceros a la izquierda cuando son cortos', () => {
    // El año NO se rellena (se usa tal cual, siempre 2 dígitos en uso real)
    expect(buildPedimentoUnificado('1', '1', '1', '5')).toBe('5-001-0001-0000001');
  });
});

describe('enrichWithPedimentoUnificado — tabla 501', () => {
  it('genera Pedimento_Unificado y extrae Mes/Año desde la fecha de pago (formato ISO con hora)', () => {
    // Header real (skipHeaderRow lo reconoce por los tokens 'patente'/'pedimento'/'seccionaduanera')
    const header501 = 'Patente|Pedimento|SeccionAduanera|TipoOperacion|Clave|SeccionAduaneraEntrada|CurpContribuyente|Rfc|CurpAgente|TipoCambio|Fletes|Seguros|Embalajes|OtrosIncrementales|OtrosDeducibles|PesoBrutoMercancia|MedioTransporteSalida|MedioTransporteArribo|MedioTransporteEntradaSalida|DestinoMercancia|NombreContribuyente|Calle|NumInterior|NumExterior|CodigoPostal|Municipio|EntidadFederativa|Pais|TipoPedimento|FechaRecepcion|FechaPago'.split('|');
    // idx: 0 Patente, 1 Pedimento, 2 SeccionAduanera, ...28 TipoPedimento, 29 FechaRecepcion, 30 FechaPago
    const row = [...Array(31).fill('')];
    row[0] = '3953';
    row[1] = '6000098';
    row[2] = '240';
    row[3] = '2';
    row[4] = 'RT';
    row[28] = '1';
    row[29] = '2026-01-05 17:40:22';
    row[30] = '2026-01-05 17:48:15';

    const data: ProcessedData = { '501': [header501, row] };
    const logs: string[] = [];
    const enriched = enrichWithPedimentoUnificado(data, (m) => logs.push(m));

    const enrichedRow = enriched['501'][1];
    expect(enrichedRow[0]).toBe('Enero');           // Mes
    expect(enrichedRow[1]).toBe('2026');             // Anio
    expect(enrichedRow[5]).toBe('26-240-3953-6000098'); // PedimentoUnificado
  });
});

describe('enrichWithPedimentoUnificado — tabla 551 (fracción arancelaria)', () => {
  it('calcula PrecioUnitarioUSD = ValorDolares / CantidadUMComercial', () => {
    const header501 = 'Patente|Pedimento|SeccionAduanera|TipoOperacion|Clave|SeccionAduaneraEntrada|CurpContribuyente|Rfc|CurpAgente|TipoCambio|Fletes|Seguros|Embalajes|OtrosIncrementales|OtrosDeducibles|PesoBrutoMercancia|MedioTransporteSalida|MedioTransporteArribo|MedioTransporteEntradaSalida|DestinoMercancia|NombreContribuyente|Calle|NumInterior|NumExterior|CodigoPostal|Municipio|EntidadFederativa|Pais|TipoPedimento|FechaRecepcion|FechaPago'.split('|');
    const row501 = [...Array(31).fill('')];
    row501[0] = '1769'; row501[1] = '6000343'; row501[2] = '480';
    row501[3] = '2'; row501[4] = 'A1'; row501[28] = '1';
    row501[29] = '2026-01-13 15:00:00'; row501[30] = '2026-01-13 15:57:02';

    const header551 = 'Patente|Pedimento|SeccionAduanera|TipoOperacion|Clave|TipoPedimento|FechaRecepcion|FraccionArancelaria|SecuenciaFraccion|DescripcionMercancia|ValorDolares|CantidadUMComercial|ClaveUMComercial|CantidadUMTarifa|ClaveUMTarifa|ValorAgregado|ClaveVinculacion|ClaveMetodoValorizacion|CodigoMercancia|MarcaMercancia|ModeloMercancia|PaisOrigenDestino|PaisCompradorVendedor|EntidadFederativaOrigen|EntidadFederativaDestino|EntidadFederativaComprador|EntidadFederativaVendedor|FechaPagoReal'.split('|');
    const row551 = [...Array(30).fill('')];
    row551[0] = '1769'; row551[1] = '6000343'; row551[2] = '480';
    row551[10] = '1976.88'; // ValorDolares
    row551[11] = '12.000';  // CantidadUMComercial
    row551[29] = '2026-01-13 15:57:02'; // FechaPagoReal (idx usado por buildPrefix en transform551Row: get(29))

    const data: ProcessedData = { '501': [header501, row501], '551': [header551, row551] };
    const enriched = enrichWithPedimentoUnificado(data, () => {});

    const enrichedRow = enriched['551'][1];
    const header = enriched['551'][0];
    const precioIdx = header.indexOf('PrecioUnitarioUSD');
    expect(precioIdx).toBeGreaterThan(-1);
    expect(parseFloat(enrichedRow[precioIdx])).toBeCloseTo(1976.88 / 12, 5);
  });
});

describe('validateProcessedData', () => {
  it('reporta archivos críticos faltantes (501, 551)', () => {
    const warnings = validateProcessedData({}, () => {});
    expect(warnings).toContain('Falta archivo crítico: 501 - Datos generales');
    expect(warnings).toContain('Falta archivo crítico: 551 - Partidas');
  });

  it('no reporta advertencias cuando los datos están completos y son válidos', () => {
    const header = ['Mes', 'Anio', 'Patente', 'Pedimento', 'SeccionAduanera', 'PedimentoUnificado'];
    const row501 = ['Enero', '2026', '1769', '6000343', '480', '26-480-1769-6000343'];
    const row551 = ['Enero', '2026', '1769', '6000343', '480', '26-480-1769-6000343'];
    const data: ProcessedData = { '501': [header, row501], '551': [header, row551] };
    const warnings = validateProcessedData(data, () => {});
    expect(warnings).toEqual([]);
  });

  it('detecta partidas (551) huérfanas sin pedimento correspondiente en 501', () => {
    const header = ['Mes', 'Anio', 'Patente', 'Pedimento', 'SeccionAduanera', 'PedimentoUnificado'];
    const row501 = ['Enero', '2026', '1769', '6000343', '480', '26-480-1769-6000343'];
    const row551Orphan = ['Enero', '2026', '9999', '9999999', '480', '26-480-9999-9999999'];
    const data: ProcessedData = { '501': [header, row501], '551': [header, row551Orphan] };
    const warnings = validateProcessedData(data, () => {});
    expect(warnings.some(w => w.includes('pedimentos no encontrados en datos generales'))).toBe(true);
  });
});
