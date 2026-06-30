import { EntityStatus } from '@prisma/client';
import type { HomeDeckRecord } from './home-deck.presenter';

export type HomeDeckWarning = {
  code:
    | 'missing_title'
    | 'missing_image'
    | 'missing_description'
    | 'missing_entities'
    | 'no_published_entities'
    | 'inactive'
    | 'unpublished_entity'
    | 'long_description';
  severity: 'info' | 'warning';
  message: string;
};

export function buildHomeDeckWarnings(deck: HomeDeckRecord): HomeDeckWarning[] {
  const warnings: HomeDeckWarning[] = [];
  if (!deck.title?.trim())
    warnings.push({ code: 'missing_title', severity: 'warning', message: 'Deck has no title.' });
  if (!deck.imageUrl && !deck.imageMediaId)
    warnings.push({
      code: 'missing_image',
      severity: 'warning',
      message: 'Deck has no main image.',
    });
  if (!deck.description?.trim())
    warnings.push({
      code: 'missing_description',
      severity: 'info',
      message: 'Deck has no description.',
    });
  if (!deck.items?.length)
    warnings.push({
      code: 'missing_entities',
      severity: 'warning',
      message: 'Deck has no selected entities.',
    });
  if (
    deck.items?.length &&
    !deck.items.some((item) => item?.entity?.status === EntityStatus.PUBLISHED)
  ) {
    warnings.push({
      code: 'no_published_entities',
      severity: 'warning',
      message: 'Deck has selected entities, but none are published for the public home.',
    });
  }
  if (!deck.isActive)
    warnings.push({
      code: 'inactive',
      severity: 'info',
      message: 'Deck is inactive and hidden from the public home.',
    });
  for (const item of deck.items ?? []) {
    if (item?.entity?.status !== EntityStatus.PUBLISHED) {
      warnings.push({
        code: 'unpublished_entity',
        severity: 'warning',
        message: `Entity "${item?.entity?.title ?? item?.entityId}" is not published.`,
      });
    }
  }
  if ((deck.description?.length ?? 0) > 260)
    warnings.push({
      code: 'long_description',
      severity: 'info',
      message: 'Deck description may be too long for the home card.',
    });
  return warnings;
}
