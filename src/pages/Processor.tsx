import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppState, ReportMode, ProgressState, ProcessedData } from '@/types/dataStage';
import { MONTH_NAMES } from '@/constants/dataStage';
import { processZipFile, consolidateAnnualData, processHistoricalData, mergeExcelAndZips } from '@/services/fileService';
import { UploadSection } from '@/components/processor/UploadSection';
import { ProcessingSection } from '@/components/processor/ProcessingSection';
import { ResultsSection } from '@/components/processor/ResultsSection';
import { AnnualUploadSection } from '@/components/processor/AnnualUploadSection';

import { HistoricalUploadSection } from '@/components/processor/HistoricalUploadSection';
import { MultiYearUploadSection } from '@/components/processor/MultiYearUploadSection';
import ThemeToggle from '@/components/landing/ThemeToggle';

const Processor = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [reportMode, setReportMode] = useState<ReportMode>(ReportMode.MONTHLY);
  const [progress, setProgress] = useState<ProgressState>({ total: 0, file: 0, fileName: '' });
  const [logs, setLogs] = useState<string[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedData>({});
  const [reportTitle, setReportTitle] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [annualFiles, setAnnualFiles] = useState<Record<string, File | null>>(
    Object.fromEntries(MONTH_NAMES.map(m => [m, null]))
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const cancellationSignal = useRef({ current: false });

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const resetState = () => {
    setAppState(AppState.UPLOAD);
    setProgress({ total: 0, file: 0, fileName: '' });
    setLogs([]);
    setProcessedData({});
    setErrorMessage('');
    setValidationWarnings([]);
    cancellationSignal.current = { current: false };
  };

  const handleCancel = () => {
    cancellationSignal.current.current = true;
    addLog('Cancelando proceso...');
    resetState();
  };

  // Monthly processing
  const handleMonthlyFileSelect = async (file: File, month: string, year: number) => {
    setAppState(AppState.PROCESSING);
    setReportTitle(`${month} ${year}`);
    cancellationSignal.current = { current: false };
    try {
      const data = await processZipFile(file, addLog, setProgress, cancellationSignal.current, year);
      setProcessedData(data);
      setAppState(AppState.RESULTS);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      if (!msg.includes('cancelled')) {
        setErrorMessage(msg);
        setAppState(AppState.ERROR);
        addLog(`❌ Error: ${msg}`);
      }
    }
  };

  // Annual processing
  const handleAnnualProcess = async () => {
    const filledMonths = Object.entries(annualFiles).filter(([, f]) => f !== null) as [string, File][];
    if (filledMonths.length === 0) return;

    setAppState(AppState.PROCESSING);
    setReportTitle('Anual');
    cancellationSignal.current = { current: false };

    try {
      const monthlyDataArray: { month: string; data: ProcessedData }[] = [];
      for (let i = 0; i < filledMonths.length; i++) {
        const [month, file] = filledMonths[i];
        addLog(`--- Procesando mes: ${month} ---`);
        setProgress({ total: Math.round((i / filledMonths.length) * 100), file: 0, fileName: file.name });
        const data = await processZipFile(file, addLog, setProgress, cancellationSignal.current);
        monthlyDataArray.push({ month, data });
      }
      const consolidated = consolidateAnnualData(monthlyDataArray, addLog);
      setProcessedData(consolidated);
      setAppState(AppState.RESULTS);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      if (!msg.includes('cancelled')) {
        setErrorMessage(msg);
        setAppState(AppState.ERROR);
      }
    }
  };

  // Historical processing
  const handleHistoricalProcess = async (files: File[]) => {
    setAppState(AppState.PROCESSING);
    cancellationSignal.current = { current: false };

    try {
      const { data, yearRange } = await processHistoricalData(files, addLog, setProgress, cancellationSignal.current);
      setReportTitle(`Histórico ${yearRange}`);
      setProcessedData(data);
      setAppState(AppState.RESULTS);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      if (!msg.includes('cancelled')) {
        setErrorMessage(msg);
        setAppState(AppState.ERROR);
      }
    }
  };

  // Multi-year merge (Excel previos + ZIPs nuevos con dedup)
  const handleMultiYearProcess = async (excelFiles: File[], zipFiles: File[]) => {
    setAppState(AppState.PROCESSING);
    cancellationSignal.current = { current: false };
    try {
      const { data, stats } = await mergeExcelAndZips(
        excelFiles, zipFiles, addLog, setProgress, cancellationSignal.current,
      );
      setReportTitle(`Multi-Año (${stats.excels} xlsx + ${stats.zips} zip)`);
      setProcessedData(data);
      setAppState(AppState.RESULTS);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      if (!msg.includes('cancelled')) {
        setErrorMessage(msg);
        setAppState(AppState.ERROR);
        addLog(`❌ Error: ${msg}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle />
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-3">
              <Layers className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Data Stage Consolidado</h1>
                <p className="text-sm text-muted-foreground">Procesamiento y Consolidación de Datos</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {appState === AppState.UPLOAD && (
          <div className="space-y-6">
            <Tabs
              value={reportMode}
              onValueChange={(v) => setReportMode(v as ReportMode)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value={ReportMode.MONTHLY}>Mensual</TabsTrigger>
                <TabsTrigger value={ReportMode.ANNUAL}>Anual</TabsTrigger>
                <TabsTrigger value={ReportMode.HISTORICAL}>Histórico</TabsTrigger>
                <TabsTrigger value={ReportMode.MULTI_YEAR}>Multi-Año</TabsTrigger>
              </TabsList>
              <TabsContent value={ReportMode.MONTHLY}>
                <UploadSection onFileSelect={handleMonthlyFileSelect} />
              </TabsContent>
              <TabsContent value={ReportMode.ANNUAL}>
                <AnnualUploadSection
                  files={annualFiles}
                  onFilesChange={setAnnualFiles}
                  onProcess={handleAnnualProcess}
                />
              </TabsContent>
              <TabsContent value={ReportMode.HISTORICAL}>
                <HistoricalUploadSection onProcess={handleHistoricalProcess} />
              </TabsContent>
              <TabsContent value={ReportMode.MULTI_YEAR}>
                <MultiYearUploadSection onProcess={handleMultiYearProcess} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {appState === AppState.PROCESSING && (
          <ProcessingSection progress={progress} logs={logs} onCancel={handleCancel} />
        )}

        {appState === AppState.RESULTS && (
          <ResultsSection
            data={processedData}
            onReset={resetState}
            reportTitle={reportTitle}
            year={selectedYear}
            reportMode={reportMode}
            warnings={validationWarnings}
          />
        )}

        {appState === AppState.ERROR && (
          <div className="bg-card rounded-xl shadow-sm p-8 border text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">Error en el Procesamiento</h2>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            {logs.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-sm text-muted-foreground text-left mb-6 border">
                {logs.map((log, i) => <p key={i} className="break-words">&gt; {log}</p>)}
              </div>
            )}
            <Button onClick={resetState}>Intentar de nuevo</Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Processor;
