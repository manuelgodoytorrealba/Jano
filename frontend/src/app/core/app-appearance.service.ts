import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { AppSettingsApi } from './api/app-settings.api';

export const DEFAULT_BACKGROUND_IMAGE_URL = '/assets/home/museum-room.jpg';

@Injectable({ providedIn: 'root' })
export class AppAppearanceService {
  private readonly api = inject(AppSettingsApi);

  readonly fallbackBackgroundImageUrl = DEFAULT_BACKGROUND_IMAGE_URL;
  readonly backgroundImageUrl = signal<string | null>(null);
  readonly backgroundLoadError = signal<string | null>(null);

  load() {
    return this.api.getPublicSettings().pipe(
      tap((settings) => {
        this.backgroundImageUrl.set(settings.backgroundImageUrl ?? null);
        this.backgroundLoadError.set(null);
      }),
      catchError(() => {
        this.backgroundImageUrl.set(null);
        this.backgroundLoadError.set('No se pudo cargar el background global.');
        return of({ backgroundImageUrl: null });
      }),
    );
  }

  setBackgroundImageUrl(backgroundImageUrl: string | null): void {
    this.backgroundImageUrl.set(backgroundImageUrl);
    this.backgroundLoadError.set(null);
  }

  currentBackgroundImageUrl(): string {
    return this.backgroundImageUrl() ?? this.fallbackBackgroundImageUrl;
  }
}
