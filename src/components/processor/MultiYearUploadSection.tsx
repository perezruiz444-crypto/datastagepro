import React, { useState, useRef, useCallback } from 'react';
import { FileArchive, FileSpreadsheet, Trash2, Layers, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { detectPeriodFromZipFile } from '@/services/fileService';

interface DetectedZip {
  file: File;
  month: string | null;
  year: number | null;
  detecting: boolean;
}

interface MultiYearUploadSectionProps {
  onProcess: (excelFiles: File[], zipFiles: File[]) => void;
}

export const MultiYearUploadSection: React.FC<MultiYearUploadSectionProps> = ({ onProcess }) => {
  const [excels, setExcels] = useState<File[]>([]);
  const [zips, setZips] = useState<DetectedZip[]>([]);
  const [draggingExcel, setDraggingExcel] = useState(false);
  const [draggingZip, setDraggingZip] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleExcelFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter(f => f.name.toLowerCase().endsWith('.xlsx'));
    if (valid.length !== incoming.length) alert('Solo se permiten archivos Excel (.xlsx).');
    setExcels(prev => [...prev, ...valid]);
  }, []);

  const handleZipFiles = useCallback(async (incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter(f => f.name.toLowerCase().endsWith('.zip'));
    if (valid.length !== incoming.length) alert('Solo se permiten archivos ZIP (.zip).');

    const placeholders: DetectedZip[] = valid.map(f => ({ file: f, month: null, year: null, detecting: true }));
    setZips(prev => [...prev, ...placeholders]);

    for (const p of placeholders) {
      const { month, year } = await detectPeriodFromZipFile(p.file);
      setZips(prev => prev.map(z => (z.file === p.file ? { ...z, month, year, detecting: false } : z)));
    }
  }, []);

  const totalSources = excels.length + zips.length;
  const detecting = zips.some(z => z.detecting);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" /> Fusión Multi-Año
        </CardTitle>
        <CardDescription>
          Combina reportes históricos previos (Excel) con ZIPs mensuales nuevos. Útil para actualizar tu histórico
          conforme te llega cada Data Stage. Si todas las fuentes tienen Pedimento_Unificado, se deduplica automáticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Zona Excel previos */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" /> Reportes previos (.xlsx)
            </h3>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                draggingExcel ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDraggingExcel(true); }}
              onDragLeave={() => setDraggingExcel(false)}
              onDrop={(e) => { e.preventDefault(); setDraggingExcel(false); handleExcelFiles(e.dataTransfer.files); }}
              onClick={() => excelInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-10 w-10 text-secondary mx-auto mb-2" />
              <p className="text-sm font-medium">Arrastra Excels históricos aquí</p>
              <p className="text-xs text-muted-foreground mt-1">Formato Lovable o Gemini (autodetectado)</p>
              <input type="file" ref={excelInputRef} multiple accept=".xlsx" className="hidden"
                     onChange={(e) => handleExcelFiles(e.target.files)} />
            </div>
            {excels.length > 0 && (
              <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                {excels.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                    <span className="font-mono truncate">{f.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); setExcels(prev => prev.filter((_, idx) => idx !== i)); }}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zona ZIPs nuevos */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <FileArchive className="h-4 w-4 text-primary" /> ZIPs nuevos (.zip)
            </h3>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                draggingZip ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDraggingZip(true); }}
              onDragLeave={() => setDraggingZip(false)}
              onDrop={(e) => { e.preventDefault(); setDraggingZip(false); handleZipFiles(e.dataTransfer.files); }}
              onClick={() => zipInputRef.current?.click()}
            >
              <FileArchive className="h-10 w-10 text-secondary mx-auto mb-2" />
              <p className="text-sm font-medium">Arrastra ZIPs mensuales aquí</p>
              <p className="text-xs text-muted-foreground mt-1">Se procesan y enriquecen con Pedimento_Unificado</p>
              <input type="file" ref={zipInputRef} multiple accept=".zip" className="hidden"
                     onChange={(e) => handleZipFiles(e.target.files)} />
            </div>
            {zips.length > 0 && (
              <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                {zips.map((z, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono truncate">{z.file.name}</span>
                      {z.detecting ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          {z.month && z.year ? `${z.month} ${z.year}` : 'sin periodo'}
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); setZips(prev => prev.filter((_, idx) => idx !== i)); }}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {totalSources > 0 && (
          <div className="text-center border-t pt-6">
            <p className="text-sm text-muted-foreground mb-3">
              {excels.length} Excel{excels.length !== 1 ? 's' : ''} + {zips.length} ZIP{zips.length !== 1 ? 's' : ''} = {totalSources} fuente{totalSources !== 1 ? 's' : ''} a fusionar
            </p>
            <Button size="lg" disabled={detecting || totalSources === 0}
                    onClick={() => onProcess(excels, zips.map(z => z.file))}>
              <Layers className="mr-2 h-4 w-4" /> Fusionar y generar reporte
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
