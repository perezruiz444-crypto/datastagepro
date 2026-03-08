export enum AppState {
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR',
}

export enum ReportMode {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
  HISTORICAL = 'HISTORICAL',
  MULTI_YEAR = 'MULTI_YEAR',
}

export enum ExportFormat {
  TEXT = 'TEXT',
  NUMERIC = 'NUMERIC',
}

export interface ProgressState {
  total: number;
  file: number;
  fileName: string;
}

export type ProcessedData = Record<string, string[][]>;

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export interface ValidationWarning {
  message: string;
  severity: 'warning' | 'error';
}
