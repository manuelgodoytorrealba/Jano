import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from './api-base';

export type SearchResult = {
  id: string;
  slug: string;
  type: string;
  title: string;
  summary: string | null;
  status: string;
  contentLevel: string | null;
  startYear: number | null;
  endYear: number | null;
  resolvedMedia?: {
    thumbnail?: any | null;
    card?: any | null;
  };
  tags?: any[];
  aliases?: Array<{
    id: string;
    locale: string;
    value: string;
    kind: string;
    weight?: number | null;
  }>;
  score: number;
  matchedFields: string[];
  matchReasons?: string[];
  relationType?: string | null;
  relationReason?: string | null;
  relationWithTitle?: string | null;
};

export type SearchRoute = {
  id: string;
  label: string;
  relationType: string;
  items: SearchResult[];
};

export type SearchDeck = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  entities: Array<{ id: string; sortOrder: number; entity: SearchResult | null }>;
};

export type SearchSection = {
  key: string;
  title: string;
  items?: SearchResult[];
  routes?: SearchRoute[];
  decks?: SearchDeck[];
};

export type SearchResponse = {
  query: string;
  total: number;
  items: SearchResult[];
  groups: Record<string, SearchResult[]>;
  sections?: SearchSection[];
  interpretation?: {
    normalizedQuery: string;
    significantTerms: string[];
    signals: Array<{ kind: string; value: string }>;
    variantsTried: Array<{ query: string; reason: string }>;
  };
};

@Injectable({ providedIn: 'root' })
export class SearchApi {
  private http = inject(HttpClient);

  search(params: { q: string; type?: string; tag?: string; limit?: number; includeDrafts?: boolean }) {
    let httpParams = new HttpParams().set('q', params.q ?? '');

    if (params.type) {
      httpParams = httpParams.set('type', params.type);
    }

    if (params.tag) {
      httpParams = httpParams.set('tag', params.tag);
    }

    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit);
    }

    if (params.includeDrafts) {
      httpParams = httpParams.set('includeDrafts', true);
    }

    return this.http.get<SearchResponse>(apiUrl('/search'), { params: httpParams });
  }
}
