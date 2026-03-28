export type CellValue = string | number | boolean | null;
export type PortfolioScope = 'commerciale' | 'tutte';
export type ClosureFilter = 'tutte' | 'aperte' | 'chiuse';
export type SortDirection = 'asc' | 'desc';
export type ViewerTab = 'overview' | 'performance' | 'portfolio' | 'glossary';
export type KpiFormat = 'currency' | 'percent' | 'count';
export type KpiTone = 'default' | 'positive' | 'negative' | 'warning';
export type SortKey =
  | 'codComm'
  | 'cliente'
  | 'businessUnit'
  | 'revenueToDate'
  | 'costToDate'
  | 'plannedMargin'
  | 'marginToDate'
  | 'marginDeltaVsPlan'
  | 'marginPctToDate'
  | 'backlogCurrentYear'
  | 'monthlyMargin'
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
  monthlyRevenue: number;
  monthlyCost: number;
  monthlyMargin: number;
  plannedMargin: number;
  marginToDate: number;
  totalMargin: number;
  marginDeltaVsPlan: number;
  marginPctToDate: number | null;
  backlogCurrentYear: number;
  backlogFutureYears: number;
  residualCostCurrentYear: number;
  residualCostFutureYears: number;
  plannedResidualCostCurrentYear: number;
  progressPct: number | null;
  costNetToDate: number;
  underPlan: boolean;
  daysToProjectEnd: number | null;
  isCommercial: boolean;
  raw: Record<string, CellValue>;
}

export interface T8DashboardDataset {
  headers: string[];
  meta: T8ReportMeta;
  records: T8JobRecord[];
}

export interface PersistedT8DashboardDataset {
  headers: string[];
  meta: Omit<T8ReportMeta, 'executedAt'> & {
    executedAt: string | null;
  };
  records: Array<
    Omit<T8JobRecord, 'projectEndDate' | 'dataApertura' | 'dataChiusura'> & {
      projectEndDate: string | null;
      dataApertura: string | null;
      dataChiusura: string | null;
    }
  >;
}

export interface DashboardFilters {
  activeTab: ViewerTab;
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

export interface PersistedViewerSession {
  id: string;
  name: string;
  fileName: string;
  dataset: PersistedT8DashboardDataset;
  filters: DashboardFilters;
  selectedCodComm: string | null;
  savedAt: string;
}

export interface ExecutiveKpis {
  contractsValue: number;
  revenueToDate: number;
  costToDate: number;
  plannedMargin: number;
  marginToDate: number;
  marginDeltaVsPlan: number;
  marginPct: number | null;
  backlogCurrentYear: number;
  underPlanRate: number | null;
  atRiskBacklog: number;
  expiringBacklog90d: number;
  weightedProgress: number | null;
  monthlyRevenueRunRate: number;
  monthlyCostRunRate: number;
  monthlyMarginRunRate: number;
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

export type KpiId =
  | 'contractsValue'
  | 'revenueToDate'
  | 'costToDate'
  | 'plannedMargin'
  | 'marginToDate'
  | 'marginDeltaVsPlan'
  | 'marginPct'
  | 'backlogCurrentYear'
  | 'underPlanRate'
  | 'atRiskBacklog'
  | 'expiringBacklog90d'
  | 'weightedProgress'
  | 'monthlyMarginRunRate';

export interface KpiDefinition {
  id: KpiId;
  label: string;
  shortLabel: string;
  format: KpiFormat;
  tabs: ViewerTab[];
  definition: string;
  formula: string;
  whyItMatters: string;
}

export interface KpiCard {
  id: KpiId;
  label: string;
  shortLabel: string;
  format: KpiFormat;
  value: number | null;
  description: string;
  tone: KpiTone;
  definition: string;
  formula: string;
  whyItMatters: string;
}

export interface InsightMessage {
  title: string;
  body: string;
  tone: KpiTone;
}
