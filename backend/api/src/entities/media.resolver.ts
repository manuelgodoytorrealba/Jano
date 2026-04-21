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
};

export type AdminResolvedSlot = {
  slotKey: MediaUsage;
  source: 'explicit' | 'fallback' | 'empty';
  matchedRole: string | null;
  item: ResolvedMediaItem | null;
  count?: number;
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
  assetCount: number;
  assignmentCount: number;
  unusedAssetCount: number;
};

export type AdminMediaLibraryPayload = {
  assets: AdminMediaAsset[];
  assignments: AdminMediaAssignment[];
  resolvedSlots: AdminResolvedSlot[];
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
      return toResolvedMediaItem(candidate);
    }
  }

  if (PRIMARY_FALLBACK_USAGES.has(usage)) {
    const legacyPrimary = selectLegacyPrimary(links);
    if (legacyPrimary) {
      return toResolvedMediaItem(legacyPrimary);
    }
  }

  if (BEST_AVAILABLE_FALLBACK_USAGES.has(usage)) {
    const best = selectBestAvailable(links, entity?.type ?? null);
    return best ? toResolvedMediaItem(best) : null;
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

  const galleryItems = resolvedEntity.resolvedMedia.gallery ?? [];
  const resolvedSlots: AdminResolvedSlot[] = [
    {
      slotKey: 'hero',
      ...resolveEntityMediaSlot(resolvedEntity, 'hero'),
    },
    {
      slotKey: 'card',
      ...resolveEntityMediaSlot(resolvedEntity, 'card'),
    },
    {
      slotKey: 'detail',
      ...resolveEntityMediaSlot(resolvedEntity, 'detail'),
    },
    {
      slotKey: 'thumbnail',
      ...resolveEntityMediaSlot(resolvedEntity, 'thumbnail'),
    },
    {
      slotKey: 'explorer3d',
      ...resolveEntityMediaSlot(resolvedEntity, 'explorer3d'),
    },
    {
      slotKey: 'gallery',
      source: galleryItems.length
        ? assignments.some((assignment) => assignment.role === 'GALLERY') ? 'explicit' : 'fallback'
        : 'empty',
      matchedRole: galleryItems[0]?.role ?? null,
      item: galleryItems[0] ?? null,
      count: galleryItems.length,
    },
    {
      slotKey: 'primary',
      ...resolveEntityMediaSlot(resolvedEntity, 'primary'),
    },
  ];

  const warnings = buildAdminMediaWarnings(assignments, assets, resolvedSlots);
  const coverageSummary = buildCoverageSummary(assignments, assets.length, resolvedSlots);

  return {
    assets,
    assignments,
    resolvedSlots,
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

function buildAdminMediaWarnings(
  assignments: AdminMediaAssignment[],
  assets: AdminMediaAsset[],
  resolvedSlots: AdminResolvedSlot[],
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
      message: `Hay ${primaryCount} medias marcadas como primary fallback. Conviene dejar solo una.`,
    });
  }

  const hasCard = assignments.some((assignment) => assignment.role === 'CARD');
  const hasHero = assignments.some((assignment) => assignment.role === 'HERO');
  const hasDetail = assignments.some((assignment) => assignment.role === 'DETAIL');
  const hasOnlyLegacy = assignments.every((assignment) => assignment.role === 'PRIMARY_LEGACY');
  const galleryAssignments = assignments.filter((assignment) => assignment.role === 'GALLERY');
  const fallbackHeavyCount = resolvedSlots.filter(
    (slot) => slot.slotKey !== 'gallery' && slot.slotKey !== 'primary' && slot.source === 'fallback',
  ).length;

  if (!hasHero) {
    warnings.push({
      code: 'media.hero_missing',
      severity: 'warning',
      message: 'No hay una media HERO explícita. La pieza destacada seguirá dependiendo de fallback.',
    });
  }

  if (!hasCard) {
    warnings.push({
      code: 'media.card_missing',
      severity: 'warning',
      message: 'No hay una media CARD explícita. El listado dependerá de fallback.',
    });
  }

  if (!hasDetail) {
    warnings.push({
      code: 'media.detail_missing',
      severity: 'warning',
      message: 'No hay una media DETAIL explícita. El detalle principal dependerá de fallback.',
    });
  }

  if (hasOnlyLegacy) {
    warnings.push({
      code: 'media.only_legacy',
      severity: 'warning',
      message: 'La entity depende solo de PRIMARY_LEGACY. Conviene asignar roles visuales explícitos.',
    });
  }

  if (galleryAssignments.length > 1) {
    const sortOrders = galleryAssignments.map((assignment) => Number(assignment.sortOrder ?? 0));
    const uniqueOrders = new Set(sortOrders);
    if (uniqueOrders.size !== sortOrders.length) {
      warnings.push({
        code: 'media.gallery_sort_ambiguous',
        severity: 'warning',
        message: 'Hay varias medias GALLERY con el mismo sortOrder. El orden puede ser ambiguo.',
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

  if (fallbackHeavyCount >= 3) {
    warnings.push({
      code: 'media.fallback_heavy',
      severity: 'warning',
      message: 'Varios slots importantes están entrando por fallback. Conviene explicitar Hero, Card, Detail y Explorer 3D.',
    });
  }

  return warnings;
}

function buildCoverageSummary(
  assignments: AdminMediaAssignment[],
  assetCount: number,
  resolvedSlots: AdminResolvedSlot[],
): AdminMediaCoverageSummary {
  const coveredSlots = resolvedSlots.filter((slot) => slot.source !== 'empty').map((slot) => slot.slotKey);
  const emptySlots = resolvedSlots.filter((slot) => slot.source === 'empty').map((slot) => slot.slotKey);
  const fallbackSlots = resolvedSlots.filter((slot) => slot.source === 'fallback').map((slot) => slot.slotKey);
  const explicitSlots = resolvedSlots.filter((slot) => slot.source === 'explicit').map((slot) => slot.slotKey);
  const activeAssetIds = new Set(
    resolvedSlots
      .map((slot) => slot.item?.id)
      .filter((value): value is string => !!value),
  );

  return {
    coveredSlots,
    emptySlots,
    fallbackSlots,
    explicitSlots,
    assetCount,
    assignmentCount: assignments.length,
    unusedAssetCount: assignments.filter((assignment) => !activeAssetIds.has(assignment.assetId)).length,
  };
}
