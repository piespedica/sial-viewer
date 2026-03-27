import { Injectable, computed, inject, signal } from '@angular/core';
import { ClosureFilter, DashboardFilters, ExecutiveKpis, RankingEntry, SegmentBreakdown, SortDirection, SortKey, T8DashboardDataset, T8JobRecord } from '../models/t8-report.model';
import { T8XlsParserService } from './t8-xls-parser.service';

const DEFAULT_FILTERS: DashboardFilters = {
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

  readonly records = computed(() => this.datasetSignal()?.records ?? []);
  readonly meta = computed(() => this.datasetSignal()?.meta ?? null);
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

        return [record.codComm, record.descriz, record.cliente, record.businessUnit]
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
    const backlogCurrentYear = this.sum(records, 'backlogCurrentYear');

    return {
      contractsValue: this.sum(records, 'contractValue'),
      revenueToDate,
      costToDate: this.sum(records, 'costToDate'),
      marginToDate,
      marginPct: revenueToDate ? (marginToDate / revenueToDate) * 100 : null,
      backlogCurrentYear,
      commesseCount: records.length,
      atRiskCount: records.filter((record) => this.isAtRisk(record)).length,
    };
  });

  readonly bestPerformers = computed(() => this.toRanking(this.filteredRecords().slice().sort((a, b) => b.marginToDate - a.marginToDate).slice(0, 8)));
  readonly worstPerformers = computed(() => this.toRanking(this.filteredRecords().slice().sort((a, b) => a.marginToDate - b.marginToDate).slice(0, 8)));
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
  readonly backlogLeaders = computed(() =>
    this.toRanking(
      this.filteredRecords()
        .slice()
        .sort((a, b) => b.backlogCurrentYear - a.backlogCurrentYear)
        .slice(0, 8),
    ),
  );
  readonly atRiskRecords = computed(() =>
    this.filteredRecords()
      .filter((record) => this.isAtRisk(record))
      .slice()
      .sort((left, right) => {
        const backlogDelta = right.backlogCurrentYear - left.backlogCurrentYear;
        return backlogDelta !== 0 ? backlogDelta : left.marginToDate - right.marginToDate;
      })
      .slice(0, 8),
  );

  readonly businessUnitBreakdown = computed(() => this.groupByMetric(this.filteredRecords(), 'businessUnit').slice(0, 6));
  readonly lineaProdBreakdown = computed(() => this.groupByMetric(this.filteredRecords(), 'lineaProd').slice(0, 6));

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
    this.selectedCodCommSignal.set(dataset.records[0]?.codComm ?? null);
  }

  reset(): void {
    this.datasetSignal.set(null);
    this.filtersSignal.set(DEFAULT_FILTERS);
    this.statusSignal.set('idle');
    this.errorSignal.set(null);
    this.fileNameSignal.set('Nessun file caricato');
    this.selectedCodCommSignal.set(null);
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
    const negativeMargin = record.marginToDate < 0;
    const endSoon =
      !!record.projectEndDate &&
      record.backlogCurrentYear > 0 &&
      record.projectEndDate.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 90;
    return negativeMargin || lowMargin || endSoon;
  }

  private patchFilters(patch: Partial<DashboardFilters>): void {
    this.filtersSignal.update((current) => ({ ...current, ...patch }));
  }

  private groupByMetric(records: T8JobRecord[], field: 'businessUnit' | 'lineaProd'): SegmentBreakdown[] {
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

  private toRanking(records: T8JobRecord[], percentage = false): RankingEntry[] {
    return records.map((record) => ({
      label: record.codComm,
      sublabel: `${record.cliente} · ${record.businessUnit || record.lineaProd}`,
      value: percentage ? record.marginPctToDate ?? 0 : record.marginToDate,
      secondaryValue: percentage ? record.marginToDate : record.marginPctToDate,
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

  private sum(records: T8JobRecord[], field: keyof Pick<T8JobRecord, 'contractValue' | 'revenueToDate' | 'costToDate' | 'marginToDate' | 'backlogCurrentYear'>): number {
    return records.reduce((accumulator, record) => accumulator + record[field], 0);
  }
}
