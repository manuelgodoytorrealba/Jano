import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GraphResponseDto } from '../../features/graph/graph.models';
import { apiUrl } from './api-base';
import { PublicEntity } from './entities.models';

export type CuratedDeck = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image: {
    url: string;
    alt: string | null;
  } | null;
  entityCount: number;
  createdAt?: string;
};

export type CuratedMapEntity = PublicEntity & {
  connectionIds: string[];
  curationCount: number;
  relatedCount: number;
};

export type CuratedPageResponse = {
  selectedEntity: PublicEntity;
  discoveryEntities: CuratedMapEntity[];
  graph: GraphResponseDto;
  staffPicks: CuratedDeck[];
  tabGroups: {
    curations: CuratedDeck[];
    articles: PublicEntity[];
    artists: PublicEntity[];
    artworks: PublicEntity[];
    concepts: PublicEntity[];
  };
  keyEntities: PublicEntity[];
  relatedEntities: PublicEntity[];
  recentlyAdded: CuratedDeck[];
};

@Injectable({ providedIn: 'root' })
export class CuratedApi {
  private readonly http = inject(HttpClient);

  page(entity?: string) {
    return this.http.get<CuratedPageResponse>(apiUrl('/curated'), {
      params: entity ? { entity } : {},
    });
  }
}
