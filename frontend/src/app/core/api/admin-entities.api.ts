import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
    return this.http.get<any>(this.baseUrl, { params: params as any });
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
}