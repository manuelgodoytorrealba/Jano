import { JanoMediaComponent } from './jano-media.component';
import { describe, expect, it } from 'vitest';

type TestableMedia = {
  imageElement: HTMLImageElement | null;
  checkCachedImage(): void;
};

function imageFor(
  component: JanoMediaComponent,
  decode: () => Promise<void> = () => Promise.resolve(),
) {
  const image = {
    src: component.src,
    currentSrc: component.src,
    complete: false,
    naturalWidth: 1200,
    dataset: { mediaRequest: String(component.imageRequestId) },
    decode,
  } as unknown as HTMLImageElement;

  (component as unknown as TestableMedia).imageElement = image;
  return image;
}

describe('JanoMediaComponent', () => {
  it('waits for load and decode before becoming ready', async () => {
    const component = new JanoMediaComponent();
    component.media = { url: 'https://example.com/image.jpg' };
    component.ngOnChanges();
    const image = imageFor(component);

    expect(component.state()).toBe('pending');
    component.onImageLoad({ target: image } as unknown as Event);
    expect(component.state()).toBe('decoding');

    await Promise.resolve();
    expect(component.state()).toBe('ready');
  });

  it('uses load as the readiness fallback when decode rejects', async () => {
    const component = new JanoMediaComponent();
    component.media = { url: 'https://example.com/image.jpg' };
    component.ngOnChanges();
    const image = imageFor(component, () => Promise.reject(new Error('decode failed')));

    component.onImageLoad({ target: image } as unknown as Event);
    await Promise.resolve();

    expect(component.state()).toBe('ready');
  });

  it('handles a complete cached image when load fired before the listener', async () => {
    const component = new JanoMediaComponent();
    component.media = { url: 'https://example.com/cached.jpg' };
    component.ngOnChanges();
    const image = imageFor(component);
    Object.defineProperties(image, {
      complete: { value: true },
      naturalWidth: { value: 1200 },
    });

    (component as unknown as TestableMedia).checkCachedImage();
    await Promise.resolve();
    await Promise.resolve();

    expect(component.state()).toBe('ready');
  });

  it('ignores a late completion from a replaced source', async () => {
    const component = new JanoMediaComponent();
    component.media = { url: 'https://example.com/a.jpg' };
    component.ngOnChanges();
    const imageA = imageFor(component);

    component.media = { url: 'https://example.com/b.jpg' };
    component.ngOnChanges();
    const imageB = imageFor(component);

    component.onImageLoad({ target: imageA } as unknown as Event);
    expect(component.state()).toBe('pending');

    component.onImageLoad({ target: imageB } as unknown as Event);
    await Promise.resolve();
    expect(component.state()).toBe('ready');
  });

  it('returns to pending while it tries an entity fallback after an error', () => {
    const component = new JanoMediaComponent();
    component.media = { url: 'https://example.com/broken.jpg' };
    component.entity = {
      resolvedMedia: { card: { url: 'https://example.com/fallback.jpg' } },
    };
    component.ngOnChanges();
    const brokenImage = imageFor(component);

    component.onImageError({ target: brokenImage } as unknown as Event);

    expect(component.src).toBe('https://example.com/fallback.jpg');
    expect(component.state()).toBe('pending');
  });

  it('shows the final placeholder when no image can be resolved', () => {
    const component = new JanoMediaComponent();
    component.placeholderMode = 'none';
    component.ngOnChanges();

    expect(component.src).toBeNull();
    expect(component.state()).toBe('placeholder');
  });
});
