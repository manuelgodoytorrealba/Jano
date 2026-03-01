import { Injectable, inject } from '@angular/core';
import { HttpClient, withFetch } from '@angular/common/http';

const API = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class EntitiesApi {
  private http = inject(HttpClient);

  list() {
    return this.http.get<any[]>(`${API}/entities`);
  }

  get(slug: string) {
    return this.http.get<any>(`${API}/entities/${slug}`);
  }

  graph(slug: string) {
    return this.http.get<any>(`${API}/entities/${slug}/graph`);
  }
}