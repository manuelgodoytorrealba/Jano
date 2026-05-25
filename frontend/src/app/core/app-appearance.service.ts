import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { AppSettingsApi } from './api/app-settings.api';

export const DEFAULT_BACKGROUND_IMAGE_URL = '/assets/home/museum-room.jpg';
export type AppThemePreference = 'system' | 'dark' | 'light';
export type AppResolvedTheme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class AppAppearanceService {
  private readonly api = inject(AppSettingsApi);
  private readonly themeStorageKey = 'jano.theme';
  private readonly systemThemeQuery = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;

  readonly fallbackBackgroundImageUrl = DEFAULT_BACKGROUND_IMAGE_URL;
  readonly backgroundImageUrl = signal<string | null>(null);
  readonly backgroundLoadError = signal<string | null>(null);
  readonly themePreference = signal<AppThemePreference>(this.readStoredThemePreference());
  readonly resolvedTheme = signal<AppResolvedTheme>(this.resolveTheme(this.themePreference()));

  constructor() {
    this.applyResolvedTheme();
    this.systemThemeQuery?.addEventListener('change', () => {
      if (this.themePreference() === 'system') {
        this.applyResolvedTheme();
      }
    });
  }

  setThemePreference(preference: AppThemePreference): void {
    this.themePreference.set(preference);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.themeStorageKey, preference);
    }

    this.applyResolvedTheme();
  }

  private applyResolvedTheme(): void {
    const nextTheme = this.resolveTheme(this.themePreference());
    this.resolvedTheme.set(nextTheme);

    if (typeof document !== 'undefined') {
      document.documentElement.dataset['theme'] = nextTheme;
      document.documentElement.style.colorScheme = nextTheme;
    }
  }

  private resolveTheme(preference: AppThemePreference): AppResolvedTheme {
    if (preference === 'light' || preference === 'dark') {
      return preference;
    }

    return this.systemThemeQuery?.matches ? 'light' : 'dark';
  }

  private readStoredThemePreference(): AppThemePreference {
    if (typeof window === 'undefined') {
      return 'dark';
    }

    const stored = window.localStorage.getItem(this.themeStorageKey);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark';
  }

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
