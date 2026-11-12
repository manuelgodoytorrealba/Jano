import sharp from 'sharp';
import {
  colorDistance,
  cosine,
  extractPalette,
  normalizeImage,
  paletteScore,
  readVisualIndex,
} from './image-features';
describe('image features', () => {
  it('compares normalized vectors and requires both requested colors', () => {
    expect(cosine([1, 0], [1, 0])).toBe(1);
    expect(cosine([0, 0], [1, 0])).toBe(0);
    expect(colorDistance('#000000', '#000000')).toBe(0);
    const palette = [{ hex: '#ff0000', weight: 1 }];
    expect(paletteScore(palette, ['#ff0000'])).toBe(1);
    expect(paletteScore(palette, ['#ff0000', '#0000ff'])).toBeLessThan(0.35);
    expect(paletteScore([{ hex: '#ff0000', weight: 0.001 }], ['#ff0000'])).toBe(0);
    expect(readVisualIndex({ embedding: [1], palette: [] })).toBeNull();
  });
  it('rejects invalid images and extracts a real decoded palette', async () => {
    await expect(normalizeImage(Buffer.from('<svg/>'))).rejects.toThrow();
    const bytes = await sharp({
      create: { width: 12, height: 12, channels: 3, background: '#ff0000' },
    })
      .png()
      .toBuffer();
    const normalized = await normalizeImage(bytes);
    const metadata = await sharp(normalized).metadata();
    expect(metadata.format).toBe('jpeg');
    expect(metadata.exif).toBeUndefined();
    const palette = await extractPalette(normalized);
    expect(palette[0].weight).toBe(1);
    expect(colorDistance(palette[0].hex, '#ff0000')).toBeLessThan(0.02);
  });
});
