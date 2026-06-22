import {
  PublicEntityMediaAsset,
  PublicEntityPreview,
  PublicEntityRelation,
  PublicEntityRelationEndpoint,
  PublicEntityResolvedMedia,
  PublicEntityTagReference,
} from '../../../core/api/entities.models';
import { AdminLocale } from '../../../core/api/admin-entities.api';
import {
  EditableAdminMediaEditor,
  EditableAdminMediaLink,
  MediaEditorSlotKey,
} from './media-admin.models';

export type AdminEntityPreviewDirection = 'outgoing' | 'incoming';

export type AdminEntityPreviewTranslationForm = {
  title: string;
  shortDescription: string;
  essay: string;
  notes: string;
  excerpt: string;
};

export type AdminEntityPreviewLocalizedDetailsForm = {
  authorNation: string;
  technique: string;
  materials: string;
  dimensions: string;
  location: string;
  collection: string;
  state: string;
  country: string;
  city: string;
  disciplines: string;
  bioShort: string;
  links: string;
  definition: string;
};

export type AdminEntityPreviewForm = {
  type: PublicEntityPreview['type'];
  title: string;
  slug: string;
  summary: string;
  content: string;
  contentLevel: string;
  status: string;
  startYear: number | null | string;
  endYear: number | null | string;
};

export type AdminEntityPreviewSourceRef = {
  id?: string | null;
  page?: string | number | null;
  quote?: string | null;
  quoteEs?: string | null;
  quoteEn?: string | null;
  note?: string | null;
  noteEs?: string | null;
  noteEn?: string | null;
  sourceType?: string | null;
  sourceTitle?: string | null;
  sourceTitleEs?: string | null;
  sourceTitleEn?: string | null;
  sourceAuthor?: string | null;
  sourceAuthorEs?: string | null;
  sourceAuthorEn?: string | null;
  sourcePublisher?: string | null;
  sourcePublisherEs?: string | null;
  sourcePublisherEn?: string | null;
  sourceYear?: string | number | null;
};

export type AdminEntityPreviewRelationEndpoint = {
  id?: string | null;
  slug?: string | null;
  title?: string | null;
  type?: string | null;
};

export type AdminEntityPreviewRelation = {
  id?: string | null;
  type?: string | null;
  relationType?: { id?: string | null; key?: string | null; label?: string | null } | null;
  relationTypeId?: string | null;
  relationTypeKey?: string | null;
  relationTypeLabel?: string | null;
  justification?: string | null;
  justificationEs?: string | null;
  justificationEn?: string | null;
  weight?: number | null;
  from?: AdminEntityPreviewRelationEndpoint | null;
  to?: AdminEntityPreviewRelationEndpoint | null;
};

export type AdminEntityPreviewResolvedSlot = {
  key: MediaEditorSlotKey;
  state: {
    item?: { id?: string | null } | null;
    source: string;
    matchedRole?: string | null;
  };
};

export type AdminEntityPreviewConnection = {
  label: string;
  value: string;
};

export type AdminEntityPreviewBuildInput = {
  entityId: string;
  locale: AdminLocale;
  form: AdminEntityPreviewForm;
  translations: Record<AdminLocale, AdminEntityPreviewTranslationForm>;
  details: Record<string, unknown>;
  localizedDetails: Record<AdminLocale, AdminEntityPreviewLocalizedDetailsForm>;
  entityTags: PublicEntityTagReference[];
  relations: AdminEntityPreviewRelation[];
  incomingRelations: AdminEntityPreviewRelation[];
  sourceRefs: AdminEntityPreviewSourceRef[];
  contributors: Array<Record<string, unknown>>;
  mediaEditors: EditableAdminMediaEditor[];
  persistedResolvedMedia: Record<string, unknown> | null;
  resolvedVisualSlots: AdminEntityPreviewResolvedSlot[];
  toNullableNumber: (value: unknown) => number | null;
};

export function buildAdminEntityPreviewModel(
  input: AdminEntityPreviewBuildInput,
): PublicEntityPreview {
  const translation = input.translations[input.locale];
  const localizedDetails =
    input.locale === 'es'
      ? (input.details as AdminEntityPreviewLocalizedDetailsForm)
      : input.localizedDetails[input.locale];

  return {
    id: input.entityId || 'draft-preview',
    type: input.form.type,
    title: (translation.title || input.form.title || 'Titulo de la entity').trim(),
    slug: input.form.slug || 'preview',
    summary:
      (translation.shortDescription || translation.excerpt || input.form.summary || '').trim() ||
      null,
    content: (translation.essay || input.form.content || '').trim() || null,
    contentLevel: input.form.contentLevel || null,
    status: input.form.status,
    startYear: input.toNullableNumber(input.form.startYear),
    endYear: input.toNullableNumber(input.form.endYear),
    createdAt: new Date().toISOString(),
    mediaLinks: input.mediaEditors
      .map((editor) => mediaLinkToPreview(editor.draft, input.toNullableNumber))
      .filter((link): link is NonNullable<typeof link> => !!link),
    resolvedMedia: buildPreviewResolvedMedia(input),
    tags: input.entityTags,
    outgoing: input.relations.map((rel) => previewRelation(rel, 'outgoing', input)),
    incoming: input.incomingRelations.map((rel) => previewRelation(rel, 'incoming', input)),
    sourceRefs: input.sourceRefs.map((ref) => ({
      id: ref.id ?? `${ref.sourceTitle}-${ref.page ?? ''}`,
      page: ref.page ?? null,
      quote: (input.locale === 'en' ? ref.quoteEn : ref.quoteEs) ?? ref.quote ?? null,
      note: (input.locale === 'en' ? ref.noteEn : ref.noteEs) ?? ref.note ?? null,
      source: {
        type: ref.sourceType ?? 'SOURCE',
        title:
          (input.locale === 'en' ? ref.sourceTitleEn : ref.sourceTitleEs) ??
          ref.sourceTitle ??
          'Fuente editorial',
        author:
          (input.locale === 'en' ? ref.sourceAuthorEn : ref.sourceAuthorEs) ??
          ref.sourceAuthor ??
          null,
        publisher:
          (input.locale === 'en' ? ref.sourcePublisherEn : ref.sourcePublisherEs) ??
          ref.sourcePublisher ??
          null,
        year: ref.sourceYear ?? null,
      },
    })),
    contributors: input.contributors,
    artwork:
      input.form.type === 'ARTWORK'
        ? {
            technique: localizedDetails.technique || null,
            materials: localizedDetails.materials || null,
            dimensions: localizedDetails.dimensions || null,
            location: localizedDetails.location || null,
            collection: localizedDetails.collection || null,
            state: localizedDetails.state || null,
            authorNation: localizedDetails.authorNation || null,
          }
        : null,
    artist:
      input.form.type === 'ARTIST'
        ? {
            country: localizedDetails.country || null,
            city: localizedDetails.city || null,
            birthYear: numberOrNull(input.details['birthYear']),
            deathYear: numberOrNull(input.details['deathYear']),
            disciplines: localizedDetails.disciplines || null,
            links: localizedDetails.links || null,
            bioShort: localizedDetails.bioShort || null,
          }
        : null,
    concept:
      input.form.type === 'CONCEPT'
        ? {
            definition: localizedDetails.definition || null,
          }
        : null,
    period:
      input.form.type === 'PERIOD'
        ? {
            definition: localizedDetails.definition || null,
          }
        : null,
  };
}

export function buildAdminEntityPreviewStateKey(input: AdminEntityPreviewBuildInput): string {
  return JSON.stringify({
    id: input.entityId || 'draft-preview',
    locale: input.locale,
    form: input.form,
    translations: input.translations,
    details: input.details,
    localizedDetails: input.localizedDetails,
    tags: input.entityTags.map((tag) => ({
      id: tag?.id ?? tag?.tag?.id ?? null,
      label: tag?.label ?? tag?.tag?.label ?? null,
      slug: tag?.slug ?? tag?.tag?.slug ?? null,
    })),
    media: input.mediaEditors.map((editor) => ({
      id: editor.id,
      isDirty: editor.isDirty,
      draft: editor.draft,
    })),
    resolvedSlots: input.resolvedVisualSlots.map((slot) => ({
      key: slot.key,
      itemId: slot.state.item?.id ?? null,
      source: slot.state.source,
      matchedRole: slot.state.matchedRole ?? null,
    })),
    sourceRefs: input.sourceRefs,
    contributors: input.contributors,
    outgoing: input.relations.map((rel) => ({
      id: rel.id ?? null,
      type: rel.type ?? null,
      relationTypeId: rel.relationTypeId ?? rel.relationType?.id ?? null,
      relationTypeKey: rel.relationTypeKey ?? rel.relationType?.key ?? null,
      toId: rel.to?.id ?? null,
      justification: rel.justification ?? null,
      weight: rel.weight ?? null,
    })),
    incoming: input.incomingRelations.map((rel) => ({
      id: rel.id ?? null,
      type: rel.type ?? null,
      relationTypeId: rel.relationTypeId ?? rel.relationType?.id ?? null,
      relationTypeKey: rel.relationTypeKey ?? rel.relationType?.key ?? null,
      fromId: rel.from?.id ?? null,
      justification: rel.justification ?? null,
      weight: rel.weight ?? null,
    })),
  });
}

export function buildAdminPreviewKeyConnections(
  relations: AdminEntityPreviewRelation[],
  incomingRelations: AdminEntityPreviewRelation[],
): AdminEntityPreviewConnection[] {
  const groups: AdminEntityPreviewConnection[] = [];
  const first = (type: string) => relations.find((rel) => rel.type === type);
  const collectTargets = (type: string) =>
    relations.map((rel) => (rel.type === type ? rel.to?.title : null)).filter(isNonEmptyString);

  const author = first('CREATED_BY')?.to?.title;
  if (isNonEmptyString(author)) {
    groups.push({ label: 'Autor', value: author });
  }

  const movement = first('BELONGS_TO_MOVEMENT')?.to?.title;
  if (isNonEmptyString(movement)) {
    groups.push({ label: 'Movimiento', value: movement });
  }

  const period = first('BELONGS_TO_PERIOD')?.to?.title;
  if (isNonEmptyString(period)) {
    groups.push({ label: 'Periodo', value: period });
  }

  const concepts = collectTargets('ABOUT_CONCEPT');
  if (concepts.length) {
    groups.push({ label: 'Conceptos', value: concepts.join(' · ') });
  }

  const places = collectTargets('LOCATED_IN');
  if (places.length) {
    groups.push({ label: 'Ubicacion', value: places.join(' · ') });
  }

  const relatedArtworks = [
    ...relations
      .map((rel) =>
        rel.type === 'RELATED_TO' && rel.to?.type === 'ARTWORK' ? rel.to?.title : null,
      )
      .filter(isNonEmptyString),
    ...incomingRelations
      .map((rel) =>
        rel.type === 'RELATED_TO' && rel.from?.type === 'ARTWORK' ? rel.from?.title : null,
      )
      .filter(isNonEmptyString),
  ];

  if (relatedArtworks.length) {
    groups.push({
      label: 'Obras relacionadas',
      value: Array.from(new Set(relatedArtworks)).join(' · '),
    });
  }

  return groups;
}

function buildPreviewResolvedMedia(
  input: AdminEntityPreviewBuildInput,
): PublicEntityResolvedMedia | null {
  const resolved: PublicEntityResolvedMedia = input.persistedResolvedMedia
    ? {
        ...input.persistedResolvedMedia,
        gallery: Array.isArray(input.persistedResolvedMedia['gallery'])
          ? [...(input.persistedResolvedMedia['gallery'] as PublicEntityMediaAsset[])]
          : (input.persistedResolvedMedia['gallery'] as PublicEntityMediaAsset[] | undefined),
      }
    : {};

  const slotMap: Array<{
    usage: 'hero' | 'card' | 'detail' | 'thumbnail' | 'explorer3d';
    slotKey: MediaEditorSlotKey;
  }> = [
    { usage: 'hero', slotKey: 'detail' },
    { usage: 'explorer3d', slotKey: 'explorer3d' },
    { usage: 'card', slotKey: 'list' },
    { usage: 'detail', slotKey: 'detail' },
    { usage: 'thumbnail', slotKey: 'preview' },
  ];

  for (const slot of slotMap) {
    const link = previewLinkForUsage(input, slot.usage);
    if (link) {
      resolved[slot.usage] = mediaLinkToResolvedPreview(link, slot.slotKey, input.toNullableNumber);
    } else if (slot.usage in resolved) {
      delete resolved[slot.usage];
    }
  }

  const primary =
    previewLinkForUsage(input, 'hero') ??
    previewLinkForUsage(input, 'detail') ??
    previewLinkForUsage(input, 'card') ??
    previewLinkForUsage(input, 'thumbnail') ??
    previewLinkForUsage(input, 'explorer3d');

  if (primary) {
    resolved['primary'] = mediaLinkToResolvedPreview(primary, 'detail', input.toNullableNumber);
  } else if ('primary' in resolved) {
    delete resolved['primary'];
  }

  const draftGallery: PublicEntityMediaAsset[] = input.mediaEditors
    .map((editor) => editor.draft)
    .filter((link) => link.role === 'GALLERY')
    .map((link) => mediaLinkToResolvedPreview(link, 'detail', input.toNullableNumber))
    .filter((item): item is PublicEntityMediaAsset => !!item);

  if (draftGallery.length) {
    resolved['gallery'] = draftGallery;
  } else if ('gallery' in resolved) {
    delete resolved['gallery'];
  }

  return Object.keys(resolved).length ? resolved : null;
}

function previewLinkForUsage(
  input: AdminEntityPreviewBuildInput,
  usage: 'hero' | 'card' | 'detail' | 'thumbnail' | 'explorer3d',
): EditableAdminMediaLink | null {
  const exactRoleByUsage: Record<typeof usage, string> = {
    hero: 'HERO',
    explorer3d: 'EXPLORER_3D',
    card: 'CARD',
    detail: 'DETAIL',
    thumbnail: 'THUMBNAIL',
  };

  const exact = input.mediaEditors
    .map((editor) => editor.draft)
    .filter((link) => link.role === exactRoleByUsage[usage])
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))[0];

  if (exact) {
    return exact;
  }

  const resolvedItemId =
    usage === 'hero'
      ? (mediaItemId(input.persistedResolvedMedia, 'hero') ??
        mediaItemId(input.persistedResolvedMedia, 'detail'))
      : (input.resolvedVisualSlots.find(
          (slot) =>
            slot.key ===
            (
              {
                explorer3d: 'explorer3d',
                card: 'list',
                detail: 'detail',
                thumbnail: 'preview',
              } as const
            )[usage],
        )?.state.item?.id ?? null);

  if (resolvedItemId) {
    const byResolvedAsset = input.mediaEditors
      .map((editor) => editor.draft)
      .find((link) => link.media.id === resolvedItemId);

    if (byResolvedAsset) {
      return byResolvedAsset;
    }
  }

  return (
    input.mediaEditors.map((editor) => editor.draft).find((link) => link.isPrimary) ??
    input.mediaEditors[0]?.draft ??
    null
  );
}

function mediaLinkToPreview(
  link: EditableAdminMediaLink | null | undefined,
  toNullableNumber: (value: unknown) => number | null,
) {
  if (!link?.media) {
    return null;
  }

  return {
    id: link.id,
    role: link.role,
    sortOrder: toNullableNumber(link.sortOrder) ?? 0,
    isPrimary: !!link.isPrimary,
    displayMode: link.displayMode || null,
    focalX: toNullableNumber(link.focalX),
    focalY: toNullableNumber(link.focalY),
    media: {
      ...link.media,
      displayMode: link.displayMode || null,
      focalX: toNullableNumber(link.assetFocalX ?? link.media.assetFocalX ?? link.media.focalX),
      focalY: toNullableNumber(link.assetFocalY ?? link.media.assetFocalY ?? link.media.focalY),
    },
  };
}

function mediaLinkToResolvedPreview(
  link: EditableAdminMediaLink,
  slotKey: MediaEditorSlotKey,
  toNullableNumber: (value: unknown) => number | null,
): PublicEntityMediaAsset | null {
  const crop = link.slotCrops?.[slotKey];

  return {
    ...link.media,
    role: link.role,
    sortOrder: toNullableNumber(link.sortOrder) ?? 0,
    isPrimary: !!link.isPrimary,
    displayMode: link.displayMode || null,
    focalX: toNullableNumber(
      link.focalX ?? link.assetFocalX ?? link.media.assetFocalX ?? link.media.focalX,
    ),
    focalY: toNullableNumber(
      link.focalY ?? link.assetFocalY ?? link.media.assetFocalY ?? link.media.focalY,
    ),
    cropX: toNullableNumber(crop?.x),
    cropY: toNullableNumber(crop?.y),
    cropZoom: toNullableNumber(crop?.zoom),
  };
}

function previewRelation(
  rel: AdminEntityPreviewRelation,
  direction: AdminEntityPreviewDirection,
  input: AdminEntityPreviewBuildInput,
): PublicEntityRelation {
  const endpoint = direction === 'outgoing' ? rel.to : rel.from;
  const fallbackEndpoint: PublicEntityRelationEndpoint = {
    id: `${rel.id ?? direction}-draft-endpoint`,
    slug: endpoint?.slug ?? 'preview',
    title: endpoint?.title ?? 'Entity relacionada',
    type: endpoint?.type ?? 'ENTITY',
  };

  return {
    ...rel,
    id: rel.id ?? `${direction}-${rel.type ?? 'relation'}`,
    type: rel.type ?? 'RELATED_TO',
    relationType: rel.relationType ?? null,
    relationTypeKey: rel.relationTypeKey ?? rel.relationType?.key ?? rel.type ?? 'RELATED_TO',
    relationTypeLabel: rel.relationTypeLabel ?? rel.relationType?.label ?? rel.type ?? 'RELATED_TO',
    justification:
      (input.locale === 'en' ? rel.justificationEn : rel.justificationEs) ??
      rel.justification ??
      null,
    weight: rel.weight ?? null,
    from:
      direction === 'incoming'
        ? fallbackEndpoint
        : toRelationEndpoint(rel.from, {
            id: input.entityId || 'draft-preview',
            slug: input.form.slug || 'preview',
            title: input.form.title || 'Titulo de la entity',
            type: input.form.type,
          }),
    to:
      direction === 'outgoing'
        ? fallbackEndpoint
        : toRelationEndpoint(rel.to, {
            id: input.entityId || 'draft-preview',
            slug: input.form.slug || 'preview',
            title: input.form.title || 'Titulo de la entity',
            type: input.form.type,
          }),
  };
}

function toRelationEndpoint(
  endpoint: AdminEntityPreviewRelationEndpoint | null | undefined,
  fallback: PublicEntityRelationEndpoint,
): PublicEntityRelationEndpoint {
  return {
    id: endpoint?.id ?? fallback.id,
    slug: endpoint?.slug ?? fallback.slug,
    title: endpoint?.title ?? fallback.title,
    type: endpoint?.type ?? fallback.type,
  };
}

function mediaItemId(source: Record<string, unknown> | null, key: string): string | null {
  const item = source?.[key];
  if (!item || typeof item !== 'object' || !('id' in item)) {
    return null;
  }

  const id = (item as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
