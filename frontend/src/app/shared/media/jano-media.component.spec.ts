import { JanoMediaComponent } from './jano-media.component';
import { describe, expect, it } from 'vitest';

describe('JanoMediaComponent', () => {
  it('falls back to the placeholder after an image fails to load', () => {
    const component = new JanoMediaComponent();
    component.media = { url: 'https://example.com/broken.jpg' };

    expect(component.src).toBe('https://example.com/broken.jpg');
    component.onImageError();
    expect(component.src).toBeNull();
  });
});
