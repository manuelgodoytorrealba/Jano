export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export const DEFAULT_CONTENT_LOCALE = 'es';
export const FALLBACK_CONTENT_LOCALE = 'en';

type TranslationLike =
  | {
      locale: string;
      title: string;
      shortDescription?: string | null;
      essay?: string | null;
      notes?: string | null;
      excerpt?: string | null;
    }
  | null
  | undefined;

type LegacyEntityLike = {
  title: string;
  summary?: string | null;
  content?: string | null;
  translations?: TranslationLike[] | null;
};

export type TranslationStatus = 'complete' | 'partial' | 'missing';

export function normalizeLocale(locale: string | null | undefined): string {
  const normalized = (locale ?? DEFAULT_CONTENT_LOCALE).trim().toLowerCase().split('-')[0];
  return SUPPORTED_LOCALES.includes(normalized as any) ? normalized : DEFAULT_CONTENT_LOCALE;
}

function translationStatus(translation: TranslationLike): TranslationStatus {
  if (!translation) return 'missing';

  const hasTitle = !!translation.title?.trim();
  const hasShort = !!translation.shortDescription?.trim() || !!translation.excerpt?.trim();
  const hasBody = !!translation.essay?.trim();

  if (hasTitle && hasShort && hasBody) return 'complete';
  if (hasTitle || hasShort || hasBody || !!translation.notes?.trim()) return 'partial';
  return 'missing';
}

export function resolveEntityTranslation<T extends LegacyEntityLike>(
  entity: T,
  requestedLocale?: string,
): T & {
  title: string;
  summary: string | null;
  content: string | null;
  translationMeta: {
    requestedLocale: string;
    resolvedLocale: string;
    isFallback: boolean;
    status: TranslationStatus;
    availableLocales: string[];
  };
} {
  const locale = normalizeLocale(requestedLocale);
  const translations = entity.translations ?? [];
  const requested = translations.find((item) => item?.locale === locale);
  const defaultTranslation = translations.find((item) => item?.locale === DEFAULT_CONTENT_LOCALE);
  const englishFallback = translations.find((item) => item?.locale === FALLBACK_CONTENT_LOCALE);
  const resolved = requested ?? defaultTranslation ?? englishFallback ?? null;
  const resolvedLocale = resolved?.locale ?? DEFAULT_CONTENT_LOCALE;

  return {
    ...entity,
    title: resolved?.title?.trim() || entity.title,
    summary:
      resolved?.shortDescription?.trim() || resolved?.excerpt?.trim() || (entity.summary ?? null),
    content: resolved?.essay?.trim() || (entity.content ?? null),
    translationMeta: {
      requestedLocale: locale,
      resolvedLocale,
      isFallback: resolvedLocale !== locale,
      status: translationStatus(requested),
      availableLocales: translations
        .filter(
          (item): item is NonNullable<TranslationLike> =>
            !!item && translationStatus(item) !== 'missing',
        )
        .map((item) => item.locale),
    },
  };
}

export function translationStatusSummary(
  translations: TranslationLike[] | null | undefined,
): Record<string, TranslationStatus> {
  const byLocale = new Map((translations ?? []).map((item) => [item?.locale, item] as const));
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, translationStatus(byLocale.get(locale))]),
  );
}
