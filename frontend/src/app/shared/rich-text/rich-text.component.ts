import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { EntitiesApi } from '../../core/api/entities.api';
import {
  PublicEntity,
  PublicEntityMediaAsset,
  PublicEntityPreview,
} from '../../core/api/entities.models';
import { JanoMediaComponent } from '../media/jano-media.component';

type InlineToken =
  | { kind: 'text'; value: string }
  | { kind: 'strong'; value: string }
  | { kind: 'em'; value: string }
  | { kind: 'break' }
  | { kind: 'link'; slug: string; label: string };

type RichTextFormat =
  | 'heading'
  | 'bold'
  | 'italic'
  | 'bullet-list'
  | 'number-list'
  | 'quote'
  | 'link';

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; tokens: InlineToken[] }
  | { kind: 'paragraph'; tokens: InlineToken[] }
  | { kind: 'lead'; tokens: InlineToken[] }
  | { kind: 'quote'; tokens: InlineToken[] }
  | { kind: 'list'; ordered: boolean; items: InlineToken[][] };

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
  private document = inject(DOCUMENT);
  private changeDetector = inject(ChangeDetectorRef);
  private host = inject(ElementRef<HTMLElement>);
  @ViewChild('editor') private editor?: ElementRef<HTMLElement>;
  @ViewChild('entitySearch') private entitySearch?: ElementRef<HTMLInputElement>;

  @Input({ required: true }) text = '';
  @Input() previewAccess: 'public' | 'admin' = 'public';
  @Input() editable = false;
  @Input() placeholder = '';
  @Output() textChange = new EventEmitter<string>();

  openSlug = signal<string | null>(null);
  openPreviewKey = signal<string | null>(null);
  preview = signal<PublicEntityPreview | null>(null);
  previewLoading = signal(false);
  entityPickerOpen = signal(false);
  entityQuery = signal('');
  entityResults = signal<PublicEntity[]>([]);
  entityLoading = signal(false);
  activeEntityIndex = signal(0);
  entityPickerTop = signal(0);
  entityPickerLeft = signal(0);

  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private requestId = 0;
  private quoteExitArmed = false;
  private activeFormats = new Set<RichTextFormat>();
  private linkRange: Range | null = null;
  private entitySearchTimer: ReturnType<typeof setTimeout> | null = null;
  private entitySearchRequest = 0;

  isHoveringLink = false;
  isHoveringTooltip = false;

  get blocks(): Block[] {
    return parseBlocks(this.text ?? '');
  }

  get previewImageMedia(): PublicEntityMediaAsset | null {
    return this.selectPreviewImage(this.preview());
  }

  format(command: RichTextFormat): void {
    const editor = this.editor?.nativeElement;
    if (!editor) return;
    this.updateFormatState();
    const wasActive = this.isFormatActive(command);
    editor.focus();
    if (command === 'link') {
      if (wasActive) {
        this.document.execCommand('unlink');
      } else {
        this.openEntityPicker();
        return;
      }
    } else {
      const [name, value] = {
        heading: ['formatBlock', wasActive ? 'p' : 'h2'],
        bold: ['bold', ''],
        italic: ['italic', ''],
        'bullet-list': ['insertUnorderedList', ''],
        'number-list': ['insertOrderedList', ''],
        quote: ['formatBlock', wasActive ? 'p' : 'blockquote'],
      }[command];
      this.document.execCommand(name, false, value);
    }
    this.emitText(editor);
    this.updateFormatState();
  }

  openEntityPicker(anchor?: HTMLElement): void {
    this.updateFormatState();
    if (this.isFormatActive('link')) {
      this.format('link');
      return;
    }

    const editor = this.editor?.nativeElement;
    const selection = this.document.getSelection();
    if (!editor) return;
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    let query = '';
    if (range && editor.contains(range.commonAncestorContainer)) {
      this.linkRange = range.cloneRange();
      query = range.toString().trim();
    } else {
      this.linkRange = this.document.createRange();
      this.linkRange.selectNodeContents(editor);
      this.linkRange.collapse(false);
    }

    const bounds = anchor?.getBoundingClientRect();
    const hostBounds = this.host.nativeElement.getBoundingClientRect();
    this.entityPickerTop.set(
      Math.max(
        0,
        (bounds?.bottom ?? hostBounds.top) - hostBounds.top + this.host.nativeElement.scrollTop + 8,
      ),
    );
    this.entityPickerLeft.set(
      Math.max(
        0,
        Math.min(
          (bounds?.left ?? hostBounds.left) - hostBounds.left + this.host.nativeElement.scrollLeft,
          hostBounds.width - 360,
        ),
      ),
    );
    this.entityPickerOpen.set(true);
    this.onEntitySearch(query);
    setTimeout(() => {
      this.entitySearch?.nativeElement.focus();
      this.entitySearch?.nativeElement.select();
    });
  }

  onEntitySearch(value: string): void {
    const query = value.trim();
    this.entityQuery.set(value);
    this.entityResults.set([]);
    this.activeEntityIndex.set(0);
    if (this.entitySearchTimer) clearTimeout(this.entitySearchTimer);
    if (!query) {
      this.entityLoading.set(false);
      return;
    }

    this.entityLoading.set(true);
    const request = ++this.entitySearchRequest;
    this.entitySearchTimer = setTimeout(() => {
      const search =
        this.previewAccess === 'admin'
          ? this.api.adminList.bind(this.api)
          : this.api.list.bind(this.api);
      search({ q: query, limit: 8, sort: 'relevance' }).subscribe({
        next: (response) => {
          if (request !== this.entitySearchRequest) return;
          this.entityResults.set(response.items);
          this.entityLoading.set(false);
        },
        error: () => {
          if (request !== this.entitySearchRequest) return;
          this.entityLoading.set(false);
        },
      });
    }, 180);
  }

  onEntityPickerKeydown(event: KeyboardEvent): void {
    const results = this.entityResults();
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeEntityPicker();
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length) {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      this.activeEntityIndex.set(
        (this.activeEntityIndex() + delta + results.length) % results.length,
      );
    } else if (event.key === 'Enter' && results.length) {
      event.preventDefault();
      this.chooseEntity(results[this.activeEntityIndex()]);
    }
  }

  chooseEntity(entity: PublicEntity): void {
    const editor = this.editor?.nativeElement;
    const range = this.linkRange;
    if (!editor || !range) return;
    const label = range.toString().trim() || entity.title;
    const link = this.document.createElement('a');
    link.href = `/entity/${entity.slug}`;
    link.textContent = label;
    range.deleteContents();
    range.insertNode(link);
    const markdown = serializeMarkdown(editor);
    link.remove();
    this.text = markdown;
    this.textChange.emit(markdown);
    this.closeEntityPicker();
    this.changeDetector.detectChanges();
    setTimeout(() => {
      const links = Array.from(editor.querySelectorAll<HTMLAnchorElement>('.link'));
      const inserted = links
        .reverse()
        .find((candidate) => candidate.getAttribute('href')?.endsWith(`/entity/${entity.slug}`));
      if (!inserted) return;
      const caret = this.document.createRange();
      caret.setStartAfter(inserted.closest('.link-wrap') ?? inserted);
      caret.collapse(true);
      const selection = this.document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(caret);
      editor.focus();
      this.updateFormatState();
    });
  }

  closeEntityPicker(): void {
    if (this.entitySearchTimer) clearTimeout(this.entitySearchTimer);
    this.entitySearchRequest += 1;
    this.entityPickerOpen.set(false);
    this.entityLoading.set(false);
    this.entityResults.set([]);
    this.linkRange = null;
  }

  @HostListener('document:mousedown', ['$event'])
  closeEntityPickerFromOutside(event: MouseEvent): void {
    if (this.entityPickerOpen() && !this.host.nativeElement.contains(event.target)) {
      this.closeEntityPicker();
    }
  }

  isFormatActive(format: RichTextFormat): boolean {
    return this.activeFormats.has(format);
  }

  updateFormatState(): void {
    const editor = this.editor?.nativeElement;
    const selection = this.document.getSelection();
    const anchor = selection?.anchorNode;
    const element = anchor instanceof Element ? anchor : anchor?.parentElement;
    if (!editor || !element || !editor.contains(element)) {
      this.activeFormats.clear();
      return;
    }

    const queryState = (command: string) => this.document.queryCommandState?.(command) ?? false;
    this.activeFormats = new Set<RichTextFormat>(
      [
        element.closest('h2') && 'heading',
        queryState('bold') && 'bold',
        queryState('italic') && 'italic',
        queryState('insertUnorderedList') && 'bullet-list',
        queryState('insertOrderedList') && 'number-list',
        element.closest('blockquote') && 'quote',
        element.closest('a') && 'link',
      ].filter(Boolean) as RichTextFormat[],
    );
  }

  onInput(event: Event): void {
    this.emitText(event.currentTarget as HTMLElement);
    this.updateFormatState();
  }

  onEditorClick(event: MouseEvent): void {
    if (!this.editable || event.target !== event.currentTarget) return;
    this.quoteExitArmed = false;
    const editor = event.currentTarget as HTMLElement;
    let paragraph = editor.lastElementChild;
    if (paragraph?.tagName !== 'P' || paragraph.textContent?.trim()) {
      paragraph = this.document.createElement('p');
      paragraph.append(this.document.createElement('br'));
      editor.append(paragraph);
    }
    editor.focus();
    const range = this.document.createRange();
    range.setStart(paragraph, 0);
    range.collapse(true);
    const selection = this.document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    this.updateFormatState();
  }

  onEditorKeydown(event: KeyboardEvent): void {
    if (!this.editable) return;
    const selection = this.document.getSelection();
    const anchor = selection?.anchorNode;
    const quote = (anchor instanceof Element ? anchor : anchor?.parentElement)?.closest(
      'blockquote',
    );

    if (event.key !== 'Enter' || !quote) {
      this.quoteExitArmed = false;
      return;
    }
    if (!this.quoteExitArmed) {
      event.preventDefault();
      this.quoteExitArmed = true;
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (!range) return;
      range.deleteContents();
      const lineBreak = this.document.createElement('br');
      range.insertNode(lineBreak);
      if (!lineBreak.nextSibling) quote.append(this.document.createElement('br'));
      range.setStartAfter(lineBreak);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
      this.emitText(event.currentTarget as HTMLElement);
      return;
    }

    event.preventDefault();
    this.quoteExitArmed = false;
    while (
      quote.lastChild &&
      (quote.lastChild.nodeName === 'BR' || !quote.lastChild.textContent?.trim())
    ) {
      quote.lastChild.remove();
    }
    const paragraph = this.document.createElement('p');
    const lineBreak = this.document.createElement('br');
    paragraph.append(lineBreak);
    quote.after(paragraph);
    const range = this.document.createRange();
    range.setStart(paragraph, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    this.emitText(event.currentTarget as HTMLElement);
    this.updateFormatState();
  }

  onEditableLinkClick(event: MouseEvent): void {
    if (this.editable) event.preventDefault();
  }

  private emitText(editor: HTMLElement): void {
    this.textChange.emit(serializeMarkdown(editor));
  }

  onLinkEnter(slug: string, previewKey = slug) {
    this.isHoveringLink = true;
    this.cancelClose();

    if (
      this.openSlug() === slug &&
      this.openPreviewKey() === previewKey &&
      (this.previewLoading() || this.preview())
    ) {
      return;
    }

    this.openSlug.set(slug);
    this.openPreviewKey.set(previewKey);
    this.preview.set(null);
    this.previewLoading.set(true);

    const currentRequest = ++this.requestId;

    this.api.preview(slug, { includeDrafts: this.previewAccess === 'admin' }).subscribe({
      next: (p: PublicEntityPreview) => {
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

  private selectPreviewImage(entity: PublicEntityPreview | null): PublicEntityMediaAsset | null {
    const resolvedSlots = Array.isArray(entity?.mediaLibrary?.resolvedSlots)
      ? entity.mediaLibrary.resolvedSlots
      : [];

    for (const slotKey of ['preview', 'list', 'detail']) {
      const slot = resolvedSlots.find((candidate) => candidate?.slotKey === slotKey);
      if (slot?.item) {
        return slot.item;
      }
    }

    return (
      entity?.resolvedMedia?.thumbnail ??
      entity?.resolvedMedia?.card ??
      entity?.resolvedMedia?.detail ??
      entity?.resolvedMedia?.hero ??
      entity?.resolvedMedia?.primary ??
      null
    );
  }
}

function serializeMarkdown(root: HTMLElement): string {
  const inline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (!(node instanceof HTMLElement)) return '';
    const content = Array.from(node.childNodes).map(inline).join('');
    if (node.matches('strong, b')) return `**${content}**`;
    if (node.matches('em, i')) return `_${content}_`;
    if (node.matches('a')) {
      const path = node.getAttribute('href') ?? '';
      const slug = decodeURIComponent(path.split('/entity/')[1]?.split(/[?#]/)[0] ?? '');
      return slug ? `[[${slug}|${content}]]` : content;
    }
    if (node.matches('br')) return '\n';
    return content;
  };

  return Array.from(root.childNodes)
    .map((block) => {
      const content = inline(block).trim();
      if (!content) return '';
      if (!(block instanceof HTMLElement)) return content;
      if (block.matches('h1, h2, h3')) return `${'#'.repeat(Number(block.tagName[1]))} ${content}`;
      if (block.matches('blockquote'))
        return content
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n');
      if (block.matches('ul, ol')) {
        return Array.from(block.children)
          .map(
            (item, index) =>
              `${block.matches('ol') ? `${index + 1}.` : '-'} ${inline(item).trim()}`,
          )
          .join('\n');
      }
      return content;
    })
    .filter(Boolean)
    .join('\n\n');
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

    const headingMatch = /^(#{1,3})\s*(.+?)\s*#*\s*$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length as 1 | 2 | 3;
      const headingText = (headingMatch[2] ?? '').trim();
      if (!headingText) {
        continue;
      }
      blocks.push({
        kind: 'heading',
        level,
        tokens: parseWikilinks(headingText),
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

      if (quoteLines.some(Boolean)) {
        blocks.push({
          kind: 'quote',
          tokens: quoteLines.flatMap((quoteLine, quoteIndex) => [
            ...(quoteIndex ? ([{ kind: 'break' }] as InlineToken[]) : []),
            ...parseWikilinks(quoteLine),
          ]),
        });
      }

      index = cursor - 1;
      continue;
    }

    const listMatch = /^(?:([-*])|(\d+)\.)\s+(.+)$/.exec(line);
    if (listMatch) {
      flushParagraph();
      const ordered = Boolean(listMatch[2]);
      const items: InlineToken[][] = [];
      let cursor = index;

      while (cursor < lines.length) {
        const item = /^(?:([-*])|(\d+)\.)\s+(.+)$/.exec((lines[cursor] ?? '').trim());
        if (!item || Boolean(item[2]) !== ordered) break;
        items.push(parseWikilinks((item[3] ?? '').trim()));
        cursor += 1;
      }

      blocks.push({ kind: 'list', ordered, items });
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
  const re = /(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)/g;

  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input))) {
    if (match.index > last) {
      tokens.push({ kind: 'text', value: input.slice(last, match.index) });
    }

    const strongValue = (match[2] ?? match[4] ?? '').trim();
    const emValue = (match[6] ?? match[8] ?? '').trim();

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
