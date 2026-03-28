import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PersistedViewerSession, SessionDialogMode } from '../../../../models/t8-report.model';

@Component({
  selector: 'app-t8-viewer-session-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (mode()) {
      <div class="detail-modal-backdrop" (click)="close.emit()">
        <section class="session-dialog panel" (click)="$event.stopPropagation()">
          @if (mode() === 'restore-choice') {
            <div class="panel-header">
              <div>
                <p class="panel-label">Sessioni salvate</p>
                <h2>Riprendi una sessione esistente</h2>
                <p>Ho trovato {{ sessions().length }} sessioni nel browser. Puoi ripartire da una sessione salvata oppure caricare un nuovo file.</p>
              </div>
            </div>

            <div class="session-summary-list">
              @for (session of sessions(); track session.id) {
                <article class="session-summary-card">
                  <strong>{{ session.name }}</strong>
                  <span>{{ session.fileName }}</span>
                  <span>Salvata il {{ formatSavedAt(session.savedAt) }}</span>
                </article>
              }
            </div>

            <div class="dialog-actions">
              <button type="button" class="secondary-action" (click)="continueWithNewFile.emit()">Carica un nuovo file</button>
              <button type="button" class="primary-action" (click)="openRestorePicker.emit()">Scegli sessione</button>
            </div>
          }

          @if (mode() === 'restore-picker') {
            <div class="panel-header">
              <div>
                <p class="panel-label">Ripristino sessione</p>
                <h2>Seleziona la sessione da aprire</h2>
                <p>Ripristino di dataset, filtri e selezione commessa salvati nel browser.</p>
              </div>
              <button type="button" class="secondary-action detail-close" (click)="close.emit()">Chiudi</button>
            </div>

            <div class="session-picker-list">
              @for (session of sessions(); track session.id) {
                <label class="session-option" [class.active]="selectedSessionId() === session.id">
                  <input
                    type="radio"
                    name="savedSession"
                    [value]="session.id"
                    [ngModel]="selectedSessionId()"
                    (ngModelChange)="selectedSessionIdChange.emit($event)"
                  />
                  <div>
                    <strong>{{ session.name }}</strong>
                    <span>{{ session.fileName }}</span>
                    <span>Salvata il {{ formatSavedAt(session.savedAt) }}</span>
                  </div>
                </label>
              }
            </div>

            @if (errorMessage()) {
              <div class="status-card status-card--error">
                <strong>Operazione non completata</strong>
                <p>{{ errorMessage() }}</p>
              </div>
            }

            <div class="dialog-actions">
              <button type="button" class="secondary-action" (click)="continueWithNewFile.emit()">Nuovo file</button>
              <button type="button" class="primary-action" (click)="restoreSelected.emit()">Apri sessione</button>
            </div>
          }

          @if (mode() === 'save-session') {
            <div class="panel-header">
              <div>
                <p class="panel-label">Salvataggio sessione</p>
                <h2>Salva questa analisi nel browser</h2>
                <p>Assegna un nome alla sessione. Il browser conserva fino a 5 sessioni e mantiene le piu recenti.</p>
              </div>
              <button type="button" class="secondary-action detail-close" (click)="close.emit()">Non ora</button>
            </div>

            <label class="session-name-field">
              <span>Nome sessione</span>
              <input
                type="text"
                [ngModel]="pendingSessionName()"
                (ngModelChange)="pendingSessionNameChange.emit($event)"
                placeholder="Es. Portafoglio marzo area digital"
              />
            </label>

            @if (errorMessage()) {
              <div class="status-card status-card--error">
                <strong>Operazione non completata</strong>
                <p>{{ errorMessage() }}</p>
              </div>
            }

            <div class="dialog-actions">
              <button type="button" class="secondary-action" (click)="close.emit()">Salta</button>
              <button type="button" class="primary-action" (click)="saveSession.emit()">Salva sessione</button>
            </div>
          }
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

    .session-dialog {
      width: min(760px, 100%);
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

    .panel-header p:last-child {
      max-width: 36ch;
      color: var(--ink-soft);
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

    .secondary-action,
    .primary-action {
      font: inherit;
      cursor: pointer;
      border: 0;
      border-radius: 999px;
      padding: 0.9rem 1.25rem;
    }

    .secondary-action {
      background: rgba(0, 47, 83, 0.08);
      color: var(--eng-blue);
      font-weight: 700;
    }

    .primary-action {
      background: linear-gradient(90deg, var(--eng-red), var(--accent-strong));
      color: var(--eng-white);
      font-weight: 700;
    }

    .session-summary-list,
    .session-picker-list {
      display: grid;
      gap: 0.85rem;
    }

    .session-summary-card,
    .session-option {
      padding: 1rem;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.88);
    }

    .session-summary-card,
    .session-option > div {
      display: grid;
      gap: 0.25rem;
    }

    .session-summary-card span,
    .session-option span {
      color: var(--ink-soft);
      font-size: 0.9rem;
    }

    .session-option {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.85rem;
      align-items: start;
      cursor: pointer;
    }

    .session-option input {
      margin-top: 0.2rem;
      accent-color: var(--eng-red);
    }

    .session-option.active {
      border-color: rgba(197, 0, 75, 0.3);
      background: rgba(197, 0, 75, 0.08);
    }

    .session-name-field {
      display: grid;
      gap: 0.45rem;
    }

    .session-name-field span {
      color: var(--ink-soft);
      font-size: 0.82rem;
      font-weight: 600;
    }

    .session-name-field input {
      width: 100%;
      padding: 0.85rem 0.95rem;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: var(--eng-white);
    }

    .status-card {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.08);
    }

    .status-card--error {
      background: rgba(197, 0, 75, 0.18);
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .detail-close {
      white-space: nowrap;
    }

    @media (max-width: 900px) {
      .detail-modal-backdrop {
        padding: 1rem;
      }

      .panel-header,
      .dialog-actions {
        display: grid;
        grid-template-columns: 1fr;
      }

      .detail-close,
      .dialog-actions button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class T8ViewerSessionDialogComponent {
  readonly mode = input<SessionDialogMode | null>(null);
  readonly sessions = input<PersistedViewerSession[]>([]);
  readonly selectedSessionId = input<string | null>(null);
  readonly pendingSessionName = input('');
  readonly errorMessage = input<string | null>(null);

  readonly close = output<void>();
  readonly continueWithNewFile = output<void>();
  readonly openRestorePicker = output<void>();
  readonly selectedSessionIdChange = output<string>();
  readonly pendingSessionNameChange = output<string>();
  readonly restoreSelected = output<void>();
  readonly saveSession = output<void>();

  formatSavedAt(value: string): string {
    return new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}
