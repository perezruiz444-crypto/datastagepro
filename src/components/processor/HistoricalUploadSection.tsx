import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FileArchive, Trash2, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { detectPeriodFromZipFile } from '@/services/fileService';

interface DetectedFile {
  file: File;
  month: string | null;
  year: number | null;
  detecting: boolean;
}

interface HistoricalUploadSectionProps {
  onProcess: (files: File[]) => void;
}

export const HistoricalUploadSection: React.FC<HistoricalUploadSectionProps> = ({ onProcess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<DetectedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (incomingFiles: FileList | null) => {
    if (!incomingFiles) return;
    const newFiles = Array.from(incomingFiles).filter(file => file.name.toLowerCase().endsWith('.zip'));
    if (newFiles.length !== incomingFiles.length) alert('Solo se permiten archivos ZIP (.zip).');

    const placeholders: DetectedFile[] = newFiles.map(f => ({ file: f, month: null, year: null, detecting: true }));
    setFiles(prev => [...prev, ...placeholders]);

    // Auto-detect periods
    for (const placeholder of placeholders) {
      const { month, year } = await detectPeriodFromZipFile(placeholder.file);
      setFiles(prev => prev.map(f =>
        f.file === placeholder.file ? { ...f, month, year, detecting: false } : f
      ));
    }
  }, []);

  const yearRange = (() => {
    const years = files.filter(f => f.year).map(f => f.year!);
    if (years.length === 0) return null;
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? `${min}` : `${min}-${max}`;
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Histórico Multianual
        </CardTitle>
        <CardDescription>
          Sube los archivos ZIP de todos los periodos que desees consolidar. El sistema procesará cada ZIP desde cero y generará un ecosistema histórico completo con todas las tablas, incluyendo columnas de Año y Mes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <FileArchive className="h-12 w-12 text-secondary mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Arrastra tus archivos ZIP aquí</p>
          <p className="text-sm text-muted-foreground mt-2">Soporta múltiples archivos .zip de distintos meses y años</p>
          <input type="file" ref={fileInputRef} multiple accept=".zip" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>

        {files.length > 0 && (
          <div>
            <h3 className="text-base font-medium text-foreground mb-4 flex justify-between items-center">
              Archivos seleccionados:
              <div className="flex items-center gap-2">
                {yearRange && <Badge variant="outline">Rango: {yearRange}</Badge>}
                <Badge variant="secondary">{files.length} {files.length === 1 ? 'archivo' : 'archivos'}</Badge>
              </div>
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {files.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileArchive className="h-4 w-4 text-secondary" />
                    <span className="text-sm font-mono truncate max-w-xs sm:max-w-md text-foreground">{item.file.name}</span>
                    {item.detecting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {item.month && item.year ? `${item.month} ${item.year}` : 'Periodo no detectado'}
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter((_, i) => i !== idx)); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center border-t pt-6">
              <Button size="lg" onClick={() => onProcess(files.map(f => f.file))} disabled={files.some(f => f.detecting)}>
                <History className="mr-2 h-4 w-4" /> Generar Histórico
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
