import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from './api-base';
import { PublicEntity } from './entities.models';

export type SavedItem = {
  id: string;
  createdAt: string;
  entity: PublicEntity;
};

@Injectable({ providedIn: 'root' })
export class SavedApi {
  private http = inject(HttpClient);
  private readonly baseUrl = apiUrl('/me/saved');

  list() {
    return this.http.get<SavedItem[]>(this.baseUrl);
  }

  save(entityId: string) {
    return this.http.post<SavedItem>(`${this.baseUrl}/${entityId}`, {});
  }

  remove(entityId: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${entityId}`);
  }

  check(entityId: string) {
    return this.http.get<{ saved: boolean }>(`${this.baseUrl}/check/${entityId}`);
  }
}
