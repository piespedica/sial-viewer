import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { T8JobRecord } from '../../../../models/t8-report.model';

@Component({
  selector: 'app-t8-viewer-detail-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen() && record(); as item) {
      <div class="detail-modal-backdrop" (click)="close.emit()">
        <section class="detail-modal panel" (click)="$event.stopPropagation()">
          <div class="panel-header">
            <div>
              <p class="panel-label">Dettaglio commessa</p>
              <h2>{{ item.codComm }}</h2>
              <p>{{ item.descriz }}</p>
            </div>
            <button type="button" class="secondary-action detail-close" (click)="close.emit()">Chiudi</button>
          </div>

          <div class="detail-grid">
            <article>
              <span>Cliente</span>
              <strong>{{ item.cliente }}</strong>
            </article>
            <article>
              <span>Business Unit</span>
              <strong>{{ item.businessUnit || 'N.D.' }}</strong>
            </article>
            <article>
              <span>CodCDC</span>
              <strong>{{ item.codCDC }}</strong>
            </article>
            <article>
              <span>Account Manager</span>
              <strong>{{ item.accountManagerLabel }}</strong>
            </article>
            <article>
              <span>Project Manager</span>
              <strong>{{ item.projectManager || 'N.D.' }}</strong>
            </article>
            <article>
              <span>Data fine progetto</span>
              <strong>{{ formatDate(item.projectEndDate) }}</strong>
            </article>
          </div>

          <div class="detail-metrics">
            <div>
              <span>Margine C12</span>
              <strong>{{ formatMoney(item.plannedMargin) }}</strong>
            </div>
            <div>
              <span>Margine totale commessa</span>
              <strong [class.negative]="item.totalMargin < 0">{{ formatMoney(item.totalMargin) }}</strong>
            </div>
            <div>
              <span>Margine alla data</span>
              <strong [class.negative]="item.marginToDate < 0">{{ formatMoney(item.marginToDate) }}</strong>
            </div>
            <div>
              <span>Delta vs C12</span>
              <strong [class.negative]="item.marginDeltaVsPlan < 0">{{ formatMoney(item.marginDeltaVsPlan) }}</strong>
            </div>
            <div>
              <span>Margine %</span>
              <strong [class.negative]="(item.marginPctToDate ?? 0) < 0">{{ formatPercent(item.marginPctToDate) }}</strong>
            </div>
            <div>
              <span>Backlog anno corrente</span>
              <strong>{{ formatMoney(item.backlogCurrentYear) }}</strong>
            </div>
            <div>
              <span>Margine del mese</span>
              <strong [class.negative]="item.monthlyMargin < 0">{{ formatMoney(item.monthlyMargin) }}</strong>
            </div>
            <div>
              <span>Ricavi alla data</span>
              <strong>{{ formatMoney(item.revenueToDate) }}</strong>
            </div>
            <div>
              <span>Costi alla data</span>
              <strong>{{ formatMoney(item.costToDate) }}</strong>
            </div>
          </div>
        </section>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .panel {
      border-radius: 24px;
      border: 1px solid var(--line);
      background: var(--surface);
      box-shadow: var(--shadow-md);
    }

    .detail-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 30;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      background: rgba(0, 0, 0, 0.36);
      backdrop-filter: blur(4px);
    }

    .detail-modal {
      width: min(1120px, 100%);
      max-height: calc(100dvh - 3rem);
      overflow: auto;
      padding: 1rem 1.1rem;
      background: var(--surface-strong);
      box-shadow: var(--shadow-lg);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
      margin-bottom: 1rem;
    }

    .panel-label {
      margin: 0 0 0.75rem;
      color: var(--eng-red);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    h2,
    p {
      margin: 0;
    }

    .secondary-action {
      font: inherit;
      cursor: pointer;
      border: 0;
      border-radius: 999px;
      padding: 0.9rem 1.25rem;
      background: rgba(0, 47, 83, 0.08);
      color: var(--eng-blue);
      font-weight: 700;
    }

    .detail-grid,
    .detail-metrics {
      display: grid;
      gap: 1rem;
    }

    .detail-grid span,
    .detail-metrics span {
      display: block;
      margin-bottom: 0.35rem;
      color: var(--ink-muted);
      font-size: 0.82rem;
    }

    .negative {
      color: var(--negative);
    }

    @media (max-width: 1180px) {
      .detail-grid,
      .detail-metrics {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 900px) {
      .detail-modal-backdrop {
        padding: 1rem;
      }

      .panel-header {
        display: grid;
        grid-template-columns: 1fr;
      }

      .detail-close {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class T8ViewerDetailModalComponent {
  private readonly currencyFormatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  readonly isOpen = input(false);
  readonly record = input<T8JobRecord | null>(null);

  readonly close = output<void>();

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
}
