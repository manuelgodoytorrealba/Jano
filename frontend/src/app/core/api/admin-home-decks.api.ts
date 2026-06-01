import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from './api-base';
import { HomeDeck } from './home-decks.api';

export type AdminHomeDeckWarning = {
  code: string;
  severity: 'info' | 'warning';
  message: string;
};

export type AdminHomeDeckTranslation = {
  locale: 'es' | 'en' | string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  ctaLabel?: string | null;
};

export type AdminHomeDeck = HomeDeck & {
  translations: AdminHomeDeckTranslation[];
  imageUrl: string | null;
  imageMediaId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  warnings: AdminHomeDeckWarning[];
};

export type AdminHomeDeckPayload = {
  surface?: 'HOME' | 'RECOMMENDED';
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  ctaRoute?: string;
  imageUrl?: string;
  imageMediaId?: string;
  sortOrder?: number;
  isActive?: boolean;
  translations?: AdminHomeDeckTranslation[];
};

@Injectable({ providedIn: 'root' })
export class AdminHomeDecksApi {
  private http = inject(HttpClient);

  list() {
    return this.http.get<AdminHomeDeck[]>(apiUrl('/home-decks/admin'));
  }

  getById(id: string) {
    return this.http.get<AdminHomeDeck>(apiUrl(`/home-decks/admin/${id}`));
  }

  create(data: AdminHomeDeckPayload) {
    return this.http.post<AdminHomeDeck>(apiUrl('/home-decks'), data);
  }

  update(id: string, data: Partial<AdminHomeDeckPayload>) {
    return this.http.patch<AdminHomeDeck>(apiUrl(`/home-decks/${id}`), data);
  }

  remove(id: string) {
    return this.http.delete<{ ok: boolean }>(apiUrl(`/home-decks/${id}`));
  }

  uploadImage(id: string, file: File, data: { alt?: string } = {}) {
    const formData = new FormData();
    formData.set('file', file);

    if (data.alt?.trim()) {
      formData.set('alt', data.alt.trim());
    }

    return this.http.post<AdminHomeDeck>(apiUrl(`/home-decks/${id}/image/upload`), formData);
  }

  addEntity(deckId: string, entityId: string, sortOrder?: number) {
    return this.http.post<AdminHomeDeck>(apiUrl(`/home-decks/${deckId}/entities`), {
      entityId,
      sortOrder,
    });
  }

  removeEntity(deckId: string, entityId: string) {
    return this.http.delete<AdminHomeDeck>(apiUrl(`/home-decks/${deckId}/entities/${entityId}`));
  }

  reorderEntity(deckId: string, entityId: string, sortOrder: number) {
    return this.http.patch<AdminHomeDeck>(apiUrl(`/home-decks/${deckId}/entities/${entityId}`), {
      sortOrder,
    });
  }
}
