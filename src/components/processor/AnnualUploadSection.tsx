import React, { useState, useCallback, useRef } from 'react';
import { Calendar, Upload, FileArchive, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MONTH_NAMES } from '@/constants/dataStage';
import { detectPeriodFromZipFile } from '@/services/fileService';

const detectMonthFromZipFile = async (file: File): Promise<string | null> => {
  const { month } = await detectPeriodFromZipFile(file);
  return month;
};

interface AnnualUploadSectionProps {
  selectedYear: number;
  onYearChange: (year: string) => void;
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
  selectedYear, onYearChange, files, onFilesChange, onProcess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => currentYear + 1 - i);

  const handleFiles = useCallback(async (incomingFiles: FileList | null) => {
    if (!incomingFiles) return;
    setIsProcessing(true);
    const newFilesMap = { ...files };
    const zipFiles = Array.from(incomingFiles).filter(f => f.name.toLowerCase().endsWith('.zip'));

    if (zipFiles.length === 0 && incomingFiles.length > 0) {
      alert('Por favor, suba archivos ZIP (.zip).');
      setIsProcessing(false);
      return;
    }

    for (const file of zipFiles) {
      let guessedMonth = guessMonth(file.name);
      if (!guessedMonth) {
        guessedMonth = await detectMonthFromZipFile(file);
      } else {
        const contentMonth = await detectMonthFromZipFile(file);
        if (contentMonth) guessedMonth = contentMonth;
      }
      if (guessedMonth) newFilesMap[guessedMonth] = file;
    }

    onFilesChange(newFilesMap);
    setIsProcessing(false);
  }, [files, onFilesChange]);

  const uploadedFilesCount = Object.values(files).filter(f => f !== null).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carga de Archivos para Reporte Anual</CardTitle>
        <CardDescription>Suba todos los archivos ZIP del año. El sistema identificará el mes automáticamente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-muted-foreground mb-1">Año del Reporte</label>
          <Select value={String(selectedYear)} onValueChange={onYearChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
              <p className="text-lg font-medium text-foreground">Arrastre los 12 archivos ZIP aquí</p>
              <p className="text-muted-foreground">o haga click para seleccionar múltiples archivos</p>
            </>
          )}
          <input type="file" ref={bulkInputRef} accept=".zip" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MONTH_NAMES.map(month => (
            <MonthUploadSlot key={month} month={month} file={files[month] || null} onFileSelect={(m, f) => onFilesChange({ ...files, [m]: f })} />
          ))}
        </div>

        <div className="border-t pt-6 text-center">
          <Button size="lg" onClick={onProcess} disabled={uploadedFilesCount === 0}>
            Generar Reporte Anual ({uploadedFilesCount} {uploadedFilesCount === 1 ? 'mes' : 'meses'})
          </Button>
          {uploadedFilesCount === 0 && (
            <p className="text-sm text-muted-foreground mt-3">Cargue al menos un archivo para generar el reporte.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
