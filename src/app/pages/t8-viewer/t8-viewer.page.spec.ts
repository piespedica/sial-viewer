import { TestBed } from '@angular/core/testing';
import { T8ViewerFacade } from '../../services/t8-viewer.facade';
import { T8ViewerPageComponent } from './t8-viewer.page';

describe('T8ViewerPageComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [T8ViewerPageComponent],
    }).compileComponents();
  });

  it('shows the upload shell before any file is loaded', () => {
    const fixture = TestBed.createComponent(T8ViewerPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Let’s make the numbers real.');
  });

  it('shows a custom restore dialog at startup and opens the selected session', async () => {
    const facade = TestBed.inject(T8ViewerFacade);
    facade.hydrateDataset(
      {
        headers: [],
        meta: {
          title: 'Sessione salvata',
          executedAtLabel: '28/mar/2026 10:00:00',
          executedAt: new Date(2026, 2, 28, 10, 0, 0),
          referenceItems: [],
          sheetName: 'Foglio1',
        },
        records: [
          {
            rowNumber: 10,
            codCDC: 'CDC1',
            codComm: 'COMM-1',
            descriz: 'Commessa',
            cliente: 'Cliente',
            lineaProd: 'F1',
            tipoAvanz: 'C',
            tipoRic: 'F',
            chiusa: false,
            contratto: 'CTR-1',
            accountManager: 'AM',
            accountManagerLabel: 'AM - Rossi - Mario',
            projectManager: 'PM',
            operation: 'OP',
            businessUnit: 'BU',
            businessArea: 'BA',
            segment: 'SEG',
            tipCliente: 'PUB',
            tipoProcesso: 'Proc',
            projectEndDate: null,
            dataApertura: null,
            dataChiusura: null,
            contractValue: 100,
            revenueToDate: 80,
            costToDate: 60,
            monthlyRevenue: 10,
            monthlyCost: 8,
            monthlyMargin: 2,
            plannedMargin: 20,
            marginToDate: 20,
            totalMargin: 25,
            marginDeltaVsPlan: 5,
            marginPctToDate: 25,
            backlogCurrentYear: 20,
            backlogFutureYears: 0,
            residualCostCurrentYear: 5,
            residualCostFutureYears: 0,
            plannedResidualCostCurrentYear: 4,
            progressPct: 80,
            costNetToDate: 10,
            underPlan: false,
            daysToProjectEnd: 30,
            isCommercial: true,
            raw: {},
          },
        ],
      },
      'saved.xls',
    );
    facade.saveCurrentSession('Sessione salvata');
    facade.reset();

    const fixture = TestBed.createComponent(T8ViewerPageComponent);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.componentInstance.sessionDialogMode()).toBe('restore-choice');

    fixture.componentInstance.openRestorePickerDialog();
    fixture.detectChanges();

    const savedSession = facade.listSavedSessions()[0];
    fixture.componentInstance.selectedSessionId.set(savedSession.id);
    fixture.componentInstance.restoreSelectedSession();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Sessione salvata');
    expect(facade.fileName()).toBe('saved.xls');
  });

  it('shows the restore session button near the file reset action', async () => {
    const facade = TestBed.inject(T8ViewerFacade);
    facade.hydrateDataset(
      {
        headers: [],
        meta: {
          title: 'Dashboard attiva',
          executedAtLabel: '28/mar/2026 10:00:00',
          executedAt: new Date(2026, 2, 28, 10, 0, 0),
          referenceItems: [],
          sheetName: 'Foglio1',
        },
        records: [],
      },
      'active.xls',
    );
    facade.saveCurrentSession('Archivio marzo');

    const fixture = TestBed.createComponent(T8ViewerPageComponent);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    fixture.componentInstance.closeSessionDialog();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Restore session');

    fixture.componentInstance.showRestoreSessionsDialog();
    fixture.detectChanges();

    expect(fixture.componentInstance.sessionDialogMode()).toBe('restore-choice');
  });
});
