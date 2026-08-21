import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GraphResponseDto } from './graph.models';
import { apiUrl } from './api-base';
import {
  PublicEntity,
  PublicEntityTypeDefinition,
  PublicHomeEntityTypeCard,
  PublicEntityListResponse,
  PublicEntityPreview,
  type PublicKnowledgeEntityKind,
} from './entities.models';

export type EntitiesListParams = {
  type?: string;
  kind?: PublicKnowledgeEntityKind;
  q?: string;
  deck?: string;
  page?: number;
  limit?: number;
  sort?: 'recent' | 'title' | 'relevance';
  status?: string;
  contentLevel?: string;
  movement?: string;
  period?: string;
  institution?: string;
  nationality?: string;
  tag?: string;
  taxonomy?: string;
  term?: string;
};

@Injectable({ providedIn: 'root' })
export class EntitiesApi {
  private http = inject(HttpClient);

  home() {
    return this.http.get<PublicHomeEntityTypeCard[]>(apiUrl('/entities/home'));
  }

  types() {
    return this.http.get<PublicEntityTypeDefinition[]>(apiUrl('/entities/types'));
  }

  list(params: EntitiesListParams) {
    const clean: Record<string, string | number> = {};

    for (const [k, v] of Object.entries(params ?? {})) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string') {
        const s = v.trim();
        if (!s || s === 'undefined' || s === 'null') continue;
        clean[k] = s;
      } else {
        clean[k] = v;
      }
    }

    return this.http.get<PublicEntityListResponse>(apiUrl('/entities'), { params: clean });
  }

  adminList(params: EntitiesListParams) {
    return this.http.get<PublicEntityListResponse>(apiUrl('/entities/admin'), { params });
  }

  institutions() {
    return this.http.get<string[]>(apiUrl('/entities/institutions'));
  }

  nationalities() {
    return this.http.get<string[]>(apiUrl('/entities/nationalities'));
  }

  get(slug: string) {
    return this.http.get<PublicEntity>(apiUrl(`/entities/${slug}`));
  }

  graph(slug: string) {
    return this.http.get<GraphResponseDto>(apiUrl(`/entities/${slug}/graph`));
  }

  preview(slug: string, options?: { includeDrafts?: boolean }) {
    const path = options?.includeDrafts
      ? `/entities/admin/preview/${slug}`
      : `/entities/${slug}/preview`;

    return this.http.get<PublicEntityPreview>(apiUrl(path));
  }
}
