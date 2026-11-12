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

  listResearch() {
    return this.http.get<SavedResearchItem[]>(apiUrl('/me/research-saved'));
  }

  save(entityId: string, target: 'entity' | 'research' = 'entity') {
    return this.http.post<SavedItem>(
      `${target === 'research' ? apiUrl('/me/research-saved') : this.baseUrl}/${entityId}`,
      {},
    );
  }

  remove(entityId: string, target: 'entity' | 'research' = 'entity') {
    return this.http.delete<{ ok: boolean }>(
      `${target === 'research' ? apiUrl('/me/research-saved') : this.baseUrl}/${entityId}`,
    );
  }

  check(entityId: string, target: 'entity' | 'research' = 'entity') {
    return this.http.get<{ saved: boolean }>(
      `${target === 'research' ? apiUrl('/me/research-saved') : this.baseUrl}/check/${entityId}`,
    );
  }
}

export type SavedResearchItem = {
  researchId: string;
  createdAt: string;
  research: {
    id: string;
    title: string;
    objective: string | null;
    coverImageUrl: string | null;
    publishedAt: string | null;
  };
};
