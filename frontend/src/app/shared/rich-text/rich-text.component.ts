// frontend/src/app/shared/rich-text/rich-text.component.ts
import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
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
  template: `
    <span class="rt">
      @for (t of tokens(); track $index) {
        @if (t.kind === 'text') {
          <span>{{ t.value }}</span>
        } @else {
          <span class="link-wrap">
            <a
              class="link"
              [routerLink]="['/entity', t.slug]"
              (mouseenter)="open(t.slug)"
              (focus)="open(t.slug)"
              (mouseleave)="close()"
              (blur)="close()"
            >
              {{ t.label }}
            </a>

            @if (openSlug() === t.slug && preview()) {
              <span class="tooltip" role="tooltip">
                <div class="tt-title">{{ preview()!.title }}</div>

                <div class="tt-meta">
                  <span>{{ preview()!.type }}</span>
                  @if (preview()!.startYear || preview()!.endYear) {
                    <span>• {{ preview()!.startYear ?? '' }}@if (preview()!.endYear) {–{{ preview()!.endYear }} }</span>
                  }
                  @if (preview()!.status) { <span>• {{ preview()!.status }}</span> }
                  @if (preview()!.contentLevel) { <span>• {{ preview()!.contentLevel }}</span> }
                </div>

                @if (preview()!.summary) {
                  <div class="tt-summary">{{ preview()!.summary }}</div>
                }

                @if (previewImageUrl()) {
                  <img class="tt-img" [src]="previewImageUrl()!" [alt]="preview()!.title" />
                }
              </span>
            }
          </span>
        }
      }
    </span>
  `,
  styles: [`
    .rt { position: relative; }

    .link-wrap {
      position: relative;
      display: inline-block;
    }

    .link {
      color: #111;
      font-weight: 650;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .tooltip {
      position: absolute;
      z-index: 20;
      left: 0;
      top: 22px;
      display: block;
      min-width: 260px;
      max-width: 360px;
      padding: 12px;
      border-radius: 14px;
      border: 1px solid rgba(0,0,0,.08);
      background: #fff;
      box-shadow: 0 14px 40px rgba(0,0,0,.12);
      color: #222;
    }

    .tt-title { font-weight: 800; margin-bottom: 4px; }
    .tt-meta {
      font-size: 12px;
      color: #666;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .tt-summary { font-size: 13px; color: #444; line-height: 1.4; }

    .tt-img {
      width: 100%;
      margin-top: 10px;
      border-radius: 10px;
      object-fit: cover;
      max-height: 140px;
    }
  `],
})
export class RichTextComponent {
  private api = inject(EntitiesApi);

  @Input({ required: true }) text = '';

  openSlug = signal<string | null>(null);
  preview = signal<any | null>(null);

  tokens = computed<Token[]>(() => parseWikilinks(this.text ?? ''));

  previewImageUrl = computed<string | null>(() => {
    const p = this.preview();
    return p?.mediaLinks?.[0]?.media?.url ?? null;
  });

  open(slug: string) {
    this.openSlug.set(slug);

    // cache simple
    if (this.preview()?.slug === slug) return;

    this.api.preview(slug).subscribe((p: any) => {
      this.preview.set(p);
    });
  }

  close() {
    this.openSlug.set(null);
  }
}

function parseWikilinks(input: string): Token[] {
  const tokens: Token[] = [];
  const re = /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g;

  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input))) {
    if (m.index > last) tokens.push({ kind: 'text', value: input.slice(last, m.index) });

    const slug = (m[1] ?? '').trim();
    const label = (m[3] ?? m[1] ?? '').trim();

    tokens.push({ kind: 'link', slug, label });
    last = re.lastIndex;
  }

  if (last < input.length) tokens.push({ kind: 'text', value: input.slice(last) });
  return tokens;
}