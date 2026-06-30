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
  provider?:
    | 'WIKIMEDIA_COMMONS'
    | 'WIKIPEDIA'
    | 'MUSEUM'
    | 'IIIF'
    | 'OPENVERSE'
    | 'UNKNOWN'
    | string
    | null;
  qualityTier?: 'LOW' | 'MEDIUM' | 'HIGH' | 'MASTER' | string | null;
  alt?: string | null;
  source?: string | null;
  photoBy?: string | null;
  license?: string | null;
  displayMode?: 'COVER' | 'CONTAIN' | string | null;
  focalX?: number | null;
  focalY?: number | null;
  assetFocalX?: number | null;
  assetFocalY?: number | null;
  cropX?: number | null;
  cropY?: number | null;
  cropZoom?: number | null;
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

export type MediaUsage =
  | 'hero'
  | 'card'
  | 'detail'
  | 'thumbnail'
  | 'explorer3d'
  | 'gallery'
  | 'primary';

export type EntityWithResolvedMedia = {
  title?: string | null;
  summary?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  type?: string | null;
  resolvedMedia?: ResolvedMediaPayload | null;
};

const ABSTRACT_ENTITY_TYPES = new Set(['CONCEPT', 'MOVEMENT', 'PERIOD']);

export type MediaPresentation = {
  src: string | null;
  objectFit: 'cover' | 'contain';
  objectPosition: string;
  imageTransform: string;
  transformOrigin: string;
  imageFilter: string;
  focusX: number;
  focusY: number;
  zoom: number;
};

export function mediaDisplayUrl(media: MediaLike | null | undefined): string | null {
  const displayUrl = normalizeMediaUrlValue(media?.displayUrl);
  const url = normalizeMediaUrlValue(media?.url);

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

export function isAbstractEntityType(
  entityOrType: EntityWithResolvedMedia | string | null | undefined,
): boolean {
  const type = typeof entityOrType === 'string' ? entityOrType : entityOrType?.type;

  return ABSTRACT_ENTITY_TYPES.has((type ?? '').toUpperCase());
}

export function selectPrimaryVisualMedia(
  entity: EntityWithResolvedMedia | null | undefined,
): ResolvedMediaItem | MediaLike | null {
  const resolvedPrimary = entity?.resolvedMedia?.primary ?? null;

  return resolvedPrimary && isRenderableRasterMedia(resolvedPrimary) ? resolvedPrimary : null;
}

export function resolveEntityMediaItem(
  entity: EntityWithResolvedMedia | null | undefined,
  usage: Exclude<MediaUsage, 'gallery'> = 'card',
): ResolvedMediaItem | null {
  return selectResolvedMediaItem(entity, usage);
}

export function resolveEntityMediaGallery(
  entity: EntityWithResolvedMedia | null | undefined,
): ResolvedMediaItem[] {
  return entity?.resolvedMedia?.gallery?.filter(isRenderableRasterMedia) ?? [];
}

export function entityVisualUrl(
  entity: EntityWithResolvedMedia | null | undefined,
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

  return null;
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
  media:
    | Pick<ResolvedMediaItem, 'focalX' | 'focalY' | 'cropX' | 'cropY'>
    | MediaLike
    | null
    | undefined,
): string {
  const x = normalizeFocal(media?.cropX ?? media?.focalX);
  const y = normalizeFocal(media?.cropY ?? media?.focalY);

  return `${x}% ${y}%`;
}

export function mediaTransform(
  media: Pick<ResolvedMediaItem, 'cropZoom'> | MediaLike | null | undefined,
): string {
  const zoom = media?.cropZoom ?? null;
  if (zoom === null || zoom === undefined || Number.isNaN(Number(zoom)) || Number(zoom) <= 1) {
    return 'scale(1)';
  }

  return `scale(${Math.min(3, Math.max(1, Number(zoom))).toFixed(3)})`;
}

export function resolveMediaPresentation(
  media:
    | Pick<ResolvedMediaItem, 'displayMode' | 'focalX' | 'focalY' | 'cropX' | 'cropY' | 'cropZoom'>
    | MediaLike
    | null
    | undefined,
  usage: MediaUsage = 'card',
): MediaPresentation {
  const focusX = normalizeFocal(media?.cropX ?? media?.focalX);
  const focusY = normalizeFocal(media?.cropY ?? media?.focalY);
  const zoomValue = media?.cropZoom;
  const zoom =
    zoomValue === null || zoomValue === undefined || Number.isNaN(Number(zoomValue))
      ? 1
      : Math.min(3, Math.max(1, Number(zoomValue)));

  return {
    src: mediaDisplayUrl(media),
    objectFit: mediaObjectFit(media, usage),
    objectPosition: `${focusX}% ${focusY}%`,
    imageTransform: zoom <= 1 ? 'scale(1)' : `scale(${zoom.toFixed(3)})`,
    transformOrigin: `${focusX}% ${focusY}%`,
    imageFilter: editorialImageFilter(usage),
    focusX,
    focusY,
    zoom,
  };
}

export function editorialImageFilter(usage: MediaUsage = 'card'): string {
  switch (usage) {
    case 'hero':
      return 'saturate(1.04) contrast(1.035) brightness(1.02)';
    case 'detail':
    case 'gallery':
      return 'saturate(1.035) contrast(1.03) brightness(1.015)';
    case 'thumbnail':
      return 'saturate(1.025) contrast(1.02) brightness(1.01)';
    case 'explorer3d':
      return 'saturate(1.03) contrast(1.025) brightness(1.015)';
    case 'primary':
    case 'card':
    default:
      return 'saturate(1.035) contrast(1.03) brightness(1.015)';
  }
}

function selectResolvedMediaItem(
  entity: EntityWithResolvedMedia | null | undefined,
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

  return null;
}

function normalizeDisplayMode(value: string | null | undefined): 'COVER' | 'CONTAIN' | null {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase();
  return normalized === 'COVER' || normalized === 'CONTAIN' ? normalized : null;
}

function normalizeMediaUrlValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const absoluteUrlMatch = /^https?:\/\//i.test(trimmed);
  if (absoluteUrlMatch) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/uploads/') && isLocalUploadHost(parsed.hostname)) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function isLocalUploadHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '0.0.0.0') {
    return true;
  }

  if (normalized.startsWith('192.168.') || normalized.startsWith('10.')) {
    return true;
  }

  const private172 = /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized);
  return private172;
}

function normalizeFocal(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 50;
  }

  const scaled = value <= 1 && value >= 0 ? value * 100 : value;
  return Math.min(100, Math.max(0, scaled));
}

function isCommonsWikiRedirect(url: string): boolean {
  const normalized = url.toLowerCase();
  return (
    normalized.includes('commons.wikimedia.org/wiki/special:redirect/file/') ||
    normalized.includes('commons.wikimedia.org/wiki/special:filepath/')
  );
}

function buildAbstractEntityPoster(entity: EntityWithResolvedMedia): string {
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
  `
    .replace(/\s+/g, ' ')
    .trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getAbstractTheme(type: string, title: string) {
  const seed = Array.from(title).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const families = {
    CONCEPT: [
      {
        bgStart: '#08121e',
        bgEnd: '#16324f',
        glowA: '#34d399',
        glowB: '#38bdf8',
        line: '#c7f9cc',
        lineSoft: '#bae6fd',
        frame: '#86efac',
        eyebrow: '#86efac',
        title: '#f8fafc',
        meta: '#cbd5e1',
        body: '#dbeafe',
      },
      {
        bgStart: '#20102f',
        bgEnd: '#35244a',
        glowA: '#f472b6',
        glowB: '#a78bfa',
        line: '#fbcfe8',
        lineSoft: '#ddd6fe',
        frame: '#f9a8d4',
        eyebrow: '#f9a8d4',
        title: '#fdf4ff',
        meta: '#e9d5ff',
        body: '#f5d0fe',
      },
    ],
    MOVEMENT: [
      {
        bgStart: '#111827',
        bgEnd: '#312e81',
        glowA: '#f59e0b',
        glowB: '#ef4444',
        line: '#fde68a',
        lineSoft: '#fecaca',
        frame: '#fbbf24',
        eyebrow: '#fbbf24',
        title: '#fffbeb',
        meta: '#fde68a',
        body: '#ffedd5',
      },
      {
        bgStart: '#132a13',
        bgEnd: '#31572c',
        glowA: '#22c55e',
        glowB: '#84cc16',
        line: '#d8f3dc',
        lineSoft: '#bef264',
        frame: '#86efac',
        eyebrow: '#86efac',
        title: '#f7fee7',
        meta: '#d9f99d',
        body: '#ecfccb',
      },
    ],
    PERIOD: [
      {
        bgStart: '#0f172a',
        bgEnd: '#1e293b',
        glowA: '#60a5fa',
        glowB: '#c084fc',
        line: '#bfdbfe',
        lineSoft: '#ddd6fe',
        frame: '#93c5fd',
        eyebrow: '#93c5fd',
        title: '#eff6ff',
        meta: '#cbd5e1',
        body: '#dbeafe',
      },
      {
        bgStart: '#3b0764',
        bgEnd: '#1f2937',
        glowA: '#f59e0b',
        glowB: '#ec4899',
        line: '#fef08a',
        lineSoft: '#f9a8d4',
        frame: '#f0abfc',
        eyebrow: '#f0abfc',
        title: '#faf5ff',
        meta: '#f5d0fe',
        body: '#fde68a',
      },
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
