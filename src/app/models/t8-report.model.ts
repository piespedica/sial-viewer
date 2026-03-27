export type CellValue = string | number | boolean | null;
export type PortfolioScope = 'commerciale' | 'tutte';
export type ClosureFilter = 'tutte' | 'aperte' | 'chiuse';
export type SortDirection = 'asc' | 'desc';
export type SortKey =
  | 'codComm'
  | 'cliente'
  | 'businessUnit'
  | 'revenueToDate'
  | 'costToDate'
  | 'marginToDate'
  | 'marginPctToDate'
  | 'backlogCurrentYear'
  | 'projectEndDate';

export interface T8ReportMetaItem {
  label: string;
  value: string;
}

export interface T8ReportMeta {
  title: string;
  executedAtLabel: string;
  executedAt: Date | null;
  referenceItems: T8ReportMetaItem[];
  sheetName: string;
}

export interface T8JobRecord {
  rowNumber: number;
  codCDC: string;
  codComm: string;
  descriz: string;
  cliente: string;
  lineaProd: string;
  tipoAvanz: string;
  tipoRic: string;
  chiusa: boolean;
  contratto: string;
  accountManager: string;
  accountManagerLabel: string;
  projectManager: string;
  operation: string;
  businessUnit: string;
  businessArea: string;
  segment: string;
  tipCliente: string;
  tipoProcesso: string;
  projectEndDate: Date | null;
  dataApertura: Date | null;
  dataChiusura: Date | null;
  contractValue: number;
  revenueToDate: number;
  costToDate: number;
  marginToDate: number;
  marginPctToDate: number | null;
  backlogCurrentYear: number;
  backlogFutureYears: number;
  residualCostCurrentYear: number;
  residualCostFutureYears: number;
  progressPct: number | null;
  costNetToDate: number;
  isCommercial: boolean;
  raw: Record<string, CellValue>;
}

export interface T8DashboardDataset {
  headers: string[];
  meta: T8ReportMeta;
  records: T8JobRecord[];
}

export interface DashboardFilters {
  scope: PortfolioScope;
  closure: ClosureFilter;
  search: string;
  codCDC: string;
  lineaProd: string;
  businessUnit: string;
  accountManager: string;
  projectManager: string;
  tipoAvanz: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

export interface ExecutiveKpis {
  contractsValue: number;
  revenueToDate: number;
  costToDate: number;
  marginToDate: number;
  marginPct: number | null;
  backlogCurrentYear: number;
  commesseCount: number;
  atRiskCount: number;
}

export interface RankingEntry {
  label: string;
  sublabel: string;
  value: number;
  secondaryValue?: number | null;
  record: T8JobRecord;
}

export interface SegmentBreakdown {
  label: string;
  revenue: number;
  margin: number;
  count: number;
}
