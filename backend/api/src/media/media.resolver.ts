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

export type CropPresetLike = {
  x?: number | null;
  y?: number | null;
  zoom?: number | null;
};

export type EntityWithMediaLinks = {
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

export type MediaCropSlot =
  | 'explorer3d'
  | 'list'
  | 'preview'
  | 'hero'
  | 'card'
  | 'detail'
  | 'thumbnail';

export type ResolvedMediaSlotState = {
  item: ResolvedMediaItem | null;
  source: 'explicit' | 'fallback' | 'empty';
  matchedRole: string | null;
};

export type NormalizedMediaLink = {
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
  'detail',
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

export function buildResolvedMedia(
  entity: EntityWithMediaLinks | null | undefined,
): ResolvedMediaPayload {
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

export function attachResolvedMedia<T extends EntityWithMediaLinks>(
  entity: T,
): T & { resolvedMedia: ResolvedMediaPayload } {
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

export function resolvedMediaUrl(item: ResolvedMediaItem | null | undefined): string | null {
  if (!item) {
    return null;
  }

  if (item.displayUrl && isCommonsWikiRedirect(item.displayUrl) && item.url) {
    return item.url;
  }

  return item.displayUrl ?? item.url ?? null;
}

export function normalizeMediaLinks(
  entity: EntityWithMediaLinks | null | undefined,
): NormalizedMediaLink[] {
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
  return normalized === 'COVER' || normalized === 'CONTAIN' ? normalized : null;
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

export function firstByRole(
  links: NormalizedMediaLink[],
  role: string,
): NormalizedMediaLink | null {
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
    ? (selectLegacyPrimary(links) ??
      (BEST_AVAILABLE_FALLBACK_USAGES.has(usage)
        ? selectBestAvailable(links, entity?.type ?? null)
        : null))
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

export function normalizeFocal(value: number | null | undefined): number | null {
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
  const zoom =
    zoomValue === null || zoomValue === undefined || Number.isNaN(Number(zoomValue))
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
  slotKey?: MediaCropSlot,
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

export function selectLegacyPrimary(links: NormalizedMediaLink[]): NormalizedMediaLink | null {
  return (
    links.find((link) => link.role === 'PRIMARY_LEGACY' && link.isPrimary) ??
    links.find((link) => link.isPrimary) ??
    null
  );
}

function selectBestAvailable(
  links: NormalizedMediaLink[],
  entityType: string | null,
): NormalizedMediaLink | null {
  const byQuality = [...links].sort((a, b) => compareMediaQuality(a.media, b.media, entityType));
  return byQuality[0] ?? null;
}

export function toResolvedMediaItem(
  link: NormalizedMediaLink,
  slotKey?: MediaCropSlot,
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
    cropZoom:
      crop?.zoom === null || crop?.zoom === undefined
        ? null
        : Math.min(3, Math.max(1, Number(crop.zoom))),
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

function containsStandaloneLogo(value: string): boolean {
  return /(^|[^\p{L}\p{N}])logo([^\p{L}\p{N}]|$)/iu.test(value);
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

  if (containsStandaloneLogo(alt) || alt.includes('identidad visual')) {
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

    if (
      entityType === 'PLACE' &&
      (containsStandaloneLogo(alt) ||
        alt.includes('identidad visual') ||
        containsStandaloneLogo(url))
    ) {
      score -= 20;
    }

    return score;
  };

  return qualityScore(b) - qualityScore(a);
}

function isCommonsWikiRedirect(url: string): boolean {
  const normalized = url.toLowerCase();
  return (
    normalized.includes('commons.wikimedia.org/wiki/special:redirect/file/') ||
    normalized.includes('commons.wikimedia.org/wiki/special:filepath/')
  );
}
