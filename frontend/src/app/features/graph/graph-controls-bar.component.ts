import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  ElementRef,
  HostListener,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  standalone: true,
  selector: 'app-graph-controls-bar',
  host: {
    '[class.graph-controls--detail]': 'detailLayout',
    '[class.graph-controls--footer]': 'footerOnly',
  },
  templateUrl: './graph-controls-bar.component.html',
  styleUrl: './graph-controls-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphControlsBarComponent {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly labelsMenuOpen = signal(false);
  readonly labelsModes = ['auto', 'always', 'hidden'] as const;
  readonly i18n = inject(I18nService);
  @Input({ required: true }) labelsMode!: 'auto' | 'always' | 'hidden';
  @Input({ required: true }) nodeCount = 0;
  @Input({ required: true }) edgeCount = 0;
  @Input({ required: true }) scalePercent = 100;
  @Input() imagesEnabled = true;
  @Input() detailLayout = false;
  @Input() footerOnly = false;
  @Input() graphReady = false;
  @Input() inspectorVisible = true;
  @Input() isMobileViewport = false;

  @Output() labelsModeChange = new EventEmitter<'auto' | 'always' | 'hidden'>();
  @Output() centerSelection = new EventEmitter<void>();
  @Output() graphZoom = new EventEmitter<number>();
  @Output() resetGraphView = new EventEmitter<void>();
  @Output() toggleImages = new EventEmitter<void>();
  @Output() toggleInspector = new EventEmitter<void>();

  setLabelsMode(mode: 'auto' | 'always' | 'hidden'): void {
    this.labelsModeChange.emit(mode);
    this.labelsMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  closeLabelsOnOutsideClick(event: MouseEvent): void {
    if (event.target instanceof Node && !this.element.nativeElement.contains(event.target)) {
      this.labelsMenuOpen.set(false);
    }
  }

  @HostListener('keydown.escape', ['$event'])
  closeLabelsOnEscape(event: Event): void {
    if (this.labelsMenuOpen()) {
      event.stopPropagation();
      this.labelsMenuOpen.set(false);
      this.element.nativeElement
        .querySelector<HTMLButtonElement>('.graph-utility-btn--mode')
        ?.focus();
    }
  }

  labelsModeLabel(): string {
    switch (this.labelsMode) {
      case 'always':
        return this.i18n.t('graph.labels.always');
      case 'hidden':
        return this.i18n.t('graph.labels.hidden');
      default:
        return this.i18n.t('graph.labels.auto');
    }
  }

  zoom(factor: number): void {
    this.graphZoom.emit(factor);
  }
}
