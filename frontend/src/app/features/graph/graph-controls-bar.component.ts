import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-graph-controls-bar',
  templateUrl: './graph-controls-bar.component.html',
  styleUrl: './graph-controls-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphControlsBarComponent {
  @Input({ required: true }) labelsMode!: 'auto' | 'always' | 'hidden';
  @Input({ required: true }) nodeCount = 0;
  @Input({ required: true }) edgeCount = 0;
  @Input({ required: true }) scalePercent = 100;
  @Input() graphReady = false;
  @Input() inspectorVisible = true;

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
        return 'Siempre';
      case 'hidden':
        return 'Nunca';
      default:
        return 'Auto';
    }
  }

  zoom(factor: number): void {
    this.graphZoom.emit(factor);
  }
}
