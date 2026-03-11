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
  templateUrl: './rich-text.component.html',
  styleUrls: ['./rich-text.component.scss'],
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