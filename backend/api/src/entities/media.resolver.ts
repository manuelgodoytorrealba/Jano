type MediaLike = {
  id: string;
  url: string;
  originType?: string | null;
  derivedFromMediaId?: string | null;
  canonicalUrl?: string | null;
  displayUrl?: string | null;
  sourcePageUrl?: string | null;
  storageKey?: string | null;
  originalFilename?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
  isVector?: boolean | null;
  provider?: string | null;
  qualityTier?: string | null;
  alt?: string | null;
  source?: string | null;
  photoBy?: string | null;
  license?: string | null;
};

type MediaLinkLike = {
  id?: string | null;
  role?: string | null;
  sortOrder?: number | null;
  isPrimary?: boolean | null;
  displayMode?: 'COVER' | 'CONTAIN' | null | string;
  focalX?: number | null;
  focalY?: number | null;
  cropExplorer3d?: unknown;
  cropList?: unknown;
  cropDetail?: unknown;
  cropPreview?: unknown;
  media?: MediaLike | null;
};

type CropPresetLike = {
  x?: number | null;
  y?: number | null;
  zoom?: number | null;
};

type EntityWithMediaLinks = {
  type?: string | null;
  resolvedMedia?: ResolvedMediaPayload | null;
  mediaLinks?: MediaLinkLike[] | null;
};

export type ResolvedMediaItem = {
  id: string;
  url: string;
  originType: string | null;
  derivedFromMediaId: string | null;
  canonicalUrl: string | null;
  displayUrl: string | null;
  sourcePageUrl: string | null;
  storageKey: string | null;
  originalFilename: string | null;
  fileSize: number | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  isVector: boolean;
  provider: string | null;
  qualityTier: string | null;
  alt: string | null;
  source: string | null;
  photoBy: string | null;
  license: string | null;
  role: string | null;
  sortOrder: number | null;
  isPrimary: boolean;
  displayMode: 'COVER' | 'CONTAIN' | null;
  focalX: number | null;
  focalY: number | null;
  assetFocalX: number | null;
  assetFocalY: number | null;
  cropX: number | null;
  cropY: number | null;
  cropZoom: number | null;
};

export type ResolvedMediaPayload = {
  hero: ResolvedMediaItem | null;
  card: ResolvedMediaItem | null;
  detail: ResolvedMediaItem | null;
  thumbnail: ResolvedMediaItem | null;
  explorer3d: ResolvedMediaItem | null;
  gallery: ResolvedMediaItem[];
  primary: ResolvedMediaItem | null;
};

export type MediaUsage =
  | 'hero'
  | 'card'
  | 'detail'
  | 'thumbnail'
  | 'explorer3d'
  | 'gallery'
  | 'primary';

export type AdminResolvedSlotKey =
  | 'explorer3d'
  | 'list'
  | 'detail'
  | 'preview';

export type AdminResolvedSlotSource = 'explicit' | 'fallback' | 'legacy' | 'empty';

export type ResolvedMediaSlotState = {
  item: ResolvedMediaItem | null;
  source: 'explicit' | 'fallback' | 'empty';
  matchedRole: string | null;
};

export type AdminMediaAsset = ResolvedMediaItem & {
  assetId: string;
};

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

export type AdminMediaWarning = {
  code: string;
  severity: 'warning';
  message: string;
};

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

type NormalizedMediaLink = {
  id: string | null;
  role: string | null;
  sortOrder: number;
  isPrimary: boolean;
  displayMode: 'COVER' | 'CONTAIN' | null;
  focalX: number | null;
  focalY: number | null;
  cropExplorer3d: CropPresetLike | null;
  cropList: CropPresetLike | null;
  cropDetail: CropPresetLike | null;
  cropPreview: CropPresetLike | null;
  media: MediaLike;
};

const ROLE_ORDER: Record<Exclude<MediaUsage, 'gallery' | 'primary'>, string[]> = {
  hero: ['HERO'],
  card: ['CARD', 'THUMBNAIL'],
  detail: ['DETAIL', 'HERO', 'CARD'],
  thumbnail: ['THUMBNAIL', 'CARD'],
  explorer3d: ['EXPLORER_3D'],
};

const PRIMARY_ROLE_ORDER = ['PRIMARY_LEGACY', 'HERO', 'CARD', 'DETAIL', 'THUMBNAIL', 'EXPLORER_3D'];

const PRIMARY_FALLBACK_USAGES = new Set<Exclude<MediaUsage, 'gallery' | 'primary'>>([
  'hero',
  'card',
  'thumbnail',
  'explorer3d',
]);

const BEST_AVAILABLE_FALLBACK_USAGES = new Set<Exclude<MediaUsage, 'gallery' | 'primary'>>([
  'hero',
  'card',
  'detail',
  'thumbnail',
  'explorer3d',
]);

const ADMIN_EDITORIAL_SLOT_ORDER: AdminResolvedSlotKey[] = [
  'explorer3d',
  'list',
  'detail',
  'preview',
];

export function buildResolvedMedia(entity: EntityWithMediaLinks | null | undefined): ResolvedMediaPayload {
  return {
    hero: resolveEntityMedia(entity, 'hero'),
    card: resolveEntityMedia(entity, 'card'),
    detail: resolveEntityMedia(entity, 'detail'),
    thumbnail: resolveEntityMedia(entity, 'thumbnail'),
    explorer3d: resolveEntityMedia(entity, 'explorer3d'),
    gallery: resolveEntityMedia(entity, 'gallery'),
    primary: resolveEntityMedia(entity, 'primary'),
  };
}

export function resolveEntityMedia(
  entity: EntityWithMediaLinks | null | undefined,
  usage: 'gallery',
): ResolvedMediaItem[];
export function resolveEntityMedia(
  entity: EntityWithMediaLinks | null | undefined,
  usage: Exclude<MediaUsage, 'gallery'>,
): ResolvedMediaItem | null;
export function resolveEntityMedia(
  entity: EntityWithMediaLinks | null | undefined,
  usage: MediaUsage,
): ResolvedMediaItem | ResolvedMediaItem[] | null {
  const links = normalizeMediaLinks(entity);

  if (!links.length) {
    return usage === 'gallery' ? [] : null;
  }

  if (usage === 'gallery') {
    const gallery = links
      .filter((link) => link.role === 'GALLERY')
      .map((link) => toResolvedMediaItem(link, 'detail'));

    if (gallery.length) {
      return gallery;
    }

    const detailFallback = resolveEntityMedia(entity, 'detail');
    return detailFallback ? [detailFallback] : [];
  }

  if (usage === 'primary') {
    for (const role of PRIMARY_ROLE_ORDER) {
      const candidate = firstByRole(links, role);
      if (candidate) {
        return toResolvedMediaItem(candidate);
      }
    }

    const legacyPrimary = selectLegacyPrimary(links);
    if (legacyPrimary) {
      return toResolvedMediaItem(legacyPrimary);
    }

    const best = selectBestAvailable(links, entity?.type ?? null);
    return best ? toResolvedMediaItem(best) : null;
  }

  const roles = ROLE_ORDER[usage];

  for (const role of roles) {
    const candidate = firstByRole(links, role);
    if (candidate) {
      return toResolvedMediaItem(candidate, usage);
    }
  }

  if (PRIMARY_FALLBACK_USAGES.has(usage)) {
    const legacyPrimary = selectLegacyPrimary(links);
    if (legacyPrimary) {
      return toResolvedMediaItem(legacyPrimary, usage);
    }
  }

  if (BEST_AVAILABLE_FALLBACK_USAGES.has(usage)) {
    const best = selectBestAvailable(links, entity?.type ?? null);
    return best ? toResolvedMediaItem(best, usage) : null;
  }

  return null;
}

export function attachResolvedMedia<T extends EntityWithMediaLinks>(entity: T): T & { resolvedMedia: ResolvedMediaPayload } {
  return {
    ...entity,
    resolvedMedia: buildResolvedMedia(entity),
  };
}

export function resolveEntityMediaSlot(
  entity: EntityWithMediaLinks | null | undefined,
  usage: Exclude<MediaUsage, 'gallery'>,
): ResolvedMediaSlotState {
  const resolved = entity?.resolvedMedia ?? null;
  const exactRole = exactRoleForUsage(usage);

  if (resolved) {
    const direct = resolved[usage];
    if (direct && isRenderableRasterMedia(direct)) {
      return {
        item: direct,
        source: direct.role === exactRole ? 'explicit' : 'fallback',
        matchedRole: direct.role ?? null,
      };
    }

    if (usage !== 'primary' && resolved.primary && isRenderableRasterMedia(resolved.primary)) {
      return {
        item: resolved.primary,
        source: 'fallback',
        matchedRole: resolved.primary.role ?? null,
      };
    }
  }

  const legacy = selectLegacyMediaLinkWithSource(entity, usage);
  if (legacy) {
    return {
      item: toResolvedMediaItem(legacy.link),
      source: legacy.source,
      matchedRole: legacy.link.role,
    };
  }

  return {
    item: null,
    source: 'empty',
    matchedRole: null,
  };
}

export function buildAdminMediaLibrary(entity: EntityWithMediaLinks | null | undefined): AdminMediaLibraryPayload {
  const resolvedEntity = attachResolvedMedia(entity ?? { mediaLinks: [] });
  const normalizedLinks = normalizeMediaLinks(resolvedEntity);
  const assignments = normalizedLinks.map((link) => ({
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
      explorer3d: sanitizeCropPreset(link.cropExplorer3d),
      list: sanitizeCropPreset(link.cropList),
      detail: sanitizeCropPreset(link.cropDetail),
      preview: sanitizeCropPreset(link.cropPreview),
    },
  }));

  const assets = Array.from(
    normalizedLinks.reduce((map, link) => {
      if (!map.has(link.media.id)) {
        map.set(link.media.id, {
          assetId: link.media.id,
          ...toResolvedMediaItem(link),
        });
      }

      return map;
    }, new Map<string, AdminMediaAsset>()).values(),
  );

  const resolvedSlots = ADMIN_EDITORIAL_SLOT_ORDER.map((slotKey) =>
    resolveAdminEditorialSlot(normalizedLinks, entity?.type ?? null, slotKey),
  );
  const additionalMedia = buildAdditionalMedia(normalizedLinks);
  const warnings = buildAdminMediaWarnings(assignments, assets, resolvedSlots, additionalMedia);
  const coverageSummary = buildCoverageSummary(assignments, assets.length, resolvedSlots, additionalMedia);

  return {
    assets,
    assignments,
    resolvedSlots,
    additionalMedia,
    warnings,
    coverageSummary,
  };
}

export function resolvedMediaUrl(item: ResolvedMediaItem | null | undefined): string | null {
  if (!item) {
    return null;
  }

  if (item.displayUrl && isCommonsWikiRedirect(item.displayUrl) && item.url) {
    return item.url;
  }

  return item.displayUrl ?? item.url ?? null;
}

function normalizeMediaLinks(entity: EntityWithMediaLinks | null | undefined): NormalizedMediaLink[] {
  return (entity?.mediaLinks ?? [])
    .filter((link): link is MediaLinkLike => !!link?.media)
    .map((link) => ({
      id: link.id ?? null,
      role: link.role ?? null,
      sortOrder: link.sortOrder ?? 0,
      isPrimary: !!link.isPrimary,
      displayMode: normalizeDisplayMode(link.displayMode),
      focalX: link.focalX ?? null,
      focalY: link.focalY ?? null,
      cropExplorer3d: sanitizeCropPreset(link.cropExplorer3d),
      cropList: sanitizeCropPreset(link.cropList),
      cropDetail: sanitizeCropPreset(link.cropDetail),
      cropPreview: sanitizeCropPreset(link.cropPreview),
      media: link.media!,
    }))
    .filter((link) => isRenderableRasterMedia(link.media))
    .sort(compareNormalizedLinks);
}

function normalizeDisplayMode(value: string | null | undefined): 'COVER' | 'CONTAIN' | null {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase();
  return normalized === 'COVER' || normalized === 'CONTAIN'
    ? normalized
    : null;
}

function exactRoleForUsage(usage: Exclude<MediaUsage, 'gallery'>): string {
  switch (usage) {
    case 'hero':
      return 'HERO';
    case 'card':
      return 'CARD';
    case 'detail':
      return 'DETAIL';
    case 'thumbnail':
      return 'THUMBNAIL';
    case 'explorer3d':
      return 'EXPLORER_3D';
    case 'primary':
      return 'PRIMARY_LEGACY';
  }
}

function compareNormalizedLinks(a: NormalizedMediaLink, b: NormalizedMediaLink): number {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  if (a.isPrimary !== b.isPrimary) {
    return a.isPrimary ? -1 : 1;
  }

  const roleA = a.role ?? '';
  const roleB = b.role ?? '';

  if (roleA !== roleB) {
    return roleA.localeCompare(roleB, 'en');
  }

  return (a.id ?? '').localeCompare(b.id ?? '', 'en');
}

function firstByRole(links: NormalizedMediaLink[], role: string): NormalizedMediaLink | null {
  return links.find((link) => link.role === role) ?? null;
}

function selectLegacyMediaLinkWithSource(
  entity: EntityWithMediaLinks | null | undefined,
  usage: Exclude<MediaUsage, 'gallery'>,
): { link: NormalizedMediaLink; source: 'explicit' | 'fallback' } | null {
  const links = normalizeMediaLinks(entity);

  if (!links.length) {
    return null;
  }

  if (usage === 'primary') {
    for (const role of PRIMARY_ROLE_ORDER) {
      const candidate = firstByRole(links, role);
      if (candidate) {
        return {
          link: candidate,
          source: candidate.role === 'PRIMARY_LEGACY' ? 'explicit' : 'fallback',
        };
      }
    }

    const fallback = selectLegacyPrimary(links) ?? selectBestAvailable(links, entity?.type ?? null);
    return fallback
      ? {
        link: fallback,
        source: fallback.role === 'PRIMARY_LEGACY' ? 'explicit' : 'fallback',
      }
      : null;
  }

  for (const role of ROLE_ORDER[usage]) {
    const candidate = firstByRole(links, role);
    if (candidate) {
      return {
        link: candidate,
        source: candidate.role === exactRoleForUsage(usage) ? 'explicit' : 'fallback',
      };
    }
  }

  const fallback = PRIMARY_FALLBACK_USAGES.has(usage)
    ? selectLegacyPrimary(links) ?? (BEST_AVAILABLE_FALLBACK_USAGES.has(usage) ? selectBestAvailable(links, entity?.type ?? null) : null)
    : BEST_AVAILABLE_FALLBACK_USAGES.has(usage)
      ? selectBestAvailable(links, entity?.type ?? null)
      : null;

  return fallback
    ? {
      link: fallback,
      source: 'fallback',
    }
    : null;
}

function resolveAdminEditorialSlot(
  links: NormalizedMediaLink[],
  entityType: string | null | undefined,
  slotKey: AdminResolvedSlotKey,
): AdminResolvedSlot {
  const explicit = selectAdminExplicitSlot(links, slotKey);
  if (explicit) {
    return {
      slotKey,
      source: 'explicit',
      matchedRole: explicit.role,
      item: toResolvedMediaItem(explicit, slotKey),
      explanation: buildSlotExplanation(slotKey, 'explicit', explicit.role),
      reasonCode: `explicit_${String(explicit.role ?? '').toLowerCase() || 'assignment'}`,
    };
  }

  const fallback = selectAdminFallbackSlot(links, entityType, slotKey);
  if (fallback) {
    return {
      slotKey,
      source: fallback.source,
      matchedRole: fallback.link.role,
      item: toResolvedMediaItem(fallback.link, slotKey),
      explanation: buildSlotExplanation(slotKey, fallback.source, fallback.link.role),
      reasonCode: fallback.reasonCode,
    };
  }

  return {
    slotKey,
    source: 'empty',
    matchedRole: null,
    item: null,
    explanation: buildSlotExplanation(slotKey, 'empty', null),
    reasonCode: 'empty',
  };
}

function selectAdminExplicitSlot(links: NormalizedMediaLink[], slotKey: AdminResolvedSlotKey): NormalizedMediaLink | null {
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

function selectAdminFallbackSlot(
  links: NormalizedMediaLink[],
  _entityType: string | null | undefined,
  slotKey: AdminResolvedSlotKey,
): { link: NormalizedMediaLink; source: 'fallback' | 'legacy'; reasonCode: string } | null {
  const legacy = selectLegacyPrimary(links);

  if (legacy) {
    return {
      link: legacy,
      source: 'legacy',
      reasonCode: 'legacy_primary_fallback',
    };
  }

  return null;
}

function buildAdditionalMedia(links: NormalizedMediaLink[]): AdminAdditionalMediaItem[] {
  return links
    .filter((link) => link.role === 'GALLERY')
    .map((link) => ({
      assignmentId: link.id ?? '',
      assetId: link.media.id,
      role: link.role,
      sortOrder: link.sortOrder,
      item: toResolvedMediaItem(link, 'detail'),
    }));
}

function buildSlotExplanation(
  slotKey: AdminResolvedSlotKey,
  source: AdminResolvedSlotSource,
  matchedRole: string | null,
): string {
  const slotLabel = adminSlotLabel(slotKey);
  const roleLabel = adminRoleLabel(matchedRole);

  if (source === 'empty') {
    switch (slotKey) {
      case 'explorer3d':
        return 'Explorer 3D no tiene imagen específica ni fallback legacy activo.';
      case 'list':
        return 'No hay imagen específica para List.';
      case 'detail':
        return 'No hay imagen específica para Detail.';
      case 'preview':
        return 'No hay imagen específica para Preview.';
    }
  }

  if (source === 'legacy') {
    return `${slotLabel} depende todavía de fallback legacy${roleLabel ? ` desde ${roleLabel}` : ''}.`;
  }

  if (source === 'explicit') {
    if (slotKey === 'detail' && matchedRole === 'HERO') {
      return 'Detail usa una asignación HERO existente como imagen principal.';
    }

    return `${slotLabel} tiene asignación específica${roleLabel ? ` desde ${roleLabel}` : ''}.`;
  }

  switch (slotKey) {
    case 'explorer3d':
      return `Explorer 3D usa fallback${roleLabel ? ` desde ${roleLabel}` : ''}.`;
    case 'list':
      return `List usa fallback${roleLabel ? ` desde ${roleLabel}` : ''}.`;
    case 'detail':
      return `Detail usa fallback${roleLabel ? ` desde ${roleLabel}` : ''}.`;
    case 'preview':
      return `Preview usa fallback${roleLabel ? ` desde ${roleLabel}` : ''}.`;
  }
}

function adminSlotLabel(slotKey: AdminResolvedSlotKey): string {
  switch (slotKey) {
    case 'explorer3d':
      return 'Explorer 3D';
    case 'list':
      return 'List';
    case 'detail':
      return 'Detail';
    case 'preview':
      return 'Preview';
  }
}

function adminRoleLabel(role: string | null): string | null {
  switch (role) {
    case 'PRIMARY_LEGACY':
      return 'legacy';
    case 'HERO':
      return 'Hero';
    case 'CARD':
      return 'List';
    case 'DETAIL':
      return 'Detail';
    case 'THUMBNAIL':
      return 'Preview';
    case 'EXPLORER_3D':
      return 'Explorer 3D';
    case 'GALLERY':
      return 'Additional Media';
    default:
      return role;
  }
}

function normalizeFocal(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return Math.min(100, Math.max(0, Number(value)));
}

function sanitizeCropPreset(value: unknown): CropPresetLike | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const crop = value as Record<string, unknown>;
  const x = normalizeFocal(crop['x'] as number | null | undefined);
  const y = normalizeFocal(crop['y'] as number | null | undefined);
  const zoomValue = crop['zoom'];
  const zoom = zoomValue === null || zoomValue === undefined || Number.isNaN(Number(zoomValue))
    ? null
    : Math.min(3, Math.max(1, Number(zoomValue)));

  if (x === null && y === null && zoom === null) {
    return null;
  }

  return {
    x,
    y,
    zoom,
  };
}

function cropPresetForSlot(
  link: NormalizedMediaLink,
  slotKey?: AdminResolvedSlotKey | 'hero' | 'card' | 'detail' | 'thumbnail' | 'explorer3d',
): CropPresetLike | null {
  switch (slotKey) {
    case 'explorer3d':
      return link.cropExplorer3d;
    case 'list':
    case 'card':
      return link.cropList;
    case 'detail':
    case 'hero':
      return link.cropDetail;
    case 'preview':
    case 'thumbnail':
      return link.cropPreview;
    default:
      return null;
  }
}

function selectLegacyPrimary(links: NormalizedMediaLink[]): NormalizedMediaLink | null {
  return (
    links.find((link) => link.role === 'PRIMARY_LEGACY' && link.isPrimary)
    ?? links.find((link) => link.isPrimary)
    ?? null
  );
}

function selectBestAvailable(links: NormalizedMediaLink[], entityType: string | null): NormalizedMediaLink | null {
  const byQuality = [...links].sort((a, b) => compareMediaQuality(a.media, b.media, entityType));
  return byQuality[0] ?? null;
}

function toResolvedMediaItem(
  link: NormalizedMediaLink,
  slotKey?: AdminResolvedSlotKey | 'hero' | 'card' | 'detail' | 'thumbnail' | 'explorer3d',
): ResolvedMediaItem {
  const crop = cropPresetForSlot(link, slotKey);
  const assetFocalX = normalizeFocal(link.media.focalX);
  const assetFocalY = normalizeFocal(link.media.focalY);

  return {
    id: link.media.id,
    url: link.media.url,
    originType: link.media.originType ?? null,
    derivedFromMediaId: link.media.derivedFromMediaId ?? null,
    canonicalUrl: link.media.canonicalUrl ?? null,
    displayUrl: link.media.displayUrl ?? null,
    sourcePageUrl: link.media.sourcePageUrl ?? null,
    storageKey: link.media.storageKey ?? null,
    originalFilename: link.media.originalFilename ?? null,
    fileSize: link.media.fileSize ?? null,
    mimeType: link.media.mimeType ?? null,
    width: link.media.width ?? null,
    height: link.media.height ?? null,
    isVector: !!link.media.isVector,
    provider: link.media.provider ?? null,
    qualityTier: link.media.qualityTier ?? null,
    alt: link.media.alt ?? null,
    source: link.media.source ?? null,
    photoBy: link.media.photoBy ?? null,
    license: link.media.license ?? null,
    role: link.role,
    sortOrder: link.sortOrder,
    isPrimary: link.isPrimary,
    displayMode: link.displayMode,
    focalX: normalizeFocal(link.focalX) ?? assetFocalX,
    focalY: normalizeFocal(link.focalY) ?? assetFocalY,
    assetFocalX,
    assetFocalY,
    cropX: normalizeFocal(crop?.x) ?? null,
    cropY: normalizeFocal(crop?.y) ?? null,
    cropZoom: crop?.zoom === null || crop?.zoom === undefined ? null : Math.min(3, Math.max(1, Number(crop.zoom))),
  };
}

function mediaDisplayUrl(media: MediaLike | null | undefined): string | null {
  const displayUrl = media?.displayUrl ?? null;
  const url = media?.url ?? null;

  if (displayUrl && isCommonsWikiRedirect(displayUrl) && url) {
    return url;
  }

  return displayUrl ?? url ?? null;
}

function isRenderableRasterMedia(media: MediaLike | null | undefined): boolean {
  if (!media) {
    return false;
  }

  const resolvedUrl = mediaDisplayUrl(media)?.toLowerCase() ?? '';
  const mime = (media.mimeType ?? '').toLowerCase();
  const alt = (media.alt ?? '').toLowerCase();

  if (media.isVector || mime.includes('svg') || resolvedUrl.includes('.svg')) {
    return false;
  }

  if (alt.includes('logo') || alt.includes('identidad visual')) {
    return false;
  }

  return !mime || mime.startsWith('image/');
}

function compareMediaQuality(a: MediaLike, b: MediaLike, entityType: string | null): number {
  const qualityScore = (media: MediaLike) => {
    const pixels = (media.width ?? 0) * (media.height ?? 0);
    const provider = (media.provider ?? '').toUpperCase();
    const alt = (media.alt ?? '').toLowerCase();
    const url = mediaDisplayUrl(media)?.toLowerCase() ?? '';
    let score = 0;

    switch ((media.qualityTier ?? '').toUpperCase()) {
      case 'MASTER':
        score += 40;
        break;
      case 'HIGH':
        score += 30;
        break;
      case 'MEDIUM':
        score += 20;
        break;
      case 'LOW':
        score += 10;
        break;
      default:
        score += 0;
    }

    if (provider === 'IIIF') score += 8;
    if (provider === 'WIKIMEDIA_COMMONS') score += 6;
    if (provider === 'MUSEUM') score += 5;
    if (provider === 'WIKIPEDIA') score -= 8;

    if (pixels >= 7_000_000) score += 8;
    else if (pixels >= 3_000_000) score += 5;
    else if (pixels >= 1_000_000) score += 3;

    if (entityType === 'PLACE' && (alt.includes('logo') || alt.includes('identidad visual') || url.includes('logo'))) {
      score -= 20;
    }

    return score;
  };

  return qualityScore(b) - qualityScore(a);
}

function isCommonsWikiRedirect(url: string): boolean {
  const normalized = url.toLowerCase();
  return normalized.includes('commons.wikimedia.org/wiki/special:redirect/file/')
    || normalized.includes('commons.wikimedia.org/wiki/special:filepath/');
}

function buildAdminMediaWarnings(
  assignments: AdminMediaAssignment[],
  assets: AdminMediaAsset[],
  resolvedSlots: AdminResolvedSlot[],
  additionalMedia: AdminAdditionalMediaItem[],
): AdminMediaWarning[] {
  if (!assignments.length) {
    return [
      {
        code: 'media.none',
        severity: 'warning',
        message: 'Esta entity no tiene media asociada todavía.',
      },
    ];
  }

  const warnings: AdminMediaWarning[] = [];
  const primaryCount = assignments.filter((assignment) => assignment.isPrimary).length;
  if (primaryCount > 1) {
    warnings.push({
      code: 'media.multiple_primary',
      severity: 'warning',
      message: `Hay ${primaryCount} medias marcadas como fallback legacy. Conviene dejar solo una.`,
    });
  }

  for (const slot of resolvedSlots) {
    if (slot.source === 'empty') {
      warnings.push({
        code: `media.${slot.slotKey}_empty`,
        severity: 'warning',
        message: slot.explanation,
      });
      continue;
    }

    if (slot.source === 'legacy') {
      warnings.push({
        code: `media.${slot.slotKey}_legacy`,
        severity: 'warning',
        message: `${adminSlotLabel(slot.slotKey)} depende de fallback legacy${slot.matchedRole ? ` desde ${adminRoleLabel(slot.matchedRole)}` : ''}.`,
      });
      continue;
    }

    if (slot.source === 'fallback') {
      warnings.push({
        code: `media.${slot.slotKey}_fallback`,
        severity: 'warning',
        message: slot.explanation,
      });
    }

    const qualityWarning = buildSlotQualityWarning(slot);
    if (qualityWarning) {
      warnings.push(qualityWarning);
    }
  }

  const galleryAssignments = assignments.filter((assignment) => assignment.role === 'GALLERY');

  if (galleryAssignments.length > 1) {
    const sortOrders = galleryAssignments.map((assignment) => Number(assignment.sortOrder ?? 0));
    const uniqueOrders = new Set(sortOrders);
    if (uniqueOrders.size !== sortOrders.length) {
      warnings.push({
        code: 'media.additional_sort_ambiguous',
        severity: 'warning',
        message: 'Additional Media tiene varios assets con el mismo sortOrder. Conviene ordenar mejor el material secundario.',
      });
    }
  }

  const missingAltCount = assets.filter((asset) => !String(asset.alt ?? '').trim()).length;
  if (missingAltCount > 0) {
    warnings.push({
      code: 'media.alt_missing',
      severity: 'warning',
      message: `Hay ${missingAltCount} media assets sin alt. Conviene completar texto alternativo para mantener calidad editorial.`,
    });
  }

  const activeAssetIds = new Set([
    ...resolvedSlots.map((slot) => slot.item?.id).filter((value): value is string => !!value),
    ...additionalMedia.map((item) => item.item.id),
  ]);
  const unusedAssetCount = assignments.filter((assignment) => !activeAssetIds.has(assignment.assetId)).length;
  if (unusedAssetCount > 0) {
    warnings.push({
      code: 'media.unused_assets',
      severity: 'warning',
      message: `Hay ${unusedAssetCount} assets sin uso ni en slots principales ni en Additional Media.`,
    });
  }

  return warnings;
}

function buildSlotQualityWarning(slot: AdminResolvedSlot): AdminMediaWarning | null {
  const item = slot.item;
  if (!item) {
    return null;
  }

  const minRule = slotMinimumSize(slot.slotKey);
  if ((item.width ?? 0) < minRule.width || (item.height ?? 0) < minRule.height) {
    return {
      code: `media.${slot.slotKey}_low_resolution`,
      severity: 'warning',
      message: `${adminSlotLabel(slot.slotKey)} tiene resolución justa para producto. Recomendado mínimo ${minRule.width}×${minRule.height}.`,
    };
  }

  const ratio = item.width && item.height ? item.width / item.height : null;
  if (ratio !== null && !slotRatioLooksHealthy(slot.slotKey, ratio)) {
    return {
      code: `media.${slot.slotKey}_ratio_warning`,
      severity: 'warning',
      message: `${adminSlotLabel(slot.slotKey)} usa una imagen con ratio poco ideal para este contexto.`,
    };
  }

  if ((item.fileSize ?? 0) > 3 * 1024 * 1024) {
    return {
      code: `media.${slot.slotKey}_heavy`,
      severity: 'warning',
      message: `${adminSlotLabel(slot.slotKey)} usa un asset pesado. Conviene optimizarlo para edición y producto.`,
    };
  }

  if ((item.cropZoom ?? 1) >= 2.35) {
    return {
      code: `media.${slot.slotKey}_crop_extreme`,
      severity: 'warning',
      message: `${adminSlotLabel(slot.slotKey)} tiene un crop muy cerrado. Revisa que no pierda legibilidad visual.`,
    };
  }

  const focalX = normalizeFocal(item.focalX);
  const focalY = normalizeFocal(item.focalY);
  if (
    focalX !== null
    && focalY !== null
    && (focalX < 8 || focalX > 92 || focalY < 8 || focalY > 92)
  ) {
    return {
      code: `media.${slot.slotKey}_focal_edge`,
      severity: 'warning',
      message: `${adminSlotLabel(slot.slotKey)} usa un foco muy extremo. Comprueba que el sujeto siga entrando bien en el marco.`,
    };
  }

  return null;
}

function slotMinimumSize(slotKey: AdminResolvedSlotKey): { width: number; height: number } {
  switch (slotKey) {
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

function slotRatioLooksHealthy(slotKey: AdminResolvedSlotKey, ratio: number): boolean {
  switch (slotKey) {
    case 'explorer3d':
      return ratio >= 0.8 && ratio <= 1.25;
    case 'list':
      return ratio >= 0.75 && ratio <= 1.15;
    case 'detail':
      return ratio >= 0.9 && ratio <= 1.9;
    case 'preview':
      return ratio >= 0.8 && ratio <= 1.25;
  }
}

function buildCoverageSummary(
  assignments: AdminMediaAssignment[],
  assetCount: number,
  resolvedSlots: AdminResolvedSlot[],
  additionalMedia: AdminAdditionalMediaItem[],
): AdminMediaCoverageSummary {
  const coveredSlots = resolvedSlots.filter((slot) => slot.source !== 'empty').map((slot) => slot.slotKey);
  const emptySlots = resolvedSlots.filter((slot) => slot.source === 'empty').map((slot) => slot.slotKey);
  const fallbackSlots = resolvedSlots.filter((slot) => slot.source === 'fallback').map((slot) => slot.slotKey);
  const explicitSlots = resolvedSlots.filter((slot) => slot.source === 'explicit').map((slot) => slot.slotKey);
  const legacySlots = resolvedSlots.filter((slot) => slot.source === 'legacy').map((slot) => slot.slotKey);
  const activeAssetIds = new Set(
    [
      ...resolvedSlots.map((slot) => slot.item?.id),
      ...additionalMedia.map((item) => item.item.id),
    ]
      .filter((value): value is string => !!value),
  );

  return {
    coveredSlots,
    emptySlots,
    fallbackSlots,
    explicitSlots,
    legacySlots,
    assetCount,
    assignmentCount: assignments.length,
    unusedAssetCount: assignments.filter((assignment) => !activeAssetIds.has(assignment.assetId)).length,
  };
}
