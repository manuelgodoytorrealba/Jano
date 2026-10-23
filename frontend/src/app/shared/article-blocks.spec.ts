import { describe, expect, it } from 'vitest';
import {
  articleImageUrl,
  articleReadingBlocks,
  parseArticleBlocks,
  serializeArticleBlocks,
} from './article-blocks';

describe('visual article paragraphs', () => {
  it('keeps each image and credit with its paragraph, including after reordering', () => {
    const blocks = [
      {
        text: 'Texto con [[traje|un enlace]].',
        imageUrl: '/uploads/media/suit.jpg',
        caption: 'Autor [V&A] · 1994',
      },
      {
        text: 'Otro párrafo.',
        imageUrl: 'https://example.org/image.jpg?a=1&b=2',
        caption: 'Otro crédito',
      },
    ];
    expect(parseArticleBlocks(serializeArticleBlocks(blocks))).toEqual(blocks);
    expect(parseArticleBlocks(serializeArticleBlocks([...blocks].reverse()))).toEqual(
      [...blocks].reverse(),
    );
  });
  it('preserves legacy essays, headings and links without requiring images', () => {
    const essay = '## Título\n\nUn párrafo.\n\nOtro con [[entidad]].';
    expect(serializeArticleBlocks(parseArticleBlocks(essay))).toBe(essay);
  });
  it('rejects executable, inline-data and protocol-relative image URLs', () => {
    for (const url of ['javascript:alert(1)', 'data:image/svg+xml,<svg>', '//example.org/a.jpg']) {
      expect(articleImageUrl(url)).toBe('');
    }
    expect(articleImageUrl('/uploads/media/photo.jpg')).toBe('/uploads/media/photo.jpg');
  });
  it('does not silently discard malformed or unattached image markup', () => {
    const essay = '![caption](<javascript:alert(1)>)\n\nTexto.';
    expect(serializeArticleBlocks(parseArticleBlocks(essay))).toBe(essay);
  });
});

describe('article reading presentation', () => {
  it('groups an editorial heading with its illustrated paragraph', () => {
    const blocks = articleReadingBlocks(
      '## Introducción\n\nUn párrafo.\n\n![Foto](</uploads/a.jpg>)',
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('## Introducción\n\nUn párrafo.');
    expect(blocks[0].imageUrl).toBe('/uploads/a.jpg');
  });
  it('turns standalone entity links into entry shortcuts but preserves mixed prose', () => {
    const blocks = articleReadingBlocks(
      '[[one|Primera]] · [[two|Segunda]]\n\nTexto sobre [[one]].',
    );
    expect(blocks[0].links).toEqual([
      { slug: 'one', label: 'Primera' },
      { slug: 'two', label: 'Segunda' },
    ]);
    expect(blocks[1].links).toEqual([]);
    expect(blocks[1].text).toBe('Texto sobre [[one]].');
  });
});
