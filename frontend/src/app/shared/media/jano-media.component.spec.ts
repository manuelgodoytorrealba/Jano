import { TestBed } from '@angular/core/testing';
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
  it.each(['card', 'thumbnail', 'explorer3d'] as const)(
    'accepts responsive %s media and retries the original if the variant fails',
    async (usage) => {
      const component = new JanoMediaComponent();
      component.usage = usage;
      component.media = {
        url: '/uploads/media/original.jpg',
        variants: [
          { url: '/uploads/media-variants/card-320.webp', width: 320, height: 480 },
          { url: '/uploads/media-variants/card-640.webp', width: 640, height: 960 },
        ],
      };
      component.ngOnChanges();
      expect(component.imageSrc).toBe('/uploads/media-variants/card-640.webp');
      expect(component.srcset).toContain('320w');
      const image = imageFor(component);
      Object.defineProperty(image, 'currentSrc', { value: component.imageSrc });
      component.onImageLoad({ target: image } as unknown as Event);
      await Promise.resolve();
      expect(component.state()).toBe('ready');
      component.onImageError({ target: image } as unknown as Event);
      expect(component.srcset).toBeNull();
      expect(component.imageSrc).toBe('/uploads/media/original.jpg');
      expect(component.state()).toBe('pending');
    },
  );

  it('keeps the original for detail and gallery views', () => {
    const component = new JanoMediaComponent();
    component.usage = 'detail';
    component.media = {
      url: '/uploads/media/original.jpg',
      variants: [{ url: '/thumb.webp', width: 640, height: 960 }],
    };
    expect(component.imageSrc).toBe('/uploads/media/original.jpg');
    expect(component.srcset).toBeNull();
  });
});

it('keeps the real artwork on a conditional source rather than the fallback image', async () => {
  const fixture = TestBed.createComponent(JanoMediaComponent);
  try {
    fixture.componentRef.setInput('media', { url: '/uploads/hero.jpg' });
    fixture.componentRef.setInput('mediaQuery', '(max-width: 720px) and (orientation: portrait)');
    fixture.detectChanges();
    const picture = fixture.nativeElement.querySelector('picture') as HTMLPictureElement;
    expect(picture.querySelector('source')?.getAttribute('srcset')).toBe('/uploads/hero.jpg');
    expect(picture.querySelector('source')?.media).toContain('max-width: 720px');
    expect(picture.querySelector('img')?.getAttribute('src')).toBe(
      fixture.componentInstance.emptyImage,
    );
    expect(picture.querySelector('img')?.hasAttribute('srcset')).toBe(false);
  } finally {
    fixture.destroy();
  }
});
