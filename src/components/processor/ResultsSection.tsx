import React, { useState } from 'react';
import { CheckCircle, FileText, ListOrdered, FileSpreadsheet, FileArchive, Upload, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProcessedData, ReportMode, ExportFormat } from '@/types/dataStage';
import { generateSeparateSheetsExcelReport, generateIndividualExcelFiles } from '@/services/fileService';
import { FILE_NAMES } from '@/constants/dataStage';

interface ResultsSectionProps {
  data: ProcessedData;
  onReset: () => void;
  reportTitle: string;
  year: number;
  reportMode: ReportMode;
}

const KpiCard: React.FC<{ title: string; value: number; icon: React.ReactNode; className?: string }> = ({
  title, value, icon, className,
}) => (
  <div className={`bg-card rounded-xl shadow-sm p-6 border-l-4 transition-transform duration-300 hover:-translate-y-1 hover:shadow-md ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-muted-foreground font-medium mb-1 text-sm">{title}</h3>
        <p className="text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
      </div>
      <div className="text-primary">{icon}</div>
    </div>
  </div>
);

export const ResultsSection: React.FC<ResultsSectionProps> = ({ data, onReset, reportTitle, year, reportMode }) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>(ExportFormat.TEXT);

  const processedFiles = Object.keys(data);
  const totalFiles = processedFiles.length;
  const headerAdjustment = reportMode === ReportMode.HISTORICAL ? 1 : 0;
  const totalRecords = Object.values(data).reduce(
    (acc, records) => acc + (records.length > 0 ? records.length - headerAdjustment : 0), 0
  );

  return (
    <Card>
      <CardHeader className="text-center">
        <CheckCircle className="h-12 w-12 text-secondary mx-auto mb-2" />
        <CardTitle>Archivos Procesados Exitosamente</CardTitle>
        <CardDescription>Los datos están listos para ser descargados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <KpiCard title="Archivos/Tipos Procesados" value={totalFiles} icon={<FileText className="h-8 w-8" />} className="border-l-primary" />
          <KpiCard title="Registros Consolidados" value={totalRecords} icon={<ListOrdered className="h-8 w-8" />} className="border-l-secondary" />
        </div>

        {/* Export format toggle */}
        <div className="p-4 bg-muted/50 border rounded-xl">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Settings className="h-4 w-4" /> Configuración de Exportación
          </h3>
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
          </p>
        </div>

        {/* File breakdown */}
        <div>
          <h3 className="text-base font-medium text-foreground mb-3 border-b pb-2">Desglose de Archivos:</h3>
          <div className="max-h-48 overflow-y-auto bg-muted/30 p-3 rounded-md border">
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
              {processedFiles.map(fileKey => (
                <li key={fileKey}>
                  <span className="font-semibold">{fileKey}.asc</span> ({FILE_NAMES[fileKey] || 'Desconocido'}) - {(data[fileKey].length > 0 ? data[fileKey].length - headerAdjustment : 0).toLocaleString()} registros.
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Download buttons */}
        <div className="border-t pt-6">
          <h3 className="text-base font-medium text-foreground mb-4 text-center">Opciones de Descarga</h3>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button
              size="lg"
              onClick={() => generateSeparateSheetsExcelReport(data, reportTitle, year, reportMode, exportFormat)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Reporte Consolidado
            </Button>
            {reportMode !== ReportMode.HISTORICAL && (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => generateIndividualExcelFiles(data, reportTitle, year, reportMode, exportFormat)}
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
