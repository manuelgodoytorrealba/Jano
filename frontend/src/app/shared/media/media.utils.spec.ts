import { mediaDisplayUrl, resolveEntityMediaItem, resolveEntityMediaSlot, resolveMediaPresentation } from './media.utils';

describe('media.utils', () => {
  it('keeps hero, card and detail separated when resolvedMedia provides distinct assets', () => {
    const entity = {
      type: 'ARTWORK',
      resolvedMedia: {
        hero: { id: 'hero-media', url: 'https://example.com/hero.jpg', role: 'HERO' },
        card: { id: 'card-media', url: 'https://example.com/card.jpg', role: 'CARD' },
        detail: { id: 'detail-media', url: 'https://example.com/detail.jpg', role: 'DETAIL' },
        thumbnail: null,
        explorer3d: null,
        gallery: [],
        primary: { id: 'hero-media', url: 'https://example.com/hero.jpg', role: 'HERO' },
      },
    };

    expect(resolveEntityMediaItem(entity, 'hero')?.id).toBe('hero-media');
    expect(resolveEntityMediaItem(entity, 'card')?.id).toBe('card-media');
    expect(resolveEntityMediaItem(entity, 'detail')?.id).toBe('detail-media');
  });

  it('resolves slot states from local mediaLinks without collapsing distinct roles', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [
        {
          id: 'link-1',
          role: 'HERO',
          media: { id: 'hero-media', url: 'https://example.com/hero.jpg' },
        },
        {
          id: 'link-2',
          role: 'CARD',
          media: { id: 'card-media', url: 'https://example.com/card.jpg' },
        },
        {
          id: 'link-3',
          role: 'DETAIL',
          media: { id: 'detail-media', url: 'https://example.com/detail.jpg' },
        },
      ],
    };

    expect(resolveEntityMediaSlot(entity, 'hero').item?.id).toBe('hero-media');
    expect(resolveEntityMediaSlot(entity, 'card').item?.id).toBe('card-media');
    expect(resolveEntityMediaSlot(entity, 'detail').item?.id).toBe('detail-media');
  });

  it('prefers primary fallback over detail for hero, card and explorer3d when those roles are unset', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [
        {
          id: 'link-1',
          role: 'PRIMARY_LEGACY',
          isPrimary: true,
          media: { id: 'legacy-media', url: 'https://example.com/legacy.jpg' },
        },
        {
          id: 'link-2',
          role: 'DETAIL',
          media: { id: 'detail-media', url: 'https://example.com/detail.jpg' },
        },
      ],
    };

    expect(resolveEntityMediaSlot(entity, 'hero').item?.id).toBe('legacy-media');
    expect(resolveEntityMediaSlot(entity, 'card').item?.id).toBe('legacy-media');
    expect(resolveEntityMediaSlot(entity, 'detail').item?.id).toBe('detail-media');
    expect(resolveEntityMediaSlot(entity, 'explorer3d').item?.id).toBe('legacy-media');
  });

  it('prefers the active legacy fallback for detail before best-available heuristics', () => {
    const entity = {
      type: 'ARTWORK',
      mediaLinks: [
        {
          id: 'legacy-preview',
          role: 'PRIMARY_LEGACY',
          isPrimary: true,
          media: { id: 'legacy-preview-media', url: 'https://example.com/preview.jpg' },
        },
        {
          id: 'explorer',
          role: 'EXPLORER_3D',
          media: { id: 'explorer-media', url: 'https://example.com/explorer.jpg', width: 2400, height: 2400 },
        },
      ],
    };

    expect(resolveEntityMediaItem(entity, 'detail')?.id).toBe('legacy-preview-media');
  });

  it('falls back to media.url when admin data carries an empty displayUrl string', () => {
    expect(mediaDisplayUrl({
      displayUrl: '',
      url: 'https://images.unsplash.com/photo-1554188248-986adbb73be4',
    })).toBe('https://images.unsplash.com/photo-1554188248-986adbb73be4');

    const entity = {
      type: 'ARTWORK',
      mediaLinks: [
        {
          id: 'link-card',
          role: 'CARD',
          media: {
            id: 'card-media',
            displayUrl: '',
            url: 'https://images.unsplash.com/photo-1554188248-986adbb73be4',
          },
        },
      ],
    };

    expect(resolveEntityMediaItem(entity, 'card')?.id).toBe('card-media');
    expect(mediaDisplayUrl(resolveEntityMediaItem(entity, 'card'))).toBe('https://images.unsplash.com/photo-1554188248-986adbb73be4');
  });

  it('rewrites local upload media to same-origin paths so SSR and browser reuse the frontend origin', () => {
    expect(mediaDisplayUrl({
      displayUrl: 'http://localhost:3000/uploads/media/uploaded-file.jpg',
    })).toBe('/uploads/media/uploaded-file.jpg');

    expect(mediaDisplayUrl({
      url: 'http://127.0.0.1:3000/uploads/media/uploaded-file.jpg',
    })).toBe('/uploads/media/uploaded-file.jpg');

    expect(mediaDisplayUrl({
      url: 'http://192.168.1.38:4200/uploads/media/uploaded-file.jpg?size=large',
    })).toBe('/uploads/media/uploaded-file.jpg?size=large');
  });

  it('builds a crop-first presentation model that public renderers can reuse', () => {
    expect(resolveMediaPresentation({
      url: 'https://example.com/detail.jpg',
      focalX: 40,
      focalY: 60,
      cropX: 18,
      cropY: 72,
      cropZoom: 1.85,
    }, 'detail')).toEqual(expect.objectContaining({
      src: 'https://example.com/detail.jpg',
      objectPosition: '18% 72%',
      imageTransform: 'scale(1.850)',
      transformOrigin: '18% 72%',
      imageFilter: 'saturate(1.035) contrast(1.03) brightness(1.015)',
      focusX: 18,
      focusY: 72,
      zoom: 1.85,
    }));
  });
});
