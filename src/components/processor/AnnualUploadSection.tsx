import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Calendar, Upload, FileArchive, X, Loader2, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MONTH_NAMES } from '@/constants/dataStage';
import { detectPeriodFromZipFile } from '@/services/fileService';

interface AnnualUploadSectionProps {
  files: Record<string, File | null>;
  onFilesChange: (files: Record<string, File | null>) => void;
  onProcess: () => void;
}

const guessMonth = (fileName: string): string | null => {
  const name = fileName.toLowerCase();
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (name.includes(MONTH_NAMES[i].toLowerCase())) return MONTH_NAMES[i];
  }
  const monthMatch = name.match(/(?:^|[^0-9])(0[1-9]|1[0-2])(?:[^0-9]|$)/);
  if (monthMatch) return MONTH_NAMES[parseInt(monthMatch[1], 10) - 1];
  return null;
};

const MonthUploadSlot: React.FC<{
  month: string;
  file: File | null;
  onFileSelect: (month: string, file: File | null) => void;
}> = ({ month, file, onFileSelect }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${file ? 'bg-secondary/10' : 'bg-muted/50'}`}>
      <div className="flex items-center overflow-hidden">
        <Calendar className={`mr-3 h-4 w-4 ${file ? 'text-secondary' : 'text-muted-foreground'}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{month}</p>
          {file ? (
            <p className="text-xs text-secondary truncate font-mono" title={file.name}>{file.name}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Pendiente</p>
          )}
        </div>
      </div>
      <div className="flex items-center ml-2">
        {!file ? (
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-1 h-3 w-3" /> Cargar
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onFileSelect(month, null); if (inputRef.current) inputRef.current.value = ''; }}>
            <X className="mr-1 h-3 w-3" /> Quitar
          </Button>
        )}
        <input type="file" ref={inputRef} accept=".zip" className="hidden" onChange={(e) => {
          if (e.target.files?.[0]?.name.toLowerCase().endsWith('.zip')) onFileSelect(month, e.target.files[0]);
          else if (e.target.files?.length) alert('Por favor, seleccione un archivo ZIP (.zip).');
        }} />
      </div>
    </div>
  );
};

export const AnnualUploadSection: React.FC<AnnualUploadSectionProps> = ({
  files, onFilesChange, onProcess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedYears, setDetectedYears] = useState<Record<string, number>>({});
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // Compute detected year from most frequent year across files
  const detectedYear = useMemo(() => {
    const years = Object.values(detectedYears);
    if (years.length === 0) return null;
    const freq: Record<number, number> = {};
    years.forEach(y => { freq[y] = (freq[y] || 0) + 1; });
    return Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
  }, [detectedYears]);

  const uploadedMonths = Object.entries(files).filter(([, f]) => f !== null).map(([m]) => m);
  const missingMonths = MONTH_NAMES.filter(m => !uploadedMonths.includes(m));
  const allComplete = missingMonths.length === 0;
  const uploadedFilesCount = uploadedMonths.length;

  const handleFiles = useCallback(async (incomingFiles: FileList | null) => {
    if (!incomingFiles) return;
    setIsProcessing(true);
    const newFilesMap = { ...files };
    const newYears = { ...detectedYears };
    const zipFiles = Array.from(incomingFiles).filter(f => f.name.toLowerCase().endsWith('.zip'));

    if (zipFiles.length === 0 && incomingFiles.length > 0) {
      alert('Por favor, suba archivos ZIP (.zip).');
      setIsProcessing(false);
      return;
    }

    const skipped: string[] = [];
    for (const file of zipFiles) {
      let guessedMonth = guessMonth(file.name);
      try {
        const { month: contentMonth, year: contentYear } = await detectPeriodFromZipFile(file);
        if (contentMonth) guessedMonth = contentMonth;
        if (guessedMonth && contentYear) newYears[guessedMonth] = contentYear;
      } catch (e) {
        console.error('Error detectando periodo:', e);
      }
      if (guessedMonth) {
        newFilesMap[guessedMonth] = file;
      } else {
        skipped.push(file.name);
      }
    }

    setSkippedFiles(skipped);
    setDetectedYears(newYears);
    onFilesChange(newFilesMap);
    setIsProcessing(false);
  }, [files, detectedYears, onFilesChange]);

  const handleSingleFileChange = useCallback((month: string, file: File | null) => {
    const updated = { ...files, [month]: file };
    onFilesChange(updated);
    if (!file) {
      const newYears = { ...detectedYears };
      delete newYears[month];
      setDetectedYears(newYears);
    }
  }, [files, detectedYears, onFilesChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Consolidación Anual y Parcial de Data Stage
          {detectedYear && (
            <Badge variant="secondary" className="text-sm flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Año detectado: {detectedYear}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Cargue los archivos .zip de los periodos a consolidar. Puede procesar el ejercicio fiscal completo o periodos parciales (1 a 11 meses); el motor unificará la estructura de los datos disponibles.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
          } ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => !isProcessing && bulkInputRef.current?.click()}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-primary mb-4 animate-spin" />
              <p className="text-lg font-medium text-foreground">Analizando contenido de los archivos...</p>
            </div>
          ) : (
            <>
              <FileArchive className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">Arrastre los archivos .zip aquí</p>
              <p className="text-muted-foreground">o seleccione los periodos a consolidar</p>
            </>
          )}
          <input type="file" ref={bulkInputRef} accept=".zip" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>

        {/* Skipped files alert */}
        {skippedFiles.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Archivos no reconocidos</AlertTitle>
            <AlertDescription>
              No se pudo detectar el periodo de: <span className="font-mono font-semibold">{skippedFiles.join(', ')}</span>.
              Renombre los archivos incluyendo el mes, por ejemplo: <span className="font-mono font-semibold">Enero_2025.zip</span> o <span className="font-mono font-semibold">01-2025.zip</span>
            </AlertDescription>
          </Alert>
        )}

       {/* Validation alerts */}
        {uploadedFilesCount > 0 && (
          allComplete ? (
            <Alert className="border-green-500/50 bg-green-500/5">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700 dark:text-green-400">Ejercicio fiscal completo detectado</AlertTitle>
              <AlertDescription className="text-green-600 dark:text-green-500">
                Los 12 periodos están listos para procesamiento.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-secondary/50 bg-secondary/5">
              <AlertTitle className="text-secondary-foreground font-medium flex items-center gap-2">
                <FileArchive className="h-4 w-4" /> Consolidación Parcial
              </AlertTitle>
              <AlertDescription className="text-secondary-foreground/80">
                {uploadedFilesCount} periodos listos para procesar. Faltan: {missingMonths.join(', ')}
              </AlertDescription>
            </Alert>
          )
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MONTH_NAMES.map(month => (
            <MonthUploadSlot key={month} month={month} file={files[month] || null} onFileSelect={handleSingleFileChange} />
          ))}
        </div>

        <div className="border-t pt-6 text-center">
          <Button size="lg" onClick={() => onProcess()} disabled={uploadedFilesCount === 0}>
            Generar Consolidado ({uploadedFilesCount} periodos)
          </Button>
          {uploadedFilesCount === 0 && (
            <p className="text-sm text-muted-foreground mt-3">Cargue al menos un archivo para iniciar la consolidación.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
