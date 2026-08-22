import {
  mediaDisplayUrl,
  resolveEntityMediaItem,
  selectPrimaryVisualMedia,
} from '../../shared/media/media.utils';
import {
  PublicEntity,
  PublicEntityMediaAsset,
  PublicEntityRelation,
  PublicEntityRelationEndpoint,
  PublicEntityTagItem,
} from '../../core/api/entities.models';

export type DetailFact = {
  label: string;
  value: string;
};

type Translate = (key: string) => string;

type PresenterContext = {
  locale: string;
  t: Translate;
};

const HIDDEN_OUTGOING_RELATIONS = new Set([
  'CREATED_BY',
  'BELONGS_TO_MOVEMENT',
  'BELONGS_TO_PERIOD',
  'ABOUT_CONCEPT',
  'LOCATED_IN',
  'RELATED_TO',
  'MENTIONS',
]);

export function primaryMedia(
  entity: PublicEntity | null | undefined,
): PublicEntityMediaAsset | null {
  return selectPrimaryVisualMedia(entity);
}

export function detailMedia(
  entity: PublicEntity | null | undefined,
): PublicEntityMediaAsset | null {
  return resolveEntityMediaItem(entity, 'detail') ?? primaryMedia(entity);
}

export function visualUrl(entity: PublicEntity | null | undefined): string | null {
  return mediaDisplayUrl(detailMedia(entity));
}

export function visualAlt(entity: PublicEntity | null | undefined, t: Translate): string {
  return detailMedia(entity)?.alt || entity?.title || t('entity.imageAlt');
}

export function isArticle(entity: PublicEntity | null | undefined): boolean {
  return entity?.type === 'ARTICLE';
}

export function articleByline(entity: PublicEntity | null | undefined): string | null {
  const contributors = Array.isArray(entity?.contributors) ? entity.contributors : [];
  const authorish =
    contributors.find((item) =>
      ['author', 'autor', 'writer', 'editor'].includes(`${item?.role ?? ''}`.trim().toLowerCase()),
    ) ??
    contributors[0] ??
    null;

  return authorish?.name?.trim() || null;
}

export function articleDateLabel(
  entity: PublicEntity | null | undefined,
  locale: string,
): string | null {
  const value = entity?.createdAt ?? null;
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function storySectionLabel(entity: PublicEntity | null | undefined, t: Translate): string {
  return isArticle(entity) ? t('entity.article') : t('entity.essay');
}

export function detailHeroSubtitle(
  entity: PublicEntity | null | undefined,
  context: PresenterContext,
): string | null {
  const parts: string[] = [];
  const author = entity?.type === 'ARTWORK' ? firstRelated(entity, 'CREATED_BY')?.title : null;

  if (author) {
    parts.push(author);
  }

  if (entity?.startYear || entity?.endYear) {
    parts.push(
      entity.startYear && entity.endYear && entity.startYear !== entity.endYear
        ? `${entity.startYear}-${entity.endYear}`
        : `${entity.startYear ?? entity.endYear}`,
    );
  }

  if (entity?.type) {
    parts.push(entityTypeLabel(entity.type, context.t));
  }

  return parts.length ? parts.join(' · ') : null;
}

export function detailFacts(
  entity: PublicEntity | null | undefined,
  context: PresenterContext,
): DetailFact[] {
  if (entity?.type === 'ARTWORK' && entity.artwork) {
    return compactFacts([
      { label: context.t('entity.fact.technique'), value: entity.artwork.technique },
      { label: context.t('entity.fact.materials'), value: entity.artwork.materials },
      { label: context.t('entity.fact.dimensions'), value: entity.artwork.dimensions },
      { label: context.t('entity.fact.location'), value: entity.artwork.location },
      { label: context.t('entity.fact.collection'), value: entity.artwork.collection },
      { label: context.t('common.status'), value: entity.artwork.state },
      { label: context.t('entity.fact.authorNation'), value: entity.artwork.authorNation },
    ]);
  }

  if (entity?.type === 'ARTIST' && entity.artist) {
    return compactFacts([
      { label: context.t('entity.fact.country'), value: entity.artist.country },
      { label: context.t('entity.fact.city'), value: entity.artist.city },
      { label: context.t('entity.fact.birth'), value: entity.artist.birthYear },
      { label: context.t('entity.fact.death'), value: entity.artist.deathYear },
      { label: context.t('entity.fact.disciplines'), value: entity.artist.disciplines },
      { label: context.t('entity.fact.links'), value: entity.artist.links },
    ]);
  }

  if (entity?.type === 'CONCEPT' && entity.concept) {
    return compactFacts([
      { label: context.t('entity.fact.definition'), value: entity.concept.definition },
    ]);
  }

  if (entity?.type === 'PERIOD' && entity.period) {
    return compactFacts([
      { label: context.t('entity.fact.definition'), value: entity.period.definition },
    ]);
  }

  return [];
}

export function detailFactKicker(entity: PublicEntity | null | undefined, t: Translate): string {
  switch (entity?.type) {
    case 'ARTWORK':
      return t('entities.type.artworkSingular');
    case 'ARTIST':
      return t('entities.type.artistSingular');
    case 'PERSON':
      return t('search.kind.people');
    case 'ARTICLE':
      return t('entity.article');
    case 'CONCEPT':
      return t('entities.type.conceptSingular');
    case 'PERIOD':
      return t('entities.type.periodSingular');
    default:
      return t('entity.sheet');
  }
}

export function detailFactTitle(entity: PublicEntity | null | undefined, t: Translate): string {
  switch (entity?.type) {
    case 'ARTWORK':
      return t('entity.factTitle.artwork');
    case 'ARTIST':
      return t('entity.factTitle.artist');
    case 'ARTICLE':
      return t('entity.factTitle.article');
    case 'CONCEPT':
      return t('entity.factTitle.concept');
    case 'PERIOD':
      return t('entity.factTitle.period');
    default:
      return t('entity.factTitle.default');
  }
}

export function detailFactSummary(entity: PublicEntity | null | undefined): string | null {
  if (entity?.type === 'ARTICLE') {
    return joinFactSummary([articleByline(entity), entity.summary]);
  }

  if (entity?.type === 'ARTWORK' && entity.artwork) {
    return joinFactSummary([
      entity.artwork.technique,
      entity.artwork.materials,
      entity.artwork.dimensions,
      entity.artwork.location,
    ]);
  }

  if (entity?.type === 'ARTIST' && entity.artist) {
    return joinFactSummary([entity.artist.country, entity.artist.city, entity.artist.disciplines]);
  }

  return null;
}

export function outgoingByType(
  entity: PublicEntity | null | undefined,
  type: string,
): PublicEntityRelation[] {
  return (entity?.outgoing ?? []).filter((relation) => relation.type === type);
}

export function incomingByType(
  entity: PublicEntity | null | undefined,
  type: string,
): PublicEntityRelation[] {
  return (entity?.incoming ?? []).filter((relation) => relation.type === type);
}

export function relatedOutgoing(
  entity: PublicEntity | null | undefined,
  type: string,
): PublicEntityRelationEndpoint[] {
  return outgoingByType(entity, type)
    .map((relation) => relation.to)
    .filter(Boolean);
}

export function relatedIncoming(
  entity: PublicEntity | null | undefined,
  type: string,
): PublicEntityRelationEndpoint[] {
  return incomingByType(entity, type)
    .map((relation) => relation.from)
    .filter(Boolean);
}

export function firstRelated(
  entity: PublicEntity | null | undefined,
  type: string,
): PublicEntityRelationEndpoint | null {
  return relatedOutgoing(entity, type)[0] ?? null;
}

export function allConcepts(
  entity: PublicEntity | null | undefined,
): PublicEntityRelationEndpoint[] {
  return relatedOutgoing(entity, 'ABOUT_CONCEPT');
}

export function allPlaces(entity: PublicEntity | null | undefined): PublicEntityRelationEndpoint[] {
  return relatedOutgoing(entity, 'LOCATED_IN');
}

export function allRelatedArtworks(
  entity: PublicEntity | null | undefined,
): PublicEntityRelationEndpoint[] {
  const outgoing = relatedOutgoing(entity, 'RELATED_TO').filter((item) => item.type === 'ARTWORK');
  const incoming = relatedIncoming(entity, 'RELATED_TO').filter((item) => item.type === 'ARTWORK');
  const deduped = new Map<string, PublicEntityRelationEndpoint>();

  for (const item of [...outgoing, ...incoming]) {
    if (item.id) {
      deduped.set(item.id, item);
    }
  }

  return Array.from(deduped.values());
}

export function allOtherOutgoing(entity: PublicEntity | null | undefined): PublicEntityRelation[] {
  return (entity?.outgoing ?? []).filter(
    (relation) => !HIDDEN_OUTGOING_RELATIONS.has(relation.type),
  );
}

export function allMentions(entity: PublicEntity | null | undefined): PublicEntityRelation[] {
  return outgoingByType(entity, 'MENTIONS');
}

export function relationLabel(type: string, t: Translate): string {
  const labels: Record<string, string> = {
    CREATED_BY: t('relation.createdBy'),
    BELONGS_TO_MOVEMENT: t('relation.belongsToMovement'),
    BELONGS_TO_PERIOD: t('relation.belongsToPeriod'),
    ABOUT_CONCEPT: t('relation.aboutConcept'),
    LOCATED_IN: t('relation.locatedIn'),
    RELATED_TO: t('relation.relatedTo'),
    MENTIONS: t('relation.mentions'),
    ASSOCIATED_WITH: t('relation.associatedWith'),
    INSPIRED_BY: t('relation.inspiredBy'),
    INFLUENCED_BY: t('relation.influencedBy'),
    PART_OF: t('relation.partOf'),
    DEPICTS: t('relation.depicts'),
    SIMILAR_TO: t('relation.similarTo'),
    USES_TECHNIQUE: t('relation.usesTechnique'),
    USES_MATERIAL: t('relation.usesMaterial'),
    HAS_SUBJECT: t('relation.hasSubject'),
    CURATED_WITH: t('relation.curatedWith'),
  };

  return labels[type] ?? type.replaceAll('_', ' ').toLowerCase();
}

export function relationDirectionLabel(
  type: string,
  direction: 'outgoing' | 'incoming',
  t: Translate,
): string {
  if (direction === 'outgoing') {
    return relationLabel(type, t);
  }

  const incomingLabels: Record<string, string> = {
    CREATED_BY: t('relation.in.createdBy'),
    BELONGS_TO_MOVEMENT: t('relation.in.belongsToMovement'),
    BELONGS_TO_PERIOD: t('relation.in.belongsToPeriod'),
    ABOUT_CONCEPT: t('relation.in.aboutConcept'),
    LOCATED_IN: t('relation.in.locatedIn'),
    RELATED_TO: t('relation.in.relatedTo'),
    MENTIONS: t('relation.in.mentions'),
    ASSOCIATED_WITH: t('relation.in.associatedWith'),
    INSPIRED_BY: t('relation.in.inspiredBy'),
    INFLUENCED_BY: t('relation.in.influencedBy'),
    PART_OF: t('relation.in.partOf'),
    DEPICTS: t('relation.in.depicts'),
    SIMILAR_TO: t('relation.in.similarTo'),
    USES_TECHNIQUE: t('relation.in.usesTechnique'),
    USES_MATERIAL: t('relation.in.usesMaterial'),
    HAS_SUBJECT: t('relation.in.hasSubject'),
    CURATED_WITH: t('relation.in.curatedWith'),
  };

  return incomingLabels[type] ?? t('relation.in.relatedTo');
}

export function entityTags(entity: PublicEntity | null | undefined): PublicEntityTagItem[] {
  return Array.isArray(entity?.tags)
    ? entity.tags.map((item) => ('tag' in item && item.tag ? item.tag : item)).filter(Boolean)
    : [];
}

export function entityTypeLabel(type: string, t: Translate): string {
  switch (type) {
    case 'ARTWORK':
      return t('entities.type.artworkSingular');
    case 'ARTIST':
      return t('entities.type.artistSingular');
    case 'ARTICLE':
      return t('entity.article');
    case 'CONCEPT':
      return t('entities.type.conceptSingular');
    case 'PERIOD':
      return t('entities.type.periodSingular');
    case 'MOVEMENT':
      return t('entities.type.movementSingular');
    case 'PLACE':
      return t('entities.type.placeSingular');
    case 'TEXT':
      return t('entities.type.textSingular');
    default:
      return type
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
}

function compactFacts(items: Array<{ label: string; value: unknown }>): DetailFact[] {
  return items
    .map((item) => ({ label: item.label, value: toDisplayText(item.value) }))
    .filter((item) => item.value.length > 0);
}

function joinFactSummary(values: unknown[]): string | null {
  const parts = values.map(toDisplayText).filter(Boolean);

  return parts.length ? parts.join(' · ') : null;
}

function toDisplayText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(toDisplayText).filter(Boolean).join(', ');
  }

  return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint'
    ? String(value).trim()
    : '';
}
