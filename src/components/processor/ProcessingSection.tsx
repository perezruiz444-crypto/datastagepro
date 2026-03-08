import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProgressState } from '@/types/dataStage';

interface ProcessingSectionProps {
  progress: ProgressState;
  logs: string[];
  onCancel: () => void;
}

export const ProcessingSection: React.FC<ProcessingSectionProps> = ({ progress, logs, onCancel }) => {
  const logPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logPanelRef.current) {
      logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Procesando archivos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-primary">Progreso general</span>
            <span className="text-sm font-medium text-primary">{progress.total}%</span>
          </div>
          <Progress value={progress.total} className="h-2.5 mb-3" />

          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-muted-foreground truncate mr-2">
              {progress.fileName ? `Procesando: ${progress.fileName}` : 'Archivo actual: Ninguno'}
            </span>
            <span className="text-sm font-medium text-muted-foreground">{progress.file}%</span>
          </div>
          <Progress value={progress.file} className="h-2" />
        </div>

        <div
          ref={logPanelRef}
          className="bg-muted/50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm text-muted-foreground border"
        >
          {logs.map((log, index) => (
            <p key={index} className="break-words">&gt; {log}</p>
          ))}
        </div>

        <div className="text-center">
          <Button variant="destructive" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancelar Proceso
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
