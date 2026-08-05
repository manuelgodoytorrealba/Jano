import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ResearchDocumentKind, ResearchDocumentStatus } from './research.api';
import { apiUrl } from './api-base';

export type LibraryMaterial = {
  id: string;
  sourceId: string | null;
  kind: ResearchDocumentKind;
  title: string;
  createdAt: string;
  updatedAt: string;
  version: {
    id: string;
    status: ResearchDocumentStatus;
    url: string | null;
    originalName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
  } | null;
  research: Array<{ id: string; title: string }>;
};

@Injectable({ providedIn: 'root' })
export class LibraryApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = apiUrl('/library/materials');

  list() {
    return this.http.get<LibraryMaterial[]>(this.baseUrl);
  }

  delete(materialId: string) {
    return this.http.delete<{ deleted: true }>(`${this.baseUrl}/${materialId}`);
  }
}
