import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EntitiesApi } from '../../core/api/entities.api';
import { JanoMediaComponent } from '../media/jano-media.component';

type InlineToken =
  | { kind: 'text'; value: string }
  | { kind: 'strong'; value: string }
  | { kind: 'em'; value: string }
  | { kind: 'link'; slug: string; label: string };

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; tokens: InlineToken[] }
  | { kind: 'paragraph'; tokens: InlineToken[] }
  | { kind: 'lead'; tokens: InlineToken[] }
  | { kind: 'quote'; tokens: InlineToken[] };

@Component({
  standalone: true,
  selector: 'app-rich-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RouterLink, JanoMediaComponent],
  templateUrl: './rich-text.component.html',
  styleUrls: ['./rich-text.component.scss'],
})
export class RichTextComponent {
  private api = inject(EntitiesApi);

  @Input({ required: true }) text = '';

  openSlug = signal<string | null>(null);
  openPreviewKey = signal<string | null>(null);
  preview = signal<any | null>(null);
  previewLoading = signal(false);

  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private requestId = 0;

  isHoveringLink = false;
  isHoveringTooltip = false;

  get blocks(): Block[] {
    return parseBlocks(this.text ?? '');
  }

  get previewImageMedia(): any | null {
    return this.selectPreviewImage(this.preview());
  }

  onLinkEnter(slug: string, previewKey = slug) {
    this.isHoveringLink = true;
    this.cancelClose();

    if (this.openSlug() === slug && this.openPreviewKey() === previewKey && (this.previewLoading() || this.preview())) {
      return;
    }

    this.openSlug.set(slug);
    this.openPreviewKey.set(previewKey);
    this.preview.set(null);
    this.previewLoading.set(true);

    const currentRequest = ++this.requestId;

    this.api.preview(slug).subscribe({
      next: (p: any) => {
        if (currentRequest !== this.requestId) return;
        if (this.openSlug() !== slug) return;

        this.preview.set(p);
        this.previewLoading.set(false);
      },
      error: () => {
        if (currentRequest !== this.requestId) return;
        if (this.openSlug() !== slug) return;

        this.preview.set(null);
        this.previewLoading.set(false);
      },
    });
  }

  onLinkLeave() {
    this.isHoveringLink = false;
    this.scheduleClose();
  }

  onTooltipEnter() {
    this.isHoveringTooltip = true;
    this.cancelClose();
  }

  onTooltipLeave() {
    this.isHoveringTooltip = false;
    this.scheduleClose();
  }

  onLinkFocus(slug: string, previewKey = slug) {
    this.onLinkEnter(slug, previewKey);
  }

  onLinkBlur() {
    this.onLinkLeave();
  }

  private scheduleClose() {
    this.cancelClose();

    this.closeTimer = setTimeout(() => {
      if (this.isHoveringLink || this.isHoveringTooltip) {
        return;
      }

      this.openSlug.set(null);
      this.openPreviewKey.set(null);
      this.preview.set(null);
      this.previewLoading.set(false);
    }, 140);
  }

  private cancelClose() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private selectPreviewImage(entity: any): any | null {
    const resolvedSlots = Array.isArray(entity?.mediaLibrary?.resolvedSlots)
      ? entity.mediaLibrary.resolvedSlots
      : [];

    for (const slotKey of ['preview', 'list', 'detail']) {
      const slot = resolvedSlots.find((candidate: any) => candidate?.slotKey === slotKey);
      if (slot?.item) {
        return slot.item;
      }
    }

    return entity?.resolvedMedia?.thumbnail
      ?? entity?.resolvedMedia?.card
      ?? entity?.resolvedMedia?.detail
      ?? entity?.resolvedMedia?.hero
      ?? entity?.resolvedMedia?.primary
      ?? entity?.mediaLinks?.[0]?.media
      ?? null;
  }
}

function parseBlocks(input: string): Block[] {
  const normalized = input.replace(/\r\n?/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const lines = normalized.split('\n');
  const blocks: Block[] = [];
  const paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    const text = paragraphBuffer.join(' ').trim();
    paragraphBuffer.length = 0;

    if (!text) {
      return;
    }

    blocks.push({ kind: 'paragraph', tokens: parseWikilinks(text) });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? '';
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({
        kind: 'heading',
        level,
        tokens: parseWikilinks((headingMatch[2] ?? '').trim()),
      });
      continue;
    }

    if (line.startsWith(':::lead')) {
      flushParagraph();
      const leadLines: string[] = [];
      let cursor = index + 1;

      while (cursor < lines.length && (lines[cursor] ?? '').trim() !== ':::') {
        leadLines.push((lines[cursor] ?? '').trim());
        cursor += 1;
      }

      const leadText = leadLines.join(' ').trim();
      if (leadText) {
        blocks.push({ kind: 'lead', tokens: parseWikilinks(leadText) });
      }

      index = cursor;
      continue;
    }

    if (line.startsWith('>')) {
      flushParagraph();
      const quoteLines: string[] = [line.replace(/^>\s?/, '').trim()];
      let cursor = index + 1;

      while (cursor < lines.length) {
        const quoteLine = (lines[cursor] ?? '').trim();
        if (!quoteLine.startsWith('>')) {
          break;
        }

        quoteLines.push(quoteLine.replace(/^>\s?/, '').trim());
        cursor += 1;
      }

      const quoteText = quoteLines.join(' ').trim();
      if (quoteText) {
        blocks.push({ kind: 'quote', tokens: parseWikilinks(quoteText) });
      }

      index = cursor - 1;
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  return blocks;
}

function parseWikilinks(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const re = /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g;

  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input))) {
    if (m.index > last) {
      tokens.push(...parseInlineMarks(input.slice(last, m.index)));
    }

    const slug = (m[1] ?? '').trim();
    const label = (m[3] ?? m[1] ?? '').trim();

    tokens.push({ kind: 'link', slug, label });
    last = re.lastIndex;
  }

  if (last < input.length) {
    tokens.push(...parseInlineMarks(input.slice(last)));
  }

  return tokens;
}

function parseInlineMarks(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;

  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input))) {
    if (match.index > last) {
      tokens.push({ kind: 'text', value: input.slice(last, match.index) });
    }

    const strongValue = (match[2] ?? '').trim();
    const emValue = (match[4] ?? '').trim();

    if (strongValue) {
      tokens.push({ kind: 'strong', value: strongValue });
    } else if (emValue) {
      tokens.push({ kind: 'em', value: emValue });
    } else {
      tokens.push({ kind: 'text', value: match[0] ?? '' });
    }

    last = re.lastIndex;
  }

  if (last < input.length) {
    tokens.push({ kind: 'text', value: input.slice(last) });
  }

  return tokens;
}
