import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-t8-viewer-upload-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      class="upload-shell"
      [class.dragging]="isDragging()"
      (dragenter)="draggingChange.emit(true)"
      (dragover)="$event.preventDefault(); draggingChange.emit(true)"
      (dragleave)="draggingChange.emit(false)"
      (drop)="onDrop($event)"
    >
      <div class="upload-card">
        <div class="upload-copy">
          <p class="eyebrow">Engineering T8 internal viewer</p>
          <h1>Let’s make the numbers real.</h1>
          <p class="lead">
            Carica il report T8 e leggi il portafoglio in una UI più chiara, spiegata e orientata alle decisioni.
          </p>
        </div>

        <div class="upload-panel">
          <button class="primary-action" type="button" (click)="pickFile.emit()">
            @if (status() === 'loading') {
              Parsing in corso...
            } @else {
              Seleziona file Excel
            }
          </button>
          <p class="upload-note">Elaborazione 100% browser-side. Nessun dato lascia il client.</p>

          @if (status() === 'error') {
            <div class="status-card status-card--error">
              <strong>File non valido</strong>
              <p>{{ errorMessage() }}</p>
            </div>
          } @else if (status() === 'loading') {
            <div class="status-card">
              <strong>Elaborazione in corso</strong>
              <p>Sto leggendo il workbook T8, i metadati di estrazione e le commesse del portafoglio.</p>
            </div>
          }

          <div class="feature-grid">
            <article class="feature-card">
              <h2>4 tab</h2>
              <p>Overview, Performance, Portafoglio e Glossario per separare executive reading e dettaglio operativo.</p>
            </article>
            <article class="feature-card">
              <h2>KPI spiegati</h2>
              <p>Ogni metrica ha tooltip con definizione e formula.</p>
            </article>
            <article class="feature-card">
              <h2>Confronto C12</h2>
              <p>Il viewer evidenzia subito delta di margine, backlog a rischio e commesse sotto piano.</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .upload-shell {
      min-height: 100dvh;
      padding: 1.5rem;
      display: grid;
      place-items: center;
    }

    .upload-shell.dragging .upload-card {
      border-color: rgba(197, 0, 75, 0.36);
      transform: translateY(-4px);
    }

    .upload-card {
      width: min(1180px, 100%);
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
      gap: 2rem;
      padding: clamp(2rem, 4vw, 3rem);
      border-radius: 24px;
      border: 1px solid var(--line);
      background: var(--surface);
      box-shadow: var(--shadow-md);
      transition:
        transform 160ms ease,
        border-color 160ms ease;
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
    h2,
    p {
      margin: 0;
    }

    h1 {
      font-size: clamp(2.6rem, 5vw, 4.6rem);
      line-height: 0.95;
      max-width: 12ch;
      color: var(--eng-blue);
    }

    h2 {
      font-size: 1.2rem;
    }

    .lead {
      max-width: 56ch;
      margin-top: 1rem;
      color: var(--ink-soft);
      font-size: 1rem;
    }

    .upload-panel {
      padding: 1.5rem;
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(0, 47, 83, 1), rgba(0, 47, 83, 0.92));
      color: var(--eng-white);
    }

    .primary-action {
      font: inherit;
      cursor: pointer;
      border: 0;
      border-radius: 999px;
      padding: 0.9rem 1.25rem;
      background: linear-gradient(90deg, var(--eng-red), var(--accent-strong));
      color: var(--eng-white);
      font-weight: 700;
    }

    .upload-note {
      margin-top: 1rem;
      color: rgba(255, 255, 255, 0.76);
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

    .feature-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr;
      margin-top: 1.5rem;
    }

    .feature-card {
      padding: 1rem;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.08);
    }

    .feature-card p {
      margin-top: 0.45rem;
      color: rgba(255, 255, 255, 0.78);
    }

    @media (max-width: 1180px) {
      .upload-card {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 900px) {
      .upload-shell {
        padding: 1rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class T8ViewerUploadShellComponent {
  readonly isDragging = input(false);
  readonly status = input.required<'idle' | 'loading' | 'ready' | 'error'>();
  readonly errorMessage = input<string | null>(null);

  readonly pickFile = output<void>();
  readonly draggingChange = output<boolean>();
  readonly fileDropped = output<File>();

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.draggingChange.emit(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.fileDropped.emit(file);
    }
  }
}
