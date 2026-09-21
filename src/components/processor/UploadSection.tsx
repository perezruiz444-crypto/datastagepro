import React, { useState, useCallback, useRef } from 'react';
import { FileArchive, ArrowRight, X, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { detectPeriodFromZipFile, buildZipFromAscFiles } from '@/services/fileService';
import { MONTH_NAMES } from '@/constants/dataStage';

interface UploadSectionProps {
  onFileSelect: (file: File, month: string, year: number) => void;
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => currentYear - i);

/** Valida una selección de archivos: un solo .zip, o uno/varios .asc. Devuelve un mensaje de error o null. */
const validateSelection = (files: File[]): string | null => {
  if (files.length === 0) return 'No se seleccionó ningún archivo.';
  const allZip = files.every(f => f.name.toLowerCase().endsWith('.zip'));
  const allAsc = files.every(f => f.name.toLowerCase().endsWith('.asc'));
  if (allZip && files.length === 1) return null;
  if (allZip && files.length > 1) return 'Seleccione un solo archivo ZIP a la vez.';
  if (allAsc) return null;
  return 'Seleccione un archivo ZIP (.zip), o uno o varios archivos .asc.';
};

export const UploadSection: React.FC<UploadSectionProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null); // .zip original, o el .zip virtual armado desde .asc
  const [detectedMonth, setDetectedMonth] = useState<string | null>(null);
  const [detectedYear, setDetectedYear] = useState<number | null>(null);
  const [manualMonth, setManualMonth] = useState<string | null>(null);
  const [manualYear, setManualYear] = useState<number | null>(null);
  const [detecting, setDetecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: File[]) => {
    const error = validateSelection(fileList);
    if (error) {
      alert(error);
      return;
    }

    setSelectedFiles(fileList);
    setZipFile(null);
    setDetectedMonth(null);
    setDetectedYear(null);
    setManualMonth(null);
    setManualYear(null);
    setDetecting(true);

    try {
      const isAsc = fileList[0].name.toLowerCase().endsWith('.asc');
      const effectiveZip = isAsc ? await buildZipFromAscFiles(fileList) : fileList[0];
      setZipFile(effectiveZip);

      const { month, year } = await detectPeriodFromZipFile(effectiveZip);
      if (month) setDetectedMonth(month);
      if (year) setDetectedYear(year);
    } catch (e) {
      console.error('Error en auto-detección:', e);
    } finally {
      setDetecting(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  }, [handleFiles]);

  const finalMonth = detectedMonth || manualMonth;
  const finalYear = detectedYear || manualYear;
  const canContinue = zipFile && finalMonth;
  const periodDetected = detectedMonth && detectedYear;
  const needsManualInput = zipFile && !detecting && !periodDetected;

  const handleContinue = () => {
    if (zipFile && finalMonth) {
      onFileSelect(zipFile, finalMonth, finalYear || currentYear);
    }
  };

  const handleCancelSelection = () => {
    setSelectedFiles([]);
    setZipFile(null);
    setDetectedMonth(null);
    setDetectedYear(null);
    setManualMonth(null);
    setManualYear(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displayName = selectedFiles.length === 1
    ? selectedFiles[0].name
    : `${selectedFiles.length} archivos .asc seleccionados`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carga de Archivos</CardTitle>
        <CardDescription>Suba un archivo ZIP, o uno o varios archivos .asc sueltos. El periodo se detectará automáticamente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {selectedFiles.length === 0 ? (
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
              <p className="text-lg font-medium text-foreground">Arrastre y suelte su ZIP o sus archivos .asc aquí</p>
              <p className="text-muted-foreground my-2">o</p>
              <Button variant="default">Seleccionar archivo(s)</Button>
              <input type="file" ref={fileInputRef} accept=".zip,.asc" multiple className="hidden"
                onChange={(e) => e.target.files && e.target.files.length > 0 && handleFiles(Array.from(e.target.files))} />
            </div>
            <p className="text-sm text-muted-foreground">Acepta un archivo ZIP con los .asc adentro, o los .asc sueltos (puede seleccionar varios a la vez).</p>
          </>
        ) : (
          <div className="bg-primary/5 border-2 border-primary/30 rounded-xl p-6 text-center">
            <FileArchive className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">Archivo(s) listo(s) para procesar:</p>
            <p className="text-muted-foreground font-mono mb-3 break-all">{displayName}</p>

            {detecting && (
              <p className="text-sm text-muted-foreground mb-4">Detectando periodo...</p>
            )}

            {periodDetected && (
              <Badge variant="secondary" className="text-sm flex items-center gap-1 w-fit mx-auto mb-4">
                <Sparkles className="h-3 w-3" /> {detectedMonth} {detectedYear} — Detectado automáticamente
              </Badge>
            )}

            {needsManualInput && (
              <div className="mb-4 space-y-3">
                <Alert variant="default" className="text-left">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No se pudo detectar el periodo automáticamente</AlertTitle>
                  <AlertDescription>
                    Seleccione el mes y año del reporte manualmente.
                  </AlertDescription>
                </Alert>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Select onValueChange={(v) => setManualMonth(v)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select onValueChange={(v) => setManualYear(parseInt(v, 10))}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button variant="outline" onClick={handleCancelSelection}>
                <X className="mr-2 h-4 w-4" /> Cambiar Archivo
              </Button>
              <Button onClick={handleContinue} disabled={!canContinue}>
                <ArrowRight className="mr-2 h-4 w-4" /> Continuar y Procesar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
