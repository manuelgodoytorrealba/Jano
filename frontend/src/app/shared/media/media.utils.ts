type MediaLike = {
  url?: string | null;
  displayUrl?: string | null;
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
};

type EntityWithMediaLinks = {
  title?: string | null;
  summary?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  type?: string | null;
  mediaLinks?: Array<{
    role?: string | null;
    media?: MediaLike | null;
  }> | null;
};

const ABSTRACT_ENTITY_TYPES = new Set(['CONCEPT', 'MOVEMENT', 'PERIOD']);

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

export function selectPrimaryVisualMedia(entity: EntityWithMediaLinks | null | undefined): MediaLike | null {
  const mediaEntries = (entity?.mediaLinks ?? [])
    .map((link) => link?.media ?? null)
    .filter((media): media is MediaLike => !!media);

  const raster = mediaEntries.filter(isRenderableRasterMedia);
  if (!raster.length) {
    return null;
  }

  const byQuality = [...raster].sort((a, b) => compareMediaQuality(a, b, entity?.type ?? null));
  return byQuality[0] ?? null;
}

export function entityVisualUrl(entity: EntityWithMediaLinks | null | undefined): string | null {
  if (!entity) {
    return null;
  }

  if (ABSTRACT_ENTITY_TYPES.has((entity.type ?? '').toUpperCase())) {
    return buildAbstractEntityPoster(entity);
  }

  return mediaDisplayUrl(selectPrimaryVisualMedia(entity));
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
