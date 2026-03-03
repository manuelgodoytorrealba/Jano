// frontend/src/app/core/api/entities.api.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class EntitiesApi {
  private http = inject(HttpClient);

  list() {
    return this.http.get<any[]>(`/api/entities`);
  }

  get(slug: string) {
    return this.http.get<any>(`/api/entities/${slug}`);
  }

  graph(slug: string) {
    return this.http.get<any>(`/api/entities/${slug}/graph`);
  }

  preview(slug: string) {
    return this.http.get<any>(`/api/entities/${slug}/preview`);
  }
}