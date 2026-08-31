import { attachResolvedMedia, type ResolvedMediaPayload } from '../media/media.resolver';
import {
  canonicalRelationDirected,
  canonicalRelationKey,
} from '../relation-types/relation-type.utils';
import { normalizeLocale, resolveEntityTranslation } from './entity-translation.resolver';

export type TranslationRecord = {
  locale?: string | null;
} & Record<string, unknown>;

type LocalizedEntityRecord = Parameters<typeof resolveEntityTranslation>[0] &
  Parameters<typeof attachResolvedMedia>[0];

type LocalizedDetailRecord = {
  translations?: TranslationRecord[] | null;
} & Record<string, unknown>;

export type EntityTypedDetailsRecord = {
  artwork?: LocalizedDetailRecord | null;
  artist?: LocalizedDetailRecord | null;
  concept?: LocalizedDetailRecord | null;
  period?: LocalizedDetailRecord | null;
};

type RelationRecord = {
  justification?: string | null;
  translations?: TranslationRecord[] | null;
  relationType: {
    label?: string | null;
    inverseLabel?: string | null;
    key: string;
    directed?: boolean | null;
    translations?: Array<
      TranslationRecord & { label?: string | null; inverseLabel?: string | null }
    > | null;
  };
};

type SourceRecord = {
  title?: string | null;
  author?: string | null;
  publisher?: string | null;
  translations?: TranslationRecord[] | null;
};

type SourceRefRecord = {
  quote?: string | null;
  note?: string | null;
  source?: SourceRecord | null;
  translations?: TranslationRecord[] | null;
};

export function localizedInclude(locale?: string) {
  return {
    where: {
      locale: { in: Array.from(new Set([normalizeLocale(locale), 'es', 'en'])) },
    },
  };
}

export function translationField(
  record: { translations?: TranslationRecord[] | null } | null | undefined,
  locale: string | undefined,
  field: string,
): string | null {
  const translations = Array.isArray(record?.translations) ? record.translations : [];
  const requestedLocale = normalizeLocale(locale);
  const resolved =
    translations.find((item) => item?.locale === requestedLocale) ??
    translations.find((item) => item?.locale === 'es') ??
    translations.find((item) => item?.locale === 'en') ??
    null;
  const value = resolved?.[field];

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function translationValueForLocale(
  record: { translations?: TranslationRecord[] | null } | null | undefined,
  field: string,
  locale: string,
): string | null {
  const translations = Array.isArray(record?.translations) ? record.translations : [];
  const value = translations.find((item) => item?.locale === locale)?.[field];

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function localizeDetail<T extends LocalizedDetailRecord | null | undefined>(
  detail: T,
  locale: string | undefined,
  fields: string[],
): T {
  if (!detail) return detail;

  const localized = { ...detail };
  for (const field of fields) {
    const value = translationField(detail, locale, field);
    if (value) localized[field] = value;
  }

  return localized;
}

export function localizeEntityDetails<T extends EntityTypedDetailsRecord>(
  entity: T,
  locale?: string,
): T {
  return {
    ...entity,
    artwork: localizeDetail(entity.artwork, locale, [
      'authorNation',
      'technique',
      'materials',
      'dimensions',
      'location',
      'collection',
      'state',
    ]),
    artist: localizeDetail(entity.artist, locale, [
      'country',
      'city',
      'disciplines',
      'bioShort',
      'links',
    ]),
    concept: localizeDetail(entity.concept, locale, ['definition']),
    period: localizeDetail(entity.period, locale, ['definition']),
  };
}

export function resolveLocalizedEntity<T extends LocalizedEntityRecord>(
  entity: T,
  locale?: string,
): T & { resolvedMedia: ResolvedMediaPayload } {
  return attachResolvedMedia(resolveEntityTranslation(entity, locale));
}

export function resolveLocalizedEntityWithDetails<
  T extends LocalizedEntityRecord & EntityTypedDetailsRecord,
>(entity: T, locale?: string) {
  return localizeEntityDetails(resolveLocalizedEntity(entity, locale), locale);
}

const RELATION_LABELS: Record<string, string> = {
  CREATED_BY: 'Creado por',
  BELONGS_TO_MOVEMENT: 'Pertenece al movimiento',
  BELONGS_TO_PERIOD: 'Pertenece al periodo',
  ABOUT_CONCEPT: 'Explora el concepto',
  LOCATED_IN: 'Ubicado en',
  RELATED_TO: 'Relacionado con',
  MENTIONS: 'Menciona',
  ASSOCIATED_WITH: 'Asociado con',
  INSPIRED_BY: 'Inspirado por',
  INFLUENCED_BY: 'Influenciado por',
  PART_OF: 'Forma parte de',
  DEPICTS: 'Representa',
};

export function relationLabel(type: string): string {
  return RELATION_LABELS[type] ?? type.replaceAll('_', ' ').toLowerCase();
}

export function relationDisplayLabel(
  relation: RelationRecord,
  locale?: string,
  inverse = false,
): string {
  const field = inverse ? 'inverseLabel' : 'label';
  return (
    translationField(relation.relationType, locale, field) ??
    relation.relationType?.[field] ??
    relationLabel(canonicalRelationKey(relation))
  );
}

export function publicRelationJustification(value: string | null | undefined): string | null {
  const justification = value?.trim() || null;
  if (!justification) return null;
  return /(?:\bJANO\b|lectura editorial relevante|editorial reading)/i.test(justification)
    ? null
    : justification;
}

export function serializeRelation<T extends RelationRecord>(relation: T, locale?: string) {
  const type = canonicalRelationKey(relation);
  const localized = translationField(relation, locale, 'justification');
  const spanish = translationValueForLocale(relation, 'justification', 'es');
  const english = translationValueForLocale(relation, 'justification', 'en');
  return {
    ...relation,
    type,
    relationTypeKey: type,
    relationTypeLabel: relationDisplayLabel(relation, locale),
    relationTypeInverseLabel: relationDisplayLabel(relation, locale, true),
    directed: canonicalRelationDirected(relation),
    justification: publicRelationJustification(localized ?? relation.justification),
    justificationEs: publicRelationJustification(spanish ?? relation.justification),
    justificationEn: publicRelationJustification(english),
  };
}

function serializeSource<T extends SourceRecord>(source: T | null | undefined, locale?: string) {
  if (!source) return source;

  return {
    ...source,
    title: translationField(source, locale, 'title') ?? source.title ?? null,
    author: translationField(source, locale, 'author') ?? source.author ?? null,
    publisher: translationField(source, locale, 'publisher') ?? source.publisher ?? null,
    titleEs: translationValueForLocale(source, 'title', 'es') ?? source.title ?? null,
    titleEn: translationValueForLocale(source, 'title', 'en'),
    authorEs: translationValueForLocale(source, 'author', 'es') ?? source.author ?? null,
    authorEn: translationValueForLocale(source, 'author', 'en'),
    publisherEs: translationValueForLocale(source, 'publisher', 'es') ?? source.publisher ?? null,
    publisherEn: translationValueForLocale(source, 'publisher', 'en'),
  };
}

export function serializeSourceRef<T extends SourceRefRecord>(ref: T, locale?: string) {
  return {
    ...ref,
    source: serializeSource(ref.source, locale),
    quote: translationField(ref, locale, 'quote') ?? ref.quote ?? null,
    note: translationField(ref, locale, 'note') ?? ref.note ?? null,
    quoteEs: translationValueForLocale(ref, 'quote', 'es') ?? ref.quote ?? null,
    quoteEn: translationValueForLocale(ref, 'quote', 'en'),
    noteEs: translationValueForLocale(ref, 'note', 'es') ?? ref.note ?? null,
    noteEn: translationValueForLocale(ref, 'note', 'en'),
  };
}
