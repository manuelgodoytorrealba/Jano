import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';
import { apiUrl } from './api-base';
import { PublicEntity } from './entities.models';

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
  entity: PublicEntity;
};

export type HomeDeck = {
  id: string;
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
  private readonly publicCache = new Map<string, HomeDeck[]>();

  listPublic(surface: 'HOME' | 'RECOMMENDED' = 'HOME', locale?: string) {
    return this.http
      .get<HomeDeck[]>(apiUrl('/home-decks'), {
        params: locale ? { surface, locale } : { surface },
      })
      .pipe(
        tap((decks) => {
          if (locale) this.publicCache.set(`${surface}:${locale}`, decks);
        }),
      );
  }

  readCachedPublic(surface: 'HOME' | 'RECOMMENDED', locale: string): HomeDeck[] | undefined {
    return this.publicCache.get(`${surface}:${locale}`);
  }
}
