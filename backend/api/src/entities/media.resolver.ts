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
  media?: MediaLike | null;
};

type EntityWithMediaLinks = {
  type?: string | null;
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

type NormalizedMediaLink = {
  id: string | null;
  role: string | null;
  sortOrder: number;
  isPrimary: boolean;
  displayMode: 'COVER' | 'CONTAIN' | null;
  focalX: number | null;
  focalY: number | null;
  media: MediaLike;
};

const ROLE_ORDER: Record<Exclude<MediaUsage, 'gallery'>, string[]> = {
  hero: ['HERO', 'DETAIL', 'CARD', 'THUMBNAIL', 'EXPLORER_3D'],
  card: ['CARD', 'THUMBNAIL', 'HERO', 'DETAIL', 'EXPLORER_3D'],
  detail: ['DETAIL', 'HERO', 'CARD'],
  thumbnail: ['THUMBNAIL', 'CARD'],
  explorer3d: ['EXPLORER_3D', 'CARD', 'THUMBNAIL', 'DETAIL', 'HERO'],
  primary: ['PRIMARY_LEGACY', 'HERO', 'CARD', 'DETAIL', 'THUMBNAIL', 'EXPLORER_3D'],
};

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
      .map(toResolvedMediaItem);

    if (gallery.length) {
      return gallery;
    }

    const detailFallback = resolveEntityMedia(entity, 'detail');
    return detailFallback ? [detailFallback] : [];
  }

  const roles = ROLE_ORDER[usage];

  for (const role of roles) {
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

export function attachResolvedMedia<T extends EntityWithMediaLinks>(entity: T): T & { resolvedMedia: ResolvedMediaPayload } {
  return {
    ...entity,
    resolvedMedia: buildResolvedMedia(entity),
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

function selectLegacyPrimary(links: NormalizedMediaLink[]): NormalizedMediaLink | null {
  return (
    links.find((link) => link.role === 'PRIMARY_LEGACY' && link.isPrimary)
    ?? links.find((link) => link.role === 'PRIMARY_LEGACY')
    ?? links.find((link) => link.isPrimary)
    ?? null
  );
}

function selectBestAvailable(links: NormalizedMediaLink[], entityType: string | null): NormalizedMediaLink | null {
  const byQuality = [...links].sort((a, b) => compareMediaQuality(a.media, b.media, entityType));
  return byQuality[0] ?? null;
}

function toResolvedMediaItem(link: NormalizedMediaLink): ResolvedMediaItem {
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
    focalX: link.focalX,
    focalY: link.focalY,
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
