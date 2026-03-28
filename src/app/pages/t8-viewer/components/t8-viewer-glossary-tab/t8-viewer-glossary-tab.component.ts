import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { KpiCard } from '../../../../models/t8-report.model';
import { T8ViewerFacade } from '../../../../services/t8-viewer.facade';

@Component({
  selector: 'app-t8-viewer-glossary-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './t8-viewer-glossary-tab.component.html',
  styleUrls: ['../t8-viewer-tab-shared.scss', './t8-viewer-glossary-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class T8ViewerGlossaryTabComponent {
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
      return this.compactCurrencyFormatter.format(card.value);
    }

    if (card.format === 'percent') {
      return this.formatPercent(card.value);
    }

    return Math.round(card.value).toString();
  }
}
