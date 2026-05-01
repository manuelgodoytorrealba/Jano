import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from './api-base';

export type Tag = {
  id: string;
  slug: string;
  label: string;
  description?: string | null;
  category?: string | null;
  isActive: boolean;
};

@Injectable({ providedIn: 'root' })
export class TagsApi {
  private http = inject(HttpClient);

  list() {
    return this.http.get<Tag[]>(apiUrl('/tags'));
  }

  create(data: { label: string; slug?: string; description?: string; category?: string; isActive?: boolean }) {
    return this.http.post<Tag>(apiUrl('/tags'), data);
  }

  addToEntity(entityId: string, tagId: string) {
    return this.http.post<any>(apiUrl(`/entities/${entityId}/tags`), { tagId, source: 'MANUAL' });
  }

  removeFromEntity(entityId: string, tagId: string) {
    return this.http.delete<{ ok: boolean }>(apiUrl(`/entities/${entityId}/tags/${tagId}`));
  }
}
