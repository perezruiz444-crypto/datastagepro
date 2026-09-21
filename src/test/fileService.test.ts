import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { detectPeriodFromZipFile, processZipFile, buildZipFromAscFiles } from '@/services/fileService';

/** Construye un .zip en memoria con archivos .asc sintéticos, como File. */
const buildZip = async (files: Record<string, string>): Promise<File> => {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  const buf = await zip.generateAsync({ type: 'arraybuffer' });
  return new File([buf], 'test.zip', { type: 'application/zip' });
};

/** jsdom 20 no implementa File.arrayBuffer() cuando el File se construye desde un string;
 *  construirlo desde bytes (TextEncoder) evita el problema y es equivalente en runtime real. */
const makeAscFile = (name: string, content: string): File =>
  new File([new TextEncoder().encode(content)], name, { type: 'text/plain' });

const HEADER_501 =
  'Patente|Pedimento|SeccionAduanera|TipoOperacion|ClaveDocumento|SeccionAduaneraEntrada|CurpContribuyente|Rfc|CurpAgenteA|TipoCambio|TotalFletes|TotalSeguros|TotalEmbalajes|TotalIncrementables|TotalDeducibles|PesoBrutoMercancia|MedioTransporteSalida|MedioTransporteArribo|MedioTransporteEntrada_Salida|DestinoMercancia|NombreContribuyente|CalleContribuyente|NumInteriorContribuyente|NumExteriorContribuyente|CPContribuyente|MunicipioContribuyente|EntidadFedContribuyente|PaisContribuyente|TipoPedimento|FechaRecepcionPedimento|FechaPagoReal';

describe('detectPeriodFromZipFile', () => {
  it('detecta mes/año con fechas ISO con hora (formato real del SAT)', async () => {
    const row = '3953|6000098|240|2|RT|240||BMA2211187E1|CAUR670725MTSRDS02|18.00120|0|0|0|0|0|287.000|7|7|7|9|X|Y||134|20909|Z|AG|MEX|1|2026-01-05 17:40:22|2026-01-05 17:48:15|';
    const zip = await buildZip({ '1_501.asc': `${HEADER_501}\r\n${row}\r\n` });
    const { month, year } = await detectPeriodFromZipFile(zip);
    expect(month).toBe('Enero');
    expect(year).toBe(2026);
  });

  it('devuelve null cuando no hay archivos .asc', async () => {
    const zip = await buildZip({ 'readme.txt': 'sin datos' });
    const { month, year } = await detectPeriodFromZipFile(zip);
    expect(month).toBeNull();
    expect(year).toBeNull();
  });
});

describe('processZipFile — regla de fracción arancelaria partida (551)', () => {
  it('une Fraccion (8 dígitos) + SubdivisionFraccion (2 dígitos) en una sola columna, con datos reales del SAT', async () => {
    const header501 = HEADER_501;
    const row501 = '1769|6000343|480|2|A1|480||BMA2211187E1|X|17|0|0|0|0|0|1|7|4|4|9|Y|Z||134|20909|W|AG|MEX|1|2026-01-13 15:00:00|2026-01-13 15:57:02|';

    // Layout real confirmado desde un .asc 551 de un zip de Data Stage SAT:
    // idx0 Patente, idx1 Pedimento, idx2 SeccionAduanera, idx3 Fraccion(8 dig),
    // idx4 SecuenciaFraccion, idx5 SubdivisionFraccion(2 dig), ...
    const header551 =
      'Patente|Pedimento|SeccionAduanera|Fraccion|SecuenciaFraccion|SubdivisionFraccion|DescripcionMercancia|PrecioUnitario|ValorAduana|ValorComercial|ValorDolares|CantidadUMComercial|UnidadMedidaComercial|CantidadUMTarifa|UnidadMedidaTarifa|ValorAgregado|ClaveVinculacion|MetodoValorizacion|CodigoMercanciaProducto|MarcaMercanciaProducto|ModeloMercanciaProducto|PaisOrigenDestino|PaisCompradorVendedor|EntidadFedOrigen|EntidadFedDestino|EntidadFedComprador|EntidadFedVendedor|TipoOperacion|ClaveDocumento|FechaPagoReal';
    const row551 = '1769|6000343|480|85389099|1|99|PARTES PARA INTERRUPTOR|2962.75000|0|35553|1976.88|12.000|6|4.80000|1||0|0||||HUN|HUN| | | | |2|A1|2026-01-13 15:57:02|';

    const zip = await buildZip({
      '1_501.asc': `${header501}\r\n${row501}\r\n`,
      '1_551.asc': `${header551}\r\n${row551}\r\n`,
    });

    const logs: string[] = [];
    const data = await processZipFile(zip, (m) => logs.push(m), () => {}, { current: false }, 2026);

    const header = data['551'][0];
    const enrichedRow = data['551'][1];
    const fraccionIdx = header.indexOf('FraccionArancelaria');
    expect(fraccionIdx).toBeGreaterThan(-1);
    // La regla debe unir "85389099" + "99" (SubdivisionFraccion) -> "8538909999"
    expect(enrichedRow[fraccionIdx]).toBe('8538909999');
  });
});

describe('buildZipFromAscFiles — soporte para .asc sueltos', () => {
  it('empaqueta uno o varios .asc en un .zip procesable por el pipeline normal', async () => {
    const row501 = '3953|6000098|240|2|RT|240||BMA2211187E1|CAUR670725MTSRDS02|18.00120|0|0|0|0|0|287.000|7|7|7|9|X|Y||134|20909|Z|AG|MEX|1|2026-01-05 17:40:22|2026-01-05 17:48:15|';
    const ascFile1 = makeAscFile('1839483_501.asc', `${HEADER_501}\r\n${row501}\r\n`);

    const zip = await buildZipFromAscFiles([ascFile1]);
    expect(zip.name.toLowerCase().endsWith('.zip')).toBe(true);

    const { month, year } = await detectPeriodFromZipFile(zip);
    expect(month).toBe('Enero');
    expect(year).toBe(2026);

    const data = await processZipFile(zip, () => {}, () => {}, { current: false }, 2026);
    expect(data['501']).toBeDefined();
    expect(data['501'].length).toBeGreaterThan(1);
  });

  it('empaqueta múltiples archivos .asc distintos en el mismo zip', async () => {
    const row501 = '3953|6000098|240|2|RT|240||BMA2211187E1|CAUR670725MTSRDS02|18.00120|0|0|0|0|0|287.000|7|7|7|9|X|Y||134|20909|Z|AG|MEX|1|2026-01-05 17:40:22|2026-01-05 17:48:15|';
    const ascFile1 = makeAscFile('1839483_501.asc', `${HEADER_501}\r\n${row501}\r\n`);
    const ascFile2 = makeAscFile('1839483_552.asc', 'Patente|Pedimento|SeccionAduanera|Fraccion\r\n');

    const zip = await buildZipFromAscFiles([ascFile1, ascFile2]);
    const data = await processZipFile(zip, () => {}, () => {}, { current: false }, 2026);
    expect(Object.keys(data)).toContain('501');
    expect(Object.keys(data)).toContain('552');
  });
});
