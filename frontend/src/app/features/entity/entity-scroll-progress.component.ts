import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-entity-scroll-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (scrollRange() > 0) {
      <input
        class="entity-scroll-progress"
        type="range"
        min="0"
        max="100"
        step="0.1"
        [value]="progress()"
        [attr.aria-label]="i18n.t('detail.pageNavigation')"
        aria-orientation="vertical"
        (input)="navigate($event)"
      />
    }
  `,
  styleUrl: './_entity-scroll-progress.scss',
})
export class EntityScrollProgressComponent implements OnDestroy {
  readonly i18n = inject(I18nService);
  private readonly document = inject(DOCUMENT);
  readonly progress = signal(0);
  readonly scrollRange = signal(0);
  private resizeObserver?: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      this.updateProgress();
      this.resizeObserver = new ResizeObserver(() => this.updateProgress());
      this.resizeObserver.observe(this.document.body);
    });
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  updateProgress(): void {
    const root = this.document.scrollingElement;
    if (!root) return;
    const range = Math.max(0, root.scrollHeight - root.clientHeight);
    this.scrollRange.set(range);
    this.progress.set(range ? Math.max(0, Math.min(100, (root.scrollTop / range) * 100)) : 0);
  }

  navigate(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.document.defaultView?.scrollTo({
      top: (value / 100) * this.scrollRange(),
      behavior: 'instant',
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }
}
