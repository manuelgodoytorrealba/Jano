import { buildAdminMediaLibrary, buildResolvedMedia, resolveEntityMedia } from './media.resolver';

type MediaLinkOverride = Partial<{
  id: string;
  role: string;
  sortOrder: number;
  isPrimary: boolean;
  displayMode: 'COVER' | 'CONTAIN' | null;
  focalX: number | null;
  focalY: number | null;
  mediaId: string;
  url: string;
  displayUrl: string;
  canonicalUrl: string | null;
  sourcePageUrl: string | null;
  mimeType: string;
  width: number;
  height: number;
  isVector: boolean;
  provider: string;
  qualityTier: string;
  alt: string | null;
  source: string | null;
  photoBy: string | null;
  license: string | null;
}>;

describe('media.resolver', () => {
  const createLink = (overrides: MediaLinkOverride = {}) => ({
    id: overrides.id ?? 'link-1',
    role: overrides.role ?? 'PRIMARY_LEGACY',
    sortOrder: overrides.sortOrder ?? 0,
    isPrimary: overrides.isPrimary ?? false,
    displayMode: overrides.displayMode ?? null,
    focalX: overrides.focalX ?? null,
    focalY: overrides.focalY ?? null,
    media: {
      id: overrides.mediaId ?? 'media-1',
      url: overrides.url ?? 'https://example.com/image.jpg',
      displayUrl: overrides.displayUrl ?? overrides.url ?? 'https://example.com/image.jpg',
      canonicalUrl: overrides.canonicalUrl ?? null,
      sourcePageUrl: overrides.sourcePageUrl ?? null,
      mimeType: overrides.mimeType ?? 'image/jpeg',
      width: overrides.width ?? 1200,
      height: overrides.height ?? 1600,
      isVector: overrides.isVector ?? false,
      provider: overrides.provider ?? 'UNKNOWN',
      qualityTier: overrides.qualityTier ?? 'MEDIUM',
      alt: overrides.alt ?? 'image',
      source: overrides.source ?? null,
      photoBy: overrides.photoBy ?? null,
      license: overrides.license ?? null,
    },
  });

  it('prefers explicit role matches before legacy primary fallbacks', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [
        createLink({
          id: 'legacy',
          mediaId: 'legacy-media',
          role: 'PRIMARY_LEGACY',
          isPrimary: true,
        }),
        createLink({ id: 'card', mediaId: 'card-media', role: 'CARD', sortOrder: 2 }),
      ],
    };

    const resolved = buildResolvedMedia(entity);

    expect(resolved.card?.id).toBe('card-media');
    expect(resolved.primary?.id).toBe('legacy-media');
  });

  it('uses the global entity image without marking empty editorial slots as covered', () => {
    const entity = { type: 'ARTWORK', mediaLinks: [] };

    const resolved = buildResolvedMedia(entity);
    const library = buildAdminMediaLibrary(entity);

    expect(resolved.detail?.url).toBe('/assets/home/museum-room.jpg');
    expect(resolved.explorer3d?.id).toBe('jano-default-entity-image');
    expect(library.coverageSummary.coveredSlots).toEqual([]);
  });

  it('falls back to legacy primary when no explicit usage role exists', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [
        createLink({
          id: 'legacy',
          mediaId: 'legacy-media',
          role: 'PRIMARY_LEGACY',
          isPrimary: true,
        }),
      ],
    };

    expect(resolveEntityMedia(entity, 'hero')?.id).toBe('legacy-media');
    expect(resolveEntityMedia(entity, 'detail')?.id).toBe('legacy-media');
    expect(resolveEntityMedia(entity, 'thumbnail')?.id).toBe('legacy-media');
  });

  it('does not let detail override card, hero or explorer3d when a primary fallback exists', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [
        createLink({
          id: 'legacy',
          mediaId: 'legacy-media',
          role: 'PRIMARY_LEGACY',
          isPrimary: true,
        }),
        createLink({ id: 'detail', mediaId: 'detail-media', role: 'DETAIL' }),
      ],
    };

    expect(resolveEntityMedia(entity, 'hero')?.id).toBe('legacy-media');
    expect(resolveEntityMedia(entity, 'card')?.id).toBe('legacy-media');
    expect(resolveEntityMedia(entity, 'detail')?.id).toBe('detail-media');
    expect(resolveEntityMedia(entity, 'explorer3d')?.id).toBe('legacy-media');
  });

  it('uses detail as gallery fallback when no explicit gallery media exists', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [createLink({ id: 'detail', mediaId: 'detail-media', role: 'DETAIL' })],
    };

    const gallery = resolveEntityMedia(entity, 'gallery');

    expect(gallery).toHaveLength(1);
    expect(gallery[0]?.id).toBe('detail-media');
  });

  it('filters out non-renderable vector media from best-available resolution', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [
        createLink({
          id: 'vector',
          mediaId: 'vector-media',
          role: 'PRIMARY_LEGACY',
          isPrimary: true,
          mimeType: 'image/svg+xml',
          url: 'https://example.com/file.svg',
          displayUrl: 'https://example.com/file.svg',
          isVector: true,
        }),
        createLink({
          id: 'raster',
          mediaId: 'raster-media',
          role: 'DETAIL',
          isPrimary: false,
          mimeType: 'image/jpeg',
          url: 'https://example.com/file.jpg',
          displayUrl: 'https://example.com/file.jpg',
        }),
      ],
    };

    expect(resolveEntityMedia(entity, 'detail')?.id).toBe('raster-media');
  });

  it('builds canonical admin slot states and warnings from the backend resolver', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [
        createLink({
          id: 'legacy',
          mediaId: 'legacy-media',
          role: 'PRIMARY_LEGACY',
          isPrimary: true,
          alt: '',
        }),
        createLink({ id: 'detail', mediaId: 'detail-media', role: 'DETAIL' }),
        createLink({ id: 'gallery', mediaId: 'gallery-media', role: 'GALLERY', sortOrder: 3 }),
      ],
    };

    const library = buildAdminMediaLibrary(entity);

    expect(library.assignments).toHaveLength(3);
    expect(library.assets).toHaveLength(3);
    expect(library.additionalMedia).toEqual([
      expect.objectContaining({
        assignmentId: 'gallery',
        assetId: 'gallery-media',
      }),
    ]);
    expect(library.resolvedSlots.find((slot) => slot.slotKey === 'explorer3d')).toEqual(
      expect.objectContaining({
        source: 'legacy',
        matchedRole: 'PRIMARY_LEGACY',
      }),
    );
    expect(library.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        'media.explorer3d_legacy',
        'media.list_legacy',
        'media.preview_legacy',
        'media.alt_missing',
      ]),
    );
  });

  it('does not let list colonize explorer3d, detail or preview in admin resolved slots', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [createLink({ id: 'list', mediaId: 'list-media', role: 'CARD' })],
    };

    const library = buildAdminMediaLibrary(entity);

    expect(library.resolvedSlots).toEqual([
      expect.objectContaining({ slotKey: 'explorer3d', source: 'empty', item: null }),
      expect.objectContaining({
        slotKey: 'list',
        source: 'explicit',
        matchedRole: 'CARD',
        item: expect.objectContaining({ id: 'list-media' }),
      }),
      expect.objectContaining({ slotKey: 'detail', source: 'empty', item: null }),
      expect.objectContaining({ slotKey: 'preview', source: 'empty', item: null }),
    ]);
  });

  it('treats preview as an explicit first-class slot instead of falling back from list', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [
        createLink({ id: 'list', mediaId: 'list-media', role: 'CARD' }),
        createLink({ id: 'preview', mediaId: 'preview-media', role: 'THUMBNAIL' }),
      ],
    };

    const library = buildAdminMediaLibrary(entity);
    const preview = library.resolvedSlots.find((slot) => slot.slotKey === 'preview');
    const detail = library.resolvedSlots.find((slot) => slot.slotKey === 'detail');

    expect(preview).toEqual(
      expect.objectContaining({
        source: 'explicit',
        matchedRole: 'THUMBNAIL',
        item: expect.objectContaining({ id: 'preview-media' }),
      }),
    );
    expect(detail).toEqual(
      expect.objectContaining({
        source: 'empty',
        item: null,
      }),
    );
  });

  it('does not keep using PRIMARY_LEGACY when the assignment is no longer marked as legacy fallback', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [
        createLink({
          id: 'legacy',
          mediaId: 'legacy-media',
          role: 'PRIMARY_LEGACY',
          isPrimary: false,
        }),
      ],
    };

    const library = buildAdminMediaLibrary(entity);

    expect(library.resolvedSlots).toEqual([
      expect.objectContaining({ slotKey: 'explorer3d', source: 'empty', item: null }),
      expect.objectContaining({ slotKey: 'list', source: 'empty', item: null }),
      expect.objectContaining({ slotKey: 'detail', source: 'empty', item: null }),
      expect.objectContaining({ slotKey: 'preview', source: 'empty', item: null }),
    ]);
    expect(library.coverageSummary.legacySlots).toEqual([]);
  });
});
