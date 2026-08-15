import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, REQUEST, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { catchError, forkJoin, map, of, tap } from 'rxjs';

export type AppLocale = 'es' | 'en';

const SUPPORTED_LOCALES: AppLocale[] = ['es', 'en'];
const DEFAULT_LOCALE: AppLocale = 'es';
const STORAGE_KEY = 'jano.locale';

type TranslationMap = Record<string, string>;

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly dictionaries = signal<Record<AppLocale, TranslationMap>>({ es: {}, en: {} });
  readonly locale = signal<AppLocale>(this.readInitialLocale());
  readonly ready = signal(false);
  readonly supportedLocales = SUPPORTED_LOCALES;
  private readonly missingKeys = new Set<string>();
  readonly localeLabel = computed(() => (this.locale() === 'es' ? 'Español' : 'English'));
  readonly fallbackLabel = computed(() =>
    this.locale() === 'es' ? 'Texto editorial disponible pronto.' : 'Editorial text coming soon.',
  );

  load() {
    return forkJoin({
      es: this.loadDictionary('es'),
      en: this.loadDictionary('en'),
    }).pipe(
      tap((dictionaries) => {
        this.dictionaries.set(dictionaries);
        this.ready.set(true);
      }),
      map(() => true),
    );
  }

  setLocale(locale: string): void {
    const normalized = this.normalizeLocale(locale);
    this.locale.set(normalized);
    if (isPlatformBrowser(this.platformId)) {
      window.localStorage.setItem(STORAGE_KEY, normalized);
      document.documentElement.lang = normalized;
    }
  }

  t(key: string): string {
    const dictionaries = this.dictionaries();
    const locale = this.locale();
    const translated = dictionaries[locale]?.[key];
    const shouldWarnForMissingTranslation = isPlatformBrowser(this.platformId) && this.ready();

    if (
      shouldWarnForMissingTranslation &&
      translated === undefined &&
      !this.missingKeys.has(`${locale}:${key}`)
    ) {
      this.missingKeys.add(`${locale}:${key}`);
      console.warn(`[i18n] Missing translation for ${locale}:${key}`);
    }

    // Keep missing UI visible in every environment. Falling back to the other
    // language silently mixes locales and makes incomplete dictionaries harder to find.
    return translated ?? `[${key}]`;
  }

  normalizeLocale(locale: string | null | undefined): AppLocale {
    const normalized = (locale ?? DEFAULT_LOCALE).trim().toLowerCase().split('-')[0];
    return SUPPORTED_LOCALES.includes(normalized as AppLocale)
      ? (normalized as AppLocale)
      : DEFAULT_LOCALE;
  }

  private loadDictionary(locale: AppLocale) {
    return this.http
      .get<TranslationMap>(this.dictionaryUrl(locale))
      .pipe(catchError(() => of({} as TranslationMap)));
  }

  private dictionaryUrl(locale: AppLocale): string {
    const assetPath = `/assets/i18n/${locale}.json`;
    if (!isPlatformServer(this.platformId) || !this.request?.url) return assetPath;
    return new URL(assetPath, this.request.url).toString();
  }

  private readInitialLocale(): AppLocale {
    if (!isPlatformBrowser(this.platformId)) {
      return DEFAULT_LOCALE;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    const browser = window.navigator.language;
    const locale = this.normalizeLocale(stored ?? browser);
    document.documentElement.lang = locale;
    return locale;
  }
}
