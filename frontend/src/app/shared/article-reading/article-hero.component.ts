import { Component, Input, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
@Component({
  selector: 'app-article-hero',
  standalone: true,
  template: `<header>
    <div class="meta">
      <span>{{ i18n.t('entity.article') }}</span>
      @if (author) {
        <span>{{ author }}</span>
      }
      @if (date) {
        <span>{{ date }}</span>
      }
      @if (startYear || endYear) {
        <span>{{ startYear ?? '' }} {{ endYear ? '– ' + endYear : '' }}</span>
      }
    </div>
    <h1>{{ title }}</h1>
    @if (summary) {
      <p>{{ summary }}</p>
    }
  </header>`,
  styles: [
    `
      :host {
        display: block;
      }
      header {
        padding: clamp(8px, 2vw, 24px);
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        color: var(--color-text-soft);
        font-size: 13px;
      }
      h1 {
        max-width: 900px;
        margin: 20px 0;
        font-size: clamp(36px, 4.6vw, 64px);
        line-height: 1.1;
        letter-spacing: -0.035em;
        color: var(--color-text);
      }
      p {
        max-width: 65ch;
        margin: 0;
        font-size: 20px;
        line-height: 1.7;
        color: var(--color-text-soft);
      }
    `,
  ],
})
export class ArticleHeroComponent {
  readonly i18n = inject(I18nService);
  @Input() title = '';
  @Input() summary: string | null | undefined;
  @Input() author: string | null | undefined;
  @Input() date: string | null | undefined;
  @Input() startYear: number | null | undefined;
  @Input() endYear: number | null | undefined;
}
