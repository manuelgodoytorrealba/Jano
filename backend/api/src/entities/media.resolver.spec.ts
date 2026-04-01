import { buildResolvedMedia, resolveEntityMedia } from './media.resolver';

describe('media.resolver', () => {
  const createLink = (overrides: Record<string, any> = {}) => ({
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
        createLink({ id: 'legacy', mediaId: 'legacy-media', role: 'PRIMARY_LEGACY', isPrimary: true }),
        createLink({ id: 'card', mediaId: 'card-media', role: 'CARD', sortOrder: 2 }),
      ],
    };

    const resolved = buildResolvedMedia(entity);

    expect(resolved.card?.id).toBe('card-media');
    expect(resolved.primary?.id).toBe('legacy-media');
  });

  it('falls back to legacy primary when no explicit usage role exists', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [
        createLink({ id: 'legacy', mediaId: 'legacy-media', role: 'PRIMARY_LEGACY', isPrimary: true }),
      ],
    };

    expect(resolveEntityMedia(entity, 'hero')?.id).toBe('legacy-media');
    expect(resolveEntityMedia(entity, 'thumbnail')?.id).toBe('legacy-media');
  });

  it('uses detail as gallery fallback when no explicit gallery media exists', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [
        createLink({ id: 'detail', mediaId: 'detail-media', role: 'DETAIL' }),
      ],
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
});
