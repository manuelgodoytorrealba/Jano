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
  private readonly personalBackgroundStorageKey = 'jano.personal-background';
  private personalBackgroundObjectUrl: string | null = null;
  private readonly systemThemeQuery =
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: light)') : null;

  readonly fallbackBackgroundImageUrl = DEFAULT_BACKGROUND_IMAGE_URL;
  readonly personalBackgroundImageUrl = signal<string | null>(null);
  readonly backgroundImageUrl = signal<string | null>(null);
  readonly backgroundLoadError = signal<string | null>(null);
  readonly themePreference = signal<AppThemePreference>(this.readStoredThemePreference());
  readonly resolvedTheme = signal<AppResolvedTheme>(this.resolveTheme(this.themePreference()));

  constructor() {
    this.applyResolvedTheme();
    void this.restorePersonalBackground();
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

  async setPersonalBackground(file: File | null): Promise<void> {
    if (!file) {
      await this.clearPersonalBackground();
      return;
    }

    await this.persistPersonalBackground(file);
    await this.restorePersonalBackground();
  }

  async clearPersonalBackground(): Promise<void> {
    await this.deletePersonalBackgroundRecord();
    this.revokePersonalBackgroundObjectUrl();
    this.personalBackgroundImageUrl.set(null);
  }

  currentBackgroundImageUrl(): string {
    return (
      this.personalBackgroundImageUrl() ??
      this.backgroundImageUrl() ??
      this.fallbackBackgroundImageUrl
    );
  }

  private async restorePersonalBackground(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    const record = await this.readPersonalBackgroundRecord();
    if (!record) {
      this.revokePersonalBackgroundObjectUrl();
      this.personalBackgroundImageUrl.set(null);
      return;
    }

    const objectUrl = URL.createObjectURL(record);
    this.revokePersonalBackgroundObjectUrl();
    this.personalBackgroundObjectUrl = objectUrl;
    this.personalBackgroundImageUrl.set(objectUrl);
  }

  private async persistPersonalBackground(file: File): Promise<void> {
    await this.writePersonalBackgroundRecord(file);
  }

  private revokePersonalBackgroundObjectUrl(): void {
    if (this.personalBackgroundObjectUrl) {
      URL.revokeObjectURL(this.personalBackgroundObjectUrl);
      this.personalBackgroundObjectUrl = null;
    }
  }

  private openBackgroundDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('jano-appearance', 1);

      request.onupgradeneeded = () => {
        request.result.createObjectStore('settings');
      };

      request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'));
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async readPersonalBackgroundRecord(): Promise<Blob | null> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return null;
    }

    const db = await this.openBackgroundDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const request = store.get(this.personalBackgroundStorageKey);

        request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
        request.onerror = () =>
          reject(request.error ?? new Error('Could not read personal background'));
      });
    } finally {
      db.close();
    }
  }

  private async writePersonalBackgroundRecord(file: File): Promise<void> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return;
    }

    const db = await this.openBackgroundDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        store.put(file, this.personalBackgroundStorageKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Could not save personal background'));
      });
    } finally {
      db.close();
    }
  }

  private async deletePersonalBackgroundRecord(): Promise<void> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return;
    }

    const db = await this.openBackgroundDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        store.delete(this.personalBackgroundStorageKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Could not delete personal background'));
      });
    } finally {
      db.close();
    }
  }
}
