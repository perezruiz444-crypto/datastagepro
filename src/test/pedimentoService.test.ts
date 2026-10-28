import { describe, it, expect } from 'vitest';
import { buildPedimentoUnificado, enrichWithPedimentoUnificado, validateProcessedData } from '@/services/pedimentoService';

const noop = () => {};
const header = ['Patente', 'Pedimento', 'SeccionAduanera'];
const row = ['1769', '6000343', '480'];
const key = '26-480-1769-6000343';

describe('Pedimento_Unificado según la habilidad', () => {
  it('normaliza solo la clave, incluyendo año corto, año largo y sufijos .0', () => {
    expect(buildPedimentoUnificado('1.0', '1', '1', '2026')).toBe('26-001-0001-0000001');
    expect(buildPedimentoUnificado('1', '1', '1', '5')).toBe('05-001-0001-0000001');
  });

  it('coloca la clave en A y conserva nombres, orden y valores originales', () => {
    const data = { '501': [[...header, 'CampoExtra'], [...row, '  original  ']] };
    const result = enrichWithPedimentoUnificado(data, noop, '2026');
    expect(result['501']).toEqual([
      ['Pedimento_Unificado', ...header, 'CampoExtra'],
      [key, ...row, '  original  '],
    ]);
    expect(data['501'][0]).toEqual([...header, 'CampoExtra']);
  });

  it('prioriza Fecha_Inicial de Resumen sobre la fecha de pago', () => {
    const result = enrichWithPedimentoUnificado({
      '501': [[...header, 'FechaPagoReal'], [...row, '2025-12-31']],
      Resumen: [['Folio', 'Fecha_Inicial'], ['123', '2026-01-01']],
    }, noop);
    expect(result['501'][1][0]).toBe(key);
    expect(result.Resumen).toEqual([
      ['Pedimento_Unificado', 'Folio', 'Fecha_Inicial'],
      ['26-000-0000-0000000', '123', '2026-01-01'],
    ]);
  });

  it('localiza campos por nombre aunque cambien de posición y no añade cálculos', () => {
    const result = enrichWithPedimentoUnificado({ '551': [
      ['SecuenciaFraccion', 'Pedimento', 'Patente', 'SeccionAduanera', 'Fraccion', 'SubdivisionFraccion', 'ValorDolares'],
      ['1', '6000343', '1769', '480', '85389099', '99', '20.00'],
    ] }, noop, '2026');
    expect(result['551'][1]).toEqual([key, '1', '6000343', '1769', '480', '85389099', '99', '20.00']);
    expect(result['551'][0]).not.toContain('PrecioUnitarioUSD');
  });

  it('normaliza un identificador existente a A sin duplicarlo ni recalcularlo', () => {
    const result = enrichWithPedimentoUnificado({ '501': [
      ['Patente', 'PedimentoUnificado', 'Pedimento'], ['1769', key, '6000343'],
    ] }, noop);
    expect(result['501']).toEqual([
      ['Pedimento_Unificado', 'Patente', 'Pedimento'], [key, '1769', '6000343'],
    ]);
  });
});

describe('validateProcessedData', () => {
  it('reporta archivos críticos faltantes', () => {
    expect(validateProcessedData({}, noop)).toEqual([
      'Falta archivo crítico: 501 - Datos generales', 'Falta archivo crítico: 551 - Partidas',
    ]);
  });
  it('valida la clave en A y permite varias partidas del mismo pedimento', () => {
    expect(validateProcessedData({
      '501': [['Pedimento_Unificado', ...header], [key, ...row]],
      '551': [['Pedimento_Unificado', 'SecuenciaFraccion'], [key, '1'], [key, '2']],
    }, noop)).toEqual([]);
  });
  it('detecta partidas huérfanas', () => {
    const warnings = validateProcessedData({
      '501': [['Pedimento_Unificado'], [key]],
      '551': [['Pedimento_Unificado'], ['26-480-9999-9999999']],
    }, noop);
    expect(warnings.some(w => w.includes('pedimentos no encontrados en datos generales'))).toBe(true);
  });
});
