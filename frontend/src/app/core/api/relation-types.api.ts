import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from './api-base';

export type RelationType = {
  id: string;
  key: string;
  label: string;
  inverseLabel?: string | null;
  directed: boolean;
  category?: string | null;
  isActive: boolean;
  sortOrder: number;
};

@Injectable({ providedIn: 'root' })
export class RelationTypesApi {
  private http = inject(HttpClient);

  list() {
    return this.http.get<RelationType[]>(apiUrl('/relation-types'));
  }
}
