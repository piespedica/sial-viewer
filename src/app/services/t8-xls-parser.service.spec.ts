import { TestBed } from '@angular/core/testing';
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
});
