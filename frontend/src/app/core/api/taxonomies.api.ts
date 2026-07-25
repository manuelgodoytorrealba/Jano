import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from './api-base';

export type TaxonomyTerm = {
  id: string;
  key: string;
  label: string;
  isActive?: boolean;
};

export type Taxonomy = {
  id: string;
  key: string;
  label: string;
  terms: TaxonomyTerm[];
};

export type CreateTaxonomyPayload = { key: string; label: string };
export type CreateTaxonomyTermPayload = { key: string; label: string };

@Injectable({ providedIn: 'root' })
export class TaxonomiesApi {
  private http = inject(HttpClient);

  list() {
    return this.http.get<Taxonomy[]>(apiUrl('/taxonomies'));
  }

  create(payload: CreateTaxonomyPayload) {
    return this.http.post<Taxonomy>(apiUrl('/taxonomies'), payload);
  }

  createTerm(taxonomyKey: string, payload: CreateTaxonomyTermPayload) {
    return this.http.post<TaxonomyTerm>(apiUrl('/taxonomies/' + taxonomyKey + '/terms'), payload);
  }
}
