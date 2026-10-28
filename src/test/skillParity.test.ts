import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {
  consolidateAnnualData, createReportWorkbook, detectPeriodFromZipFile, generateIndividualExcelFiles,
  generateSeparateSheetsExcelReport, mergeExcelAndZips, processHistoricalData, processZipFile,
} from '@/services/fileService';
import { ExportFormat, ProcessedData, ReportMode } from '@/types/dataStage';

const noop = () => {};
const signal = () => ({ current: false });
const key = '26-240-1690-6001103';
const header = ['Pedimento_Unificado', 'Patente', 'Pedimento', 'SeccionAduanera', 'FechaPagoReal', 'CampoExtra'];
const table = (month: string): ProcessedData => ({ '501': [header, [key, '1690', '6001103', '240', `2026-${month}-05`, month]] });
const zipFile = async (files: Record<string, string>, name = 'mes.zip'): Promise<File> => {
  const zip = new JSZip();
  Object.entries(files).forEach(([path, text]) => zip.file(path, text));
  return new File([await zip.generateAsync({ type: 'arraybuffer' })], name);
};
const zipMonth = (month: string, name = 'mes.zip') => zipFile({
  'carpeta/100_501.asc': `Patente|Pedimento|SeccionAduanera|FechaPagoReal|CampoExtra|\r\n1690|6001103|240|2025-${month}-05 17:40:22|${month}|\r\n`,
  'carpeta/100_508.asc': 'Patente|Pedimento|SeccionAduanera|Cuenta|\r\n',
  'carpeta/100_Resumen.asc': `Folio|Fecha_Inicial|Fecha_Final|\r\n100|2026-${month}-01|2026-${month}-28|\r\n`,
  '__MACOSX/._100_501.asc': 'ignorar',
}, name);
const excelFile = (data: ProcessedData, name = 'anterior.xlsx'): File => {
  const workbook = XLSX.utils.book_new();
  Object.entries(data).forEach(([sheet, rows]) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheet));
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const file = new File([bytes], name);
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes });
  return file;
};
const readBlob = (blob: Blob): Promise<ArrayBuffer> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as ArrayBuffer);
  reader.onerror = reject;
  reader.readAsArrayBuffer(blob);
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('regresiones de la habilidad: lectura y apilado', () => {
  it('detecta el mes de los datos aunque Resumen abarque un rango mayor', async () => {
    const zip = await zipFile({
      '1_501.asc': 'Patente|Pedimento|SeccionAduanera|FechaPagoReal|\n1690|6001103|240|2025-03-05|\n',
      '1_Resumen.asc': 'Folio|Fecha_Inicial|Fecha_Final|\n100|2026-01-01|2026-12-31|\n',
    });
    expect(await detectPeriodFromZipFile(zip)).toEqual({ month: 'Marzo', year: 2026 });
  });

  it('conserva los originales, ignora metadatos Mac y usa el año del Resumen', async () => {
    const data = await processZipFile(await zipMonth('01'), noop, noop, signal());
    expect(data['501']).toEqual([header, [key, '1690', '6001103', '240', '2025-01-05 17:40:22', '01']]);
    expect(data['508']).toEqual([['Pedimento_Unificado', 'Patente', 'Pedimento', 'SeccionAduanera', 'Cuenta']]);
    expect(data.Resumen).toHaveLength(2);
    expect(data.Resumen[1]).toEqual(['26-000-0000-0000000', '100', '2026-01-01', '2026-01-28']);
  });
  it('respeta marzo→enero tanto en anual como en histórico', async () => {
    expect(consolidateAnnualData([
      { month: 'Marzo', data: table('03') }, { month: 'Enero', data: table('01') },
    ], noop)['501'].slice(1).map(row => row.at(-1))).toEqual(['03', '01']);
    const result = await processHistoricalData([await zipMonth('03'), await zipMonth('01')], noop, noop, signal());
    expect(result.data['501'].slice(1).map(row => row.at(-1))).toEqual(['03', '01']);
    expect(result.yearRange).toBe('2026');
    expect(result.data.Resumen).toHaveLength(3);
  });
  it('conserva tablas ausentes en otro periodo y todas las filas repetidas', () => {
    const data = consolidateAnnualData([
      { month: 'Marzo', data: { ...table('03'), '508': [['Pedimento_Unificado', 'Cuenta']] } },
      { month: 'Enero', data: table('03') },
    ], noop);
    expect(data['501']).toHaveLength(3);
    expect(data['508']).toEqual([['Pedimento_Unificado', 'Cuenta']]);
  });
  it('rechaza esquemas incompatibles antes de apilar ZIP y archivos del mismo tipo', async () => {
    const zip = await zipFile({
      'a/1_501.asc': 'Patente|Pedimento|SeccionAduanera\n1|2|3\n',
      'b/2_501.asc': 'Pedimento|Patente|SeccionAduanera\n2|1|3\n',
    });
    await expect(processZipFile(zip, noop, noop, signal())).rejects.toThrow(/encabezados.*nombre y orden/);
    expect(() => consolidateAnnualData([
      { month: 'Enero', data: table('01') }, { month: 'Marzo', data: { '501': [['Otro'], ['valor']] } },
    ], noop)).toThrow(/encabezados/);
  });
  it('no sobrescribe archivos del mismo tipo dentro de carpetas', async () => {
    const content = 'Patente|Pedimento|SeccionAduanera|Extra|\n1|2|3|dato|\n';
    const zip = await zipFile({ 'a/1_501.asc': content, 'b/2_501.asc': content });
    const data = await processZipFile(zip, noop, noop, signal(), 2026);
    expect(data['501']).toHaveLength(3);
  });
  it('no oculta errores de lectura ni devuelve una consolidación incompleta', async () => {
    const zip = await zipFile({ '1_501.asc': 'Patente|Pedimento\n1|2|extra\n' });
    await expect(processZipFile(zip, noop, noop, signal())).rejects.toThrow(/más valores/);
    await expect(processZipFile(await zipMonth('01'), noop, noop, { current: true })).rejects.toThrow(/cancelled/);
  });
});

describe('regresiones de la habilidad: combinación de Excel', () => {
  it('conserva dos partidas distintas del mismo pedimento y filas idénticas', async () => {
    const file = excelFile({ '551': [
      ['Pedimento_Unificado', 'SecuenciaFraccion', 'Importe'],
      [key, '1', '10.00'], [key, '2', '20.00'], [key, '2', '20.00'],
    ] });
    const result = await mergeExcelAndZips([file], [], noop, noop, signal());
    expect(result.data['551']).toHaveLength(4);
    expect(result.stats).toMatchObject({ duplicatesRemoved: 0, rowsAdded: 3 });
  });
  it('rechaza columnas invertidas en vez de colocar importes bajo otro encabezado', async () => {
    await expect(mergeExcelAndZips([
      excelFile({ '551': [['Pedimento_Unificado', 'SecuenciaFraccion', 'Importe'], [key, '1', '10']] }),
      excelFile({ '551': [['Pedimento_Unificado', 'Importe', 'SecuenciaFraccion'], [key, '99', '2']] }),
    ], [], noop, noop, signal())).rejects.toThrow(/551.*nombre y orden/);
  });
  it('combina un Excel de la habilidad con el ZIP sin cambiar el esquema', async () => {
    const first = await processZipFile(await zipMonth('03'), noop, noop, signal());
    const file = excelFile({ '100_501': first['501'] });
    const result = await mergeExcelAndZips([file], [await zipMonth('01')], noop, noop, signal());
    expect(result.data['501'][0]).toEqual(header);
    expect(result.data['501'].slice(1).map(row => row.at(-1))).toEqual(['03', '01']);
  });
  it('conserva fechas de Excel y vacíos sin generar NaT', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Pedimento_Unificado', 'FechaFacturacion', 'Codigo'],
      [key, new Date(2026, 0, 5), '01'], [key, null, '02'],
    ], { cellDates: true }), '505');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const file = { name: 'fechas.xlsx', arrayBuffer: async () => bytes } as File;
    const result = await mergeExcelAndZips([file], [], noop, noop, signal());
    expect(result.data['505'][1]).toEqual([key, '2026-01-05', '01']);
    expect(result.data['505'][2]).toEqual([key, '', '02']);
  });
});

describe('regresiones de la habilidad: Excel generado', () => {
  const data: ProcessedData = {
    '501': [
      ['Pedimento_Unificado', 'NumeroGuia', 'TipoGuia', 'FechaPago', 'Nombre', 'Importe', 'Fraccion'],
      [key, '000123', '01', '2026-01-05 17:40:22', 'X'.repeat(45), '20.00', '85389099'],
    ],
    '508': [['Pedimento_Unificado', 'CampoConEncabezadoLargo']],
  };
  it('escribe tipos, formatos, filtros, hojas vacías y anchos basados en el contenido', () => {
    const workbook = createReportWorkbook(data);
    const written = XLSX.read(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }), { type: 'array', cellDates: true, cellNF: true });
    expect(written.SheetNames).toEqual(['501', '508']);
    const sheet = written.Sheets['501'];
    expect(sheet.A1.v).toBe('Pedimento_Unificado');
    expect(sheet.A2).toMatchObject({ t: 's', v: key, z: '@' });
    expect(sheet.B2).toMatchObject({ t: 's', v: '000123', z: '@' });
    expect(sheet.C2).toMatchObject({ t: 's', v: '01', z: '@' });
    expect(sheet.D2).toMatchObject({ t: 'd', z: 'dd/mm/yyyy' });
    expect((sheet.D2.v as Date).getHours()).toBe(0);
    expect(sheet.F2).toMatchObject({ t: 's', v: '20.00', z: '@' });
    expect(sheet['!autofilter']?.ref).toBe('A1:G2');
    expect(written.Sheets['508']['!ref']).toBe('A1:B1');
    expect(written.Sheets['508']['!autofilter']?.ref).toBe('A1:B1');
    expect(workbook.Sheets['501']['!cols']?.[4].wch).toBe(47);
  });
  it('el modo numérico opcional no convierte identificadores ni fechas a números', () => {
    const sheet = createReportWorkbook(data, ExportFormat.NUMERIC).Sheets['501'];
    expect(sheet.F2).toMatchObject({ t: 'n', v: 20 });
    expect(sheet.G2).toMatchObject({ t: 's', v: '85389099' });
    expect(sheet.D2).toMatchObject({ t: 'n', z: 'dd/mm/yyyy' });
    expect(Number.isInteger(sheet.D2.v)).toBe(true);
    expect(sheet.B2.v).toBe('000123');
  });
  it('guarda fechas como días enteros de Excel, sin desfases de zona horaria', () => {
    const sheet = createReportWorkbook(data).Sheets['501'];
    const expected = (Date.UTC(2026, 0, 5) - Date.UTC(1899, 11, 30)) / 86400000;
    expect(sheet.D2).toMatchObject({ t: 'n', v: expected, z: 'dd/mm/yyyy' });
  });
  it('respeta el nombre elegido en todos los modos y usa el mismo formato en los individuales', async () => {
    const blobs: Blob[] = [], names: string[] = [];
    vi.stubGlobal('URL', { createObjectURL: (blob: Blob) => { blobs.push(blob); return 'blob:test'; }, revokeObjectURL: noop });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
    for (const mode of Object.values(ReportMode)) generateSeparateSheetsExcelReport(data, 'Mi reporte.xlsx', 2026, mode);
    expect(names).toEqual(Array(4).fill('Mi reporte.xlsx'));
    await generateIndividualExcelFiles(data, 'Mi reporte', 2026, ReportMode.HISTORICAL);
    expect(names.at(-1)).toBe('Mi reporte_Individual.zip');
    const zip = await JSZip.loadAsync(await readBlob(blobs.at(-1)!));
    const workbook = XLSX.read(await zip.file('501.xlsx')!.async('arraybuffer'), { type: 'array', cellNF: true });
    expect(workbook.Sheets['501'].A1.v).toBe('Pedimento_Unificado');
    expect(workbook.Sheets['501'].B2).toMatchObject({ v: '000123', z: '@' });
  });
});
