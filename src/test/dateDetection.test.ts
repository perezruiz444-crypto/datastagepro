import { describe, it, expect } from 'vitest';
import { parseDateOnly, detectDateColumns } from '@/services/fileService';

describe('parseDateOnly', () => {
  it('parsea YYYYMMDD puro', () => {
    const d = parseDateOnly('20260105');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(0); // Enero = 0
    expect(d!.getDate()).toBe(5);
  });

  it('parsea YYYY-MM-DD con hora (formato real FechaPago/FechaRecepcion del SAT)', () => {
    const d = parseDateOnly('2026-01-05 17:40:22');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(0);
    expect(d!.getDate()).toBe(5);
  });

  it('parsea YYYY-MM-DD sin hora', () => {
    const d = parseDateOnly('2026-01-05');
    expect(d).not.toBeNull();
    expect(d!.getDate()).toBe(5);
  });

  it('parsea DD/MM/YYYY', () => {
    const d = parseDateOnly('05/01/2026');
    expect(d).not.toBeNull();
    expect(d!.getMonth()).toBe(0);
    expect(d!.getDate()).toBe(5);
  });

  it('devuelve null para códigos numéricos que no son fecha (ej. TipoFecha)', () => {
    expect(parseDateOnly('1')).toBeNull();
    expect(parseDateOnly('99')).toBeNull();
  });

  it('devuelve null para vacío', () => {
    expect(parseDateOnly('')).toBeNull();
    expect(parseDateOnly('   ')).toBeNull();
  });

  it('devuelve null para mes/día fuera de rango', () => {
    expect(parseDateOnly('2026-13-01')).toBeNull();
    expect(parseDateOnly('2026-01-32')).toBeNull();
  });
});

describe('detectDateColumns', () => {
  it('detecta una columna como fecha cuando ≥90% de los valores no vacíos matchean', () => {
    const rows = [
      ['Header1', 'FechaPago', 'Codigo'],
      ['a', '2026-01-05 17:40:22', '1'],
      ['b', '2026-01-06 10:00:00', '2'],
      ['c', '2026-01-07 09:00:00', '3'],
      ['d', '', '4'], // vacío no cuenta contra el ratio
    ];
    const cols = detectDateColumns(rows);
    expect(cols.has(1)).toBe(true);
    expect(cols.has(0)).toBe(false);
    expect(cols.has(2)).toBe(false);
  });

  it('NO detecta una columna de código numérico como TipoFecha (valores cortos, no matchean patrón de fecha)', () => {
    const rows = [
      ['TipoFecha', 'FechaPago'],
      ['1', '2026-01-05'],
      ['1', '2026-01-06'],
      ['2', '2026-01-07'],
    ];
    const cols = detectDateColumns(rows);
    expect(cols.has(0)).toBe(false); // TipoFecha es código, no fecha
    expect(cols.has(1)).toBe(true);
  });

  it('no detecta columna con menos del 90% de valores que matchean fecha', () => {
    const rows = [
      ['Mixta'],
      ['2026-01-05'],
      ['no-es-fecha'],
      ['tampoco'],
      ['ni-esto'],
    ];
    const cols = detectDateColumns(rows);
    expect(cols.has(0)).toBe(false);
  });
});
