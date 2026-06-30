import {
  type CropPresetLike,
  type EntityWithMediaLinks,
  type NormalizedMediaLink,
  type ResolvedMediaItem,
  firstByRole,
  normalizeFocal,
  normalizeMediaLinks,
  selectLegacyPrimary,
  toResolvedMediaItem,
} from './media.resolver';

export type AdminResolvedSlotKey = 'explorer3d' | 'list' | 'detail' | 'preview';
export type AdminResolvedSlotSource = 'explicit' | 'fallback' | 'legacy' | 'empty';

export type AdminMediaAsset = ResolvedMediaItem & { assetId: string };

export type AdminMediaAssignment = {
  assignmentId: string;
  assetId: string;
  role: string | null;
  sortOrder: number;
  isPrimary: boolean;
  displayMode: 'COVER' | 'CONTAIN' | null;
  focalX: number | null;
  focalY: number | null;
  assetFocalX: number | null;
  assetFocalY: number | null;
  slotCrops: Partial<Record<AdminResolvedSlotKey, CropPresetLike | null>>;
};

export type AdminResolvedSlot = {
  slotKey: AdminResolvedSlotKey;
  source: AdminResolvedSlotSource;
  matchedRole: string | null;
  item: ResolvedMediaItem | null;
  explanation: string;
  reasonCode: string;
};

export type AdminAdditionalMediaItem = {
  assignmentId: string;
  assetId: string;
  role: string | null;
  sortOrder: number;
  item: ResolvedMediaItem;
};

export type AdminMediaWarning = { code: string; severity: 'warning'; message: string };

export type AdminMediaCoverageSummary = {
  coveredSlots: string[];
  emptySlots: string[];
  fallbackSlots: string[];
  explicitSlots: string[];
  legacySlots: string[];
  assetCount: number;
  assignmentCount: number;
  unusedAssetCount: number;
};

export type AdminMediaLibraryPayload = {
  assets: AdminMediaAsset[];
  assignments: AdminMediaAssignment[];
  resolvedSlots: AdminResolvedSlot[];
  additionalMedia: AdminAdditionalMediaItem[];
  warnings: AdminMediaWarning[];
  coverageSummary: AdminMediaCoverageSummary;
};

const SLOT_ORDER: AdminResolvedSlotKey[] = ['explorer3d', 'list', 'detail', 'preview'];
const SLOT_LABELS: Record<AdminResolvedSlotKey, string> = {
  explorer3d: 'Explorer 3D',
  list: 'List',
  detail: 'Detail',
  preview: 'Preview',
};
const ROLE_LABELS: Record<string, string> = {
  PRIMARY_LEGACY: 'legacy',
  HERO: 'Hero',
  CARD: 'List',
  DETAIL: 'Detail',
  THUMBNAIL: 'Preview',
  EXPLORER_3D: 'Explorer 3D',
  GALLERY: 'Additional Media',
};

export function buildAdminMediaLibrary(
  entity: EntityWithMediaLinks | null | undefined,
): AdminMediaLibraryPayload {
  const links = normalizeMediaLinks(entity);
  const assignments = links.map((link) => ({
    assignmentId: link.id ?? '',
    assetId: link.media.id,
    role: link.role,
    sortOrder: link.sortOrder,
    isPrimary: link.isPrimary,
    displayMode: link.displayMode,
    focalX: link.focalX,
    focalY: link.focalY,
    assetFocalX: normalizeFocal(link.media.focalX),
    assetFocalY: normalizeFocal(link.media.focalY),
    slotCrops: {
      explorer3d: link.cropExplorer3d,
      list: link.cropList,
      detail: link.cropDetail,
      preview: link.cropPreview,
    },
  }));
  const assets = Array.from(
    links
      .reduce((map, link) => {
        if (!map.has(link.media.id)) {
          map.set(link.media.id, { assetId: link.media.id, ...toResolvedMediaItem(link) });
        }
        return map;
      }, new Map<string, AdminMediaAsset>())
      .values(),
  );
  const resolvedSlots = SLOT_ORDER.map((slotKey) => resolveAdminSlot(links, slotKey));
  const additionalMedia = links
    .filter((link) => link.role === 'GALLERY')
    .map((link) => ({
      assignmentId: link.id ?? '',
      assetId: link.media.id,
      role: link.role,
      sortOrder: link.sortOrder,
      item: toResolvedMediaItem(link, 'detail'),
    }));

  return {
    assets,
    assignments,
    resolvedSlots,
    additionalMedia,
    warnings: buildWarnings(assignments, assets, resolvedSlots, additionalMedia),
    coverageSummary: buildCoverage(assignments, assets.length, resolvedSlots, additionalMedia),
  };
}

function resolveAdminSlot(
  links: NormalizedMediaLink[],
  slotKey: AdminResolvedSlotKey,
): AdminResolvedSlot {
  const explicit = selectExplicitSlot(links, slotKey);
  if (explicit) {
    return {
      slotKey,
      source: 'explicit',
      matchedRole: explicit.role,
      item: toResolvedMediaItem(explicit, slotKey),
      explanation: slotExplanation(slotKey, 'explicit', explicit.role),
      reasonCode: `explicit_${String(explicit.role ?? '').toLowerCase() || 'assignment'}`,
    };
  }

  const legacy = selectLegacyPrimary(links);
  if (legacy) {
    return {
      slotKey,
      source: 'legacy',
      matchedRole: legacy.role,
      item: toResolvedMediaItem(legacy, slotKey),
      explanation: slotExplanation(slotKey, 'legacy', legacy.role),
      reasonCode: 'legacy_primary_fallback',
    };
  }

  return {
    slotKey,
    source: 'empty',
    matchedRole: null,
    item: null,
    explanation: slotExplanation(slotKey, 'empty', null),
    reasonCode: 'empty',
  };
}

function selectExplicitSlot(
  links: NormalizedMediaLink[],
  slotKey: AdminResolvedSlotKey,
): NormalizedMediaLink | null {
  switch (slotKey) {
    case 'explorer3d':
      return firstByRole(links, 'EXPLORER_3D');
    case 'list':
      return firstByRole(links, 'CARD');
    case 'detail':
      return firstByRole(links, 'DETAIL') ?? firstByRole(links, 'HERO');
    case 'preview':
      return firstByRole(links, 'THUMBNAIL');
  }
}

function slotExplanation(
  slotKey: AdminResolvedSlotKey,
  source: AdminResolvedSlotSource,
  role: string | null,
): string {
  const slot = SLOT_LABELS[slotKey];
  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : null;

  if (source === 'empty') {
    if (slotKey === 'explorer3d') {
      return 'Explorer 3D no tiene imagen específica ni fallback legacy activo.';
    }
    return `No hay imagen específica para ${slot}.`;
  }
  if (source === 'legacy') {
    return `${slot} depende todavía de fallback legacy${roleLabel ? ` desde ${roleLabel}` : ''}.`;
  }
  if (source === 'explicit') {
    if (slotKey === 'detail' && role === 'HERO') {
      return 'Detail usa una asignación HERO existente como imagen principal.';
    }
    return `${slot} tiene asignación específica${roleLabel ? ` desde ${roleLabel}` : ''}.`;
  }
  return `${slot} usa fallback${roleLabel ? ` desde ${roleLabel}` : ''}.`;
}

function buildWarnings(
  assignments: AdminMediaAssignment[],
  assets: AdminMediaAsset[],
  slots: AdminResolvedSlot[],
  additionalMedia: AdminAdditionalMediaItem[],
): AdminMediaWarning[] {
  if (!assignments.length) {
    return [warning('media.none', 'Esta entity no tiene media asociada todavía.')];
  }

  const warnings: AdminMediaWarning[] = [];
  const primaryCount = assignments.filter((assignment) => assignment.isPrimary).length;
  if (primaryCount > 1) {
    warnings.push(
      warning(
        'media.multiple_primary',
        `Hay ${primaryCount} medias marcadas como fallback legacy. Conviene dejar solo una.`,
      ),
    );
  }

  for (const slot of slots) {
    if (slot.source === 'empty') {
      warnings.push(warning(`media.${slot.slotKey}_empty`, slot.explanation));
      continue;
    }
    if (slot.source === 'legacy') {
      const role = slot.matchedRole ? (ROLE_LABELS[slot.matchedRole] ?? slot.matchedRole) : null;
      warnings.push(
        warning(
          `media.${slot.slotKey}_legacy`,
          `${SLOT_LABELS[slot.slotKey]} depende de fallback legacy${role ? ` desde ${role}` : ''}.`,
        ),
      );
      continue;
    }
    if (slot.source === 'fallback') {
      warnings.push(warning(`media.${slot.slotKey}_fallback`, slot.explanation));
    }

    const qualityWarning = slotQualityWarning(slot);
    if (qualityWarning) warnings.push(qualityWarning);
  }

  const gallery = assignments.filter((assignment) => assignment.role === 'GALLERY');
  if (
    gallery.length > 1 &&
    new Set(gallery.map((assignment) => Number(assignment.sortOrder ?? 0))).size !== gallery.length
  ) {
    warnings.push(
      warning(
        'media.additional_sort_ambiguous',
        'Additional Media tiene varios assets con el mismo sortOrder. Conviene ordenar mejor el material secundario.',
      ),
    );
  }

  const missingAltCount = assets.filter((asset) => !String(asset.alt ?? '').trim()).length;
  if (missingAltCount) {
    warnings.push(
      warning(
        'media.alt_missing',
        `Hay ${missingAltCount} media assets sin alt. Conviene completar texto alternativo para mantener calidad editorial.`,
      ),
    );
  }

  const activeIds = new Set([
    ...slots.map((slot) => slot.item?.id).filter((id): id is string => !!id),
    ...additionalMedia.map((item) => item.item.id),
  ]);
  const unusedCount = assignments.filter((assignment) => !activeIds.has(assignment.assetId)).length;
  if (unusedCount) {
    warnings.push(
      warning(
        'media.unused_assets',
        `Hay ${unusedCount} assets sin uso ni en slots principales ni en Additional Media.`,
      ),
    );
  }

  return warnings;
}

function slotQualityWarning(slot: AdminResolvedSlot): AdminMediaWarning | null {
  const item = slot.item;
  if (!item) return null;

  const minimum = slotMinimumSize(slot.slotKey);
  if ((item.width ?? 0) < minimum.width || (item.height ?? 0) < minimum.height) {
    return warning(
      `media.${slot.slotKey}_low_resolution`,
      `${SLOT_LABELS[slot.slotKey]} tiene resolución justa para producto. Recomendado mínimo ${minimum.width}×${minimum.height}.`,
    );
  }

  const ratio = item.width && item.height ? item.width / item.height : null;
  if (ratio !== null && !slotRatioLooksHealthy(slot.slotKey, ratio)) {
    return warning(
      `media.${slot.slotKey}_ratio_warning`,
      `${SLOT_LABELS[slot.slotKey]} usa una imagen con ratio poco ideal para este contexto.`,
    );
  }
  if ((item.fileSize ?? 0) > 3 * 1024 * 1024) {
    return warning(
      `media.${slot.slotKey}_heavy`,
      `${SLOT_LABELS[slot.slotKey]} usa un asset pesado. Conviene optimizarlo para edición y producto.`,
    );
  }
  if ((item.cropZoom ?? 1) >= 2.35) {
    return warning(
      `media.${slot.slotKey}_crop_extreme`,
      `${SLOT_LABELS[slot.slotKey]} tiene un crop muy cerrado. Revisa que no pierda legibilidad visual.`,
    );
  }

  const focalX = normalizeFocal(item.focalX);
  const focalY = normalizeFocal(item.focalY);
  if (
    focalX !== null &&
    focalY !== null &&
    (focalX < 8 || focalX > 92 || focalY < 8 || focalY > 92)
  ) {
    return warning(
      `media.${slot.slotKey}_focal_edge`,
      `${SLOT_LABELS[slot.slotKey]} usa un foco muy extremo. Comprueba que el sujeto siga entrando bien en el marco.`,
    );
  }
  return null;
}

function warning(code: string, message: string): AdminMediaWarning {
  return { code, severity: 'warning', message };
}

function slotMinimumSize(slot: AdminResolvedSlotKey): { width: number; height: number } {
  switch (slot) {
    case 'explorer3d':
      return { width: 1024, height: 1024 };
    case 'list':
      return { width: 800, height: 800 };
    case 'detail':
      return { width: 1400, height: 1000 };
    case 'preview':
      return { width: 400, height: 400 };
  }
}

function slotRatioLooksHealthy(slot: AdminResolvedSlotKey, ratio: number): boolean {
  switch (slot) {
    case 'explorer3d':
    case 'preview':
      return ratio >= 0.8 && ratio <= 1.25;
    case 'list':
      return ratio >= 0.75 && ratio <= 1.15;
    case 'detail':
      return ratio >= 0.9 && ratio <= 1.9;
  }
}

function buildCoverage(
  assignments: AdminMediaAssignment[],
  assetCount: number,
  slots: AdminResolvedSlot[],
  additionalMedia: AdminAdditionalMediaItem[],
): AdminMediaCoverageSummary {
  const slotKeys = (source: AdminResolvedSlotSource) =>
    slots.filter((slot) => slot.source === source).map((slot) => slot.slotKey);
  const activeIds = new Set(
    [...slots.map((slot) => slot.item?.id), ...additionalMedia.map((item) => item.item.id)].filter(
      (id): id is string => !!id,
    ),
  );

  return {
    coveredSlots: slots.filter((slot) => slot.source !== 'empty').map((slot) => slot.slotKey),
    emptySlots: slotKeys('empty'),
    fallbackSlots: slotKeys('fallback'),
    explicitSlots: slotKeys('explicit'),
    legacySlots: slotKeys('legacy'),
    assetCount,
    assignmentCount: assignments.length,
    unusedAssetCount: assignments.filter((assignment) => !activeIds.has(assignment.assetId)).length,
  };
}
