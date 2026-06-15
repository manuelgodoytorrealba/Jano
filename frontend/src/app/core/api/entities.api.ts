import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GraphResponseDto } from '../../features/graph/graph.models';
import { apiUrl } from './api-base';
import { PublicEntity, PublicEntityListResponse, PublicEntityPreview } from './entities.models';

@Injectable({ providedIn: 'root' })
export class EntitiesApi {
  private http = inject(HttpClient);

  home() {
    return this.http.get<PublicEntity[]>(apiUrl('/entities/home'));
  }

  list(params: {
    type?: string;
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
  }) {
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

    return this.http.get<PublicEntityListResponse>(
      apiUrl('/entities'),
      { params: clean },
    );
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

  preview(slug: string) {
    return this.http.get<PublicEntityPreview>(apiUrl(`/entities/${slug}/preview`));
  }
}
