import { describe, expect, it } from 'vitest';
import { PublicEntity } from '../../core/api/entities.models';
import { contextGallery } from './entity-detail.presenter';

describe('entity context gallery', () => {
  it('leaves article media to the article layout', () => {
    const entity = {
      type: 'ARTICLE',
      resolvedMedia: { gallery: [{ id: 'context', url: 'https://example.com/context.jpg' }] },
    } as PublicEntity;

    expect(contextGallery(entity)).toEqual([]);
  });

  it('preserves backend order and omits the detail image and non-raster media', () => {
    const detail = { id: 'detail', url: 'https://example.com/detail.jpg' };
    const first = { id: 'first', url: 'https://example.com/first.jpg', sortOrder: 20 };
    const second = { id: 'second', url: 'https://example.com/second.jpg', sortOrder: 10 };
    const entity = {
      type: 'MOVEMENT',
      resolvedMedia: {
        detail,
        gallery: [first, detail, { id: 'vector', url: 'https://example.com/vector.svg' }, second],
      },
    } as PublicEntity;

    expect(contextGallery(entity)).toEqual([first, second]);
    expect(entity.resolvedMedia?.gallery).toHaveLength(4);
  });

  it('keeps images without ids when the detail has no id', () => {
    const context = { url: 'https://example.com/context.jpg' };
    const entity = {
      type: 'MOVEMENT',
      resolvedMedia: {
        detail: { url: 'https://example.com/detail.jpg' },
        gallery: [context],
      },
    } as PublicEntity;

    expect(contextGallery(entity)).toEqual([context]);
  });

  it('handles absent entities and galleries', () => {
    expect(contextGallery(undefined)).toEqual([]);
    expect(contextGallery(null)).toEqual([]);
    expect(contextGallery({ type: 'ARTWORK' } as PublicEntity)).toEqual([]);
  });
});
