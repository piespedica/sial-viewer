import { Injectable } from '@angular/core';
import { PersistedT8DashboardDataset, PersistedViewerSession, T8DashboardDataset, T8JobRecord, T8ReportMeta } from '../models/t8-report.model';

const STORAGE_KEY = 't8-viewer.saved-sessions';
const LEGACY_STORAGE_KEY = 't8-viewer.saved-session';
const MAX_SESSIONS = 5;

@Injectable({
  providedIn: 'root',
})
export class T8SessionStorageService {
  listSessions(): PersistedViewerSession[] {
    const sessions = this.readRawSessions();
    return sessions.slice().sort((left, right) => right.savedAt.localeCompare(left.savedAt));
  }

  hasSessions(): boolean {
    return this.listSessions().length > 0;
  }

  loadSession(sessionId: string): PersistedViewerSession | null {
    return this.listSessions().find((session) => session.id === sessionId) ?? null;
  }

  saveSession(session: {
    name: string;
    fileName: string;
    dataset: T8DashboardDataset;
    filters: PersistedViewerSession['filters'];
    selectedCodComm: string | null;
  }): void {
    const sessions = this.listSessions().filter((item) => item.name !== session.name.trim());
    const payload: PersistedViewerSession = {
      id: this.buildSessionId(),
      name: session.name.trim(),
      fileName: session.fileName,
      dataset: this.serializeDataset(session.dataset),
      filters: session.filters,
      selectedCodComm: session.selectedCodComm,
      savedAt: new Date().toISOString(),
    };

    sessions.unshift(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  clearSession(sessionId: string): void {
    const nextSessions = this.listSessions().filter((session) => session.id !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSessions));
  }

  clearAllSessions(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  restoreDataset(dataset: PersistedT8DashboardDataset): T8DashboardDataset {
    return {
      headers: dataset.headers,
      meta: this.restoreMeta(dataset.meta),
      records: dataset.records.map((record) => this.restoreRecord(record)),
    };
  }

  private readRawSessions(): PersistedViewerSession[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PersistedViewerSession[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        this.clearAllSessions();
        return [];
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) {
      return [];
    }

    try {
      const legacySession = JSON.parse(legacyRaw) as Omit<PersistedViewerSession, 'id' | 'name'>;
      const migratedSession: PersistedViewerSession = {
        id: this.buildSessionId(),
        name: legacySession.fileName,
        ...legacySession,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([migratedSession]));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return [migratedSession];
    } catch {
      this.clearAllSessions();
      return [];
    }
  }

  private serializeDataset(dataset: T8DashboardDataset): PersistedT8DashboardDataset {
    return {
      headers: dataset.headers,
      meta: {
        ...dataset.meta,
        executedAt: dataset.meta.executedAt?.toISOString() ?? null,
      },
      records: dataset.records.map((record) => ({
        ...record,
        projectEndDate: record.projectEndDate?.toISOString() ?? null,
        dataApertura: record.dataApertura?.toISOString() ?? null,
        dataChiusura: record.dataChiusura?.toISOString() ?? null,
      })),
    };
  }

  private restoreMeta(meta: PersistedT8DashboardDataset['meta']): T8ReportMeta {
    return {
      ...meta,
      executedAt: meta.executedAt ? new Date(meta.executedAt) : null,
    };
  }

  private restoreRecord(record: PersistedT8DashboardDataset['records'][number]): T8JobRecord {
    return {
      ...record,
      projectEndDate: record.projectEndDate ? new Date(record.projectEndDate) : null,
      dataApertura: record.dataApertura ? new Date(record.dataApertura) : null,
      dataChiusura: record.dataChiusura ? new Date(record.dataChiusura) : null,
    };
  }

  private buildSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
