import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from './api-base';

export type SourceRecord = {
  id: string;
  type: string;
  title: string;
  author: string | null;
  publisher: string | null;
  year: number | null;
  url: string | null;
};

@Injectable({ providedIn: 'root' })
export class SourcesApi {
  private readonly http = inject(HttpClient);

  search(q: string, limit = 8) {
    return this.http.get<SourceRecord[]>(apiUrl('/sources'), {
      params: new HttpParams().set('q', q).set('limit', limit),
    });
  }
}
