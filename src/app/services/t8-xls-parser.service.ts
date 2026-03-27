import { Injectable } from '@angular/core';
import { CellValue, PortfolioScope, T8DashboardDataset, T8JobRecord, T8ReportMeta, T8ReportMetaItem } from '../models/t8-report.model';

type SheetRef = {
  name: string;
  offset: number;
};

type RawRow = Record<string, CellValue>;

const HEADER_ROW_INDEX = 9;
const DATA_ROW_START_INDEX = 10;
const REQUIRED_HEADERS = [
  'CodComm',
  'Descriz',
  'Cliente',
  'LineaProd',
  'TipoAvanz',
  'TipoRic',
  'Chiusa',
  'RicTotComm',
  'RicTotData',
  'CostTotData',
  'MarTotData',
  '%MarTotData',
  'RicResAnnoCorr',
  'CostResAnnoCorr',
  'Business Unit',
  'Account Manager',
  'Project Manager',
  'Data Fine Progetto',
];

const WINDOWS_1252 = new TextDecoder('windows-1252');
const UTF16LE = new TextDecoder('utf-16le');

@Injectable({
  providedIn: 'root',
})
export class T8XlsParserService {
  async parseFile(file: File): Promise<T8DashboardDataset> {
    const buffer = await file.arrayBuffer();
    return this.parseBuffer(buffer);
  }

  parseBuffer(buffer: ArrayBuffer): T8DashboardDataset {
    const bytes = new Uint8Array(buffer);
    const workbook = this.extractWorkbook(bytes);
    const { sheets, sstSegments } = this.parseWorkbookGlobals(workbook);
    if (!sheets.length) {
      throw new Error('Il file non contiene fogli di lavoro leggibili.');
    }

    const sharedStrings = this.parseSharedStrings(sstSegments);
    const sheet = this.parseSheet(workbook, sheets[0].offset, sharedStrings);
    const headerEntries = this.extractHeaders(sheet.rows);
    const rawRows = this.extractRawRows(sheet.rows, headerEntries);
    const meta = this.extractMeta(sheet.rows, sheets[0].name);
    const records = rawRows.map((row, index) => this.toJobRecord(row, DATA_ROW_START_INDEX + index));

    return {
      headers: headerEntries.map(([, header]) => header),
      meta,
      records,
    };
  }

  parseItalianDateValue(value: CellValue | undefined): Date | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const monthMap: Record<string, number> = {
      gen: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      mag: 4,
      giu: 5,
      lug: 6,
      ago: 7,
      set: 8,
      ott: 9,
      nov: 10,
      dic: 11,
    };

    const match = trimmed.match(/^(\d{1,2})\/([a-z]{3})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/i);
    if (!match) {
      return null;
    }

    const [, dayValue, monthLabel, yearValue, hourValue, minuteValue] = match;
    const month = monthMap[monthLabel.toLowerCase()];
    if (month === undefined) {
      return null;
    }

    const year = Number(yearValue);
    const day = Number(dayValue);
    const hour = hourValue ? Number(hourValue) : 0;
    const minute = minuteValue ? Number(minuteValue) : 0;
    return new Date(year, month, day, hour, minute);
  }

  deriveScope(rawRow: RawRow): PortfolioScope {
    const cliente = this.asString(rawRow['Cliente']).toUpperCase();
    const lineaProd = this.asString(rawRow['LineaProd']).toUpperCase();
    return cliente.includes('ENGINEERING INGEGNERIA INFORMATICA SPA') || lineaProd === 'F10'
      ? 'tutte'
      : 'commerciale';
  }

  private extractWorkbook(bytes: Uint8Array): Uint8Array {
    const sectorSize = 1 << this.readUInt16LE(bytes, 30);
    const fatSectorsCount = this.readUInt32LE(bytes, 44);
    const firstDirectorySector = this.readInt32LE(bytes, 48);
    const difat: number[] = [];

    for (let index = 0; index < 109; index++) {
      const value = this.readInt32LE(bytes, 76 + index * 4);
      if (value >= 0) {
        difat.push(value);
      }
    }

    const fat: number[] = [];
    for (let index = 0; index < fatSectorsCount; index++) {
      const sectorId = difat[index];
      const sectorOffset = this.sectorOffset(sectorId, sectorSize);
      for (let entry = 0; entry < sectorSize / 4; entry++) {
        fat.push(this.readInt32LE(bytes, sectorOffset + entry * 4));
      }
    }

    const directoryStream = this.readChain(bytes, fat, firstDirectorySector, sectorSize);

    for (let offset = 0; offset + 128 <= directoryStream.length; offset += 128) {
      const nameLength = this.readUInt16LE(directoryStream, offset + 64);
      if (nameLength < 2) {
        continue;
      }

      const entryName = UTF16LE.decode(directoryStream.slice(offset, offset + nameLength - 2));
      if (entryName === 'Workbook' || entryName === 'Book') {
        const startSector = this.readInt32LE(directoryStream, offset + 116);
        const streamSize = this.readUInt32LE(directoryStream, offset + 120);
        return this.readChain(bytes, fat, startSector, sectorSize, streamSize);
      }
    }

    throw new Error('Workbook stream non trovato nel file Excel legacy.');
  }

  private parseWorkbookGlobals(workbook: Uint8Array): { sheets: SheetRef[]; sstSegments: Uint8Array[] } {
    const sheets: SheetRef[] = [];
    let sstSegments: Uint8Array[] | null = null;

    for (let position = 0; position + 4 <= workbook.length;) {
      const recordId = this.readUInt16LE(workbook, position);
      const recordLength = this.readUInt16LE(workbook, position + 2);
      const payloadStart = position + 4;
      const payloadEnd = payloadStart + recordLength;
      const payload = workbook.slice(payloadStart, payloadEnd);

      if (recordId === 0x0085) {
        const offset = this.readUInt32LE(payload, 0);
        const nameLength = payload[6];
        const isUnicode = (payload[7] & 0x01) === 0x01;
        const nameBytes = payload.slice(8, 8 + nameLength * (isUnicode ? 2 : 1));
        sheets.push({
          name: isUnicode ? UTF16LE.decode(nameBytes) : WINDOWS_1252.decode(nameBytes),
          offset,
        });
      }

      if (recordId === 0x00fc) {
        sstSegments = [payload.slice(8)];
        let continuePosition = payloadEnd;
        while (continuePosition + 4 <= workbook.length && this.readUInt16LE(workbook, continuePosition) === 0x003c) {
          const continueLength = this.readUInt16LE(workbook, continuePosition + 2);
          sstSegments.push(workbook.slice(continuePosition + 4, continuePosition + 4 + continueLength));
          continuePosition += 4 + continueLength;
        }
      }

      if (recordId === 0x000a && sheets.length) {
        break;
      }

      position = payloadEnd;
    }

    if (!sstSegments) {
      throw new Error('Shared strings non trovate nel workbook.');
    }

    return { sheets, sstSegments };
  }

  private parseSharedStrings(segments: Uint8Array[]): string[] {
    const reader = new SegmentReader(segments);
    const strings: string[] = [];

    while (!reader.isDone()) {
      try {
        const charCount = reader.readUInt16();
        const flags = reader.readByte();
        const highByte = (flags & 0x01) === 0x01;
        const hasExtended = (flags & 0x04) === 0x04;
        const hasRichText = (flags & 0x08) === 0x08;
        const richTextRuns = hasRichText ? reader.readUInt16() : 0;
        const extendedSize = hasExtended ? reader.readUInt32() : 0;
        let unicode = highByte;
        let remainingChars = charCount;
        const parts: string[] = [];

        while (remainingChars > 0) {
          reader.ensureReadable();
          if (reader.offset === 0 && parts.length > 0) {
            unicode = (reader.readByte() & 0x01) === 0x01;
          }

          const current = reader.currentSegment();
          const bytesPerChar = unicode ? 2 : 1;
          const availableChars = Math.floor((current.length - reader.offset) / bytesPerChar);
          if (availableChars <= 0) {
            reader.moveToNextSegment();
            continue;
          }

          const takeChars = Math.min(remainingChars, availableChars);
          const takeBytes = takeChars * bytesPerChar;
          const chunk = current.slice(reader.offset, reader.offset + takeBytes);
          parts.push(unicode ? UTF16LE.decode(chunk) : WINDOWS_1252.decode(chunk));
          reader.offset += takeBytes;
          remainingChars -= takeChars;
        }

        if (hasRichText) {
          reader.readBytes(richTextRuns * 4);
        }

        if (hasExtended) {
          reader.readBytes(extendedSize);
        }

        strings.push(parts.join(''));
      } catch {
        break;
      }
    }

    return strings;
  }

  private parseSheet(workbook: Uint8Array, offset: number, sharedStrings: string[]): { rows: Map<number, Record<number, CellValue>> } {
    const rows = new Map<number, Record<number, CellValue>>();

    for (let position = offset; position + 4 <= workbook.length;) {
      const recordId = this.readUInt16LE(workbook, position);
      const recordLength = this.readUInt16LE(workbook, position + 2);
      const payloadStart = position + 4;
      const payloadEnd = payloadStart + recordLength;
      const payload = workbook.slice(payloadStart, payloadEnd);

      if (recordId === 0x00fd) {
        const row = this.readUInt16LE(payload, 0);
        const column = this.readUInt16LE(payload, 2);
        const sstIndex = this.readUInt32LE(payload, 6);
        this.ensureRow(rows, row)[column] = sharedStrings[sstIndex] ?? '';
      }

      if (recordId === 0x0203) {
        const row = this.readUInt16LE(payload, 0);
        const column = this.readUInt16LE(payload, 2);
        this.ensureRow(rows, row)[column] = this.readFloat64LE(payload, 6);
      }

      if (recordId === 0x027e) {
        const row = this.readUInt16LE(payload, 0);
        const column = this.readUInt16LE(payload, 2);
        this.ensureRow(rows, row)[column] = this.decodeRk(this.readUInt32LE(payload, 6));
      }

      if (recordId === 0x00bd) {
        const row = this.readUInt16LE(payload, 0);
        const firstColumn = this.readUInt16LE(payload, 2);
        const lastColumn = this.readUInt16LE(payload, 4);
        for (let column = firstColumn, valueOffset = 6; column <= lastColumn; column++, valueOffset += 6) {
          this.ensureRow(rows, row)[column] = this.decodeRk(this.readUInt32LE(payload, valueOffset + 2));
        }
      }

      if (recordId === 0x0204) {
        const row = this.readUInt16LE(payload, 0);
        const column = this.readUInt16LE(payload, 2);
        const textLength = this.readUInt16LE(payload, 6);
        this.ensureRow(rows, row)[column] = WINDOWS_1252.decode(payload.slice(8, 8 + textLength));
      }

      if (recordId === 0x000a && position > offset) {
        break;
      }

      position = payloadEnd;
    }

    return { rows };
  }

  private extractHeaders(rows: Map<number, Record<number, CellValue>>): Array<[number, string]> {
    const headerRow = rows.get(HEADER_ROW_INDEX);
    if (!headerRow) {
      throw new Error('Riga intestazioni non trovata nel file caricato.');
    }

    const headerEntries = Object.entries(headerRow)
      .map(([column, value]) => [Number(column), this.asString(value)] as [number, string])
      .sort((left, right) => left[0] - right[0])
      .filter(([, header]) => header.length > 0);

    const headerSet = new Set(headerEntries.map(([, header]) => header));
    const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerSet.has(header));
    if (missingHeaders.length > 0) {
      throw new Error(`Il file non ha il formato T8 atteso. Mancano le colonne: ${missingHeaders.join(', ')}`);
    }

    return headerEntries;
  }

  private extractRawRows(rows: Map<number, Record<number, CellValue>>, headers: Array<[number, string]>): RawRow[] {
    const rawRows: RawRow[] = [];

    for (let rowIndex = DATA_ROW_START_INDEX; rowIndex <= Math.max(...rows.keys()); rowIndex++) {
      const source = rows.get(rowIndex);
      if (!source) {
        continue;
      }

      const row: RawRow = {};
      for (const [column, header] of headers) {
        row[header] = source[column] ?? null;
      }

      if (this.asString(row['CodComm'])) {
        rawRows.push(row);
      }
    }

    return rawRows;
  }

  private extractMeta(rows: Map<number, Record<number, CellValue>>, sheetName: string): T8ReportMeta {
    const title = this.asString(rows.get(0)?.[0]) || 'T8 Aggregato';
    const executedAtLabel = this.asString(rows.get(1)?.[0]).replace('DATA-ORA DI ESECUZIONE:', '').trim();
    const referenceItems: T8ReportMetaItem[] = [];

    for (let rowIndex = 3; rowIndex <= 8; rowIndex++) {
      const rawLabel = this.asString(rows.get(rowIndex)?.[0]);
      if (!rawLabel) {
        continue;
      }

      const normalized = rawLabel.replace(/^-+\s*/, '');
      const separatorIndex = normalized.indexOf(':');
      if (separatorIndex === -1) {
        continue;
      }

      referenceItems.push({
        label: normalized.slice(0, separatorIndex).trim(),
        value: normalized.slice(separatorIndex + 1).trim(),
      });
    }

    return {
      title,
      executedAtLabel,
      executedAt: this.parseItalianDateValue(executedAtLabel),
      referenceItems,
      sheetName,
    };
  }

  private toJobRecord(row: RawRow, rowNumber: number): T8JobRecord {
    const accountManager = this.asString(row['Account Manager']);
    const accountManagerSurname = this.asString(row['Cognome']);
    const accountManagerName = this.asString(row['Nome']);
    const accountManagerLabel = [accountManager, accountManagerSurname, accountManagerName].filter(Boolean).join(' - ');
    const isCommercial = this.deriveScope(row) === 'commerciale';
    const revenueToDate = this.asNumber(row['RicTotData']);
    const marginToDate = this.asNumber(row['MarTotData']);
    const marginPct = this.asNullableNumber(row['%MarTotData']) ?? (revenueToDate ? (marginToDate / revenueToDate) * 100 : null);

    return {
      rowNumber,
      codCDC: this.asString(row['CodCDC']),
      codComm: this.asString(row['CodComm']),
      descriz: this.asString(row['Descriz']),
      cliente: this.asString(row['Cliente']),
      lineaProd: this.asString(row['LineaProd']),
      tipoAvanz: this.asString(row['TipoAvanz']),
      tipoRic: this.asString(row['TipoRic']),
      chiusa: this.asString(row['Chiusa']).toUpperCase() === 'X',
      contratto: this.asString(row['Contratto']),
      accountManager,
      accountManagerLabel: accountManagerLabel || accountManager || 'Non assegnato',
      projectManager: this.asString(row['Project Manager']),
      operation: this.asString(row['Operation']),
      businessUnit: this.asString(row['Business Unit']),
      businessArea: this.asString(row['Business Area']),
      segment: this.asString(row['Segment']),
      tipCliente: this.asString(row['Tip.Cliente']),
      tipoProcesso: this.asString(row['Tipo Processo']),
      projectEndDate: this.parseItalianDateValue(row['Data Fine Progetto']),
      dataApertura: this.parseItalianDateValue(row['DATA APERTURA']),
      dataChiusura: this.parseItalianDateValue(row['DATA CHIUSURA']),
      contractValue: this.asNumber(row['RicTotComm']),
      revenueToDate,
      costToDate: this.asNumber(row['CostTotData']),
      marginToDate,
      marginPctToDate: marginPct,
      backlogCurrentYear: this.asNumber(row['RicResAnnoCorr']),
      backlogFutureYears: this.asNumber(row['RicResAnniFut']),
      residualCostCurrentYear: this.asNumber(row['CostResAnnoCorr']),
      residualCostFutureYears: this.asNumber(row['CostResAnniFut']),
      progressPct: this.asNullableNumber(row['%AvanRicTotData']),
      costNetToDate: this.asNumber(row['CostNetAllaData']),
      isCommercial,
      raw: row,
    };
  }

  private ensureRow(rows: Map<number, Record<number, CellValue>>, row: number): Record<number, CellValue> {
    const current = rows.get(row);
    if (current) {
      return current;
    }

    const created: Record<number, CellValue> = {};
    rows.set(row, created);
    return created;
  }

  private asString(value: CellValue | undefined): string {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? String(value) : '';
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    return value?.toString().trim() ?? '';
  }

  private asNumber(value: CellValue | undefined): number {
    return this.asNullableNumber(value) ?? 0;
  }

  private asNullableNumber(value: CellValue | undefined): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/\./g, '').replace(',', '.').trim();
      if (!normalized || normalized.toUpperCase() === 'N.D.') {
        return null;
      }

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private readChain(bytes: Uint8Array, fat: number[], startSector: number, sectorSize: number, maxLength?: number): Uint8Array {
    const chunks: Uint8Array[] = [];
    const visited = new Set<number>();
    let sector = startSector;

    while (sector >= 0 && !visited.has(sector)) {
      visited.add(sector);
      const offset = this.sectorOffset(sector, sectorSize);
      chunks.push(bytes.slice(offset, offset + sectorSize));
      const next = fat[sector];
      if (next === -2) {
        break;
      }
      sector = next;
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(totalLength);
    let writeOffset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, writeOffset);
      writeOffset += chunk.length;
    }

    return maxLength ? merged.slice(0, maxLength) : merged;
  }

  private sectorOffset(sector: number, sectorSize: number): number {
    return (sector + 1) * sectorSize;
  }

  private decodeRk(value: number): number {
    const dividedBy100 = (value & 0x01) === 0x01;
    const isInteger = (value & 0x02) === 0x02;
    let decoded: number;

    if (isInteger) {
      decoded = value >> 2;
    } else {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setUint32(4, value & 0xfffffffc, true);
      decoded = view.getFloat64(0, true);
    }

    return dividedBy100 ? decoded / 100 : decoded;
  }

  private readUInt16LE(bytes: Uint8Array, offset: number): number {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
  }

  private readUInt32LE(bytes: Uint8Array, offset: number): number {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
  }

  private readInt32LE(bytes: Uint8Array, offset: number): number {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(offset, true);
  }

  private readFloat64LE(bytes: Uint8Array, offset: number): number {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat64(offset, true);
  }
}

class SegmentReader {
  segmentIndex = 0;
  offset = 0;

  constructor(private readonly segments: Uint8Array[]) {}

  isDone(): boolean {
    this.ensureReadable();
    return this.segmentIndex >= this.segments.length;
  }

  currentSegment(): Uint8Array {
    this.ensureReadable();
    return this.segments[this.segmentIndex];
  }

  moveToNextSegment(): void {
    this.segmentIndex += 1;
    this.offset = 0;
  }

  ensureReadable(): void {
    while (this.segmentIndex < this.segments.length && this.offset >= this.segments[this.segmentIndex].length) {
      this.moveToNextSegment();
    }
  }

  readByte(): number {
    this.ensureReadable();
    return this.segments[this.segmentIndex][this.offset++];
  }

  readUInt16(): number {
    const bytes = this.readBytes(2);
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(0, true);
  }

  readUInt32(): number {
    const bytes = this.readBytes(4);
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
  }

  readBytes(length: number): Uint8Array {
    const chunk = new Uint8Array(length);
    let written = 0;

    while (written < length) {
      this.ensureReadable();
      const current = this.currentSegment();
      const readable = Math.min(length - written, current.length - this.offset);
      chunk.set(current.slice(this.offset, this.offset + readable), written);
      this.offset += readable;
      written += readable;
    }

    return chunk;
  }
}
