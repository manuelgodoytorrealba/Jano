import { CuratedDeck } from '../../core/api/curated.api';
import { PublicEntity } from '../../core/api/entities.models';

export type RecommendedTab = 'curations' | 'articles' | 'artists' | 'artworks' | 'concepts';

export function recommendedTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ARTWORK: 'Artwork',
    ARTICLE: 'Article',
    ARTIST: 'Artist',
    MOVEMENT: 'Movement',
    PERIOD: 'Period',
    CONCEPT: 'Concept',
    PLACE: 'Place',
    TEXT: 'Text',
  };

  return labels[type] ?? type.replaceAll('_', ' ').toLowerCase();
}

export function recommendedEntityDescription(entity: PublicEntity | null): string | null {
  if (!entity) {
    return null;
  }

  if (entity.concept?.definition) {
    return entity.concept.definition;
  }

  if (entity.period?.definition) {
    return entity.period.definition;
  }

  if (entity.artist?.bioShort) {
    return entity.artist.bioShort;
  }

  return entity.content ?? entity.summary ?? null;
}

export function recommendedEntityMeta(entity: PublicEntity | null): string | null {
  if (!entity) {
    return null;
  }

  if (entity.type === 'ARTIST') {
    return (
      [entity.artist?.country, entity.startYear, entity.endYear].filter(Boolean).join(' • ') || null
    );
  }

  if (entity.type === 'ARTWORK') {
    return [entity.artwork?.location, entity.startYear].filter(Boolean).join(' • ') || null;
  }

  if (entity.type === 'MOVEMENT' || entity.type === 'PERIOD') {
    return (
      [entity.startYear, entity.endYear]
        .filter((value) => value !== null && value !== undefined)
        .join(' - ') || null
    );
  }

  return entity.summary ?? null;
}

export function recommendedTabItems(
  tab: RecommendedTab,
  groups: CuratedPageTabs | null,
): Array<CuratedDeck | PublicEntity> {
  if (!groups) {
    return [];
  }

  return groups[tab] ?? [];
}

export type CuratedPageTabs = {
  curations: CuratedDeck[];
  articles: PublicEntity[];
  artists: PublicEntity[];
  artworks: PublicEntity[];
  concepts: PublicEntity[];
};
