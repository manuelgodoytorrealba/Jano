import { RouterLink } from '@angular/router';
import { Component, Input, OnChanges, inject } from '@angular/core';
import { RichTextComponent } from '../rich-text/rich-text.component';
import { ArticleReadingBlock, articleReadingBlocks } from '../article-blocks';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-article-reading',
  standalone: true,
  imports: [RichTextComponent, RouterLink],
  template: `
    <article class="article-flow">
      @for (block of blocks; track $index) {
        <section
          class="article-paragraph"
          [class.has-image]="block.imageUrl"
          [class.image-left]="block.imageLeft"
          [class.is-link-group]="block.links.length"
        >
          @if (block.links.length) {
            <nav class="article-links" [attr.aria-label]="i18n.t('article.explorePieces')">
              <p>{{ i18n.t('article.explorePieces') }}</p>
              <div>
                @for (link of block.links; track $index) {
                  <a [routerLink]="['/entity', link.slug]"
                    >{{ link.label }} <span aria-hidden="true">↗</span></a
                  >
                }
              </div>
            </nav>
          } @else {
            <app-rich-text [text]="block.text" [previewAccess]="previewAccess" />
          }
          @if (block.imageUrl) {
            <figure>
              <button
                type="button"
                class="image-button"
                [attr.aria-label]="i18n.t('research.publication.enlargeImage')"
                (click)="viewer.showModal()"
              >
                <img [src]="block.imageUrl" [alt]="block.caption" loading="lazy" />
              </button>
              @if (block.caption) {
                <figcaption>{{ block.caption }}</figcaption>
              }
              <dialog
                tabindex="-1"
                #viewer
                (keydown.escape)="$event.stopPropagation()"
                [attr.aria-label]="i18n.t('research.publication.enlargeImage')"
              >
                <form method="dialog">
                  <button type="submit">{{ i18n.t('research.publication.closeImage') }} ×</button>
                </form>
                <img [src]="block.imageUrl" [alt]="block.caption" loading="lazy" />
                <p>{{ block.caption }}</p>
              </dialog>
            </figure>
          }
        </section>
      }
    </article>
  `,
  styleUrl: './article-reading.component.scss',
})
export class ArticleReadingComponent implements OnChanges {
  readonly i18n = inject(I18nService);
  @Input() content = '';
  @Input() previewAccess: 'public' | 'admin' = 'public';
  blocks: ArticleReadingBlock[] = [];
  ngOnChanges(): void {
    this.blocks = articleReadingBlocks(this.content);
  }
}
