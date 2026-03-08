import React, { useState, useRef, useCallback } from 'react';
import { FileSpreadsheet, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MultiYearUploadSectionProps {
  onProcess: (files: File[]) => void;
}

export const MultiYearUploadSection: React.FC<MultiYearUploadSectionProps> = ({ onProcess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((incomingFiles: FileList | null) => {
    if (!incomingFiles) return;
    const newFiles = Array.from(incomingFiles).filter(file => file.name.toLowerCase().endsWith('.xlsx'));
    if (newFiles.length !== incomingFiles.length) alert('Solo se permiten archivos Excel (.xlsx).');
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" /> Consolidación Multi-Anual
        </CardTitle>
        <CardDescription>Sube los archivos Excel generados previamente para unificarlos en un solo reporte histórico.</CardDescription>
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
          <FileSpreadsheet className="h-12 w-12 text-secondary mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Arrastra tus reportes Excel aquí</p>
          <p className="text-sm text-muted-foreground mt-2">Soporta múltiples archivos .xlsx</p>
          <input type="file" ref={fileInputRef} multiple accept=".xlsx" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>

        {files.length > 0 && (
          <div>
            <h3 className="text-base font-medium text-foreground mb-4 flex justify-between items-center">
              Archivos seleccionados:
              <Badge variant="secondary">{files.length} {files.length === 1 ? 'archivo' : 'archivos'}</Badge>
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-4 w-4 text-secondary" />
                    <span className="text-sm font-mono truncate max-w-xs sm:max-w-md text-foreground">{file.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter((_, i) => i !== idx)); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center border-t pt-6">
              <Button size="lg" onClick={() => onProcess(files)}>
                <Layers className="mr-2 h-4 w-4" /> Unificar Datos Multi-Anuales
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
