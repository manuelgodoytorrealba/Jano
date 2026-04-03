import { mediaDisplayUrl, resolveEntityMediaItem, resolveEntityMediaSlot } from './media.utils';

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
});
