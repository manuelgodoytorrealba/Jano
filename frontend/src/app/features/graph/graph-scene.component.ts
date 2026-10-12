import { CommonModule } from '@angular/common';
import { GraphTooltipPositionDirective } from './graph-tooltip-position.directive';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  OnDestroy,
  signal,
} from '@angular/core';
import {
  GraphAmbientField,
  GraphEdge,
  GraphRenderedEdge,
  GraphRenderedNode,
  GraphTooltip,
} from './graph.models';

@Component({
  standalone: true,
  selector: 'app-graph-scene',
  imports: [CommonModule, GraphTooltipPositionDirective],
  templateUrl: './graph-scene.component.html',
  styleUrl: './graph-scene.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphSceneComponent implements OnDestroy {
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingHover: { event: PointerEvent; nodeId: string } | null = null;
  private activeHoverId: string | null = null;

  hoverNode(event: PointerEvent, nodeId: string): void {
    if (event.pointerType === 'touch' || event.buttons || this.interactionActive) return;
    if (this.activeHoverId === nodeId) {
      this.nodeHover.emit({ event, nodeId });
      return;
    }
    this.pendingHover = { event, nodeId };
    if (this.hoverTimer) return;
    this.hoverTimer = setTimeout(() => {
      this.hoverTimer = null;
      if (!this.pendingHover || this.interactionActive) {
        this.pendingHover = null;
        return;
      }
      this.activeHoverId = this.pendingHover.nodeId;
      this.nodeHover.emit(this.pendingHover);
      this.pendingHover = null;
    }, 140);
  }

  leaveNode(): void {
    this.cancelPendingHover();
    this.clearHover.emit();
  }

  ngOnDestroy(): void {
    this.cancelPendingHover();
  }

  private cancelPendingHover(): void {
    if (this.hoverTimer) clearTimeout(this.hoverTimer);
    this.hoverTimer = null;
    this.pendingHover = null;
    this.activeHoverId = null;
  }
  readonly failedImages = signal<Set<string>>(new Set());

  imageFailed(url: string): void {
    this.failedImages.update((failed) => new Set([...failed, url]));
  }

  @Input() ambientFields: GraphAmbientField[] = [];
  @Input({ required: true }) markerDefs: Array<{ id: string; color: string }> = [];
  @Input({ required: true }) viewportTransform = '';
  @Input({ required: true }) renderedEdges: GraphRenderedEdge[] = [];
  @Input({ required: true }) renderedNodes: GraphRenderedNode[] = [];
  @Input({ required: true }) edgeLabelVisibility: Record<string, boolean> = {};
  @Input({ required: true }) nodeLabelVisibility: Record<string, boolean> = {};
  @Input() interactionActive = false;
  @Input() tooltip: GraphTooltip | null = null;
  @Input() tooltipAnchorId: string | null = null;

  @HostBinding('class.is-interacting')
  get isInteracting(): boolean {
    return this.interactionActive;
  }

  @Output() nodePointerDown = new EventEmitter<{ event: PointerEvent; nodeId: string }>();
  @Output() nodePointerMove = new EventEmitter<PointerEvent>();
  @Output() nodePointerUp = new EventEmitter<{ event: PointerEvent; nodeId: string }>();
  @Output() nodePointerCancel = new EventEmitter<PointerEvent>();
  @Output() nodeHover = new EventEmitter<{ event: PointerEvent; nodeId: string }>();
  @Output() edgeHover = new EventEmitter<{ event: PointerEvent; edge: GraphEdge }>();
  @Output() edgeActivate = new EventEmitter<{ event: PointerEvent; edge: GraphEdge }>();
  @Output() dismissTooltip = new EventEmitter<void>();
  @Output() retainTooltip = new EventEmitter<void>();
  @Output() clearHover = new EventEmitter<void>();
}
