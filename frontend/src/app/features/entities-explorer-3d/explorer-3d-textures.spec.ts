import { describe, expect, it } from 'vitest';
import { MediaPresentation } from '../../shared/media/media.utils';
import { resolveExplorerImagePlacement, wrapExplorerText } from './explorer-3d-textures';

const presentation: MediaPresentation = {
  src: '/artwork.jpg',
  objectFit: 'cover',
  objectPosition: '50% 50%',
  imageTransform: 'none',
  transformOrigin: '50% 50%',
  imageFilter: 'none',
  focusX: 100,
  focusY: 50,
  zoom: 1,
};

describe('explorer 3d textures', () => {
  it('honors the editorial focal point without exposing the cover crop', () => {
    expect(
      resolveExplorerImagePlacement({
        imageWidth: 200,
        imageHeight: 100,
        width: 100,
        height: 100,
        presentation,
      }),
    ).toEqual({ drawWidth: 200, drawHeight: 100, dx: -100, dy: 0 });
  });

  it('wraps fallback titles to the requested line limit', () => {
    expect(
      wrapExplorerText('Museo Nacional de Arte Moderno', (text) => text.length, 12, 2),
    ).toEqual(['Museo', 'Nacional de']);
  });
});
