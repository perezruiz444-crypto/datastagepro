import React, { useState } from 'react';
import { CheckCircle, FileText, ListOrdered, FileSpreadsheet, FileArchive, Upload, Settings, AlertTriangle, Key, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProcessedData, ReportMode, ExportFormat } from '@/types/dataStage';
import { generateSeparateSheetsExcelReport, generateIndividualExcelFiles } from '@/services/fileService';
import { FILE_NAMES, PEDIMENTO_REGEX, PEDIMENTO_UNIFICADO_INDEX } from '@/constants/dataStage';

interface ResultsSectionProps {
  data: ProcessedData;
  onReset: () => void;
  reportTitle: string;
  year: number;
  reportMode: ReportMode;
  warnings?: string[];
}

const KpiCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; className?: string }> = ({
  title, value, icon, className,
}) => (
  <div className={`bg-card rounded-xl shadow-sm p-6 border-l-4 transition-transform duration-300 hover:-translate-y-1 hover:shadow-md ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-muted-foreground font-medium mb-1 text-sm">{title}</h3>
        <p className="text-3xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
      <div className="text-primary">{icon}</div>
    </div>
  </div>
);

export const ResultsSection: React.FC<ResultsSectionProps> = ({ data, onReset, reportTitle, year, reportMode, warnings = [] }) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>(ExportFormat.TEXT);
  const [customFileName, setCustomFileName] = useState(`Data_Stage_${reportTitle.replace(/\s/g, '_')}`);

  const processedFiles = Object.keys(data);
  const totalFiles = processedFiles.length;
  
  // Data now includes header row from enrichment, so subtract 1 for record count
  const hasHeaders = reportMode !== ReportMode.CONSOLIDATED_TABLE;
  const totalRecords = Object.values(data).reduce(
    (acc, records) => acc + (records.length > (hasHeaders ? 1 : 0) ? records.length - (hasHeaders ? 1 : 0) : 0), 0
  );

  // Count unique pedimentos from 501
  let uniquePedimentos = 0;
  if (data['501'] && data['501'].length > 1) {
    const pedSet = new Set<string>();
    for (let i = 1; i < data['501'].length; i++) {
      const ped = data['501'][i][PEDIMENTO_UNIFICADO_INDEX]; // Cambiado de 5 a la constante (0)
      if (ped && PEDIMENTO_REGEX.test(ped)) pedSet.add(ped);
    }
    uniquePedimentos = pedSet.size;
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CheckCircle className="h-12 w-12 text-secondary mx-auto mb-2" />
        <CardTitle>Archivos Procesados Exitosamente</CardTitle>
        <CardDescription>Los datos están listos para ser descargados con Pedimento Unificado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <KpiCard title="Archivos Procesados" value={totalFiles} icon={<FileText className="h-8 w-8" />} className="border-l-primary" />
          <KpiCard title="Registros Totales" value={totalRecords} icon={<ListOrdered className="h-8 w-8" />} className="border-l-secondary" />
          {uniquePedimentos > 0 && (
            <KpiCard title="Pedimentos Únicos" value={uniquePedimentos} icon={<Key className="h-8 w-8" />} className="border-l-accent" />
          )}
        </div>

        {/* Validation warnings */}
        {warnings.length > 0 && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
            <h3 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Advertencias de Validación ({warnings.length})
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-destructive/80">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Export config */}
        <div className="p-4 bg-muted/50 border rounded-xl">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Settings className="h-4 w-4" /> Configuración de Exportación
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Nombre del archivo:</span>
            <Input
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              className="max-w-md"
              placeholder="Nombre del archivo de salida"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Formato de celdas:</span>
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                onClick={() => setExportFormat(ExportFormat.TEXT)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  exportFormat === ExportFormat.TEXT
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Texto (Preservar IDs)
              </button>
              <button
                onClick={() => setExportFormat(ExportFormat.NUMERIC)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  exportFormat === ExportFormat.NUMERIC
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Numérico (Permite Sumas)
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground italic">
            * <strong>Texto</strong> evita que Excel convierta "001" en "1". <strong>Numérico</strong> permite operaciones matemáticas.
            La columna Pedimento siempre se exporta como texto.
          </p>
        </div>

        {/* File breakdown */}
        <div>
          <h3 className="text-base font-medium text-foreground mb-3 border-b pb-2">Desglose de Archivos:</h3>
          <div className="max-h-48 overflow-y-auto bg-muted/30 p-3 rounded-md border">
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
              {processedFiles.map(fileKey => {
                const recordCount = data[fileKey].length > (hasHeaders ? 1 : 0) ? data[fileKey].length - (hasHeaders ? 1 : 0) : 0;
                return (
                  <li key={fileKey}>
                    <span className="font-semibold">{fileKey}.asc</span> ({FILE_NAMES[fileKey] || 'Desconocido'}) - {recordCount.toLocaleString()} registros.
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Download buttons */}
        <div className="border-t pt-6">
          <h3 className="text-base font-medium text-foreground mb-4 text-center">Opciones de Descarga</h3>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button
              size="lg"
              onClick={() => generateSeparateSheetsExcelReport(data, customFileName || reportTitle, year, reportMode, exportFormat)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Reporte Consolidado
            </Button>
            {reportMode !== ReportMode.CONSOLIDATED_TABLE && (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => generateIndividualExcelFiles(data, customFileName || reportTitle, year, reportMode, exportFormat)}
              >
                <FileArchive className="mr-2 h-4 w-4" />
                Reportes Individuales (ZIP)
              </Button>
            )}
          </div>
        </div>

        <div className="text-center border-t pt-6">
          <Button variant="outline" size="lg" onClick={onReset}>
            <Upload className="mr-2 h-4 w-4" />
            Cargar otros archivos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
