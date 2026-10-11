import { SimpleChange } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { resolveGraphInputChangesRuntime } from './graph-load';

describe('image input updates', () => {
  it('preserves the image viewport for equivalent media and translated captions', () => {
    const media = { url: '/image.jpg', cropX: 30, cropZoom: 1.2, alt: 'Imagen' };
    const result = resolveGraphInputChangesRuntime({
      slug: 'test',
      persistedState: null,
      changes: { imageMedia: new SimpleChange(media, { ...media, alt: 'Image' }, false) },
    });
    expect(result.imageState).toBeNull();
    expect(result.shouldLoadGraph).toBe(false);
  });
  it('resets the image when the source or crop actually changes', () => {
    for (const next of [{ url: '/other.jpg' }, { url: '/image.jpg', cropZoom: 2 }]) {
      const result = resolveGraphInputChangesRuntime({
        slug: 'test',
        persistedState: null,
        changes: { imageMedia: new SimpleChange({ url: '/image.jpg' }, next, false) },
      });
      expect(result.imageState).not.toBeNull();
    }
  });
});
