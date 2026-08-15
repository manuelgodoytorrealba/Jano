import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  HostBinding,
  ElementRef,
  inject,
  Input,
  Output,
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
  imports: [CommonModule],
  templateUrl: './graph-scene.component.html',
  styleUrl: './graph-scene.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphSceneComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  @Input() ambientFields: GraphAmbientField[] = [];
  @Input({ required: true }) markerDefs: Array<{ id: string; color: string }> = [];
  @Input({ required: true }) viewportTransform = '';
  @Input({ required: true }) renderedEdges: GraphRenderedEdge[] = [];
  @Input({ required: true }) renderedNodes: GraphRenderedNode[] = [];
  @Input({ required: true }) edgeLabelVisibility: Record<string, boolean> = {};
  @Input({ required: true }) nodeLabelVisibility: Record<string, boolean> = {};
  @Input() interactionActive = false;
  @Input() tooltip: GraphTooltip | null = null;
  @Input() tooltipStyle: Record<string, string> = {};

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
  @Output() tooltipMove = new EventEmitter<PointerEvent>();
  @Output() clearHover = new EventEmitter<void>();

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (!target || !this.host.nativeElement.contains(target)) return;

    const edgeElement = target.closest<SVGElement>('.graph-edge-hit, .graph-edge-label');
    if (edgeElement) {
      const edgeId = edgeElement.getAttribute('data-edge-id');
      const renderedEdge = this.renderedEdges.find((item) => item.edge.id === edgeId);
      if (renderedEdge) {
        this.edgeHover.emit({ event: event as PointerEvent, edge: renderedEdge.edge });
        this.tooltipMove.emit(event as PointerEvent);
        return;
      }
    }

    const nodeElement = target.closest<SVGGElement>('.graph-node');
    const nodeId = nodeElement?.getAttribute('data-node-id');
    if (nodeId) {
      this.nodeHover.emit({ event: event as PointerEvent, nodeId });
    }
  }
}
