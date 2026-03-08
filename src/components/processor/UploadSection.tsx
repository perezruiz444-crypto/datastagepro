import React, { useState, useCallback, useRef } from 'react';
import { FileArchive, ArrowRight, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MONTH_NAMES } from '@/constants/dataStage';
import { detectPeriodFromZipFile } from '@/services/fileService';

interface UploadSectionProps {
  onFileSelect: (file: File) => void;
  selectedMonth: string;
  selectedYear: number;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onFileSelect,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => currentYear + 1 - i);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file || !file.name.toLowerCase().endsWith('.zip')) {
      alert('Por favor, seleccione un archivo ZIP (.zip).');
      return;
    }
    setSelectedFile(file);
    setAutoDetected(false);

    try {
      const { month, year } = await detectPeriodFromZipFile(file);
      let detected = false;
      if (month) { onMonthChange(month); detected = true; }
      if (year) { onYearChange(String(year)); detected = true; }
      setAutoDetected(detected);
    } catch (e) {
      console.error('Error en auto-detección:', e);
    }
  }, [onMonthChange, onYearChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [handleFile]);

  const handleContinue = () => { if (selectedFile) onFileSelect(selectedFile); };
  const handleCancelSelection = () => {
    setSelectedFile(null);
    setAutoDetected(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carga de Archivo ZIP</CardTitle>
        <CardDescription>Seleccione el periodo y suba el archivo ZIP que contiene sus archivos de datos (.asc).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-muted/50 border rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-base font-medium text-foreground">Periodo del Reporte</h3>
            {autoDetected && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Detectado automáticamente
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Mes</label>
              <Select value={selectedMonth} onValueChange={onMonthChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map(month => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Año</label>
              <Select value={String(selectedYear)} onValueChange={onYearChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {!selectedFile ? (
          <>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileArchive className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">Arrastre y suelte su archivo ZIP aquí</p>
              <p className="text-muted-foreground my-2">o</p>
              <Button variant="default">Seleccionar archivo</Button>
              <input type="file" ref={fileInputRef} accept=".zip" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
            <p className="text-sm text-muted-foreground">El archivo debe contener archivos de datos con extensión .asc.</p>
          </>
        ) : (
          <div className="bg-primary/5 border-2 border-primary/30 rounded-xl p-6 text-center">
            <FileArchive className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">Archivo listo para procesar:</p>
            <p className="text-muted-foreground font-mono mb-6 break-all">{selectedFile.name}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button variant="outline" onClick={handleCancelSelection}>
                <X className="mr-2 h-4 w-4" /> Cambiar Archivo
              </Button>
              <Button onClick={handleContinue}>
                <ArrowRight className="mr-2 h-4 w-4" /> Continuar y Procesar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
