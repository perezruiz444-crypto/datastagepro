import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppState, ReportMode, ProgressState, ProcessedData } from '@/types/dataStage';
import { MONTH_NAMES } from '@/constants/dataStage';
import { processZipFile, consolidateAnnualData, processHistoricalData } from '@/services/fileService';
import { UploadSection } from '@/components/processor/UploadSection';
import { ProcessingSection } from '@/components/processor/ProcessingSection';
import { ResultsSection } from '@/components/processor/ResultsSection';
import { AnnualUploadSection } from '@/components/processor/AnnualUploadSection';
import { ConsolidatedTableUploadSection } from '@/components/processor/ConsolidatedTableUploadSection';
import { MultiYearUploadSection } from '@/components/processor/MultiYearUploadSection';
import ThemeToggle from '@/components/landing/ThemeToggle';

const Processor = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [reportMode, setReportMode] = useState<ReportMode>(ReportMode.MONTHLY);
  const [progress, setProgress] = useState<ProgressState>({ total: 0, file: 0, fileName: '' });
  const [logs, setLogs] = useState<string[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedData>({});
  const [reportTitle, setReportTitle] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(MONTH_NAMES[new Date().getMonth()]);
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
  const handleMonthlyFileSelect = async (file: File) => {
    setAppState(AppState.PROCESSING);
    setReportTitle(`${selectedMonth} ${selectedYear}`);
    cancellationSignal.current = { current: false };
    try {
      const data = await processZipFile(file, addLog, setProgress, cancellationSignal.current, selectedYear);
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
    setReportTitle(`Anual ${selectedYear}`);
    cancellationSignal.current = { current: false };

    try {
      const monthlyDataArray: { month: string; data: ProcessedData }[] = [];
      for (let i = 0; i < filledMonths.length; i++) {
        const [month, file] = filledMonths[i];
        addLog(`--- Procesando mes: ${month} ---`);
        setProgress({ total: Math.round((i / filledMonths.length) * 100), file: 0, fileName: file.name });
        const data = await processZipFile(file, addLog, setProgress, cancellationSignal.current, selectedYear);
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

  // Consolidated table processing
  const handleConsolidatedTableProcess = async (fileType: string, files: { file: File; label: string }[]) => {
    setAppState(AppState.PROCESSING);
    setReportTitle(`Consolidado por Tabla - ${fileType}`);
    cancellationSignal.current = { current: false };

    try {
      const consolidated: ProcessedData = {};
      consolidated[fileType] = [];

      for (let i = 0; i < files.length; i++) {
        const { file, label } = files[i];
        addLog(`Procesando: ${file.name} (${label})...`);
        setProgress({ total: Math.round((i / files.length) * 100), file: 0, fileName: file.name });

        const content = await file.text();
        const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
        const parsed = lines.map(line => line.split('|').map(f => f.trim()));

        if (consolidated[fileType].length === 0) {
          const header = ['Periodo', ...(parsed[0] || [])];
          consolidated[fileType].push(header);
        }
        const dataRows = parsed.slice(consolidated[fileType].length === 1 ? 0 : 1);
        const rowsWithLabel = dataRows.map(row => [label, ...row]);
        consolidated[fileType].push(...rowsWithLabel);

        addLog(`✅ ${file.name}: ${parsed.length} registros.`);
        setProgress({ total: Math.round(((i + 1) / files.length) * 100), file: 100, fileName: file.name });
      }

      setProcessedData(consolidated);
      setAppState(AppState.RESULTS);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setErrorMessage(msg);
      setAppState(AppState.ERROR);
    }
  };

  // Multi-year processing
  const handleMultiYearProcess = async (files: File[]) => {
    setAppState(AppState.PROCESSING);
    setReportTitle('Multi-Anual');
    cancellationSignal.current = { current: false };

    try {
      const data = await mergeExcelFiles(files, addLog, setProgress);
      setProcessedData(data);
      setAppState(AppState.RESULTS);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setErrorMessage(msg);
      setAppState(AppState.ERROR);
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
                <TabsTrigger value={ReportMode.CONSOLIDATED_TABLE}>Consolidado por Tabla</TabsTrigger>
                <TabsTrigger value={ReportMode.MULTI_YEAR}>Multi-Anual</TabsTrigger>
              </TabsList>
              <TabsContent value={ReportMode.MONTHLY}>
                <UploadSection
                  onFileSelect={handleMonthlyFileSelect}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  onMonthChange={setSelectedMonth}
                  onYearChange={(y) => setSelectedYear(parseInt(y, 10))}
                />
              </TabsContent>
              <TabsContent value={ReportMode.ANNUAL}>
                <AnnualUploadSection
                  selectedYear={selectedYear}
                  onYearChange={(y) => setSelectedYear(parseInt(y, 10))}
                  files={annualFiles}
                  onFilesChange={setAnnualFiles}
                  onProcess={handleAnnualProcess}
                />
              </TabsContent>
              <TabsContent value={ReportMode.CONSOLIDATED_TABLE}>
                <ConsolidatedTableUploadSection
                  selectedYear={selectedYear}
                  onYearChange={(y) => setSelectedYear(parseInt(y, 10))}
                  onProcess={handleConsolidatedTableProcess}
                />
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
