export type MediaLike = {
  id?: string | null;
  url?: string | null;
  originType?: string | null;
  derivedFromMediaId?: string | null;
  canonicalUrl?: string | null;
  displayUrl?: string | null;
  sourcePageUrl?: string | null;
  storageKey?: string | null;
  originalFilename?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  isVector?: boolean | null;
  width?: number | null;
  height?: number | null;
  provider?: 'WIKIMEDIA_COMMONS' | 'WIKIPEDIA' | 'MUSEUM' | 'IIIF' | 'OPENVERSE' | 'UNKNOWN' | string | null;
  qualityTier?: 'LOW' | 'MEDIUM' | 'HIGH' | 'MASTER' | string | null;
  alt?: string | null;
  source?: string | null;
  photoBy?: string | null;
  license?: string | null;
  displayMode?: 'COVER' | 'CONTAIN' | string | null;
  focalX?: number | null;
  focalY?: number | null;
};

export type ResolvedMediaItem = MediaLike & {
  role?: string | null;
  sortOrder?: number | null;
  isPrimary?: boolean | null;
  displayMode?: 'COVER' | 'CONTAIN' | string | null;
  focalX?: number | null;
  focalY?: number | null;
};

export type ResolvedMediaPayload = {
  hero?: ResolvedMediaItem | null;
  card?: ResolvedMediaItem | null;
  detail?: ResolvedMediaItem | null;
  thumbnail?: ResolvedMediaItem | null;
  explorer3d?: ResolvedMediaItem | null;
  gallery?: ResolvedMediaItem[] | null;
  primary?: ResolvedMediaItem | null;
};

export type MediaLinkLike = {
  id?: string | null;
  role?: string | null;
  sortOrder?: number | null;
  isPrimary?: boolean | null;
  displayMode?: 'COVER' | 'CONTAIN' | string | null;
  focalX?: number | null;
  focalY?: number | null;
  media?: MediaLike | null;
};

export type MediaUsage =
  | 'hero'
  | 'card'
  | 'detail'
  | 'thumbnail'
  | 'explorer3d'
  | 'gallery'
  | 'primary';

export type ResolvedMediaSlotState = {
  item: ResolvedMediaItem | null;
  source: 'explicit' | 'fallback' | 'empty';
  matchedRole: string | null;
};

export type EntityWithMediaLinks = {
  title?: string | null;
  summary?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  type?: string | null;
  resolvedMedia?: ResolvedMediaPayload | null;
  mediaLinks?: MediaLinkLike[] | null;
};

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

const ABSTRACT_ENTITY_TYPES = new Set(['CONCEPT', 'MOVEMENT', 'PERIOD']);

const ROLE_ORDER: Record<Exclude<MediaUsage, 'gallery'>, string[]> = {
  hero: ['HERO', 'DETAIL', 'CARD', 'THUMBNAIL', 'EXPLORER_3D'],
  card: ['CARD', 'THUMBNAIL', 'HERO', 'DETAIL', 'EXPLORER_3D'],
  detail: ['DETAIL', 'HERO', 'CARD'],
  thumbnail: ['THUMBNAIL', 'CARD'],
  explorer3d: ['EXPLORER_3D', 'CARD', 'THUMBNAIL', 'DETAIL', 'HERO'],
  primary: ['PRIMARY_LEGACY', 'HERO', 'CARD', 'DETAIL', 'THUMBNAIL', 'EXPLORER_3D'],
};

export function mediaDisplayUrl(media: MediaLike | null | undefined): string | null {
  const displayUrl = media?.displayUrl ?? null;
  const url = media?.url ?? null;

  if (displayUrl && isCommonsWikiRedirect(displayUrl) && url) {
    return url;
  }

  return displayUrl ?? url ?? null;
}

export function isRenderableRasterMedia(media: MediaLike | null | undefined): boolean {
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

export function isAbstractEntityType(entityOrType: EntityWithMediaLinks | string | null | undefined): boolean {
  const type = typeof entityOrType === 'string'
    ? entityOrType
    : entityOrType?.type;

  return ABSTRACT_ENTITY_TYPES.has((type ?? '').toUpperCase());
}

export function selectPrimaryVisualMedia(entity: EntityWithMediaLinks | null | undefined): ResolvedMediaItem | MediaLike | null {
  const resolvedPrimary = entity?.resolvedMedia?.primary
    ?? entity?.resolvedMedia?.detail
    ?? entity?.resolvedMedia?.card
    ?? entity?.resolvedMedia?.hero
    ?? entity?.resolvedMedia?.thumbnail
    ?? entity?.resolvedMedia?.explorer3d
    ?? null;

  if (resolvedPrimary && isRenderableRasterMedia(resolvedPrimary)) {
    return resolvedPrimary;
  }

  const legacy = selectLegacyMediaLink(entity, 'primary');
  return legacy ? toResolvedMediaItem(legacy) : null;
}

export function resolveEntityMediaItem(
  entity: EntityWithMediaLinks | null | undefined,
  usage: Exclude<MediaUsage, 'gallery'> = 'card',
): ResolvedMediaItem | null {
  const resolved = selectResolvedMediaItem(entity, usage);
  if (resolved) {
    return resolved;
  }

  if (isAbstractEntityType(entity)) {
    return null;
  }

  const legacy = selectLegacyMediaLink(entity, usage);
  return legacy ? toResolvedMediaItem(legacy) : null;
}

export function resolveEntityMediaGallery(
  entity: EntityWithMediaLinks | null | undefined,
): ResolvedMediaItem[] {
  const resolved = entity?.resolvedMedia?.gallery?.filter(isRenderableRasterMedia) ?? [];
  if (resolved.length) {
    return resolved;
  }

  const normalized = normalizeMediaLinks(entity);
  const gallery = normalized
    .filter((link) => link.role === 'GALLERY')
    .map(toResolvedMediaItem);

  if (gallery.length) {
    return gallery;
  }

  const detail = resolveEntityMediaItem(entity, 'detail');
  return detail ? [detail] : [];
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

export function entityVisualUrl(
  entity: EntityWithMediaLinks | null | undefined,
  usage: Exclude<MediaUsage, 'gallery'> = 'card',
): string | null {
  if (!entity) {
    return null;
  }

  const resolved = selectResolvedMediaItem(entity, usage);
  if (resolved) {
    return mediaDisplayUrl(resolved);
  }

  if (isAbstractEntityType(entity)) {
    return buildAbstractEntityPoster(entity);
  }

  const legacy = selectLegacyMediaLink(entity, usage);
  return legacy ? mediaDisplayUrl(legacy.media) : null;
}

export function mediaObjectFit(
  media: Pick<ResolvedMediaItem, 'displayMode'> | MediaLike | null | undefined,
  usage: MediaUsage = 'card',
): 'cover' | 'contain' {
  const displayMode = normalizeDisplayMode(media?.displayMode);
  if (displayMode === 'CONTAIN') {
    return 'contain';
  }

  if (displayMode === 'COVER') {
    return 'cover';
  }

  switch (usage) {
    case 'detail':
    case 'gallery':
      return 'contain';
    default:
      return 'cover';
  }
}

export function mediaObjectPosition(
  media: Pick<ResolvedMediaItem, 'focalX' | 'focalY'> | MediaLike | null | undefined,
): string {
  const x = normalizeFocal(media?.focalX);
  const y = normalizeFocal(media?.focalY);

  return `${x}% ${y}%`;
}

function selectResolvedMediaItem(
  entity: EntityWithMediaLinks | null | undefined,
  usage: Exclude<MediaUsage, 'gallery'>,
): ResolvedMediaItem | null {
  const resolved = entity?.resolvedMedia ?? null;

  if (!resolved) {
    return null;
  }

  const direct = resolved[usage];
  if (direct && isRenderableRasterMedia(direct)) {
    return direct;
  }

  if (usage !== 'primary' && resolved.primary && isRenderableRasterMedia(resolved.primary)) {
    return resolved.primary;
  }

  return null;
}

function selectLegacyMediaLink(
  entity: EntityWithMediaLinks | null | undefined,
  usage: Exclude<MediaUsage, 'gallery'>,
): NormalizedMediaLink | null {
  return selectLegacyMediaLinkWithSource(entity, usage)?.link ?? null;
}

function selectLegacyMediaLinkWithSource(
  entity: EntityWithMediaLinks | null | undefined,
  usage: Exclude<MediaUsage, 'gallery'>,
): { link: NormalizedMediaLink; source: 'explicit' | 'fallback' } | null {
  const links = normalizeMediaLinks(entity);

  if (!links.length) {
    return null;
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

  const fallback = selectLegacyPrimary(links) ?? selectBestAvailable(links, entity?.type ?? null);
  return fallback
    ? {
      link: fallback,
      source: 'fallback',
    }
    : null;
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

function normalizeFocal(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 50;
  }

  const scaled = value <= 1 && value >= 0 ? value * 100 : value;
  return Math.min(100, Math.max(0, scaled));
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
    ...link.media,
    role: link.role,
    sortOrder: link.sortOrder,
    isPrimary: link.isPrimary,
    displayMode: link.displayMode,
    focalX: link.focalX,
    focalY: link.focalY,
  };
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

function buildAbstractEntityPoster(entity: EntityWithMediaLinks): string {
  const type = (entity.type ?? '').toUpperCase();
  const title = (entity.title ?? '').trim() || 'JANO';
  const summary = compact((entity.summary ?? '').trim(), 92);
  const years =
    entity.startYear || entity.endYear
      ? `${entity.startYear ?? ''}${entity.endYear ? `–${entity.endYear}` : ''}`
      : '';
  const theme = getAbstractTheme(type, title);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${theme.bgStart}"/>
          <stop offset="100%" stop-color="${theme.bgEnd}"/>
        </linearGradient>
        <radialGradient id="glowA" cx="16%" cy="18%" r="72%">
          <stop offset="0%" stop-color="${theme.glowA}" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="${theme.glowA}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="glowB" cx="86%" cy="84%" r="80%">
          <stop offset="0%" stop-color="${theme.glowB}" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="${theme.glowB}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="1500" rx="56" fill="url(#bg)"/>
      <rect width="1200" height="1500" rx="56" fill="url(#glowA)"/>
      <rect width="1200" height="1500" rx="56" fill="url(#glowB)"/>
      <g opacity="0.2">
        <circle cx="198" cy="258" r="146" fill="none" stroke="${theme.line}" stroke-width="24"/>
        <circle cx="960" cy="1180" r="180" fill="none" stroke="${theme.lineSoft}" stroke-width="18"/>
        <path d="M110 1015C280 862 456 788 658 820C866 852 979 760 1086 530" fill="none" stroke="${theme.line}" stroke-width="28" stroke-linecap="round"/>
        <path d="M160 1224L420 946L760 1012L1078 760" fill="none" stroke="${theme.lineSoft}" stroke-width="15" stroke-linecap="round"/>
        <rect x="108" y="108" width="984" height="1284" rx="40" fill="none" stroke="${theme.frame}" stroke-width="10"/>
      </g>
      <g transform="translate(106 1088)">
        <text x="0" y="0" fill="${theme.eyebrow}" font-family="Helvetica, Arial, sans-serif" font-size="34" letter-spacing="8">${escapeSvg(typeLabel(type))}</text>
        <text x="0" y="110" fill="${theme.title}" font-family="Georgia, Times New Roman, serif" font-size="112" font-weight="700">${escapeSvg(title)}</text>
        ${years ? `<text x="0" y="168" fill="${theme.meta}" font-family="Helvetica, Arial, sans-serif" font-size="30" letter-spacing="3">${escapeSvg(years)}</text>` : ''}
        ${summary ? `<text x="0" y="236" fill="${theme.body}" font-family="Helvetica, Arial, sans-serif" font-size="38">${escapeSvg(summary)}</text>` : ''}
      </g>
    </svg>
  `.replace(/\s+/g, ' ').trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getAbstractTheme(type: string, title: string) {
  const seed = Array.from(title).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const families = {
    CONCEPT: [
      { bgStart: '#08121e', bgEnd: '#16324f', glowA: '#34d399', glowB: '#38bdf8', line: '#c7f9cc', lineSoft: '#bae6fd', frame: '#86efac', eyebrow: '#86efac', title: '#f8fafc', meta: '#cbd5e1', body: '#dbeafe' },
      { bgStart: '#20102f', bgEnd: '#35244a', glowA: '#f472b6', glowB: '#a78bfa', line: '#fbcfe8', lineSoft: '#ddd6fe', frame: '#f9a8d4', eyebrow: '#f9a8d4', title: '#fdf4ff', meta: '#e9d5ff', body: '#f5d0fe' },
    ],
    MOVEMENT: [
      { bgStart: '#111827', bgEnd: '#312e81', glowA: '#f59e0b', glowB: '#ef4444', line: '#fde68a', lineSoft: '#fecaca', frame: '#fbbf24', eyebrow: '#fbbf24', title: '#fffbeb', meta: '#fde68a', body: '#ffedd5' },
      { bgStart: '#132a13', bgEnd: '#31572c', glowA: '#22c55e', glowB: '#84cc16', line: '#d8f3dc', lineSoft: '#bef264', frame: '#86efac', eyebrow: '#86efac', title: '#f7fee7', meta: '#d9f99d', body: '#ecfccb' },
    ],
    PERIOD: [
      { bgStart: '#0f172a', bgEnd: '#1e293b', glowA: '#60a5fa', glowB: '#c084fc', line: '#bfdbfe', lineSoft: '#ddd6fe', frame: '#93c5fd', eyebrow: '#93c5fd', title: '#eff6ff', meta: '#cbd5e1', body: '#dbeafe' },
      { bgStart: '#3b0764', bgEnd: '#1f2937', glowA: '#f59e0b', glowB: '#ec4899', line: '#fef08a', lineSoft: '#f9a8d4', frame: '#f0abfc', eyebrow: '#f0abfc', title: '#faf5ff', meta: '#f5d0fe', body: '#fde68a' },
    ],
  } as const;

  const options = families[type as keyof typeof families] ?? families.CONCEPT;
  return options[seed % options.length];
}

function typeLabel(type: string): string {
  switch (type) {
    case 'CONCEPT':
      return 'CONCEPTO';
    case 'MOVEMENT':
      return 'MOVIMIENTO';
    case 'PERIOD':
      return 'PERIODO';
    default:
      return 'JANO';
  }
}

function compact(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function escapeSvg(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
