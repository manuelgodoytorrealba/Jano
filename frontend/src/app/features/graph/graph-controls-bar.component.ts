import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  standalone: true,
  selector: 'app-graph-controls-bar',
  templateUrl: './graph-controls-bar.component.html',
  styleUrl: './graph-controls-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphControlsBarComponent {
  readonly i18n = inject(I18nService);
  @Input({ required: true }) labelsMode!: 'auto' | 'always' | 'hidden';
  @Input({ required: true }) nodeCount = 0;
  @Input({ required: true }) edgeCount = 0;
  @Input({ required: true }) scalePercent = 100;
  @Input() graphReady = false;
  @Input() inspectorVisible = true;
  @Input() isMobileViewport = false;

  @Output() labelsModeChange = new EventEmitter<'auto' | 'always' | 'hidden'>();
  @Output() centerSelection = new EventEmitter<void>();
  @Output() graphZoom = new EventEmitter<number>();
  @Output() resetGraphView = new EventEmitter<void>();
  @Output() toggleInspector = new EventEmitter<void>();

  setLabelsMode(mode: 'auto' | 'always' | 'hidden'): void {
    this.labelsModeChange.emit(mode);
  }

  cycleLabelsMode(): void {
    const nextMode: 'auto' | 'always' | 'hidden' =
      this.labelsMode === 'auto' ? 'always' : this.labelsMode === 'always' ? 'hidden' : 'auto';
    this.labelsModeChange.emit(nextMode);
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
