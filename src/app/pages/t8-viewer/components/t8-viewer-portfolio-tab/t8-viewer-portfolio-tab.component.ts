import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { SegmentBreakdown, T8JobRecord } from '../../../../models/t8-report.model';
import { T8ViewerFacade } from '../../../../services/t8-viewer.facade';

@Component({
  selector: 'app-t8-viewer-portfolio-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './t8-viewer-portfolio-tab.component.html',
  styleUrls: ['../t8-viewer-tab-shared.scss', './t8-viewer-portfolio-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class T8ViewerPortfolioTabComponent {
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
  readonly detailRecord = computed(() => this.facade.selectedRecord() ?? this.facade.selectedRecordFallback());
  readonly recordOpen = output<T8JobRecord>();
  readonly recordPinned = output<T8JobRecord>();

  pinRecord(event: MouseEvent, record: T8JobRecord): void {
    event.preventDefault();
    this.recordPinned.emit(record);
  }

  sortIndicator(sortKey: Parameters<T8ViewerFacade['toggleSort']>[0]): string {
    const filters = this.facade.filters();
    if (filters.sortKey !== sortKey) {
      return '';
    }

    return filters.sortDirection === 'desc' ? 'v' : '^';
  }

  formatMoney(value: number): string {
    return this.currencyFormatter.format(value);
  }

  formatCompactMoney(value: number): string {
    return this.compactCurrencyFormatter.format(value);
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
}
