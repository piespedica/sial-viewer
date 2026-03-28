import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KpiCard, RankingEntry, SegmentBreakdown, T8JobRecord, ViewerTab } from '../../models/t8-report.model';
import { T8ViewerFacade } from '../../services/t8-viewer.facade';

@Component({
  selector: 'app-t8-viewer-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './t8-viewer.page.html',
  styleUrl: './t8-viewer.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class T8ViewerPageComponent {
  private readonly currencyFormatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  private readonly compactCurrencyFormatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  });

  readonly facade = inject(T8ViewerFacade);
  readonly isDragging = signal(false);
  readonly openTooltipId = signal<string | null>(null);
  readonly isDetailModalOpen = signal(false);
  readonly modalRecord = signal<T8JobRecord | null>(null);
  readonly detailRecord = computed(() => this.facade.selectedRecord() ?? this.facade.selectedRecordFallback());

  @ViewChild('fileInput') private readonly fileInput?: ElementRef<HTMLInputElement>;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.closeDetailModal();
    void this.facade.loadFile(file);
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    this.closeDetailModal();
    void this.facade.loadFile(file);
  }

  openPicker(): void {
    this.fileInput?.nativeElement.click();
  }

  setDragging(value: boolean): void {
    this.isDragging.set(value);
  }

  onSearchChange(value: string): void {
    this.facade.setSearch(value);
  }

  formatMoney(value: number): string {
    return this.currencyFormatter.format(value);
  }

  formatCompactMoney(value: number): string {
    return this.compactCurrencyFormatter.format(value);
  }

  formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'N.D.';
    }

    return `${value.toFixed(1)}%`;
  }

  formatDate(value: Date | null): string {
    if (!value) {
      return 'N.D.';
    }

    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(value);
  }

  formatKpiValue(card: KpiCard): string {
    if (card.value === null || card.value === undefined) {
      return 'N.D.';
    }

    if (card.format === 'currency') {
      return this.formatCompactMoney(card.value);
    }

    if (card.format === 'percent') {
      return this.formatPercent(card.value);
    }

    return Math.round(card.value).toString();
  }

  formatBarWidth(value: number, max: number): string {
    if (max <= 0) {
      return '0%';
    }

    return `${Math.max(8, (Math.abs(value) / max) * 100)}%`;
  }

  maxRevenue(items: SegmentBreakdown[]): number {
    return Math.max(...items.map((item) => item.revenue), 0);
  }

  maxAbsoluteValue(items: RankingEntry[]): number {
    return Math.max(...items.map((item) => Math.abs(item.value)), 0);
  }

  sortIndicator(sortKey: Parameters<T8ViewerFacade['toggleSort']>[0]): string {
    const filters = this.facade.filters();
    if (filters.sortKey !== sortKey) {
      return '';
    }

    return filters.sortDirection === 'desc' ? 'v' : '^';
  }

  setTab(tab: ViewerTab): void {
    this.facade.setActiveTab(tab);
  }

  showTooltip(id: string): void {
    this.openTooltipId.set(id);
  }

  hideTooltip(id: string): void {
    if (this.openTooltipId() === id) {
      this.openTooltipId.set(null);
    }
  }

  toggleTooltip(id: string): void {
    this.openTooltipId.set(this.openTooltipId() === id ? null : id);
  }

  openRecordModal(record: T8JobRecord): void {
    this.modalRecord.set(record);
    this.isDetailModalOpen.set(true);
  }

  selectDetailRecord(event: MouseEvent, record: T8JobRecord): void {
    event.preventDefault();
    this.facade.selectRecord(record);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.modalRecord.set(null);
  }

  resetViewer(): void {
    this.closeDetailModal();
    this.facade.reset();
  }

  trackTab = (_: number, item: { id: ViewerTab }) => item.id;
}
