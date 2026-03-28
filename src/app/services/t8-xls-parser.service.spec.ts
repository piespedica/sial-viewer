import { TestBed } from '@angular/core/testing';
import * as XLSX from 'xlsx';
import { T8XlsParserService } from './t8-xls-parser.service';

describe('T8XlsParserService', () => {
  let service: T8XlsParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(T8XlsParserService);
  });

  it('parses Italian date strings with optional time', () => {
    const parsed = service.parseItalianDateValue('20/mag/2025 14:47');
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2025);
    expect(parsed?.getMonth()).toBe(4);
    expect(parsed?.getDate()).toBe(20);
    expect(parsed?.getHours()).toBe(14);
    expect(parsed?.getMinutes()).toBe(47);
  });

  it('derives commercial scope excluding internal engineering rows', () => {
    expect(
      service.deriveScope({
        Cliente: 'ENGINEERING INGEGNERIA INFORMATICA Spa',
        LineaProd: 'F9',
      }),
    ).toBe('tutte');

    expect(
      service.deriveScope({
        Cliente: 'I.N.A.I.L.',
        LineaProd: 'F1',
      }),
    ).toBe('commerciale');
  });

  it('derives shared support scope for cybertech rows', () => {
    expect(
      service.deriveScope({
        Cliente: 'CYBERTECH SRL',
        LineaProd: 'F7',
      }),
    ).toBe('tutte');
  });

  it('parses xlsx files with compatible headers and english-style numeric formatting', async () => {
    const rows: unknown[][] = Array.from({ length: 12 }, () => []);
    rows[0] = ['T8 Aggregato'];
    rows[1] = ['DATA-ORA DI ESECUZIONE: 25/mar/2026 16:19:17'];
    rows[2] = ['PARAMETRI DI RIFERIMENTO:'];
    rows[3] = ['- Società: N'];
    rows[4] = ['- PERIODO:  FINO AL 03/2026'];
    rows[5] = ['- Avanzamento commesse : S'];
    rows[6] = ['- Centro di Costo: NRBMS0400'];
    rows[7] = ['- Estrazione Gerarchica: S'];
    rows[8] = ['- Tipo Ricavo: tutti (tranne linea M)'];
    rows[9] = [
      'CodCDC',
      'CodComm',
      'Descriz',
      'Cliente',
      'LineaProd',
      'TipoAvanz',
      'TipoRic',
      'Chiusa',
      'Contratto',
      'RicTotComm',
      'RicTotData',
      'RicMatNelMese',
      '%AvanRicTotData',
      'CostTotData',
      'CostMatNelMese',
      'MarDatiC12',
      'MarTotComm',
      'MarTotData',
      'MarMatNelMese',
      '%MarTotData',
      'RicResAnnoCorr',
      'Costi Res. Anno corrente (Da Piano)',
      'CostResAnnoCorr',
      'Business Unit',
      'Account Manager',
      'Cognome',
      'Nome',
      'Project Manager',
      'Operation',
      'Tip.Cliente',
      'Tipo Processo',
      'Data Fine Progetto',
      'DATA APERTURA',
      'DATA CHIUSURA',
    ];
    rows[10] = [
      'NRBMS0400',
      'CYBR950',
      'Attività Cybertech',
      'CYBERTECH SRL',
      'F7',
      'H',
      'F',
      '',
      'S',
      '160,034.00',
      '302,792.19',
      '22,184.00',
      '189.20',
      '303,207.77',
      '22,184.00',
      '160,034.00',
      '-143,173.77',
      '-415.58',
      '-142,758.19',
      '-0.20',
      '-142,758.19',
      '0.00',
      '0.00',
      'DIGITAL EXPERIENCE',
      '',
      '',
      '',
      'E13622',
      'E13622',
      'ALT',
      'Altro processo',
      '31/dic/2025',
      '16/set/2025 17:05',
      '',
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Foglio1');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new File([buffer], 't8_cyb_20260325.xlsx');

    const dataset = await service.parseFile(file);

    expect(dataset.records.length).toBe(1);
    expect(dataset.records[0].codComm).toBe('CYBR950');
    expect(dataset.records[0].contractValue).toBe(160034);
    expect(dataset.records[0].revenueToDate).toBe(302792.19);
    expect(dataset.records[0].monthlyRevenue).toBe(22184);
    expect(dataset.records[0].marginToDate).toBeCloseTo(-415.58, 2);
    expect(dataset.records[0].backlogCurrentYear).toBeCloseTo(-142758.19, 2);
    expect(dataset.records[0].businessUnit).toBe('DIGITAL EXPERIENCE');
  });
});
