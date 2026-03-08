import React, { useState, useCallback, useRef } from 'react';
import { FileText, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FILE_NAMES } from '@/constants/dataStage';

interface HistoricalFile {
  id: string;
  file: File;
  label: string;
}

interface HistoricalUploadSectionProps {
  selectedYear: number;
  onYearChange: (year: string) => void;
  onProcess: (fileType: string, files: { file: File; label: string }[]) => void;
}

export const HistoricalUploadSection: React.FC<HistoricalUploadSectionProps> = ({
  selectedYear, onYearChange, onProcess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<HistoricalFile[]>([]);
  const [fileType, setFileType] = useState<string>(Object.keys(FILE_NAMES)[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => currentYear + 1 - i);

  const handleFiles = useCallback((incomingFiles: FileList | null) => {
    if (!incomingFiles) return;
    const newFiles: HistoricalFile[] = Array.from(incomingFiles)
      .filter(file => file.name.toLowerCase().endsWith('.asc'))
      .map(file => ({ id: `${file.name}-${file.lastModified}`, file, label: '' }));

    if (newFiles.length !== incomingFiles.length) {
      alert('Algunos archivos no son de tipo .asc y fueron ignorados.');
    }

    setFiles(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      return [...prev, ...newFiles.filter(f => !existingIds.has(f.id))];
    });
  }, []);

  const canProcess = files.length > 0 && files.every(f => f.label.trim() !== '');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generar Reporte Histórico</CardTitle>
        <CardDescription>Seleccione un tipo de archivo, suba todos los archivos .asc y asigne una etiqueta de periodo a cada uno.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Tipo de Archivo a Consolidar</label>
            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(FILE_NAMES).map(([key, name]) => (
                  <SelectItem key={key} value={key}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Año de Referencia</label>
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

        {files.length > 0 && (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-4 bg-muted/30 p-3 rounded-lg border">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 flex flex-col min-w-0">
                  <span className="font-mono text-sm truncate" title={f.file.name}>{f.file.name}</span>
                  <span className="text-[10px] text-muted-foreground">{(f.file.size / 1024).toFixed(2)} KB</span>
                </div>
                <Input
                  placeholder="Etiqueta (e.g. Ene 2023)"
                  value={f.label}
                  onChange={(e) => setFiles(prev => prev.map(x => x.id === f.id ? { ...x, label: e.target.value } : x))}
                  className={`w-48 text-sm ${!f.label.trim() ? 'border-destructive' : ''}`}
                />
                <Button variant="ghost" size="icon" onClick={() => setFiles(prev => prev.filter(x => x.id !== f.id))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); e.dataTransfer.clearData(); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Arrastre sus archivos .asc aquí</p>
          <p className="text-muted-foreground">o haga click para seleccionar</p>
          <input type="file" ref={fileInputRef} accept=".asc" className="hidden" multiple onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
        </div>

        <div className="border-t pt-6 text-center">
          <Button size="lg" onClick={() => canProcess && onProcess(fileType, files.map(({ file, label }) => ({ file, label })))} disabled={!canProcess}>
            Generar Reporte ({files.length} {files.length === 1 ? 'archivo' : 'archivos'})
          </Button>
          {!canProcess && files.length > 0 && (
            <p className="text-sm text-destructive/80 mt-3 flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Asigne una etiqueta de periodo a todos los archivos.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
