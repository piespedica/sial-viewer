import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { PersistedViewerSession, SessionDialogMode, T8JobRecord, ViewerTab } from '../../models/t8-report.model';
import { T8ViewerFacade } from '../../services/t8-viewer.facade';
import { T8ViewerDetailModalComponent } from './components/t8-viewer-detail-modal/t8-viewer-detail-modal.component';
import { T8ViewerGlossaryTabComponent } from './components/t8-viewer-glossary-tab/t8-viewer-glossary-tab.component';
import { T8ViewerOverviewTabComponent } from './components/t8-viewer-overview-tab/t8-viewer-overview-tab.component';
import { T8ViewerPerformanceTabComponent } from './components/t8-viewer-performance-tab/t8-viewer-performance-tab.component';
import { T8ViewerPortfolioTabComponent } from './components/t8-viewer-portfolio-tab/t8-viewer-portfolio-tab.component';
import { T8ViewerSessionDialogComponent } from './components/t8-viewer-session-dialog/t8-viewer-session-dialog.component';
import { T8ViewerToolbarComponent } from './components/t8-viewer-toolbar/t8-viewer-toolbar.component';
import { T8ViewerUploadShellComponent } from './components/t8-viewer-upload-shell/t8-viewer-upload-shell.component';
import { T8ViewerWorkspaceHeaderComponent } from './components/t8-viewer-workspace-header/t8-viewer-workspace-header.component';

@Component({
  selector: 'app-t8-viewer-page',
  standalone: true,
  imports: [
    CommonModule,
    T8ViewerDetailModalComponent,
    T8ViewerGlossaryTabComponent,
    T8ViewerOverviewTabComponent,
    T8ViewerPerformanceTabComponent,
    T8ViewerPortfolioTabComponent,
    T8ViewerSessionDialogComponent,
    T8ViewerToolbarComponent,
    T8ViewerUploadShellComponent,
    T8ViewerWorkspaceHeaderComponent,
  ],
  templateUrl: './t8-viewer.page.html',
  styleUrl: './t8-viewer.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class T8ViewerPageComponent implements OnInit {
  readonly facade = inject(T8ViewerFacade);
  readonly isDragging = signal(false);
  readonly isDetailModalOpen = signal(false);
  readonly modalRecord = signal<T8JobRecord | null>(null);
  readonly sessionDialogMode = signal<SessionDialogMode | null>(null);
  readonly savedSessions = signal<PersistedViewerSession[]>([]);
  readonly selectedSessionId = signal<string | null>(null);
  readonly pendingSessionName = signal('');
  readonly sessionDialogError = signal<string | null>(null);

  @ViewChild('fileInput') private readonly fileInput?: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    this.refreshSavedSessions();

    queueMicrotask(() => {
      if (this.facade.status() === 'idle') {
        this.showRestoreSessionsDialog();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.closeDetailModal();
    void this.handleLoadedFile(file);
    input.value = '';
  }

  onDropFile(file: File): void {
    this.isDragging.set(false);
    this.closeDetailModal();
    void this.handleLoadedFile(file);
  }

  openPicker(): void {
    this.fileInput?.nativeElement.click();
  }

  setDragging(value: boolean): void {
    this.isDragging.set(value);
  }

  setTab(tab: ViewerTab): void {
    this.facade.setActiveTab(tab);
  }

  openRecordModal(record: T8JobRecord): void {
    this.modalRecord.set(record);
    this.isDetailModalOpen.set(true);
  }

  selectDetailRecord(record: T8JobRecord): void {
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

  showRestoreSessionsDialog(): void {
    this.refreshSavedSessions();
    if (!this.savedSessions().length) {
      return;
    }

    this.selectedSessionId.set(null);
    this.sessionDialogError.set(null);
    this.sessionDialogMode.set('restore-choice');
  }

  trackTab = (_: number, item: { id: ViewerTab }) => item.id;

  private async handleLoadedFile(file: File): Promise<void> {
    await this.facade.loadFile(file);

    if (this.facade.status() !== 'ready') {
      return;
    }

    this.openSaveSessionDialog(file.name);
  }

  private defaultSessionName(fileName: string): string {
    const timestamp = new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    return `${fileName} - ${timestamp}`;
  }

  openRestorePickerDialog(): void {
    const sessions = this.savedSessions();
    this.sessionDialogError.set(null);
    this.selectedSessionId.set(sessions[0]?.id ?? null);
    this.sessionDialogMode.set('restore-picker');
  }

  keepWorkingWithNewFile(): void {
    this.closeSessionDialog();
  }

  restoreSelectedSession(): void {
    const sessionId = this.selectedSessionId();
    if (!sessionId) {
      this.sessionDialogError.set('Seleziona una sessione da ripristinare.');
      return;
    }

    this.closeDetailModal();
    const restored = this.facade.restoreSavedSession(sessionId);
    if (!restored) {
      this.sessionDialogError.set('La sessione selezionata non e piu disponibile.');
      this.refreshSavedSessions();
      return;
    }

    this.closeSessionDialog();
  }

  openSaveSessionDialog(fileName: string): void {
    this.pendingSessionName.set(this.defaultSessionName(fileName));
    this.sessionDialogError.set(null);
    this.sessionDialogMode.set('save-session');
  }

  saveSessionFromDialog(): void {
    const normalizedName = this.pendingSessionName().trim();
    if (!normalizedName) {
      this.sessionDialogError.set('Il nome della sessione non puo essere vuoto.');
      return;
    }

    try {
      this.facade.saveCurrentSession(normalizedName);
      this.refreshSavedSessions();
      this.closeSessionDialog();
    } catch (error) {
      this.sessionDialogError.set(
        error instanceof Error ? error.message : 'Non sono riuscito a salvare la sessione nel browser.',
      );
    }
  }

  closeSessionDialog(): void {
    this.sessionDialogMode.set(null);
    this.sessionDialogError.set(null);
  }

  private refreshSavedSessions(): void {
    this.savedSessions.set(this.facade.listSavedSessions());
  }
}
