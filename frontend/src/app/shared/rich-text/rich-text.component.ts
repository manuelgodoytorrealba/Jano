import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { EntitiesApi } from '../../core/api/entities.api';

type Token =
  | { kind: 'text'; value: string }
  | { kind: 'link'; slug: string; label: string };

@Component({
  standalone: true,
  selector: 'app-rich-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './rich-text.component.html',
  styleUrls: ['./rich-text.component.scss'],
})
export class RichTextComponent {
  private api = inject(EntitiesApi);

  @Input({ required: true }) text = '';

  openSlug = signal<string | null>(null);
  preview = signal<any | null>(null);
  previewLoading = signal(false);

  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private requestId = 0;

  isHoveringLink = false;
  isHoveringTooltip = false;

  get tokens(): Token[] {
    return parseWikilinks(this.text ?? '');
  }

  get previewImageUrl(): string | null {
    const p = this.preview();
    return p?.mediaLinks?.[0]?.media?.url ?? null;
  }

  onLinkEnter(slug: string) {
    this.isHoveringLink = true;
    this.cancelClose();

    if (this.openSlug() === slug && (this.previewLoading() || this.preview())) {
      return;
    }

    this.openSlug.set(slug);
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

  onLinkFocus(slug: string) {
    this.onLinkEnter(slug);
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
}

function parseWikilinks(input: string): Token[] {
  const tokens: Token[] = [];
  const re = /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g;

  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input))) {
    if (m.index > last) {
      tokens.push({ kind: 'text', value: input.slice(last, m.index) });
    }

    const slug = (m[1] ?? '').trim();
    const label = (m[3] ?? m[1] ?? '').trim();

    tokens.push({ kind: 'link', slug, label });
    last = re.lastIndex;
  }

  if (last < input.length) {
    tokens.push({ kind: 'text', value: input.slice(last) });
  }

  return tokens;
}