import { I18nService } from './i18n.service';

type TranslationLookup = Pick<I18nService, 't'>;

const ENTITY_TYPE_LABEL_KEYS: Record<string, string> = {
  ARTWORK: 'entities.type.artworkSingular',
  ARTICLE: 'entity.article',
  ARTIST: 'entities.type.artistSingular',
  MOVEMENT: 'entities.type.movementSingular',
  PERIOD: 'entities.type.periodSingular',
  CONCEPT: 'entities.type.conceptSingular',
  PLACE: 'entities.type.placeSingular',
  TEXT: 'entities.type.textSingular',
  PERSON: 'search.kind.people',
  WORK: 'search.kind.works',
  ABSTRACTION: 'search.kind.abstractions',
  EVENT: 'search.kind.events',
  ORGANIZATION: 'search.kind.organizations',
  ENTITY: 'entity.generic',
};

export function entityTypeLabel(type: string | null | undefined, i18n: TranslationLookup): string {
  const normalized = (type ?? '').trim().toUpperCase();
  return i18n.t(ENTITY_TYPE_LABEL_KEYS[normalized] ?? 'entity.generic');
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  DRAFT: 'status.draft',
  IN_REVIEW: 'status.inReview',
  PUBLISHED: 'status.published',
};

const CONTENT_LEVEL_LABEL_KEYS: Record<string, string> = {
  BASIC: 'level.basic',
  INTERMEDIATE: 'level.intermediate',
  ADVANCED: 'level.advanced',
};

export function statusLabel(status: string | null | undefined, i18n: TranslationLookup): string {
  return i18n.t(STATUS_LABEL_KEYS[(status ?? '').trim().toUpperCase()] ?? 'common.status');
}

export function contentLevelLabel(
  level: string | null | undefined,
  i18n: TranslationLookup,
): string {
  return i18n.t(CONTENT_LEVEL_LABEL_KEYS[(level ?? '').trim().toUpperCase()] ?? 'common.status');
}
