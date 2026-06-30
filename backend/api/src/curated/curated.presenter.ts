import { resolveLocalizedEntityWithDetails, translationField } from '../entities/entity.presenter';
import { type ResolvedMediaPayload } from '../media/media.resolver';

type LocalizedTranslation = { locale?: string | null } & Record<string, unknown>;
type LocalizedDetail = {
  translations?: LocalizedTranslation[] | null;
} & Record<string, unknown>;

export type CuratedEntityRecord = {
  id: string;
  slug: string;
  title: string;
  type: string;
  summary: string | null;
  content: string | null;
  startYear: number | null;
  endYear: number | null;
  resolvedMedia?: ResolvedMediaPayload | null;
  mediaLinks?: Array<Record<string, unknown>> | null;
  artwork?: LocalizedDetail | null;
  artist?: LocalizedDetail | null;
  concept?: LocalizedDetail | null;
  period?: LocalizedDetail | null;
};

type DeckTranslation = {
  locale: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
};

export type CuratedDeckRecord = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  imageMedia?: {
    displayUrl?: string | null;
    url: string;
    alt?: string | null;
  } | null;
  translations?: DeckTranslation[] | null;
  items?: Array<{ entityId: string; entity?: CuratedEntityRecord | null }> | null;
  createdAt?: Date;
};

export function presentCuratedEntity(entity: CuratedEntityRecord, locale: string) {
  const localized = resolveLocalizedEntityWithDetails(entity, locale);
  return {
    id: localized.id,
    slug: localized.slug,
    title: localized.title,
    type: localized.type,
    summary: localized.summary ?? null,
    content: localized.content ?? null,
    startYear: localized.startYear ?? null,
    endYear: localized.endYear ?? null,
    resolvedMedia: localized.resolvedMedia ?? {},
    artwork: localized.artwork,
    artist: localized.artist,
    concept: localized.concept,
    period: localized.period,
  };
}

export function presentCuratedDeck(deck: CuratedDeckRecord, locale: string) {
  return {
    id: deck.id,
    slug: deck.slug,
    title: translationField(deck, locale, 'title') ?? deck.title,
    subtitle: translationField(deck, locale, 'subtitle') ?? deck.subtitle ?? null,
    description: translationField(deck, locale, 'description') ?? deck.description ?? null,
    image: deck.imageMedia
      ? {
          url: deck.imageMedia.displayUrl ?? deck.imageMedia.url,
          alt: deck.imageMedia.alt ?? deck.title,
        }
      : deck.imageUrl
        ? { url: deck.imageUrl, alt: deck.title }
        : null,
    entityCount: deck.items?.length ?? 0,
    createdAt: deck.createdAt,
  };
}
