import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from './api-base';

@Injectable({ providedIn: 'root' })
export class CollectionsApi {
  private http = inject(HttpClient);
  private readonly baseUrl = apiUrl('/me/collections');

  list() {
    return this.http.get<any[]>(this.baseUrl);
  }

  create(data: { name: string; description?: string }) {
    return this.http.post<any>(this.baseUrl, data);
  }

  addEntity(collectionId: string, entityId: string) {
    return this.http.post<any>(`${this.baseUrl}/${collectionId}/entities/${entityId}`, {});
  }

  removeEntity(collectionId: string, entityId: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${collectionId}/entities/${entityId}`);
  }
}
