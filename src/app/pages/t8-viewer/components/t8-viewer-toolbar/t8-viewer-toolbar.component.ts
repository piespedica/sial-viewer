import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { T8ViewerFacade } from '../../../../services/t8-viewer.facade';

@Component({
  selector: 'app-t8-viewer-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="toolbar">
      <div class="scope-switch">
        <button
          type="button"
          [class.active]="facade.filters().scope === 'commerciale'"
          (click)="facade.setScope('commerciale')"
        >
          Commerciale
        </button>
        <button type="button" [class.active]="facade.filters().scope === 'tutte'" (click)="facade.setScope('tutte')">
          Tutte le commesse
        </button>
      </div>

      <div class="meta-strip">
        @for (item of facade.meta()?.referenceItems ?? []; track item.label) {
          <div class="meta-pill">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        }
      </div>

      <div class="filter-grid">
        <label>
          <span>Ricerca</span>
          <input
            type="search"
            [ngModel]="facade.filters().search"
            (ngModelChange)="facade.setSearch($event)"
            placeholder="Codice, descrizione, cliente"
          />
        </label>
        <label>
          <span>Stato</span>
          <select [ngModel]="facade.filters().closure" (ngModelChange)="facade.setClosure($event)">
            <option value="tutte">Tutte</option>
            <option value="aperte">Aperte</option>
            <option value="chiuse">Chiuse</option>
          </select>
        </label>
        <label>
          <span>CodCDC</span>
          <select [ngModel]="facade.filters().codCDC" (ngModelChange)="facade.setFilter('codCDC', $event)">
            <option value="tutte">Tutti</option>
            @for (item of facade.codCDCOptions(); track item) {
              <option [value]="item">{{ item }}</option>
            }
          </select>
        </label>
        <label>
          <span>Linea prodotto</span>
          <select [ngModel]="facade.filters().lineaProd" (ngModelChange)="facade.setFilter('lineaProd', $event)">
            <option value="tutte">Tutte</option>
            @for (item of facade.lineaProdOptions(); track item) {
              <option [value]="item">{{ item }}</option>
            }
          </select>
        </label>
        <label>
          <span>Business Unit</span>
          <select [ngModel]="facade.filters().businessUnit" (ngModelChange)="facade.setFilter('businessUnit', $event)">
            <option value="tutte">Tutte</option>
            @for (item of facade.businessUnitOptions(); track item) {
              <option [value]="item">{{ item }}</option>
            }
          </select>
        </label>
        <label>
          <span>Account Manager</span>
          <select [ngModel]="facade.filters().accountManager" (ngModelChange)="facade.setFilter('accountManager', $event)">
            <option value="tutte">Tutti</option>
            @for (item of facade.accountManagerOptions(); track item) {
              <option [value]="item">{{ item }}</option>
            }
          </select>
        </label>
        <label>
          <span>Project Manager</span>
          <select [ngModel]="facade.filters().projectManager" (ngModelChange)="facade.setFilter('projectManager', $event)">
            <option value="tutte">Tutti</option>
            @for (item of facade.projectManagerOptions(); track item) {
              <option [value]="item">{{ item }}</option>
            }
          </select>
        </label>
        <label>
          <span>Tipo avanzamento</span>
          <select [ngModel]="facade.filters().tipoAvanz" (ngModelChange)="facade.setFilter('tipoAvanz', $event)">
            <option value="tutte">Tutti</option>
            @for (item of facade.tipoAvanzOptions(); track item) {
              <option [value]="item">{{ item }}</option>
            }
          </select>
        </label>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .toolbar {
      display: grid;
      gap: 1rem;
      padding: 1rem;
      border-radius: 24px;
      border: 1px solid var(--line);
      background: var(--surface);
      box-shadow: var(--shadow-md);
    }

    .scope-switch {
      display: inline-flex;
      width: fit-content;
      padding: 0.3rem;
      border-radius: 999px;
      background: rgba(0, 47, 83, 0.08);
    }

    .scope-switch button {
      font: inherit;
      cursor: pointer;
      border: 0;
      border-radius: 999px;
      padding: 0.7rem 1rem;
      background: transparent;
      color: var(--ink-soft);
      font-weight: 700;
    }

    .scope-switch button.active {
      background: var(--eng-blue);
      color: var(--eng-white);
    }

    .meta-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .meta-pill {
      padding: 0.8rem 0.95rem;
      border-radius: 16px;
      background: rgba(0, 47, 83, 0.04);
    }

    .meta-pill span,
    .meta-pill strong {
      display: block;
    }

    .meta-pill span {
      color: var(--ink-muted);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .filter-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.8rem;
    }

    .filter-grid label {
      display: grid;
      gap: 0.4rem;
    }

    .filter-grid span {
      color: var(--ink-soft);
      font-size: 0.82rem;
      font-weight: 600;
    }

    .filter-grid input,
    .filter-grid select {
      width: 100%;
      padding: 0.8rem 0.9rem;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: var(--eng-white);
    }

    @media (max-width: 1180px) {
      .filter-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class T8ViewerToolbarComponent {
  readonly facade = inject(T8ViewerFacade);
}
