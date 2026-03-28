import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-t8-viewer-workspace-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="masthead">
      <div class="masthead-copy">
        <p class="eyebrow">Engineering portfolio cockpit</p>
        <h1>{{ title() }}</h1>
        <p class="lead">
          {{ fileName() }} · estratto {{ executedAtLabel() || 'N.D.' }} · {{ filteredRecordsCount() }} commesse nel perimetro corrente
        </p>
      </div>

      <div class="masthead-actions">
        @if (showRestoreAction()) {
          <button type="button" class="secondary-action" (click)="restoreSession.emit()">Restore session</button>
        }
        <button type="button" class="secondary-action" (click)="resetViewer.emit()">Carica un altro file</button>
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
    }

    .masthead {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
    }

    .eyebrow {
      margin: 0 0 0.75rem;
      color: var(--eng-red);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    h1,
    p {
      margin: 0;
    }

    .masthead-copy h1 {
      max-width: none;
      font-size: clamp(2rem, 4vw, 3.25rem);
      color: var(--eng-blue);
    }

    .lead {
      max-width: 56ch;
      margin-top: 1rem;
      color: var(--ink-soft);
      font-size: 1rem;
    }

    .masthead-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.75rem;
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

    @media (max-width: 900px) {
      .masthead,
      .masthead-actions {
        display: grid;
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class T8ViewerWorkspaceHeaderComponent {
  readonly title = input('');
  readonly fileName = input('');
  readonly executedAtLabel = input<string | null>(null);
  readonly filteredRecordsCount = input(0);
  readonly showRestoreAction = input(false);

  readonly restoreSession = output<void>();
  readonly resetViewer = output<void>();
}
