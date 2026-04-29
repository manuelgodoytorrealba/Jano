import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from './api-base';

export type CollectionItem = {
  id: string;
  collectionId: string;
  entityId: string;
  sortOrder: number;
  createdAt: string;
  entity: any;
};

export type CollectionGraph = {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    slug: string;
    sortOrder: number;
    resolvedMedia?: any;
    metadata: {
      summary: string | null;
      startYear: number | null;
      endYear: number | null;
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    relationType: string;
    weight: number;
    justification: string | null;
  }>;
  summary: {
    entityTypes: Record<string, number>;
    relationTypes: Record<string, number>;
  };
};

export type Collection = {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  notes?: string | null;
  coverMediaId?: string | null;
  coverMedia?: any | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  items: CollectionItem[];
  itemCount: number;
  graph?: CollectionGraph | null;
};

export type CollectionPayload = {
  name: string;
  description?: string;
  notes?: string | null;
  coverMediaId?: string | null;
};

@Injectable({ providedIn: 'root' })
export class CollectionsApi {
  private http = inject(HttpClient);
  private readonly baseUrl = apiUrl('/me/collections');

  list() {
    return this.http.get<Collection[]>(this.baseUrl);
  }

  getById(collectionId: string) {
    return this.http.get<Collection>(`${this.baseUrl}/${collectionId}`);
  }

  create(data: CollectionPayload) {
    return this.http.post<Collection>(this.baseUrl, data);
  }

  update(collectionId: string, data: Partial<CollectionPayload>) {
    return this.http.patch<Collection>(`${this.baseUrl}/${collectionId}`, data);
  }

  addEntity(collectionId: string, entityId: string) {
    return this.http.post<CollectionItem>(`${this.baseUrl}/${collectionId}/entities/${entityId}`, {});
  }

  reorderEntity(collectionId: string, entityId: string, sortOrder: number) {
    return this.http.patch<CollectionItem>(`${this.baseUrl}/${collectionId}/entities/${entityId}`, { sortOrder });
  }

  removeEntity(collectionId: string, entityId: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${collectionId}/entities/${entityId}`);
  }
}
