import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { KpiCard, SegmentBreakdown, T8JobRecord } from '../../../../models/t8-report.model';
import { T8ViewerFacade } from '../../../../services/t8-viewer.facade';

@Component({
  selector: 'app-t8-viewer-overview-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './t8-viewer-overview-tab.component.html',
  styleUrls: ['../t8-viewer-tab-shared.scss', './t8-viewer-overview-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class T8ViewerOverviewTabComponent {
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
  readonly openTooltipId = signal<string | null>(null);

  readonly recordOpen = output<T8JobRecord>();
  readonly recordPinned = output<T8JobRecord>();

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

  pinRecord(event: MouseEvent, record: T8JobRecord): void {
    event.preventDefault();
    this.recordPinned.emit(record);
  }

  formatCompactMoney(value: number): string {
    return this.compactCurrencyFormatter.format(value);
  }

  formatMoney(value: number): string {
    return this.currencyFormatter.format(value);
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

  maxAbsoluteValue(items: Array<{ value: number }>): number {
    return Math.max(...items.map((item) => Math.abs(item.value)), 0);
  }
}
