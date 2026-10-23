export type ArticleBlock = { text: string; imageUrl: string; caption: string };

export function articleImageUrl(value: string): string {
  if (/^\/uploads\/[\w./%-]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

// Image metadata stays beside its paragraph in the existing localized essay.
export function parseArticleBlocks(content: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  for (const part of content.split(/\n\s*\n/).filter((part) => part.trim())) {
    const match = /^!\[([^\]]*)\]\(<([^>]+)>\)$/.exec(part.trim());
    if (match && blocks.length && articleImageUrl(match[2])) {
      let caption = match[1];
      try {
        caption = decodeURIComponent(caption);
      } catch {
        /* Keep legacy captions. */
      }
      const previous = blocks[blocks.length - 1];
      if (!previous.imageUrl) {
        previous.imageUrl = articleImageUrl(match[2]);
        previous.caption = caption;
        continue;
      }
    }
    blocks.push({ text: part.trim(), imageUrl: '', caption: '' });
  }
  return blocks;
}

export function serializeArticleBlocks(blocks: ArticleBlock[]): string {
  return blocks
    .map((block) => {
      const url = articleImageUrl(block.imageUrl);
      const text = block.text.trim();
      return (
        text +
        (url
          ? `\n\n![${encodeURIComponent(block.caption)}](<${url.replace(/[<>\s]/g, (char) => encodeURIComponent(char))}>)`
          : '')
      );
    })
    .filter(Boolean)
    .join('\n\n');
}

export type ArticleReadingBlock = ArticleBlock & {
  links: Array<{ slug: string; label: string }>;
  imageLeft: boolean;
};

export function articleReadingBlocks(content: string): ArticleReadingBlock[] {
  const result: ArticleReadingBlock[] = [];
  let headings: string[] = [];
  let imageCount = 0;
  for (const block of parseArticleBlocks(content)) {
    if (/^#{1,3} [^\n]+$/.test(block.text) && !block.imageUrl) {
      headings.push(block.text);
      continue;
    }
    const matches = [...block.text.matchAll(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g)];
    const onlyLinks =
      matches.length > 0 && !block.text.replace(/\[\[[^\]]+\]\]/g, '').replace(/[·,\s]/g, '');
    result.push({
      ...block,
      text: [...headings, block.text].join('\n\n'),
      links:
        onlyLinks && !headings.length && !block.imageUrl
          ? matches.map((match) => ({ slug: match[1], label: match[2] || match[1] }))
          : [],
      imageLeft: !!block.imageUrl && imageCount++ % 2 === 1,
    });
    headings = [];
  }
  if (headings.length)
    result.push({
      text: headings.join('\n\n'),
      imageUrl: '',
      caption: '',
      links: [],
      imageLeft: false,
    });
  return result;
}
