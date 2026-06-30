import { EntityStatus, HomeDeckSurface } from '@prisma/client';
import { resolveEntityTranslation } from '../entities/entity-translation.resolver';
import { resolveLocalizedEntity, translationField } from '../entities/entity.presenter';
import { normalizeStoredUploadUrl } from '../common/media-url.util';
import type { HomeDeckWarning } from './home-deck-warnings';

type HomeDeckTranslationRecord = {
  locale: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  ctaLabel?: string | null;
};

type HomeDeckEntityRecord = Parameters<typeof resolveEntityTranslation>[0] & {
  id: string;
  slug: string;
  title: string;
  type?: string | null;
  status?: EntityStatus | null;
} & Record<string, unknown>;

export type HomeDeckItemRecord = {
  id: string;
  entityId: string;
  sortOrder: number;
  entity: HomeDeckEntityRecord | null;
};

export type HomeDeckRecord = {
  id: string;
  slug: string;
  surface: HomeDeckSurface;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  ctaRoute?: string | null;
  imageUrl?: string | null;
  imageMediaId?: string | null;
  imageMedia?: {
    id: string;
    url: string;
    displayUrl?: string | null;
    width?: number | null;
    height?: number | null;
    alt?: string | null;
    source?: string | null;
  } | null;
  sortOrder: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  translations?: HomeDeckTranslationRecord[] | null;
  items?: Array<HomeDeckItemRecord | null> | null;
};

export function presentPublicHomeDeck(deck: HomeDeckRecord, locale?: string) {
  return {
    id: deck.id,
    isVirtual: false,
    surface: deck.surface,
    slug: deck.slug,
    title: translationField(deck, locale, 'title') ?? deck.title,
    subtitle: translationField(deck, locale, 'subtitle') ?? deck.subtitle,
    description: translationField(deck, locale, 'description') ?? deck.description,
    ctaLabel: translationField(deck, locale, 'ctaLabel') ?? deck.ctaLabel,
    ctaUrl: deck.ctaUrl,
    ctaRoute: deck.ctaRoute,
    image: presentDeckImage(deck),
    sortOrder: deck.sortOrder,
    entities: (deck.items ?? [])
      .filter((item): item is HomeDeckItemRecord => !!item)
      .map((item) => ({
        id: item.id,
        sortOrder: item.sortOrder,
        entity: item.entity ? resolveLocalizedEntity(item.entity, locale) : null,
      })),
  };
}

export function presentAdminHomeDeck(deck: HomeDeckRecord, warnings: HomeDeckWarning[]) {
  return {
    ...presentPublicHomeDeck(deck),
    translations: (deck.translations ?? [])
      .map(({ locale, title, subtitle, description, ctaLabel }) => ({
        locale,
        title,
        subtitle,
        description,
        ctaLabel,
      }))
      .sort((a, b) => a.locale.localeCompare(b.locale)),
    imageUrl: normalizeStoredUploadUrl(deck.imageUrl),
    imageMediaId: deck.imageMediaId,
    isActive: deck.isActive,
    createdAt: deck.createdAt,
    updatedAt: deck.updatedAt,
    warnings,
  };
}

function presentDeckImage(deck: HomeDeckRecord) {
  if (deck.imageMedia) {
    return {
      id: deck.imageMedia.id,
      url: normalizeStoredUploadUrl(deck.imageMedia.displayUrl ?? deck.imageMedia.url),
      width: deck.imageMedia.width ?? null,
      height: deck.imageMedia.height ?? null,
      alt: deck.imageMedia.alt ?? deck.title,
      source: deck.imageMedia.source ?? null,
    };
  }

  return deck.imageUrl
    ? {
        id: null,
        url: normalizeStoredUploadUrl(deck.imageUrl),
        width: null,
        height: null,
        alt: deck.title,
        source: null,
      }
    : null;
}
