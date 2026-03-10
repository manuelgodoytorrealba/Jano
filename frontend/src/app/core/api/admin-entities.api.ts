import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export type AdminEntityPayload = {
  type: 'ARTWORK' | 'ARTIST' | 'CONCEPT' | 'MOVEMENT' | 'PERIOD' | 'TEXT' | 'PLACE';
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  contentLevel?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  status?: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED';
  startYear?: number | null;
  endYear?: number | null;
};

@Injectable({ providedIn: 'root' })
export class AdminEntitiesApi {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/entities';

  list(params?: Record<string, string | number | undefined>) {
    let httpParams = new HttpParams();

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }

    return this.http.get<any>(this.baseUrl, { params: httpParams });
  }

  getById(id: string) {
    return this.http.get<any>(`${this.baseUrl}/admin/${id}`);
  }

  create(data: AdminEntityPayload) {
    return this.http.post<any>(this.baseUrl, data);
  }

  update(id: string, data: Partial<AdminEntityPayload>) {
    return this.http.patch<any>(`${this.baseUrl}/${id}`, data);
  }

  remove(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${id}`);
  }

  listRelations(entityId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/${entityId}/relations`);
  }

  listIncomingRelations(entityId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/${entityId}/relations/incoming`);
  }

  createRelation(
    entityId: string,
    data: { toId: string; type: string; justification?: string; weight?: number }
  ) {
    return this.http.post<any>(`${this.baseUrl}/${entityId}/relations`, data);
  }

  deleteRelation(entityId: string, relationId: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${entityId}/relations/${relationId}`);
  }
}