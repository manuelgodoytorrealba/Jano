import {
  AdminAdditionalMediaItem,
  AdminMediaAsset,
  AdminMediaCoverageSummary,
  AdminMediaWarning,
} from '../../../core/api/admin-entities.api';
import {
  EditableAdminMediaEditor,
  EditableAdminMediaLink,
  MediaEditorSlotKey,
} from './media-admin.models';

export type ResolvedMediaSlotState = {
  item: AdminMediaAsset | null;
  source: 'explicit' | 'fallback' | 'legacy' | 'empty';
  matchedRole: string | null;
  explanation: string;
  reasonCode: string;
};

export type VisualSlot = {
  key: 'explorer3d' | 'list' | 'detail' | 'preview';
  label: string;
  description: string;
  previewUsage: 'explorer3d' | 'card' | 'detail' | 'thumbnail';
  previewClass: string;
  state: ResolvedMediaSlotState;
};

export type MediaLibraryViewId = 'coverage' | 'library' | 'add';

type MediaCoverageCard = {
  label: string;
  value: string;
  tone?: 'warning' | 'ok' | 'neutral';
};

export type AdminEntityMediaEditorPresentation = {
  activeSlotLabels: string[];
  canIngest: boolean;
  canPromote: boolean;
  canRestore: boolean;
  hasPromotedReplacement: boolean;
  replacementTargetLabel: string | null;
  replacementIngestedLabel: string | null;
  ingestedSourceLabel: string | null;
  slotWarnings: Partial<Record<MediaEditorSlotKey, string[]>>;
};

export type AdminEntityMediaLibraryViewModel = {
  mainVisualSlots: VisualSlot[];
  coverageSummaryCards: MediaCoverageCard[];
  mainUsedEditors: EditableAdminMediaEditor[];
  additionalMediaEditors: EditableAdminMediaEditor[];
  derivedEditors: EditableAdminMediaEditor[];
  unusedEditors: EditableAdminMediaEditor[];
  libraryManagedCount: number;
  mediaWarnings: string[];
  activeMediaEditor: EditableAdminMediaEditor | null;
  viewCounts: Record<MediaLibraryViewId, string>;
  editorMetaById: Record<string, AdminEntityMediaEditorPresentation>;
  sourceExternalLinkById: Record<string, EditableAdminMediaLink | null>;
  replacementIngestedLinkById: Record<string, EditableAdminMediaLink | null>;
};

export type AdminEntityMediaLibraryBuildInput = {
  mediaEditors: EditableAdminMediaEditor[];
  persistedMediaLinks: EditableAdminMediaLink[];
  resolvedVisualSlots: VisualSlot[];
  additionalMediaItems: AdminAdditionalMediaItem[];
  mediaWarningsDetailed: AdminMediaWarning[];
  mediaWarningMessages: string[];
  mediaCoverageSummary: AdminMediaCoverageSummary | null;
  activeMediaEditorId: string | null;
  mediaRoleLabel: (role: string | null | undefined) => string;
};

export function buildAdminEntityMediaLibraryViewModel(
  input: AdminEntityMediaLibraryBuildInput,
): AdminEntityMediaLibraryViewModel {
  const {
    mediaEditors,
    persistedMediaLinks,
    resolvedVisualSlots,
    additionalMediaItems,
    mediaWarningsDetailed,
    mediaWarningMessages,
    mediaCoverageSummary,
    activeMediaEditorId,
    mediaRoleLabel,
  } = input;

  const activeSlotLabelsByMediaId = new Map<string, string[]>();
  for (const slot of resolvedVisualSlots) {
    const mediaId = slot.state.item?.id;
    if (!mediaId) {
      continue;
    }

    const labels = activeSlotLabelsByMediaId.get(mediaId) ?? [];
    labels.push(slot.label);
    activeSlotLabelsByMediaId.set(mediaId, labels);
  }

  const slotWarningsByMediaId = new Map<string, Partial<Record<MediaEditorSlotKey, string[]>>>();
  for (const slot of resolvedVisualSlots) {
    const mediaId = slot.state.item?.id;
    if (!mediaId) {
      continue;
    }

    const matches = mediaWarningsDetailed
      .filter((warning) => warning.code.startsWith(`media.${slot.key}_`))
      .map((warning) => warning.message);

    if (!matches.length) {
      continue;
    }

    const record = slotWarningsByMediaId.get(mediaId) ?? {};
    record[slot.key] = matches;
    slotWarningsByMediaId.set(mediaId, record);
  }

  const sourceExternalLinkById: Record<string, EditableAdminMediaLink | null> = {};
  const replacementIngestedLinkById: Record<string, EditableAdminMediaLink | null> = {};

  const sourceExternalLink = (link: EditableAdminMediaLink): EditableAdminMediaLink | null => {
    if (link.media.originType !== 'INGESTED') {
      return null;
    }

    if (link.media.derivedFromMediaId) {
      const direct = persistedMediaLinks.find((candidate) => candidate.media.id === link.media.derivedFromMediaId);
      if (direct?.media.originType === 'EXTERNAL_URL') {
        return direct;
      }
    }

    const canonical = normalizeMediaUrl(link.media.canonicalUrl);
    if (!canonical) {
      return null;
    }

    return persistedMediaLinks.find((candidate) => {
      if (candidate.id === link.id || candidate.media.originType !== 'EXTERNAL_URL') {
        return false;
      }

      return [
        candidate.media.canonicalUrl,
        candidate.media.displayUrl,
        candidate.media.url,
      ]
        .map((value) => normalizeMediaUrl(value))
        .filter(Boolean)
        .includes(canonical);
    }) ?? null;
  };

  const hasPromotedVisualReplacement = (link: EditableAdminMediaLink): boolean => {
    const source = sourceExternalLink(link);
    if (!source || link.media.originType !== 'INGESTED') {
      return false;
    }

    return source.role === 'GALLERY'
      && (link.role !== 'GALLERY' || link.isPrimary);
  };

  const replacementIngestedLink = (link: EditableAdminMediaLink): EditableAdminMediaLink | null => {
    if (link.media.originType !== 'EXTERNAL_URL') {
      return null;
    }

    const externalCandidates = [
      link.media.canonicalUrl,
      link.media.displayUrl,
      link.media.url,
    ]
      .map((value) => normalizeMediaUrl(value))
      .filter(Boolean);

    if (!externalCandidates.length) {
      return persistedMediaLinks.find((candidate) =>
        candidate.media.originType === 'INGESTED'
        && candidate.media.derivedFromMediaId === link.media.id
        && hasPromotedVisualReplacement(candidate),
      ) ?? null;
    }

    const byDerivedFrom = persistedMediaLinks.find((candidate) =>
      candidate.media.originType === 'INGESTED'
      && candidate.media.derivedFromMediaId === link.media.id
      && hasPromotedVisualReplacement(candidate),
    );

    if (byDerivedFrom) {
      return byDerivedFrom;
    }

    return persistedMediaLinks.find((candidate) =>
      candidate.media.originType === 'INGESTED'
      && hasPromotedVisualReplacement(candidate)
      && externalCandidates.includes(normalizeMediaUrl(candidate.media.canonicalUrl)),
    ) ?? null;
  };

  const additionalIds = new Set(additionalMediaItems.map((item) => item.assignmentId));
  const mainUsedEditors = mediaEditors.filter((editor) => (activeSlotLabelsByMediaId.get(editor.persisted.media.id)?.length ?? 0) > 0);
  const additionalMediaEditors = mediaEditors.filter((editor) => additionalIds.has(editor.id));
  const mainUsedIds = new Set(mainUsedEditors.map((editor) => editor.id));
  const additionalEditorIds = new Set(additionalMediaEditors.map((editor) => editor.id));

  const derivedEditors = mediaEditors.filter((editor) => {
    if (mainUsedIds.has(editor.id) || additionalEditorIds.has(editor.id)) {
      return false;
    }

    return editor.persisted.media.originType === 'INGESTED'
      || !!editor.persisted.media.derivedFromMediaId
      || hasPromotedVisualReplacement(editor.persisted)
      || !!replacementIngestedLink(editor.persisted);
  });

  const derivedIds = new Set(derivedEditors.map((editor) => editor.id));
  const unusedEditors = mediaEditors.filter((editor) =>
    !mainUsedIds.has(editor.id)
    && !additionalEditorIds.has(editor.id)
    && !derivedIds.has(editor.id),
  );

  const editorMetaById = mediaEditors.reduce<Record<string, AdminEntityMediaEditorPresentation>>((acc, editor) => {
    const source = sourceExternalLink(editor.persisted);
    const ingestedReplacement = replacementIngestedLink(editor.persisted);
    const hasPromotedReplacement = hasPromotedVisualReplacement(editor.persisted);

    sourceExternalLinkById[editor.id] = source;
    replacementIngestedLinkById[editor.id] = ingestedReplacement;

    acc[editor.id] = {
      activeSlotLabels: activeSlotLabelsByMediaId.get(editor.persisted.media.id) ?? [],
      canIngest: editor.persisted.media.originType === 'EXTERNAL_URL',
      canPromote: editor.persisted.media.originType === 'INGESTED' && !!source,
      canRestore: editor.persisted.media.originType === 'EXTERNAL_URL' && !!ingestedReplacement,
      hasPromotedReplacement,
      replacementTargetLabel: source ? `${mediaRoleLabel(source.role)} · asset ${source.media.id}` : null,
      replacementIngestedLabel: ingestedReplacement ? `asset INGESTED ${ingestedReplacement.media.id}` : null,
      ingestedSourceLabel: editor.persisted.media.originType === 'INGESTED'
        ? editor.persisted.media.canonicalUrl || editor.persisted.media.sourcePageUrl || null
        : null,
      slotWarnings: slotWarningsByMediaId.get(editor.persisted.media.id) ?? {},
    };
    return acc;
  }, {});

  return {
    mainVisualSlots: resolvedVisualSlots,
    coverageSummaryCards: buildCoverageSummaryCards(mediaCoverageSummary),
    mainUsedEditors,
    additionalMediaEditors,
    derivedEditors,
    unusedEditors,
    libraryManagedCount: mainUsedEditors.length + additionalMediaEditors.length + derivedEditors.length + unusedEditors.length,
    mediaWarnings: mediaWarningMessages,
    activeMediaEditor: mediaEditors.find((editor) => editor.id === activeMediaEditorId) ?? mediaEditors[0] ?? null,
    viewCounts: {
      coverage: `${mediaCoverageSummary?.coveredSlots.length ?? 0}/4`,
      library: String(mainUsedEditors.length + additionalMediaEditors.length + derivedEditors.length + unusedEditors.length),
      add: mediaEditors.length ? 'Listo' : 'Vacío',
    },
    editorMetaById,
    sourceExternalLinkById,
    replacementIngestedLinkById,
  };
}

export function mediaSlotStatusLabel(
  slot: VisualSlot,
  mediaRoleLabel: (role: string | null | undefined) => string,
): string {
  switch (slot.state.source) {
    case 'explicit':
      return 'Explícito';
    case 'fallback':
      return `Fallback${slot.state.matchedRole ? ` · ${mediaRoleLabel(slot.state.matchedRole)}` : ''}`;
    case 'legacy':
      return 'Legacy';
    default:
      return 'Vacío';
  }
}

export function mediaSlotStateClass(slot: VisualSlot): string {
  switch (slot.state.source) {
    case 'explicit':
      return 'media-pill--slot-explicit';
    case 'fallback':
      return 'media-pill--slot-fallback';
    case 'legacy':
      return 'media-pill--legacy';
    default:
      return 'media-pill--slot-empty';
  }
}

export function mediaSlotResolutionLabel(slot: VisualSlot): string {
  if (slot.state.source === 'empty') {
    return 'No hay media resuelta para este contexto';
  }

  return slot.state.explanation;
}

function buildCoverageSummaryCards(
  summary: AdminMediaCoverageSummary | null,
): MediaCoverageCard[] {
  if (!summary) {
    return [];
  }

  return [
    {
      label: 'Slots cubiertos',
      value: `${summary.coveredSlots.length}/4`,
      tone: summary.emptySlots.length ? 'warning' : 'ok',
    },
    {
      label: 'Fallbacks activos',
      value: String(summary.fallbackSlots.length),
      tone: summary.fallbackSlots.length ? 'neutral' : 'ok',
    },
    {
      label: 'Assets en biblioteca',
      value: String(summary.assetCount),
      tone: 'neutral',
    },
    {
      label: 'Sin uso',
      value: String(summary.unusedAssetCount),
      tone: summary.unusedAssetCount ? 'neutral' : 'ok',
    },
  ];
}

function normalizeMediaUrl(value: string | null | undefined): string {
  return String(value ?? '').trim().replace(/\/+$/, '');
}
