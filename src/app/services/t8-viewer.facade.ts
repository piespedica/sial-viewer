import { Injectable, computed, inject, signal } from '@angular/core';
import {
  ClosureFilter,
  DashboardFilters,
  ExecutiveKpis,
  InsightMessage,
  KpiCard,
  KpiDefinition,
  KpiId,
  KpiTone,
  RankingEntry,
  SegmentBreakdown,
  SortDirection,
  SortKey,
  T8DashboardDataset,
  T8JobRecord,
  ViewerTab,
} from '../models/t8-report.model';
import { T8XlsParserService } from './t8-xls-parser.service';

const DEFAULT_FILTERS: DashboardFilters = {
  activeTab: 'overview',
  scope: 'commerciale',
  closure: 'tutte',
  search: '',
  codCDC: 'tutte',
  lineaProd: 'tutte',
  businessUnit: 'tutte',
  accountManager: 'tutte',
  projectManager: 'tutte',
  tipoAvanz: 'tutte',
  sortKey: 'marginToDate',
  sortDirection: 'desc',
};

const KPI_DEFINITIONS: KpiDefinition[] = [
  {
    id: 'revenueToDate',
    label: 'Ricavi alla data',
    shortLabel: 'Ricavi',
    format: 'currency',
    tabs: ['overview', 'portfolio', 'glossary'],
    definition: 'Ricavo già maturato alla data del report sulle commesse filtrate.',
    formula: 'Somma di RicTotData.',
    whyItMatters: 'Misura la dimensione del portafoglio già convertita in ricavo.',
  },
  {
    id: 'marginToDate',
    label: 'Margine alla data',
    shortLabel: 'Margine',
    format: 'currency',
    tabs: ['overview', 'performance', 'glossary'],
    definition: 'Margine effettivo già consuntivato alla data del report.',
    formula: 'Somma di MarTotData.',
    whyItMatters: 'È il dato economico chiave per capire se il portafoglio sta creando o erodendo valore.',
  },
  {
    id: 'marginDeltaVsPlan',
    label: 'Delta vs MarDatiC12',
    shortLabel: 'Delta vs C12',
    format: 'currency',
    tabs: ['overview', 'performance', 'glossary'],
    definition: 'Scostamento tra margine totale commessa e margine ipotizzato in C12.',
    formula: 'Somma di (MarTotComm - MarDatiC12).',
    whyItMatters: 'Dice subito se il portafoglio sta andando meglio o peggio delle attese.',
  },
  {
    id: 'underPlanRate',
    label: '% commesse sotto piano C12',
    shortLabel: 'Sotto piano',
    format: 'percent',
    tabs: ['overview', 'performance', 'glossary'],
    definition: 'Quota di commesse in cui il margine totale commessa è sotto il margine C12.',
    formula: 'Count(MarTotComm < MarDatiC12) / commesse filtrate.',
    whyItMatters: 'Trasforma lo scostamento economico in un indicatore di diffusione del problema.',
  },
  {
    id: 'atRiskBacklog',
    label: 'Backlog a rischio',
    shortLabel: 'Backlog rischio',
    format: 'currency',
    tabs: ['overview', 'performance', 'glossary'],
    definition: 'Ricavo residuo dell’anno corrente esposto su commesse sotto piano o con margine debole.',
    formula: 'Somma di RicResAnnoCorr su commesse a rischio.',
    whyItMatters: 'Quantifica il valore futuro già potenzialmente compromesso.',
  },
  {
    id: 'expiringBacklog90d',
    label: 'Valore in scadenza a 90 giorni',
    shortLabel: 'Scadenza 90g',
    format: 'currency',
    tabs: ['overview', 'performance', 'glossary'],
    definition: 'Backlog delle commesse aperte che terminano entro 90 giorni.',
    formula: 'Somma di RicResAnnoCorr su commesse aperte con Data Fine Progetto entro 90 giorni.',
    whyItMatters: 'Evidenzia l’esposizione operativa/commerciale nel brevissimo termine.',
  },
  {
    id: 'weightedProgress',
    label: 'Avanzamento ponderato portafoglio',
    shortLabel: 'Avanzamento',
    format: 'percent',
    tabs: ['overview', 'portfolio', 'glossary'],
    definition: 'Avanzamento medio del portafoglio pesato per valore contrattuale.',
    formula: 'Media pesata di %AvanRicTotData usando RicTotComm come peso.',
    whyItMatters: 'Evita che le commesse piccole distorcano la lettura del progresso reale.',
  },
  {
    id: 'monthlyMarginRunRate',
    label: 'Run-rate mensile di margine',
    shortLabel: 'Margine mese',
    format: 'currency',
    tabs: ['overview', 'performance', 'glossary'],
    definition: 'Margine maturato nel mese corrente dal portafoglio filtrato.',
    formula: 'Somma di MarMatNelMese.',
    whyItMatters: 'Introduce una lettura dinamica, utile per capire il momentum del mese.',
  },
  {
    id: 'contractsValue',
    label: 'Valore contratti',
    shortLabel: 'Contratti',
    format: 'currency',
    tabs: ['overview', 'portfolio', 'glossary'],
    definition: 'Valore complessivo dei contratti nel perimetro filtrato.',
    formula: 'Somma di RicTotComm.',
    whyItMatters: 'Fornisce il denominatore economico del portafoglio osservato.',
  },
  {
    id: 'backlogCurrentYear',
    label: 'Backlog anno corrente',
    shortLabel: 'Backlog',
    format: 'currency',
    tabs: ['overview', 'portfolio', 'glossary'],
    definition: 'Ricavo ancora da maturare nell’anno corrente.',
    formula: 'Somma di RicResAnnoCorr.',
    whyItMatters: 'Misura la pipeline economica residua nel periodo più vicino.',
  },
  {
    id: 'plannedMargin',
    label: 'Margine ipotizzato C12',
    shortLabel: 'C12',
    format: 'currency',
    tabs: ['performance', 'glossary'],
    definition: 'Margine di riferimento ipotizzato nel dato C12.',
    formula: 'Somma di MarDatiC12.',
    whyItMatters: 'Serve come benchmark per leggere lo scostamento attuale.',
  },
  {
    id: 'marginPct',
    label: 'Margine %',
    shortLabel: 'Margine %',
    format: 'percent',
    tabs: ['performance', 'glossary'],
    definition: 'Rapporto tra margine attuale e ricavo attuale.',
    formula: 'Somma MarTotData / Somma RicTotData.',
    whyItMatters: 'Aiuta a confrontare efficienza economica tra portafogli diversi.',
  },
];

@Injectable({
  providedIn: 'root',
})
export class T8ViewerFacade {
  private readonly parser = inject(T8XlsParserService);
  private readonly datasetSignal = signal<T8DashboardDataset | null>(null);
  private readonly filtersSignal = signal<DashboardFilters>(DEFAULT_FILTERS);
  private readonly selectedCodCommSignal = signal<string | null>(null);
  private readonly statusSignal = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  private readonly errorSignal = signal<string | null>(null);
  private readonly fileNameSignal = signal<string>('Nessun file caricato');

  readonly dataset = this.datasetSignal.asReadonly();
  readonly filters = this.filtersSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly errorMessage = this.errorSignal.asReadonly();
  readonly fileName = this.fileNameSignal.asReadonly();

  readonly tabs: Array<{ id: ViewerTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'performance', label: 'Performance' },
    { id: 'portfolio', label: 'Portafoglio' },
    { id: 'glossary', label: 'Glossario & dettaglio' },
  ];

  readonly records = computed(() => this.datasetSignal()?.records ?? []);
  readonly meta = computed(() => this.datasetSignal()?.meta ?? null);
  readonly activeTab = computed(() => this.filtersSignal().activeTab);
  readonly kpiDefinitions = computed(() => KPI_DEFINITIONS);
  readonly selectedRecord = computed(
    () => this.filteredRecords().find((record) => record.codComm === this.selectedCodCommSignal()) ?? null,
  );
  readonly selectedRecordFallback = computed(
    () => this.records().find((record) => record.codComm === this.selectedCodCommSignal()) ?? null,
  );

  readonly lineaProdOptions = computed(() => this.uniqueValues(this.records().map((record) => record.lineaProd)));
  readonly codCDCOptions = computed(() => this.uniqueValues(this.records().map((record) => record.codCDC)));
  readonly businessUnitOptions = computed(() => this.uniqueValues(this.records().map((record) => record.businessUnit)));
  readonly accountManagerOptions = computed(() => this.uniqueValues(this.records().map((record) => record.accountManagerLabel)));
  readonly projectManagerOptions = computed(() => this.uniqueValues(this.records().map((record) => record.projectManager)));
  readonly tipoAvanzOptions = computed(() => this.uniqueValues(this.records().map((record) => record.tipoAvanz)));

  readonly filteredRecords = computed(() => {
    const filters = this.filtersSignal();
    const term = filters.search.trim().toLowerCase();
    const closureMatches = this.buildClosurePredicate(filters.closure);

    return this.records()
      .filter((record) => (filters.scope === 'commerciale' ? record.isCommercial : true))
      .filter((record) => closureMatches(record))
      .filter((record) => (filters.codCDC === 'tutte' ? true : record.codCDC === filters.codCDC))
      .filter((record) => (filters.lineaProd === 'tutte' ? true : record.lineaProd === filters.lineaProd))
      .filter((record) => (filters.businessUnit === 'tutte' ? true : record.businessUnit === filters.businessUnit))
      .filter((record) => (filters.accountManager === 'tutte' ? true : record.accountManagerLabel === filters.accountManager))
      .filter((record) => (filters.projectManager === 'tutte' ? true : record.projectManager === filters.projectManager))
      .filter((record) => (filters.tipoAvanz === 'tutte' ? true : record.tipoAvanz === filters.tipoAvanz))
      .filter((record) => {
        if (!term) {
          return true;
        }

        return [record.codComm, record.descriz, record.cliente, record.businessUnit, record.codCDC]
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((left, right) => this.compareRecords(left, right, filters.sortKey, filters.sortDirection));
  });

  readonly kpis = computed<ExecutiveKpis>(() => {
    const records = this.filteredRecords();
    const revenueToDate = this.sum(records, 'revenueToDate');
    const marginToDate = this.sum(records, 'marginToDate');
    const underPlanRecords = records.filter((record) => record.underPlan);
    const weightedProgressRecords = records.filter((record) => record.progressPct !== null && record.contractValue > 0);

    return {
      contractsValue: this.sum(records, 'contractValue'),
      revenueToDate,
      costToDate: this.sum(records, 'costToDate'),
      plannedMargin: this.sum(records, 'plannedMargin'),
      marginToDate,
      marginDeltaVsPlan: this.sum(records, 'marginDeltaVsPlan'),
      marginPct: revenueToDate ? (marginToDate / revenueToDate) * 100 : null,
      backlogCurrentYear: this.sum(records, 'backlogCurrentYear'),
      underPlanRate: records.length ? (underPlanRecords.length / records.length) * 100 : null,
      atRiskBacklog: records.filter((record) => this.isAtRisk(record)).reduce((acc, record) => acc + record.backlogCurrentYear, 0),
      expiringBacklog90d: records
        .filter((record) => !record.chiusa && record.backlogCurrentYear > 0 && record.daysToProjectEnd !== null && record.daysToProjectEnd >= 0 && record.daysToProjectEnd <= 90)
        .reduce((acc, record) => acc + record.backlogCurrentYear, 0),
      weightedProgress: weightedProgressRecords.length
        ? weightedProgressRecords.reduce((acc, record) => acc + (record.progressPct ?? 0) * record.contractValue, 0) /
          weightedProgressRecords.reduce((acc, record) => acc + record.contractValue, 0)
        : null,
      monthlyRevenueRunRate: this.sum(records, 'monthlyRevenue'),
      monthlyCostRunRate: this.sum(records, 'monthlyCost'),
      monthlyMarginRunRate: this.sum(records, 'monthlyMargin'),
      commesseCount: records.length,
      atRiskCount: records.filter((record) => this.isAtRisk(record)).length,
    };
  });

  readonly overviewPrimaryKpis = computed(() =>
    [
      this.buildKpiCard('revenueToDate'),
      this.buildKpiCard('marginToDate'),
      this.buildKpiCard('marginDeltaVsPlan'),
      this.buildKpiCard('underPlanRate'),
      this.buildKpiCard('atRiskBacklog'),
      this.buildKpiCard('expiringBacklog90d'),
    ].filter(Boolean) as KpiCard[],
  );

  readonly overviewSecondaryKpis = computed(() =>
    [
      this.buildKpiCard('contractsValue'),
      this.buildKpiCard('backlogCurrentYear'),
      this.buildKpiCard('weightedProgress'),
      this.buildKpiCard('monthlyMarginRunRate'),
    ].filter(Boolean) as KpiCard[],
  );

  readonly glossaryCards = computed(() =>
    this.kpiDefinitions()
      .slice()
      .sort((left, right) => left.label.localeCompare(right.label, 'it'))
      .map((definition) => this.buildKpiCard(definition.id))
      .filter(Boolean) as KpiCard[],
  );

  readonly insights = computed<InsightMessage[]>(() => {
    const kpis = this.kpis();
    const messages: InsightMessage[] = [];

    messages.push({
      title: kpis.marginDeltaVsPlan >= 0 ? 'Portafoglio sopra C12' : 'Portafoglio sotto C12',
      body:
        kpis.marginDeltaVsPlan >= 0
          ? 'Il margine totale commessa è sopra il benchmark C12 sul perimetro attuale.'
          : 'Il margine totale commessa sta erodendo valore rispetto all’ipotesi C12.',
      tone: kpis.marginDeltaVsPlan >= 0 ? 'positive' : 'negative',
    });

    messages.push({
      title: 'Backlog esposto',
      body: `${this.numberLabel(kpis.atRiskCount)} a rischio con backlog esposto sul periodo.`,
      tone: kpis.atRiskCount > 0 ? 'warning' : 'default',
    });

    if (kpis.expiringBacklog90d > 0) {
      messages.push({
        title: 'Finestra 90 giorni',
        body: 'Ci sono commesse aperte in scadenza ravvicinata con ricavo residuo ancora da proteggere.',
        tone: 'warning',
      });
    } else {
      messages.push({
        title: 'Scadenze sotto controllo',
        body: 'Nessun backlog rilevante ricade oggi nella finestra di scadenza a 90 giorni.',
        tone: 'positive',
      });
    }

    return messages;
  });

  readonly bestPerformers = computed(() => this.toRanking(this.filteredRecords().slice().sort((a, b) => b.marginToDate - a.marginToDate).slice(0, 8)));
  readonly worstPerformers = computed(() => this.toRanking(this.filteredRecords().slice().sort((a, b) => a.marginToDate - b.marginToDate).slice(0, 8)));
  readonly bestDeltaVsPlan = computed(() =>
    this.toRanking(this.filteredRecords().slice().sort((a, b) => b.marginDeltaVsPlan - a.marginDeltaVsPlan).slice(0, 8), false, true),
  );
  readonly worstDeltaVsPlan = computed(() =>
    this.toRanking(this.filteredRecords().slice().sort((a, b) => a.marginDeltaVsPlan - b.marginDeltaVsPlan).slice(0, 8), false, true),
  );
  readonly bestMarginPct = computed(() =>
    this.toRanking(
      this.filteredRecords()
        .filter((record) => record.revenueToDate >= 1000 && record.marginPctToDate !== null)
        .sort((a, b) => (b.marginPctToDate ?? 0) - (a.marginPctToDate ?? 0))
        .slice(0, 8),
      true,
    ),
  );
  readonly worstMarginPct = computed(() =>
    this.toRanking(
      this.filteredRecords()
        .filter((record) => record.revenueToDate >= 1000 && record.marginPctToDate !== null)
        .sort((a, b) => (a.marginPctToDate ?? 0) - (b.marginPctToDate ?? 0))
        .slice(0, 8),
      true,
    ),
  );

  readonly businessUnitBreakdown = computed(() => this.groupByMetric(this.filteredRecords(), 'businessUnit').slice(0, 6));
  readonly lineaProdBreakdown = computed(() => this.groupByMetric(this.filteredRecords(), 'lineaProd').slice(0, 6));
  readonly codCDCBreakdown = computed(() => this.groupByMetric(this.filteredRecords(), 'codCDC').slice(0, 6));

  async loadFile(file: File): Promise<void> {
    this.statusSignal.set('loading');
    this.errorSignal.set(null);
    this.selectedCodCommSignal.set(null);
    this.fileNameSignal.set(file.name);

    try {
      const dataset = await this.parser.parseFile(file);
      this.hydrateDataset(dataset, file.name);
    } catch (error) {
      this.statusSignal.set('error');
      this.errorSignal.set(error instanceof Error ? error.message : 'Errore imprevisto durante il parsing del file.');
    }
  }

  hydrateDataset(dataset: T8DashboardDataset, fileName: string): void {
    this.datasetSignal.set(dataset);
    this.fileNameSignal.set(fileName);
    this.filtersSignal.set(DEFAULT_FILTERS);
    this.statusSignal.set('ready');
    this.errorSignal.set(null);
    this.selectedCodCommSignal.set(null);
  }

  reset(): void {
    this.datasetSignal.set(null);
    this.filtersSignal.set(DEFAULT_FILTERS);
    this.statusSignal.set('idle');
    this.errorSignal.set(null);
    this.fileNameSignal.set('Nessun file caricato');
    this.selectedCodCommSignal.set(null);
  }

  setActiveTab(activeTab: ViewerTab): void {
    this.patchFilters({ activeTab });
  }

  setSearch(search: string): void {
    this.patchFilters({ search });
  }

  setScope(scope: DashboardFilters['scope']): void {
    this.patchFilters({ scope });
  }

  setClosure(closure: ClosureFilter): void {
    this.patchFilters({ closure });
  }

  setFilter<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]): void {
    this.patchFilters({ [key]: value } as Pick<DashboardFilters, K>);
  }

  toggleSort(sortKey: SortKey): void {
    const current = this.filtersSignal();
    const sortDirection: SortDirection =
      current.sortKey === sortKey ? (current.sortDirection === 'desc' ? 'asc' : 'desc') : this.defaultSortDirection(sortKey);

    this.patchFilters({ sortKey, sortDirection });
  }

  selectRecord(record: T8JobRecord): void {
    this.selectedCodCommSignal.set(record.codComm);
  }

  clearSelection(): void {
    this.selectedCodCommSignal.set(null);
  }

  isAtRisk(record: T8JobRecord): boolean {
    const lowMargin = (record.marginPctToDate ?? 0) < 10 && record.backlogCurrentYear > 0;
    const negativeMargin = record.marginToDate < 0 || record.marginDeltaVsPlan < 0;
    const endSoon = record.daysToProjectEnd !== null && record.daysToProjectEnd >= 0 && record.daysToProjectEnd <= 90 && record.backlogCurrentYear > 0;
    return negativeMargin || lowMargin || endSoon;
  }

  private buildKpiCard(id: KpiId): KpiCard | null {
    const definition = KPI_DEFINITIONS.find((item) => item.id === id);
    if (!definition) {
      return null;
    }

    const kpis = this.kpis();
    const value = kpis[id as keyof ExecutiveKpis] as number | null | undefined;
    const tone = this.resolveKpiTone(id, value ?? null);

    return {
      id,
      label: definition.label,
      shortLabel: definition.shortLabel,
      format: definition.format,
      value: value ?? null,
      description: definition.whyItMatters,
      tone,
      definition: definition.definition,
      formula: definition.formula,
      whyItMatters: definition.whyItMatters,
    };
  }

  private resolveKpiTone(id: KpiId, value: number | null): KpiTone {
    if (value === null) {
      return 'default';
    }

    if (id === 'marginToDate' || id === 'marginDeltaVsPlan' || id === 'monthlyMarginRunRate') {
      return value >= 0 ? 'positive' : 'negative';
    }

    if (id === 'underPlanRate') {
      return value <= 25 ? 'positive' : value <= 45 ? 'warning' : 'negative';
    }

    if (id === 'atRiskBacklog' || id === 'expiringBacklog90d') {
      return value > 0 ? 'warning' : 'positive';
    }

    return 'default';
  }

  private patchFilters(patch: Partial<DashboardFilters>): void {
    this.filtersSignal.update((current) => ({ ...current, ...patch }));
  }

  private groupByMetric(records: T8JobRecord[], field: 'businessUnit' | 'lineaProd' | 'codCDC'): SegmentBreakdown[] {
    const groups = new Map<string, SegmentBreakdown>();

    for (const record of records) {
      const key = record[field] || 'Non valorizzato';
      const current = groups.get(key) ?? { label: key, revenue: 0, margin: 0, count: 0 };
      current.revenue += record.revenueToDate;
      current.margin += record.marginToDate;
      current.count += 1;
      groups.set(key, current);
    }

    return Array.from(groups.values()).sort((left, right) => right.revenue - left.revenue);
  }

  private toRanking(records: T8JobRecord[], percentage = false, compareToPlan = false): RankingEntry[] {
    return records.map((record) => ({
      label: record.codComm,
      sublabel: `${record.cliente} · ${record.businessUnit || record.lineaProd}`,
      value: percentage ? record.marginPctToDate ?? 0 : compareToPlan ? record.marginDeltaVsPlan : record.marginToDate,
      secondaryValue: percentage ? record.marginToDate : compareToPlan ? record.totalMargin : record.marginPctToDate,
      record,
    }));
  }

  private uniqueValues(values: string[]): string[] {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  }

  private buildClosurePredicate(filter: ClosureFilter): (record: T8JobRecord) => boolean {
    if (filter === 'aperte') {
      return (record) => !record.chiusa;
    }

    if (filter === 'chiuse') {
      return (record) => record.chiusa;
    }

    return () => true;
  }

  private compareRecords(left: T8JobRecord, right: T8JobRecord, key: SortKey, direction: SortDirection): number {
    const factor = direction === 'desc' ? -1 : 1;
    const leftValue = this.sortValue(left, key);
    const rightValue = this.sortValue(right, key);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return factor * (leftValue - rightValue);
    }

    return factor * String(leftValue).localeCompare(String(rightValue), 'it');
  }

  private sortValue(record: T8JobRecord, key: SortKey): number | string {
    if (key === 'projectEndDate') {
      return record.projectEndDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    }

    return record[key] ?? '';
  }

  private defaultSortDirection(sortKey: SortKey): SortDirection {
    return sortKey === 'codComm' || sortKey === 'cliente' || sortKey === 'businessUnit' ? 'asc' : 'desc';
  }

  private sum(
    records: T8JobRecord[],
    field: keyof Pick<
      T8JobRecord,
      | 'contractValue'
      | 'revenueToDate'
      | 'costToDate'
      | 'plannedMargin'
      | 'marginToDate'
      | 'marginDeltaVsPlan'
      | 'totalMargin'
      | 'backlogCurrentYear'
      | 'monthlyRevenue'
      | 'monthlyCost'
      | 'monthlyMargin'
    >,
  ): number {
    return records.reduce((accumulator, record) => accumulator + record[field], 0);
  }

  private numberLabel(value: number): string {
    if (value === 1) {
      return '1 commessa';
    }

    return `${value} commesse`;
  }
}
