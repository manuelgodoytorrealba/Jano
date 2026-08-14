import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from './api-base';
import {
  PublicEntity,
  PublicEntityListResponse,
  PublicEntityResolvedMedia,
  PublicEntityTagItem,
  PublicEntityTagReference,
  type PublicKnowledgeEntityKind,
} from './entities.models';

export type SearchResult = {
  id: string;
  resultType: 'ENTITY' | 'RESEARCH' | 'RELATION';
  slug: string;
  type: string;
  kind?: PublicKnowledgeEntityKind | null;
  title: string;
  summary: string | null;
  status: string;
  contentLevel: string | null;
  startYear: number | null;
  endYear: number | null;
  resolvedMedia?: PublicEntityResolvedMedia | null;
  tags?: PublicEntityTagReference[] | PublicEntityTagItem[];
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
  fromSlug?: string;
  toSlug?: string;
  publishedAt?: string | null;
};

export type SearchRoute = {
  id: string;
  label: string;
  relationType: string;
  items: SearchResult[];
};

export type SearchSection = {
  key: string;
  title: string;
  total?: number;
  items?: SearchResult[];
  routes?: SearchRoute[];
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

export type ArchiveRecommendation = PublicEntity & {
  recommendationReason: string;
  recommendationScore: number;
};

@Injectable({ providedIn: 'root' })
export class SearchApi {
  private http = inject(HttpClient);

  search(params: {
    q: string;
    type?: string;
    kind?: PublicKnowledgeEntityKind;
    tag?: string;
    limit?: number;
    includeDrafts?: boolean;
    recordInterest?: boolean;
    locale?: string;
  }) {
    let httpParams = new HttpParams().set('q', params.q ?? '');

    if (params.type) {
      httpParams = httpParams.set('type', params.type);
    }

    if (params.kind) {
      httpParams = httpParams.set('kind', params.kind);
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

    if (params.recordInterest) {
      httpParams = httpParams.set('recordInterest', true);
    }

    if (params.locale) {
      httpParams = httpParams.set('locale', params.locale);
    }

    return this.http.get<SearchResponse>(apiUrl('/search'), { params: httpParams });
  }

  archiveRecommendations(params: { type?: string; limit?: number } = {}) {
    return this.http.get<
      PublicEntityListResponse<ArchiveRecommendation> & { personalized: boolean }
    >(apiUrl('/search/recommendations/archive'), { params });
  }
}
