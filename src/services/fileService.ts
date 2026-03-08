import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { ProgressState, ProcessedData, ReportMode, ExportFormat } from '@/types/dataStage';
import { FILE_NAMES, CRITICAL_FILES, MONTH_NAMES, COLUMN_HEADERS, generateFallbackHeaders } from '@/constants/dataStage';
import { enrichWithPedimentoUnificado, validateProcessedData } from '@/services/pedimentoService';

export { enrichWithPedimentoUnificado, validateProcessedData };

export const detectPeriodFromZipFile = async (file: File): Promise<{ month: string | null; year: number | null }> => {
  try {
    const zip = await JSZip.loadAsync(file);
    const ascFiles = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.asc'));
    const file501 = ascFiles.find(name => name.includes('501'));
    if (!file501) return { month: null, year: null };

    const content = await zip.file(file501)!.async('string');
    const lines = content.split(/\r?\n/).slice(0, 100);

    const monthCounts: Record<number, number> = {};
    const yearCounts: Record<number, number> = {};
    lines.forEach(line => {
      const parts = line.split('|');
      parts.forEach(field => {
        const trimmed = field.trim();
        if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
          const yr = parseInt(trimmed.substring(0, 4), 10);
          const month = parseInt(trimmed.substring(4, 6), 10);
          if (month >= 1 && month <= 12 && yr >= 2000 && yr <= 2099) {
            monthCounts[month] = (monthCounts[month] || 0) + 1;
            yearCounts[yr] = (yearCounts[yr] || 0) + 1;
          }
        }
      });
    });

    let maxMonthCount = 0, detectedMonth: number | null = null;
    for (const [m, count] of Object.entries(monthCounts)) {
      if (count > maxMonthCount) { maxMonthCount = count; detectedMonth = parseInt(m, 10); }
    }
    let maxYearCount = 0, detectedYear: number | null = null;
    for (const [y, count] of Object.entries(yearCounts)) {
      if (count > maxYearCount) { maxYearCount = count; detectedYear = parseInt(y, 10); }
    }

    return {
      month: detectedMonth !== null ? MONTH_NAMES[detectedMonth - 1] : null,
      year: detectedYear,
    };
  } catch (e) {
    console.error("Error detectando periodo desde contenido:", e);
  }
  return { month: null, year: null };
};

export const processZipFile = async (
  file: File,
  onLog: (message: string) => void,
  onProgress: (progress: ProgressState) => void,
  cancellationSignal: { current: boolean },
  year?: number
): Promise<ProcessedData> => {
  onLog('Iniciando análisis del archivo ZIP...');
  const zip = await JSZip.loadAsync(file);
  const files = Object.keys(zip.files).filter(name => !zip.files[name].dir && name.toLowerCase().endsWith('.asc'));

  onLog(`Archivos .asc encontrados en el ZIP (${files.length}): ${files.join(', ')}`);

  if (files.length === 0) {
    throw new Error('No se encontraron archivos .asc en el ZIP.');
  }

  const processedData: ProcessedData = {};
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const fileName = files[i];

    if (cancellationSignal.current) {
      onLog('Proceso cancelado por el usuario.');
      throw new Error('Operation cancelled by user.');
    }

    const nameWithoutExtension = fileName.split('.')[0];
    const parts = nameWithoutExtension.split('_');
    const fileNumber = parts[parts.length - 1];

    try {
      onProgress({ total: Math.round((i / totalFiles) * 100), file: 0, fileName });
      onLog(`[${i + 1}/${totalFiles}] Procesando ${fileName}...`);

      const contentAsUint8Array = await zip.file(fileName)!.async('uint8array');
      const decoder = new TextDecoder('iso-8859-1');
      const content = decoder.decode(contentAsUint8Array);

      if (!content) {
        onLog(`Advertencia: ${fileName} está vacío - Saltando...`);
        continue;
      }

      const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

      if (lines.length > 0 && !lines[0].includes('|')) {
        onLog(`Error de formato: El archivo ${fileName} no parece estar separado por pipes '|'.`);
        continue;
      }
      onProgress({ total: Math.round((i / totalFiles) * 100), file: 50, fileName });

      processedData[fileNumber] = lines.map(line => {
        const lineParts = line.split('|');
        return lineParts.map(field => field.trim());
      });

      onLog(`✅ ${fileName} procesado correctamente con ${lines.length} registros.`);
      onProgress({ total: Math.round(((i + 1) / totalFiles) * 100), file: 100, fileName });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      onLog(`❌ Error procesando ${fileName}: ${errorMessage}`);
      console.error(`Error processing ${fileName}:`, error);
    }
  }

  if (Object.keys(processedData).length === 0 && !cancellationSignal.current) {
    throw new Error('No se pudo procesar ningún archivo .asc correctamente.');
  }

  const missingCritical = CRITICAL_FILES.filter(id => !processedData[id]);
  if (missingCritical.length > 0) {
    onLog(`⚠️ ATENCIÓN: Faltan archivos críticos: ${missingCritical.map(id => `${id} (${FILE_NAMES[id] || 'N/A'})`).join(', ')}`);
  }

  // Enrich with Pedimento Unificado + headers
  onLog('--- Enriqueciendo datos con Pedimento Unificado ---');
  const enrichedData = enrichWithPedimentoUnificado(processedData, onLog);
  onLog('--- Validando integridad de datos ---');
  validateProcessedData(enrichedData, onLog);
  return enrichedData;
};

export const consolidateAnnualData = (
  monthlyData: { month: string; data: ProcessedData }[],
  onLog: (message: string) => void
): ProcessedData => {
  const consolidated: ProcessedData = {};

  const allFileKeys = new Set<string>();
  monthlyData.forEach(({ data }) => {
    Object.keys(data).forEach(key => allFileKeys.add(key));
  });

  onLog(`Iniciando consolidación anual. Tipos de archivos detectados: ${allFileKeys.size}`);

  const sortedMonthlyData = [...monthlyData].sort((a, b) => {
    return MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month);
  });

  sortedMonthlyData.forEach(({ month, data }) => {
    const monthFiles = Object.keys(data);

    const missingCritical = CRITICAL_FILES.filter(id => !monthFiles.includes(id));
    if (missingCritical.length > 0) {
      onLog(`⚠️ Mes ${month}: Faltan archivos CRÍTICOS: ${missingCritical.join(', ')}`);
    }

    Object.entries(data).forEach(([fileKey, records]) => {
      if (!consolidated[fileKey]) {
        consolidated[fileKey] = [];
        if (records.length > 0) {
          // First row is header (from enrichment) - add "Mes" column after "Pedimento"
          const header = [...records[0]];
          header.splice(1, 0, 'Mes');
          consolidated[fileKey].push(header);
        }
      }
      // Skip header row (index 0), add month column to data rows
      const dataRows = records.slice(1);
      const recordsWithMonth = dataRows.map(record => {
        const row = [...record];
        row.splice(1, 0, month);
        return row;
      });
      consolidated[fileKey].push(...recordsWithMonth);
    });
  });

  onLog(`Consolidación finalizada. Total de tipos de archivo: ${Object.keys(consolidated).length}`);
  return consolidated;
};

export const mergeExcelFiles = async (
  files: File[],
  onLog: (msg: string) => void,
  onProgress: (prog: ProgressState) => void
): Promise<ProcessedData> => {
  const consolidated: ProcessedData = {};
  const totalFiles = files.length;
  const filesWith558: string[] = [];

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    onLog(`Leyendo archivo Excel: ${file.name}...`);
    onProgress({ total: Math.round((i / totalFiles) * 100), file: 0, fileName: file.name });

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    let has558 = false;

    workbook.SheetNames.forEach((sheetName: string) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (jsonData.length === 0) return;

      const stringData: string[][] = jsonData.map((row: any[]) => row.map((cell: any) => String(cell).trim()));

      const fileId = sheetName.split(' - ')[0].trim() || sheetName.trim();

      if (fileId === '558') has558 = true;

      if (!consolidated[fileId]) {
        consolidated[fileId] = stringData;
      } else {
        consolidated[fileId].push(...stringData.slice(1));
      }
    });

    if (has558) filesWith558.push(file.name);
    onProgress({ total: Math.round(((i + 1) / totalFiles) * 100), file: 100, fileName: file.name });
  }

  onLog(`Fusión completada. Hojas consolidadas: ${Object.keys(consolidated).join(', ')}`);
  return consolidated;
};

const prepareDataForExcel = (data: string[][], format: ExportFormat) => {
  if (format === ExportFormat.TEXT) return data;

  return data.map((row, rowIndex) => {
    if (rowIndex === 0) return row; // Keep headers as text
    return row.map((cell, colIndex) => {
      if (colIndex === 0) return cell; // Keep Pedimento column as text always
      if (cell === '' || cell === null || cell === undefined) return '';
      const cellStr = String(cell).trim();
      if (/^-?\d*\.?\d+$/.test(cellStr)) {
        if (cellStr === '0') return 0;
        if (cellStr.startsWith('0') && !cellStr.startsWith('0.')) return cellStr;
        const num = parseFloat(cellStr);
        return isNaN(num) ? cellStr : num;
      }
      return cellStr;
    });
  });
};

export const generateSeparateSheetsExcelReport = (
  data: ProcessedData,
  title: string,
  year: number,
  reportMode: ReportMode,
  format: ExportFormat = ExportFormat.TEXT
) => {
  try {
    const wb = XLSX.utils.book_new();
    const sectionsToExport = Object.keys(data);

    sectionsToExport.forEach(section => {
      if (data[section]) {
        const preparedData = prepareDataForExcel(data[section], format);
        const ws = XLSX.utils.aoa_to_sheet(preparedData);

        if (preparedData.length > 0) {
          const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
          ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

          // Auto-width columns based on header length
          if (preparedData[0]) {
            ws['!cols'] = preparedData[0].map((header: any) => ({
              wch: Math.max(String(header).length + 2, 12)
            }));
          }
        }

        const sheetName = FILE_NAMES[section] || section;
        XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
      }
    });

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    let fileName = `Reporte_Consolidado_${title.replace(/\s/g, '_')}_${year}.xlsx`;
    if (reportMode === ReportMode.MONTHLY) {
      fileName = `Data Stage ${title} ${year}.xlsx`;
    } else if (reportMode === ReportMode.MULTI_YEAR) {
      fileName = `Data_Stage_MultiAnual_${new Date().getTime()}.xlsx`;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error generating consolidated report:', error);
    alert('Ocurrió un error al generar el reporte consolidado.');
  }
};

export const generateIndividualExcelFiles = async (
  data: ProcessedData,
  title: string,
  year: number,
  reportMode: ReportMode,
  format: ExportFormat = ExportFormat.TEXT
) => {
  try {
    const zip = new JSZip();
    const sectionsToExport = Object.keys(data);

    sectionsToExport.forEach(section => {
      if (data[section]) {
        const wb = XLSX.utils.book_new();
        const preparedData = prepareDataForExcel(data[section], format);
        const ws = XLSX.utils.aoa_to_sheet(preparedData);

        if (preparedData.length > 0) {
          const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
          ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

          if (preparedData[0]) {
            ws['!cols'] = preparedData[0].map((header: any) => ({
              wch: Math.max(String(header).length + 2, 12)
            }));
          }
        }

        const sheetName = FILE_NAMES[section] || section;
        XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        zip.file(`Reporte_${section}.xlsx`, excelBuffer);
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    let fileName = `Reportes_Individuales_${title.replace(/\s/g, '_')}_${year}.zip`;
    if (reportMode === ReportMode.MONTHLY) {
      fileName = `Reportes Individuales Data Stage ${title} ${year}.zip`;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error generating individual reports ZIP:', error);
    alert('Ocurrió un error al generar el archivo ZIP.');
  }
};
