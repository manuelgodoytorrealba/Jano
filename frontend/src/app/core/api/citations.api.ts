import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from './api-base';
import { SourceRecord } from './sources.api';

export type CitationTarget = 'entity' | 'relation' | 'attribute';
export type CitationStance = 'SUPPORTS' | 'CONTRADICTS' | 'MENTIONS';

export type CitationRecord = {
  id: string;
  sourceId: string;
  source: SourceRecord;
  stance: CitationStance;
  locator: string | null;
  quote: string | null;
  note: string | null;
};

export type CreateCitationPayload = {
  sourceId: string;
  stance?: CitationStance;
  locator?: string;
  quote?: string;
  note?: string;
};

@Injectable({ providedIn: 'root' })
export class CitationsApi {
  private readonly http = inject(HttpClient);

  list(target: CitationTarget, id: string) {
    return this.http.get<CitationRecord[]>(apiUrl(`${this.path(target, id)}/citations`));
  }

  create(target: CitationTarget, id: string, payload: CreateCitationPayload) {
    return this.http.post<CitationRecord>(apiUrl(`${this.path(target, id)}/citations`), payload);
  }

  remove(id: string) {
    return this.http.delete<{ ok: true }>(apiUrl(`/citations/${id}`));
  }

  private path(target: CitationTarget, id: string) {
    const base =
      target === 'attribute' ? 'entity-attributes' : target === 'entity' ? 'entities' : 'relations';
    return '/' + base + '/' + id;
  }
}
