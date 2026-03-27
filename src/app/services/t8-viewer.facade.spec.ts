import { TestBed } from '@angular/core/testing';
import { T8DashboardDataset } from '../models/t8-report.model';
import { T8ViewerFacade } from './t8-viewer.facade';

describe('T8ViewerFacade', () => {
  let facade: T8ViewerFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    facade = TestBed.inject(T8ViewerFacade);
  });

  it('aggregates KPIs on the commercial default scope', () => {
    const dataset: T8DashboardDataset = {
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
          projectEndDate: null,
          dataApertura: null,
          dataChiusura: null,
          contractValue: 1000,
          revenueToDate: 800,
          costToDate: 500,
          marginToDate: 300,
          marginPctToDate: 37.5,
          backlogCurrentYear: 200,
          backlogFutureYears: 0,
          residualCostCurrentYear: 80,
          residualCostFutureYears: 0,
          progressPct: 80,
          costNetToDate: 100,
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
          marginToDate: -600,
          marginPctToDate: null,
          backlogCurrentYear: 0,
          backlogFutureYears: 0,
          residualCostCurrentYear: 300,
          residualCostFutureYears: 0,
          progressPct: null,
          costNetToDate: 0,
          isCommercial: false,
          raw: {},
        },
      ],
    };

    facade.hydrateDataset(dataset, 'sample.xls');

    expect(facade.filteredRecords().length).toBe(1);
    expect(facade.kpis().revenueToDate).toBe(800);
    expect(facade.kpis().marginToDate).toBe(300);

    facade.setScope('tutte');
    expect(facade.filteredRecords().length).toBe(2);
    expect(facade.kpis().marginToDate).toBe(-300);
  });
});
