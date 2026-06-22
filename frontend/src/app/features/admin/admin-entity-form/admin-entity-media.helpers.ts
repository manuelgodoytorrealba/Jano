import {
  AdminAdditionalMediaItem,
  AdminMediaDisplayMode,
  AdminEntityMediaPayload,
  AdminEntityResponse,
  AdminMediaAsset,
  AdminMediaAssignment,
  AdminMediaCoverageSummary,
  AdminMediaRole,
  AdminMediaWarning,
  AdminResolvedSlot,
  AdminUploadEntityMediaPayload,
} from '../../../core/api/admin-entities.api';
import {
  EditableAdminMediaEditor,
  EditableAdminMediaLink,
  MediaDraft,
  MediaEditorSlotKey,
  MediaSlotCropMap,
  UploadPreviewDimensions,
} from './media-admin.models';
import { MediaLibraryViewId, VisualSlot } from './admin-entity-media.presenter';

type ToNullableNumber = (value: unknown) => number | null;

export type AdminEntityMediaLibraryState = {
  persistedMediaLinks: EditableAdminMediaLink[];
  mediaEditors: EditableAdminMediaEditor[];
  resolvedVisualSlots: VisualSlot[];
  additionalMediaItems: AdminAdditionalMediaItem[];
  mediaWarningsDetailed: AdminMediaWarning[];
  mediaWarningMessages: string[];
  mediaCoverageSummary: AdminMediaCoverageSummary | null;
  activeMediaEditorId: string | null;
  activeMediaLibraryView: MediaLibraryViewId;
};

type BuildAdminEntityMediaLibraryStateInput = {
  entity: AdminEntityResponse;
  mediaEditors: EditableAdminMediaEditor[];
  activeMediaEditorId: string | null;
  activeMediaLibraryView: MediaLibraryViewId;
  preserveDirtyEditors?: boolean;
  clearedEditorId?: string;
  toNullableNumber: ToNullableNumber;
};

export function buildAdminEntityMediaLibraryState(
  input: BuildAdminEntityMediaLibraryStateInput,
): AdminEntityMediaLibraryState {
  const {
    entity,
    mediaEditors,
    activeMediaEditorId,
    activeMediaLibraryView,
    preserveDirtyEditors = true,
    clearedEditorId,
    toNullableNumber,
  } = input;

  const library = entity.mediaLibrary;
  const assetMap = new Map<string, AdminMediaAsset>();

  for (const asset of library?.assets ?? []) {
    assetMap.set(asset.assetId, asset);
  }

  const assignments = library?.assignments ?? legacyAssignmentsFromEntity(entity);
  const nextPersisted = assignments
    .map((assignment) =>
      normalizeMediaAssignment(assignment, assetMap.get(assignment.assetId), toNullableNumber),
    )
    .filter((assignment): assignment is EditableAdminMediaLink => !!assignment);

  const existingEditors = new Map(mediaEditors.map((editor) => [editor.id, editor]));
  const persistedMediaLinks = sortMediaLinks(nextPersisted);
  const nextMediaEditors: EditableAdminMediaEditor[] = persistedMediaLinks.map(
    (persisted): EditableAdminMediaEditor => {
      const existing = existingEditors.get(persisted.id);
      const preserveDraft =
        preserveDirtyEditors && existing?.isDirty && existing.id !== clearedEditorId;

      if (existing && preserveDraft) {
        return {
          ...existing,
          persisted,
        };
      }

      return {
        id: persisted.id,
        persisted,
        draft: cloneMediaLink(persisted, toNullableNumber),
        isDirty: false,
        saveState: clearedEditorId === persisted.id ? 'saved' : 'idle',
        errorMessage: '',
        removing: false,
        ingesting: false,
        promoting: false,
        restoring: false,
      };
    },
  );

  const nextActiveMediaEditorId =
    !activeMediaEditorId || !nextMediaEditors.some((editor) => editor.id === activeMediaEditorId)
      ? (nextMediaEditors[0]?.id ?? null)
      : activeMediaEditorId;

  const additionalMediaItems = library?.additionalMedia ?? [];
  const mediaWarningsDetailed = library?.warnings ?? [];

  return {
    persistedMediaLinks,
    mediaEditors: nextMediaEditors,
    resolvedVisualSlots: (library?.resolvedSlots ?? []).map((slot) => normalizeResolvedSlot(slot)),
    additionalMediaItems,
    mediaWarningsDetailed,
    mediaWarningMessages: mediaWarningsDetailed.map((warning) => warning.message),
    mediaCoverageSummary: library?.coverageSummary ?? null,
    activeMediaEditorId: nextActiveMediaEditorId,
    activeMediaLibraryView:
      !nextMediaEditors.length && !additionalMediaItems.length ? 'add' : activeMediaLibraryView,
  };
}

export function removeMediaFromLibraryState(
  state: AdminEntityMediaLibraryState,
  linkId: string,
): AdminEntityMediaLibraryState {
  const nextMediaEditors = state.mediaEditors.filter((candidate) => candidate.id !== linkId);
  const nextActiveMediaEditorId =
    !state.activeMediaEditorId || state.activeMediaEditorId === linkId
      ? (nextMediaEditors[0]?.id ?? null)
      : state.activeMediaEditorId;

  return {
    ...state,
    persistedMediaLinks: state.persistedMediaLinks.filter((candidate) => candidate.id !== linkId),
    mediaEditors: nextMediaEditors,
    additionalMediaItems: state.additionalMediaItems.filter((item) => item.assignmentId !== linkId),
    activeMediaEditorId: nextActiveMediaEditorId,
  };
}

export function cloneMediaLibraryState(
  state: AdminEntityMediaLibraryState,
  toNullableNumber: ToNullableNumber,
): AdminEntityMediaLibraryState {
  return {
    persistedMediaLinks: state.persistedMediaLinks.map((link) =>
      cloneMediaLink(link, toNullableNumber),
    ),
    mediaEditors: state.mediaEditors.map((editor) => ({
      ...editor,
      persisted: cloneMediaLink(editor.persisted, toNullableNumber),
      draft: cloneMediaLink(editor.draft, toNullableNumber),
    })),
    resolvedVisualSlots: state.resolvedVisualSlots.map((slot) => ({
      ...slot,
      state: {
        ...slot.state,
        item: slot.state.item ? { ...slot.state.item } : null,
      },
    })),
    additionalMediaItems: state.additionalMediaItems.map((item) => ({
      ...item,
      item: item.item ? { ...item.item } : item.item,
    })),
    mediaWarningsDetailed: state.mediaWarningsDetailed.map((warning) => ({ ...warning })),
    mediaWarningMessages: [...state.mediaWarningMessages],
    mediaCoverageSummary: state.mediaCoverageSummary
      ? {
          ...state.mediaCoverageSummary,
          coveredSlots: [...state.mediaCoverageSummary.coveredSlots],
          emptySlots: [...state.mediaCoverageSummary.emptySlots],
          fallbackSlots: [...state.mediaCoverageSummary.fallbackSlots],
          explicitSlots: [...state.mediaCoverageSummary.explicitSlots],
          legacySlots: [...state.mediaCoverageSummary.legacySlots],
        }
      : null,
    activeMediaEditorId: state.activeMediaEditorId,
    activeMediaLibraryView: state.activeMediaLibraryView,
  };
}

export function buildMediaPayload(
  source: MediaDraft,
  toNullableNumber: ToNullableNumber,
): { payload: AdminEntityMediaPayload } | { error: string } {
  const url = String(source.url ?? '').trim();
  if (!url) {
    return { error: 'La URL de media es obligatoria.' };
  }

  return {
    payload: {
      url,
      displayUrl: String(source.displayUrl ?? '').trim() || undefined,
      sourcePageUrl: String(source.sourcePageUrl ?? '').trim() || undefined,
      alt: String(source.alt ?? '').trim() || undefined,
      source: String(source.source ?? '').trim() || undefined,
      photoBy: String(source.photoBy ?? '').trim() || undefined,
      license: String(source.license ?? '').trim() || undefined,
      role: source.role as AdminMediaRole,
      sortOrder: Number(source.sortOrder ?? 0),
      isPrimary: !!source.isPrimary,
      displayMode: (source.displayMode || null) as AdminMediaDisplayMode | null,
      focalX: toNullableNumber(source.focalX),
      focalY: toNullableNumber(source.focalY),
      assetFocalX: toNullableNumber(source.assetFocalX),
      assetFocalY: toNullableNumber(source.assetFocalY),
      slotCrops: buildSlotCropPayload(source.slotCrops, toNullableNumber),
    },
  };
}

export function buildUploadPayload(
  source: MediaDraft,
  dimensions: UploadPreviewDimensions | null,
  toNullableNumber: ToNullableNumber,
): AdminUploadEntityMediaPayload {
  return {
    alt: String(source.alt ?? '').trim() || undefined,
    source: String(source.source ?? '').trim() || undefined,
    photoBy: String(source.photoBy ?? '').trim() || undefined,
    license: String(source.license ?? '').trim() || undefined,
    width: dimensions?.width,
    height: dimensions?.height,
    role: source.role as AdminMediaRole,
    sortOrder: Number(source.sortOrder ?? 0),
    isPrimary: !!source.isPrimary,
    displayMode: (source.displayMode || null) as AdminMediaDisplayMode | null,
    focalX: toNullableNumber(source.focalX),
    focalY: toNullableNumber(source.focalY),
    assetFocalX: toNullableNumber(source.assetFocalX),
    assetFocalY: toNullableNumber(source.assetFocalY),
    slotCrops: buildSlotCropPayload(source.slotCrops, toNullableNumber),
  };
}

export function buildMediaUpdatePayload(
  source: EditableAdminMediaLink,
  toNullableNumber: ToNullableNumber,
): { payload: Partial<AdminEntityMediaPayload> } | { error: string } {
  const payload: Partial<AdminEntityMediaPayload> = {
    alt: String(source.media.alt ?? '').trim() || undefined,
    source: String(source.media.source ?? '').trim() || undefined,
    photoBy: String(source.media.photoBy ?? '').trim() || undefined,
    license: String(source.media.license ?? '').trim() || undefined,
    role: source.role as AdminEntityMediaPayload['role'],
    sortOrder: Number(source.sortOrder ?? 0),
    isPrimary: !!source.isPrimary,
    displayMode: (source.displayMode || null) as AdminEntityMediaPayload['displayMode'],
    focalX: toNullableNumber(source.focalX),
    focalY: toNullableNumber(source.focalY),
    assetFocalX: toNullableNumber(source.assetFocalX),
    assetFocalY: toNullableNumber(source.assetFocalY),
    slotCrops: buildSlotCropPayload(source.slotCrops, toNullableNumber),
  };

  if (source.media.originType === 'EXTERNAL_URL') {
    const url = String(source.media.url ?? '').trim();
    if (!url) {
      return { error: 'La URL de media es obligatoria.' };
    }

    payload.url = url;
    payload.displayUrl = String(source.media.displayUrl ?? '').trim() || undefined;
    payload.sourcePageUrl = String(source.media.sourcePageUrl ?? '').trim() || undefined;
  } else if (source.media.sourcePageUrl) {
    payload.sourcePageUrl = String(source.media.sourcePageUrl ?? '').trim() || undefined;
  }

  if (source.media.originType !== 'EXTERNAL_URL') {
    delete payload.url;
    delete payload.displayUrl;
  }

  return { payload };
}

export function cloneMediaLink(
  link: EditableAdminMediaLink,
  toNullableNumber: ToNullableNumber,
): EditableAdminMediaLink {
  return {
    ...link,
    slotCrops: cloneSlotCrops(link.slotCrops, toNullableNumber),
    media: {
      ...link.media,
    },
  };
}

export function mediaLinksEqual(a: EditableAdminMediaLink, b: EditableAdminMediaLink): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function emptySlotCropMap(): MediaSlotCropMap {
  return {
    explorer3d: { x: null, y: null, zoom: null },
    list: { x: null, y: null, zoom: null },
    detail: { x: null, y: null, zoom: null },
    preview: { x: null, y: null, zoom: null },
  };
}

function sortMediaLinks(items: EditableAdminMediaLink[]) {
  return [...items].sort((a, b) => {
    const orderDiff = Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0);
    if (orderDiff !== 0) {
      return orderDiff;
    }

    return (a.id ?? '').localeCompare(b.id ?? '', 'en');
  });
}

function normalizeMediaAssignment(
  assignment: AdminMediaAssignment,
  asset: AdminMediaAsset | undefined,
  toNullableNumber: ToNullableNumber,
): EditableAdminMediaLink | null {
  if (!assignment?.assignmentId || !asset) {
    return null;
  }

  return {
    id: assignment.assignmentId,
    role: assignment.role ?? 'CARD',
    sortOrder: assignment.sortOrder ?? 0,
    isPrimary: !!assignment.isPrimary,
    displayMode: assignment.displayMode ?? '',
    focalX: assignment.focalX ?? null,
    focalY: assignment.focalY ?? null,
    assetFocalX: assignment.assetFocalX ?? asset.assetFocalX ?? asset.focalX ?? null,
    assetFocalY: assignment.assetFocalY ?? asset.assetFocalY ?? asset.focalY ?? null,
    slotCrops: normalizeSlotCrops(assignment.slotCrops, toNullableNumber),
    media: {
      id: asset.id ?? asset.assetId,
      url: asset.url ?? '',
      derivedFromMediaId: asset.derivedFromMediaId ?? null,
      canonicalUrl: asset.canonicalUrl ?? '',
      displayUrl: asset.displayUrl ?? '',
      sourcePageUrl: asset.sourcePageUrl ?? '',
      alt: asset.alt ?? '',
      source: asset.source ?? '',
      photoBy: asset.photoBy ?? '',
      license: asset.license ?? '',
      provider: asset.provider ?? null,
      qualityTier: asset.qualityTier ?? null,
      width: asset.width ?? null,
      height: asset.height ?? null,
      originType: asset.originType ?? 'EXTERNAL_URL',
      storageKey: asset.storageKey ?? null,
      originalFilename: asset.originalFilename ?? null,
      fileSize: asset.fileSize ?? null,
    },
  };
}

function legacyAssignmentsFromEntity(entity: AdminEntityResponse): AdminMediaAssignment[] {
  return (entity.mediaLinks ?? []).map((link: any) => ({
    assignmentId: link.id,
    assetId: link.media?.id,
    role: link.role ?? 'CARD',
    sortOrder: link.sortOrder ?? 0,
    isPrimary: !!link.isPrimary,
    displayMode: link.displayMode ?? null,
    focalX: link.focalX ?? null,
    focalY: link.focalY ?? null,
    assetFocalX: link.media?.focalX ?? null,
    assetFocalY: link.media?.focalY ?? null,
    slotCrops: emptySlotCropMap(),
  }));
}

function normalizeResolvedSlot(slot: AdminResolvedSlot): VisualSlot {
  const definitions: Record<VisualSlot['key'], Omit<VisualSlot, 'state'>> = {
    explorer3d: {
      key: 'explorer3d',
      label: 'Explorer 3D',
      description: 'Imagen para la vista inmersiva.',
      previewUsage: 'explorer3d',
      previewClass: 'slot-preview--explorer',
    },
    list: {
      key: 'list',
      label: 'List',
      description: 'Imagen para listas, grids y railes.',
      previewUsage: 'card',
      previewClass: 'slot-preview--card',
    },
    detail: {
      key: 'detail',
      label: 'Detail',
      description: 'Imagen principal de la entidad.',
      previewUsage: 'detail',
      previewClass: 'slot-preview--detail',
    },
    preview: {
      key: 'preview',
      label: 'Preview',
      description: 'Imagen para previews contextuales.',
      previewUsage: 'thumbnail',
      previewClass: 'slot-preview--thumbnail',
    },
  };

  return {
    ...definitions[slot.slotKey],
    state: {
      item: slot.item,
      source: slot.source,
      matchedRole: slot.matchedRole,
      explanation: slot.explanation,
      reasonCode: slot.reasonCode,
    },
  };
}

function normalizeSlotCrops(value: any, toNullableNumber: ToNullableNumber): MediaSlotCropMap {
  return {
    explorer3d: normalizeCropValue(value?.explorer3d, toNullableNumber),
    list: normalizeCropValue(value?.list, toNullableNumber),
    detail: normalizeCropValue(value?.detail, toNullableNumber),
    preview: normalizeCropValue(value?.preview, toNullableNumber),
  };
}

function normalizeCropValue(value: any, toNullableNumber: ToNullableNumber) {
  return {
    x: toNullableNumber(value?.x),
    y: toNullableNumber(value?.y),
    zoom: toNullableNumber(value?.zoom),
  };
}

function cloneSlotCrops(
  slotCrops: MediaSlotCropMap | null | undefined,
  toNullableNumber: ToNullableNumber,
): MediaSlotCropMap {
  return normalizeSlotCrops(slotCrops ?? emptySlotCropMap(), toNullableNumber);
}

function buildSlotCropPayload(
  slotCrops: MediaSlotCropMap | null | undefined,
  toNullableNumber: ToNullableNumber,
) {
  if (!slotCrops) {
    return undefined;
  }

  const keys: MediaEditorSlotKey[] = ['explorer3d', 'list', 'detail', 'preview'];
  return keys.reduce(
    (acc, key) => {
      const crop = slotCrops[key];
      const x = toNullableNumber(crop?.x);
      const y = toNullableNumber(crop?.y);
      const zoom = toNullableNumber(crop?.zoom);
      acc[key] = x === null && y === null && zoom === null ? null : { x, y, zoom };
      return acc;
    },
    {} as Record<
      MediaEditorSlotKey,
      { x: number | null; y: number | null; zoom: number | null } | null
    >,
  );
}
