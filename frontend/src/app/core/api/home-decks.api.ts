import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from './api-base';

export type HomeDeckImage = {
  id: string | null;
  url: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  source?: string | null;
};

export type HomeDeckEntity = {
  id: string;
  sortOrder: number;
  entity: any;
};

export type HomeDeck = {
  id: string;
  isVirtual?: boolean;
  surface: 'HOME' | 'RECOMMENDED';
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  ctaRoute: string | null;
  image: HomeDeckImage | null;
  sortOrder: number;
  entities: HomeDeckEntity[];
};

@Injectable({ providedIn: 'root' })
export class HomeDecksApi {
  private http = inject(HttpClient);

  listPublic(surface: 'HOME' | 'RECOMMENDED' = 'HOME') {
    return this.http.get<HomeDeck[]>(apiUrl('/home-decks'), { params: { surface } });
  }
}
