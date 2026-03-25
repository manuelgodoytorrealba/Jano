import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GraphResponseDto } from '../../features/graph/graph.models';

type Entity = any;

@Injectable({ providedIn: 'root' })
export class EntitiesApi {
  private http = inject(HttpClient);

  // ✅ con /api por tu globalPrefix
  private base = 'http://localhost:3000/api';

  // ✅ NUEVO: home (5 cards)
  home() {
    return this.http.get<Entity[]>(`${this.base}/entities/home`);
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
      `${this.base}/entities`,
      { params: clean },
    );
  }

  // ✅ ALIAS para no romper entity.component.ts
  get(slug: string) {
    return this.http.get<Entity>(`${this.base}/entities/${slug}`);
  }

  // ✅ ALIAS para graph.component.ts
  graph(slug: string) {
    return this.http.get<GraphResponseDto>(`${this.base}/entities/${slug}/graph`);
  }

  // ✅ ALIAS para rich-text.component.ts
  preview(slug: string) {
    return this.http.get<any>(`${this.base}/entities/${slug}/preview`);
  }
}
