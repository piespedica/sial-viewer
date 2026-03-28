import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { T8JobRecord } from '../../../../models/t8-report.model';
import { T8ViewerFacade } from '../../../../services/t8-viewer.facade';

@Component({
  selector: 'app-t8-viewer-performance-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './t8-viewer-performance-tab.component.html',
  styleUrls: ['../t8-viewer-tab-shared.scss', './t8-viewer-performance-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class T8ViewerPerformanceTabComponent {
  private readonly currencyFormatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  readonly facade = inject(T8ViewerFacade);
  readonly recordOpen = output<T8JobRecord>();
  readonly recordPinned = output<T8JobRecord>();

  pinRecord(event: MouseEvent, record: T8JobRecord): void {
    event.preventDefault();
    this.recordPinned.emit(record);
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

  formatBarWidth(value: number, max: number): string {
    if (max <= 0) {
      return '0%';
    }

    return `${Math.max(8, (Math.abs(value) / max) * 100)}%`;
  }

  maxAbsoluteValue(items: Array<{ value: number }>): number {
    return Math.max(...items.map((item) => Math.abs(item.value)), 0);
  }
}
