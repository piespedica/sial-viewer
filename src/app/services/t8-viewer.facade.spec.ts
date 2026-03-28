import { TestBed } from '@angular/core/testing';
import { T8DashboardDataset } from '../models/t8-report.model';
import { T8ViewerFacade } from './t8-viewer.facade';

describe('T8ViewerFacade', () => {
  let facade: T8ViewerFacade;
  let dataset: T8DashboardDataset;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    facade = TestBed.inject(T8ViewerFacade);

    dataset = {
      headers: [],
      meta: {
        title: 'T8 Aggregato',
        executedAtLabel: '25/mar/2026 16:06:53',
        executedAt: new Date(2026, 2, 25, 16, 6, 53),
        referenceItems: [],
        sheetName: 'Foglio1',
      },
      records: [
        {
          rowNumber: 10,
          codCDC: 'DDE',
          codComm: 'A001',
          descriz: 'Commessa esterna',
          cliente: 'Cliente Esterno',
          lineaProd: 'F1',
          tipoAvanz: 'C',
          tipoRic: 'F',
          chiusa: false,
          contratto: 'CTR-1',
          accountManager: 'E1',
          accountManagerLabel: 'E1 - Rossi - Mario',
          projectManager: 'P1',
          operation: 'P1',
          businessUnit: 'DIGITAL EXPERIENCE',
          businessArea: 'DIGITAL EXPERIENCE',
          segment: 'DIGITAL EXPERIENCE',
          tipCliente: 'PUB',
          tipoProcesso: 'Sviluppo',
          projectEndDate: new Date(2026, 5, 30),
          dataApertura: new Date(2026, 0, 15),
          dataChiusura: null,
          contractValue: 1000,
          revenueToDate: 800,
          costToDate: 500,
          monthlyRevenue: 120,
          monthlyCost: 70,
          monthlyMargin: 50,
          plannedMargin: 250,
          marginToDate: 300,
          totalMargin: 340,
          marginDeltaVsPlan: 90,
          marginPctToDate: 37.5,
          backlogCurrentYear: 200,
          backlogFutureYears: 0,
          residualCostCurrentYear: 80,
          residualCostFutureYears: 0,
          plannedResidualCostCurrentYear: 60,
          progressPct: 80,
          costNetToDate: 100,
          underPlan: false,
          daysToProjectEnd: 45,
          isCommercial: true,
          raw: {},
        },
        {
          rowNumber: 11,
          codCDC: 'DDE',
          codComm: 'INT001',
          descriz: 'Interna',
          cliente: 'ENGINEERING INGEGNERIA INFORMATICA Spa',
          lineaProd: 'F10',
          tipoAvanz: 'N',
          tipoRic: 'F',
          chiusa: false,
          contratto: 'CTR-2',
          accountManager: '',
          accountManagerLabel: 'Non assegnato',
          projectManager: 'P2',
          operation: 'P2',
          businessUnit: 'R&I DE',
          businessArea: 'R&I DE',
          segment: 'DIGITAL EXPERIENCE',
          tipCliente: 'INT',
          tipoProcesso: 'Ricerca',
          projectEndDate: null,
          dataApertura: null,
          dataChiusura: null,
          contractValue: 0,
          revenueToDate: 0,
          costToDate: 600,
          monthlyRevenue: 0,
          monthlyCost: 25,
          monthlyMargin: -25,
          plannedMargin: -500,
          marginToDate: -600,
          totalMargin: -550,
          marginDeltaVsPlan: -50,
          marginPctToDate: null,
          backlogCurrentYear: 0,
          backlogFutureYears: 0,
          residualCostCurrentYear: 300,
          residualCostFutureYears: 0,
          plannedResidualCostCurrentYear: 250,
          progressPct: null,
          costNetToDate: 0,
          underPlan: true,
          daysToProjectEnd: null,
          isCommercial: false,
          raw: {},
        },
      ],
    };
  });

  it('aggregates KPIs on the commercial default scope', () => {
    facade.hydrateDataset(dataset, 'sample.xls');

    expect(facade.filteredRecords().length).toBe(1);
    expect(facade.kpis().revenueToDate).toBe(800);
    expect(facade.kpis().marginToDate).toBe(300);
    expect(facade.kpis().marginDeltaVsPlan).toBe(90);
    expect(facade.kpis().underPlanRate).toBe(0);

    facade.setScope('tutte');
    expect(facade.filteredRecords().length).toBe(2);
    expect(facade.kpis().marginToDate).toBe(-300);
    expect(facade.kpis().marginDeltaVsPlan).toBe(40);
    expect(facade.kpis().underPlanRate).toBe(50);
  });

  it('saves and restores a browser session with filters and date fields', () => {
    facade.hydrateDataset(dataset, 'sample.xls');
    facade.setScope('tutte');
    facade.setSearch('Cliente Esterno');
    facade.selectRecord(dataset.records[0]);

    facade.saveCurrentSession('Sessione demo');
    facade.reset();

    expect(facade.status()).toBe('idle');
    const savedSessions = facade.listSavedSessions();
    expect(savedSessions.length).toBe(1);
    expect(savedSessions[0].name).toBe('Sessione demo');
    expect(facade.restoreSavedSession(savedSessions[0].id)).toBe(true);
    expect(facade.status()).toBe('ready');
    expect(facade.fileName()).toBe('sample.xls');
    expect(facade.filters().scope).toBe('tutte');
    expect(facade.filters().search).toBe('Cliente Esterno');
    expect(facade.selectedRecord()?.codComm).toBe('A001');
    expect(facade.meta()?.executedAt instanceof Date).toBe(true);
    expect(facade.records()[0].projectEndDate instanceof Date).toBe(true);
  });

  it('keeps at most five saved sessions', () => {
    for (let index = 1; index <= 6; index += 1) {
      facade.hydrateDataset(dataset, `sample-${index}.xls`);
      facade.saveCurrentSession(`Sessione ${index}`);
    }

    const savedSessions = facade.listSavedSessions();
    expect(savedSessions.length).toBe(5);
    expect(savedSessions.map((session) => session.name)).toEqual([
      'Sessione 6',
      'Sessione 5',
      'Sessione 4',
      'Sessione 3',
      'Sessione 2',
    ]);
  });
});
