import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GraphResponseDto } from '../../features/graph/graph.models';
import { apiUrl } from './api-base';

type Entity = any;

@Injectable({ providedIn: 'root' })
export class EntitiesApi {
  private http = inject(HttpClient);

  // ✅ NUEVO: home (5 cards)
  home() {
    return this.http.get<Entity[]>(apiUrl('/entities/home'));
  }

  // ✅ EXISTENTE (mantén firma): listado simple para pantallas antiguas (si lo usas en algún lado)
  // Si ya no lo usas, igual lo dejamos para no romper.
 list(params: {
  type?: string;
  q?: string;
  page?: number;
  limit?: number;
  sort?: 'recent' | 'title' | 'relevance';
  status?: string;
  contentLevel?: string;
  movement?: string;
  period?: string;
  institution?: string;
  nationality?: string;
}) {
    const clean: any = {};

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

    return this.http.get<{ items: any[]; page: number; limit: number; total: number; totalPages: number }>(
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

  // ✅ ALIAS para no romper entity.component.ts
  get(slug: string) {
    return this.http.get<Entity>(apiUrl(`/entities/${slug}`));
  }

  // ✅ ALIAS para graph.component.ts
  graph(slug: string) {
    return this.http.get<GraphResponseDto>(apiUrl(`/entities/${slug}/graph`));
  }

  // ✅ ALIAS para rich-text.component.ts
  preview(slug: string) {
    return this.http.get<any>(apiUrl(`/entities/${slug}/preview`));
  }
}
