import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { EntitiesApi } from '../../core/api/entities.api';
import { compactGraphLabel, shouldRenderGraphLabel } from './graph-labels';
import {
  clearPointerCapture,
  exceedsPointerThreshold,
  GraphPointerSession,
  shouldSuppressHover,
} from './graph-interaction';
import {
  getEntityTypeConfig,
  getRelationTypeConfig,
  graphNodeShapePath,
  humanizeGraphKey,
  lineDasharray,
} from './graph.config';
import {
  createInitialPositions,
  edgeCurveOffset,
  edgeMidpoint,
  edgePath,
  measureGraphBounds,
  normalizeGraphData,
  stepForceLayout,
} from './graph-layout';
import {
  createGraphViewport,
  fitGraphBounds,
  focusGraphPoint,
  graphViewportTransform,
  interpolateViewport,
  panGraphViewport,
  zoomGraphViewport,
} from './graph-viewport';
import {
  createImageViewport,
  clampImageViewport,
  imageViewportTransform,
  ImageAssetSize,
  ImageViewport,
  interpolateImageViewport,
  panImageViewport,
  zoomImageViewport,
} from './image-viewport';
import { GraphData, GraphEdge, GraphPoint, GraphResponseDto, GraphTooltip, GraphViewport } from './graph.models';
import {
  ExplorerPersistedState,
  loadExplorerState,
  restoreGraphViewport,
  restoreImageViewport,
  saveExplorerState,
  serializeGraphViewport,
  serializeImageViewport,
} from './graph-persistence';
import { buildImageSyncOverlay } from './image-graph-sync';

type ImageMeta = {
  source?: string | null;
  photoBy?: string | null;
  license?: string | null;
};

@Component({
  standalone: true,
  selector: 'app-graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
})
export class GraphComponent implements OnChanges, AfterViewInit, OnDestroy {
  private readonly api = inject(EntitiesApi);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  @Input({ required: true }) slug!: string;
  @Input() imageUrl: string | null = null;
  @Input() imageAlt = '';
  @Input() entityTitle = '';
  @Input() entityType = '';
  @Input() imageMeta: ImageMeta | null = null;

  @ViewChild('graphStage') graphStage?: ElementRef<HTMLDivElement>;
  @ViewChild('imageStage') imageStage?: ElementRef<HTMLDivElement>;

  readonly graph = signal<GraphData | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedNodeId = signal<string | null>(null);
  readonly hoveredNodeId = signal<string | null>(null);
  readonly hoveredEdgeId = signal<string | null>(null);
  readonly tooltip = signal<GraphTooltip | null>(null);
  readonly labelsMode = signal<'auto' | 'always' | 'hidden'>('auto');
  readonly graphViewport = signal<GraphViewport>({ x: 0, y: 0, scale: 0.82 });
  readonly imageViewport = signal<ImageViewport>({ x: 0, y: 0, scale: 1, fitScale: 1 });
  readonly graphSize = signal({ width: 0, height: 0 });
  readonly imageSize = signal({ width: 0, height: 0 });
  readonly imageAsset = signal<ImageAssetSize | null>(null);
  readonly entityTypeFilters = signal<Record<string, boolean>>({});
  readonly relationTypeFilters = signal<Record<string, boolean>>({});
  readonly renderTick = signal(0);

  private loadSub?: Subscription;
  private graphResizeObserver?: ResizeObserver;
  private imageResizeObserver?: ResizeObserver;
  private frameId: number | null = null;
  private initialFocusFrameId: number | null = null;
  private initialFocusPasses = 0;
  private targetGraphViewport: GraphViewport | null = null;
  private targetImageViewport: ImageViewport | null = null;
  private positions: Record<string, GraphPoint> = {};
  private velocities: Record<string, GraphPoint> = {};
  private pointerSession: GraphPointerSession | null = null;
  private imageViewportReady = false;
  private graphViewportReady = false;
  private persistedState: ExplorerPersistedState | null = null;
  private pendingInitialEntityFocus = false;
  private selectedNodeSource: 'center' | 'explicit' = 'center';

  readonly filteredNodes = computed(() => {
    const graph = this.graph();
    if (!graph) {
      return [];
    }

    const filters = this.entityTypeFilters();
    return graph.nodes.filter((node) => node.id === graph.centerId || filters[node.type] !== false);
  });

  readonly visibleNodeIds = computed(() => new Set(this.filteredNodes().map((node) => node.id)));

  readonly filteredEdges = computed(() => {
    const graph = this.graph();
    if (!graph) {
      return [];
    }

    const filters = this.relationTypeFilters();
    const visibleNodeIds = this.visibleNodeIds();

    return graph.edges.filter(
      (edge) =>
        filters[edge.relationType] !== false &&
        visibleNodeIds.has(edge.source) &&
        visibleNodeIds.has(edge.target),
    );
  });

  readonly selectedNode = computed(() => {
    const graph = this.graph();
    const selectedNodeId = this.selectedNodeId();
    return graph?.nodes.find((node) => node.id === selectedNodeId) ?? null;
  });
  readonly contextualNode = computed(() => this.selectedNode() ?? this.centerNode());
  readonly centerNode = computed(() => {
    const graph = this.graph();
    return graph?.nodes.find((node) => node.id === graph.centerId) ?? null;
  });
  readonly imageSyncOverlay = computed(() =>
    buildImageSyncOverlay(
      this.centerNode(),
      this.selectedNodeSource === 'explicit' ? this.selectedNode() : null,
      shouldSuppressHover(this.pointerSession),
    ),
  );

  readonly selectedNeighbors = computed(() => {
    const selectedNodeId = this.selectedNodeId();
    const related = new Set<string>();

    if (!selectedNodeId) {
      return related;
    }

    for (const edge of this.filteredEdges()) {
      if (edge.source === selectedNodeId) {
        related.add(edge.target);
      }
      if (edge.target === selectedNodeId) {
        related.add(edge.source);
      }
    }

    return related;
  });

  readonly hasVisibleSelection = computed(() => {
    const selectedNodeId = this.selectedNodeId();
    return selectedNodeId ? this.visibleNodeIds().has(selectedNodeId) : false;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slug']?.currentValue) {
      this.persistedState = loadExplorerState(this.slug);
      this.graphViewportReady = false;
      this.imageViewportReady = false;
      this.targetGraphViewport = null;
      this.targetImageViewport = null;
      this.selectedNodeSource = 'center';
      this.loadGraph();
    }

    if (changes['imageUrl'] && !changes['imageUrl'].firstChange) {
      this.imageAsset.set(null);
      this.imageViewportReady = false;
      this.targetImageViewport = null;
      this.imageViewport.set({ x: 0, y: 0, scale: 1, fitScale: 1 });
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.measureGraphStage();
    this.measureImageStage();

    if (this.graph()) {
      this.positions[this.graph()!.centerId] = { x: 0, y: 0 };
      this.pendingInitialEntityFocus = true;
      this.startAnimationLoop();
      this.scheduleInitialEntityFocus();
    }

    const graphStage = this.graphStage?.nativeElement;
    if (graphStage) {
      this.graphResizeObserver = new ResizeObserver(() => this.measureGraphStage());
      this.graphResizeObserver.observe(graphStage);
    }

    const imageStage = this.imageStage?.nativeElement;
    if (imageStage) {
      this.imageResizeObserver = new ResizeObserver(() => this.measureImageStage());
      this.imageResizeObserver.observe(imageStage);
    }
  }

  ngOnDestroy(): void {
    this.persistExplorerState();
    this.loadSub?.unsubscribe();
    this.graphResizeObserver?.disconnect();
    this.imageResizeObserver?.disconnect();
    if (this.frameId !== null && this.isBrowser) {
      cancelAnimationFrame(this.frameId);
    }
    if (this.initialFocusFrameId !== null && this.isBrowser) {
      cancelAnimationFrame(this.initialFocusFrameId);
    }
  }

  private loadGraph(): void {
    if (!this.slug) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.tooltip.set(null);
    this.loadSub?.unsubscribe();

    this.loadSub = this.api.graph(this.slug).subscribe({
      next: (response) => {
        const graph = this.toGraphData(response);
        const persistedGraph = this.persistedState?.graph;
        const seededPositions = createInitialPositions(graph);
        this.graph.set(graph);
        this.positions = graph.nodes.reduce<Record<string, GraphPoint>>((acc, node) => {
          acc[node.id] =
            node.id === graph.centerId
              ? { x: 0, y: 0 }
              : persistedGraph?.positions?.[node.id] ?? seededPositions[node.id] ?? { x: 0, y: 0 };
          return acc;
        }, {});
        this.velocities = {};
        this.entityTypeFilters.set(this.createFilterMap(graph.entityTypes, persistedGraph?.entityTypeFilters));
        this.relationTypeFilters.set(this.createFilterMap(graph.relationTypes, persistedGraph?.relationTypeFilters));
        this.labelsMode.set(persistedGraph?.labelsMode ?? 'auto');
        this.selectedNodeSource = 'center';
        this.selectedNodeId.set(graph.centerId);
        this.loading.set(false);
        this.graphViewportReady = false;
        this.pendingInitialEntityFocus = true;
        this.startAnimationLoop();
        this.scheduleInitialEntityFocus();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el grafo.');
      },
    });
  }

  private toGraphData(response: GraphResponseDto): GraphData {
    return normalizeGraphData({
      centerId: response.centerId,
      nodes: response.nodes.map((node) => ({ ...node, degree: 0 })),
      edges: response.edges.map((edge) => ({
        ...edge,
        label: edge.label ?? humanizeGraphKey(edge.relationType),
        directed: edge.directed ?? getRelationTypeConfig(edge.relationType).directed,
        weight: edge.weight ?? 1,
        parallelIndex: 0,
        parallelTotal: 1,
      })),
      entityTypes: response.filters?.entityTypes ?? Array.from(new Set(response.nodes.map((node) => node.type))),
      relationTypes:
        response.filters?.relationTypes ?? Array.from(new Set(response.edges.map((edge) => edge.relationType))),
    });
  }

  private createEnabledMap(values: string[]): Record<string, boolean> {
    return values.reduce<Record<string, boolean>>((acc, value) => {
      acc[value] = true;
      return acc;
    }, {});
  }

  private createFilterMap(values: string[], persisted?: Record<string, boolean>): Record<string, boolean> {
    const defaults = this.createEnabledMap(values);
    if (!persisted) {
      return defaults;
    }

    return values.reduce<Record<string, boolean>>((acc, value) => {
      acc[value] = persisted[value] !== false;
      return acc;
    }, {});
  }

  private startAnimationLoop(): void {
    if (!this.isBrowser || this.frameId !== null) {
      return;
    }

    const frame = () => {
      this.frameId = requestAnimationFrame(frame);

      const graph = this.graph();
      if (graph) {
        stepForceLayout(graph, this.positions, this.velocities, this.pointerSession?.kind === 'node-drag' ? this.pointerSession.nodeId : null);
      }

      this.animateGraphViewport();
      this.animateImageViewport();
      this.renderTick.update((value) => value + 1);
    };

    this.frameId = requestAnimationFrame(frame);
  }

  private animateGraphViewport(): void {
    const target = this.targetGraphViewport;
    if (!target) {
      return;
    }

    const { next, done } = interpolateViewport(this.graphViewport(), target);
    this.graphViewport.set(next);
    if (done) {
      this.targetGraphViewport = null;
      this.graphViewportReady = true;
      this.persistExplorerState();
    }
  }

  private animateImageViewport(): void {
    const target = this.targetImageViewport;
    if (!target) {
      return;
    }

    const { next, done } = interpolateImageViewport(this.imageViewport(), target);
    this.imageViewport.set(next);
    if (done) {
      this.targetImageViewport = null;
      this.imageViewportReady = true;
      this.persistExplorerState();
    }
  }

  private measureGraphStage(): void {
    const host = this.graphStage?.nativeElement;
    if (!host) {
      return;
    }

    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const previous = this.graphSize();
    this.graphSize.set({ width: rect.width, height: rect.height });

    if (!this.graph()) {
      return;
    }

    if (!previous.width || !previous.height || !this.graphViewportReady) {
      this.scheduleInitialEntityFocus();
      return;
    }

    const snapshot = serializeGraphViewport(this.targetGraphViewport ?? this.graphViewport(), previous);
    const restored = restoreGraphViewport(snapshot, { width: rect.width, height: rect.height });
    if (!restored) {
      return;
    }

    this.targetGraphViewport = null;
    this.graphViewport.set(restored);
    this.graphViewportReady = true;
  }

  private measureImageStage(): void {
    const host = this.imageStage?.nativeElement;
    if (!host) {
      return;
    }

    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const previous = this.imageSize();
    this.imageSize.set({ width: rect.width, height: rect.height });

    const asset = this.imageAsset();
    if (!asset) {
      return;
    }

    if (!previous.width || !previous.height || !this.imageViewportReady) {
      this.syncImageViewport(undefined, false);
      return;
    }

    const snapshot = serializeImageViewport(this.targetImageViewport ?? this.imageViewport(), previous);
    this.targetImageViewport = null;
    this.imageViewport.set(restoreImageViewport(snapshot, { width: rect.width, height: rect.height }, asset));
    this.imageViewportReady = true;
  }

  onImageLoaded(event: Event): void {
    const image = event.target as HTMLImageElement;
    this.imageAsset.set({
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    });
    this.syncImageViewport(undefined, false);
  }

  graphViewportTransform(): string {
    return graphViewportTransform(this.graphViewport());
  }

  imageTransform(): string {
    return imageViewportTransform(this.imageViewport());
  }

  nodePosition(nodeId: string): GraphPoint {
    this.renderTick();
    return this.positions[nodeId] ?? { x: 0, y: 0 };
  }

  nodeTransform(nodeId: string): string {
    const point = this.nodePosition(nodeId);
    return `translate(${point.x} ${point.y})`;
  }

  nodeShapePath(nodeId: string): string {
    const graph = this.graph();
    const node = graph?.nodes.find((item) => item.id === nodeId);
    return graphNodeShapePath(getEntityTypeConfig(node?.type ?? '').shape, this.nodeSize(nodeId));
  }

  nodeSize(nodeId: string): number {
    const graph = this.graph();
    const node = graph?.nodes.find((item) => item.id === nodeId);
    const base = nodeId === graph?.centerId ? 28 : 22;
    const degreeBoost = Math.min(node?.degree ?? 0, 5) * 1.25;
    const selectedBoost = this.selectedNodeId() === nodeId ? 6 : 0;
    return base + degreeBoost + selectedBoost;
  }

  nodeHaloSize(nodeId: string): number {
    return this.nodeSize(nodeId) + 12;
  }

  nodeConfig(type: string) {
    return getEntityTypeConfig(type);
  }

  relationConfig(type: string) {
    return getRelationTypeConfig(type);
  }

  edgeDasharray(type: string): string {
    return lineDasharray(this.relationConfig(type).style);
  }

  edgeMarkerId(type: string): string {
    return `graph-arrow-${type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }

  edgeCurve(edge: GraphEdge): number {
    return edgeCurveOffset(edge);
  }

  edgePath(edge: GraphEdge): string {
    return edgePath(this.nodePosition(edge.source), this.nodePosition(edge.target), this.edgeCurve(edge));
  }

  edgeLabelPoint(edge: GraphEdge): GraphPoint {
    return edgeMidpoint(this.nodePosition(edge.source), this.nodePosition(edge.target), this.edgeCurve(edge));
  }

  edgeLabel(edge: GraphEdge): string {
    return compactGraphLabel(edge.label, 24);
  }

  compactLabel(label: string, maxLength = 28): string {
    return compactGraphLabel(label, maxLength);
  }

  isNodeMuted(nodeId: string): boolean {
    const selectedNodeId = this.selectedNodeId();
    if (!selectedNodeId || selectedNodeId === nodeId) {
      return false;
    }

    return !this.selectedNeighbors().has(nodeId);
  }

  isEdgeMuted(edge: GraphEdge): boolean {
    const selectedNodeId = this.selectedNodeId();
    if (!selectedNodeId) {
      return false;
    }

    return edge.source !== selectedNodeId && edge.target !== selectedNodeId;
  }

  shouldShowEdgeLabel(edge: GraphEdge): boolean {
    const selectedNodeId = this.selectedNodeId();

    return shouldRenderGraphLabel({
      mode: this.labelsMode(),
      scale: this.graphViewport().scale,
      edgeCount: this.filteredEdges().length,
      highlighted: this.hoveredEdgeId() === edge.id,
      connectedToSelection: edge.source === selectedNodeId || edge.target === selectedNodeId,
    });
  }

  resetAllViews(): void {
    this.resetImageView();
    this.resetGraphView();
  }

  resetGraphView(animate = true): void {
    this.focusCurrentEntity(false);
  }

  resetImageView(animate = true): void {
    const next = createImageViewport(this.imageSize(), this.imageAsset());
    if (!this.imageAsset() || !this.imageSize().width || !this.imageSize().height) {
      return;
    }

    if (animate) {
      this.targetImageViewport = next;
      this.persistExplorerState();
      return;
    }

    this.targetImageViewport = null;
    this.imageViewport.set(next);
    this.imageViewportReady = true;
    this.persistExplorerState();
  }

  centerSelection(): void {
    const graph = this.graph();
    if (!graph) {
      this.resetGraphView();
      return;
    }

    this.focusCurrentEntity(false);
  }

  focusCurrentEntity(animate = false): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    this.selectedNodeSource = 'center';
    this.selectedNodeId.set(graph.centerId);
    this.positions[graph.centerId] = { x: 0, y: 0 };
    this.velocities[graph.centerId] = { x: 0, y: 0 };
    const next = this.createEntityFocusedGraphViewport();
    if (!next) {
      return;
    }

    if (animate) {
      this.targetGraphViewport = next;
    } else {
      this.targetGraphViewport = null;
      this.graphViewport.set(next);
      this.graphViewportReady = true;
    }

    this.persistExplorerState();
  }

  focusNode(nodeId: string): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    const node = graph.nodes.find((item) => item.id === nodeId);
    if (!node) {
      return;
    }

    this.selectedNodeSource = nodeId === graph.centerId ? 'center' : 'explicit';
    this.selectedNodeId.set(nodeId);
    this.targetGraphViewport = focusGraphPoint(
      this.nodePosition(nodeId),
      this.graphSize(),
      Math.max(this.graphViewport().scale, nodeId === graph.centerId ? 0.96 : 1.08),
    );
    this.persistExplorerState();
  }

  openSelectedEntity(): void {
    const node = this.contextualNode();
    if (node) {
      this.router.navigate(['/entity', node.slug]);
    }
  }

  adjustGraphZoom(factor: number): void {
    const stage = this.graphStage?.nativeElement;
    if (!stage) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    this.targetGraphViewport = null;
    this.graphViewport.set(
      zoomGraphViewport(this.graphViewport(), factor, rect.left + rect.width / 2, rect.top + rect.height / 2, rect),
    );
    this.persistExplorerState();
  }

  adjustImageZoom(factor: number): void {
    const stage = this.imageStage?.nativeElement;
    const asset = this.imageAsset();
    if (!stage || !asset) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    this.targetImageViewport = null;
    this.imageViewport.set(
      zoomImageViewport(
        this.imageViewport(),
        factor,
        { x: rect.width / 2, y: rect.height / 2 },
        this.imageSize(),
        asset,
      ),
    );
    this.persistExplorerState();
  }

  onGraphWheel(event: WheelEvent): void {
    event.preventDefault();
    const stage = this.graphStage?.nativeElement;
    if (!stage) {
      return;
    }

    const factor = event.deltaY < 0 ? 1.1 : 0.92;
    this.targetGraphViewport = null;
    this.graphViewport.set(
      zoomGraphViewport(this.graphViewport(), factor, event.clientX, event.clientY, stage.getBoundingClientRect()),
    );
    this.persistExplorerState();
  }

  onImageWheel(event: WheelEvent): void {
    event.preventDefault();
    const stage = this.imageStage?.nativeElement;
    const asset = this.imageAsset();
    if (!stage || !asset) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    this.targetImageViewport = null;
    this.imageViewport.set(
      zoomImageViewport(
        this.imageViewport(),
        event.deltaY < 0 ? 1.08 : 0.92,
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
        this.imageSize(),
        asset,
      ),
    );
    this.persistExplorerState();
  }

  onGraphStagePointerDown(event: PointerEvent): void {
    if ((event.target as HTMLElement | null)?.closest('.graph-node')) {
      return;
    }

    const currentTarget = event.currentTarget as HTMLElement;
    currentTarget.setPointerCapture(event.pointerId);
    this.pointerSession = {
      kind: 'graph-pan',
      pointerId: event.pointerId,
      originClient: { x: event.clientX, y: event.clientY },
      lastClient: { x: event.clientX, y: event.clientY },
      moved: false,
    };
    this.tooltip.set(null);
  }

  onGraphStagePointerMove(event: PointerEvent): void {
    if (this.pointerSession?.kind !== 'graph-pan' || this.pointerSession.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - this.pointerSession.lastClient.x;
    const deltaY = event.clientY - this.pointerSession.lastClient.y;
    const moved =
      this.pointerSession.moved ||
      exceedsPointerThreshold(this.pointerSession.originClient, { x: event.clientX, y: event.clientY });

    if (!moved) {
      this.pointerSession = {
        ...this.pointerSession,
        lastClient: { x: event.clientX, y: event.clientY },
      };
      return;
    }

    this.targetGraphViewport = null;
    this.graphViewport.set(panGraphViewport(this.graphViewport(), deltaX, deltaY));
    this.pointerSession = {
      ...this.pointerSession,
      lastClient: { x: event.clientX, y: event.clientY },
      moved: true,
    };
  }

  onGraphStagePointerUp(event: PointerEvent): void {
    if (this.pointerSession?.kind !== 'graph-pan' || this.pointerSession.pointerId !== event.pointerId) {
      return;
    }

    clearPointerCapture(event.currentTarget, event.pointerId);
    this.persistExplorerState();
    this.pointerSession = null;
  }

  onNodePointerDown(event: PointerEvent, nodeId: string): void {
    event.stopPropagation();

    const stage = this.graphStage?.nativeElement;
    const target = event.currentTarget as Element;
    if (!stage) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    const worldPoint = this.graphClientToWorld(event.clientX, event.clientY, rect);
    const nodePoint = this.nodePosition(nodeId);

    target.setPointerCapture(event.pointerId);
    this.pointerSession = {
      kind: 'node-drag',
      pointerId: event.pointerId,
      nodeId,
      originClient: { x: event.clientX, y: event.clientY },
      pointerOffset: {
        x: worldPoint.x - nodePoint.x,
        y: worldPoint.y - nodePoint.y,
      },
      moved: false,
    };
    this.tooltip.set(null);
  }

  onNodePointerMove(event: PointerEvent): void {
    if (this.pointerSession?.kind !== 'node-drag' || this.pointerSession.pointerId !== event.pointerId) {
      return;
    }

    const stage = this.graphStage?.nativeElement;
    if (!stage) {
      return;
    }

    const moved =
      this.pointerSession.moved ||
      exceedsPointerThreshold(this.pointerSession.originClient, { x: event.clientX, y: event.clientY });

    if (!moved) {
      return;
    }

    const worldPoint = this.graphClientToWorld(event.clientX, event.clientY, stage.getBoundingClientRect());
    this.positions[this.pointerSession.nodeId] = {
      x: worldPoint.x - this.pointerSession.pointerOffset.x,
      y: worldPoint.y - this.pointerSession.pointerOffset.y,
    };
    this.pointerSession = {
      ...this.pointerSession,
      moved: true,
    };
    this.renderTick.update((value) => value + 1);
  }

  onNodePointerUp(event: PointerEvent): void {
    if (this.pointerSession?.kind !== 'node-drag' || this.pointerSession.pointerId !== event.pointerId) {
      return;
    }

    clearPointerCapture(event.currentTarget, event.pointerId);
    if (!this.pointerSession.moved) {
      this.focusNode(this.pointerSession.nodeId);
    }
    this.persistExplorerState();
    this.pointerSession = null;
  }

  onNodePointerCancel(event: PointerEvent): void {
    if (this.pointerSession?.kind === 'node-drag' && this.pointerSession.pointerId === event.pointerId) {
      clearPointerCapture(event.currentTarget, event.pointerId);
      this.persistExplorerState();
      this.pointerSession = null;
    }
  }

  onImagePointerDown(event: PointerEvent): void {
    const asset = this.imageAsset();
    if (!asset) {
      return;
    }

    const currentTarget = event.currentTarget as HTMLElement;
    currentTarget.setPointerCapture(event.pointerId);
    this.pointerSession = {
      kind: 'image-pan',
      pointerId: event.pointerId,
      originClient: { x: event.clientX, y: event.clientY },
      lastClient: { x: event.clientX, y: event.clientY },
      moved: false,
    };
  }

  onImagePointerMove(event: PointerEvent): void {
    if (this.pointerSession?.kind !== 'image-pan' || this.pointerSession.pointerId !== event.pointerId) {
      return;
    }

    const asset = this.imageAsset();
    if (!asset) {
      return;
    }

    const deltaX = event.clientX - this.pointerSession.lastClient.x;
    const deltaY = event.clientY - this.pointerSession.lastClient.y;
    const moved =
      this.pointerSession.moved ||
      exceedsPointerThreshold(this.pointerSession.originClient, { x: event.clientX, y: event.clientY });

    if (!moved) {
      this.pointerSession = {
        ...this.pointerSession,
        lastClient: { x: event.clientX, y: event.clientY },
      };
      return;
    }

    this.targetImageViewport = null;
    this.imageViewport.set(panImageViewport(this.imageViewport(), deltaX, deltaY, this.imageSize(), asset));
    this.pointerSession = {
      ...this.pointerSession,
      lastClient: { x: event.clientX, y: event.clientY },
      moved: true,
    };
  }

  onImagePointerUp(event: PointerEvent): void {
    if (this.pointerSession?.kind !== 'image-pan' || this.pointerSession.pointerId !== event.pointerId) {
      return;
    }

    clearPointerCapture(event.currentTarget, event.pointerId);
    this.persistExplorerState();
    this.pointerSession = null;
  }

  onImagePointerCancel(event: PointerEvent): void {
    if (this.pointerSession?.kind === 'image-pan' && this.pointerSession.pointerId === event.pointerId) {
      clearPointerCapture(event.currentTarget, event.pointerId);
      this.persistExplorerState();
      this.pointerSession = null;
    }
  }

  onNodeHover(event: PointerEvent, nodeId: string): void {
    if (shouldSuppressHover(this.pointerSession)) {
      return;
    }

    const node = this.graph()?.nodes.find((item) => item.id === nodeId);
    if (!node) {
      return;
    }

    this.hoveredNodeId.set(nodeId);
    this.tooltip.set({
      kind: 'node',
      x: event.clientX,
      y: event.clientY,
      title: node.label,
      subtitle: this.nodeConfig(node.type).label,
      body: node.metadata?.summary || null,
    });
  }

  onEdgeHover(event: PointerEvent, edge: GraphEdge): void {
    if (shouldSuppressHover(this.pointerSession)) {
      return;
    }

    this.hoveredEdgeId.set(edge.id);
    this.tooltip.set({
      kind: 'edge',
      x: event.clientX,
      y: event.clientY,
      title: edge.label,
      subtitle: edge.relationType,
      body: edge.justification || null,
    });
  }

  onTooltipMove(event: PointerEvent): void {
    if (shouldSuppressHover(this.pointerSession)) {
      return;
    }

    const tooltip = this.tooltip();
    if (!tooltip) {
      return;
    }

    this.tooltip.set({
      ...tooltip,
      x: event.clientX,
      y: event.clientY,
    });
  }

  clearHover(): void {
    if (shouldSuppressHover(this.pointerSession)) {
      return;
    }

    this.hoveredNodeId.set(null);
    this.hoveredEdgeId.set(null);
    this.tooltip.set(null);
  }

  tooltipStyle() {
    const tooltip = this.tooltip();
    const host = this.graphStage?.nativeElement;
    if (!tooltip || !host) {
      return {};
    }

    const rect = host.getBoundingClientRect();
    return {
      left: `${tooltip.x - rect.left + 18}px`,
      top: `${tooltip.y - rect.top + 18}px`,
    };
  }

  toggleEntityType(type: string): void {
    this.entityTypeFilters.update((filters) => ({ ...filters, [type]: filters[type] === false }));
    this.ensureSelectionVisible();
    this.persistExplorerState();
  }

  toggleRelationType(type: string): void {
    this.relationTypeFilters.update((filters) => ({ ...filters, [type]: filters[type] === false }));
    this.persistExplorerState();
  }

  setAllEntityTypes(enabled: boolean): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    this.entityTypeFilters.set(
      graph.entityTypes.reduce<Record<string, boolean>>((acc, type) => {
        acc[type] = enabled;
        return acc;
      }, {}),
    );
    this.ensureSelectionVisible();
    this.persistExplorerState();
  }

  setAllRelationTypes(enabled: boolean): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    this.relationTypeFilters.set(
      graph.relationTypes.reduce<Record<string, boolean>>((acc, type) => {
        acc[type] = enabled;
        return acc;
      }, {}),
    );
    this.persistExplorerState();
  }

  setLabelsMode(mode: 'auto' | 'always' | 'hidden'): void {
    this.labelsMode.set(mode);
    this.persistExplorerState();
  }

  entityTypeLabel(type: string): string {
    return this.nodeConfig(type).label;
  }

  relationTypeLabel(type: string): string {
    return this.relationConfig(type).label;
  }

  private graphClientToWorld(clientX: number, clientY: number, rect: DOMRect): GraphPoint {
    const viewport = this.graphViewport();
    return {
      x: (clientX - rect.left - viewport.x) / viewport.scale,
      y: (clientY - rect.top - viewport.y) / viewport.scale,
    };
  }

  private ensureSelectionVisible(): void {
    const graph = this.graph();
    const selectedNodeId = this.selectedNodeId();
    if (!graph || !selectedNodeId) {
      return;
    }

    if (this.visibleNodeIds().has(selectedNodeId)) {
      return;
    }

    this.selectedNodeSource = 'center';
    this.selectedNodeId.set(graph.centerId);
  }

  private createFittedGraphViewport(): GraphViewport | null {
    const size = this.graphSize();
    if (!size.width || !size.height) {
      return null;
    }

    const nodeIds = this.filteredNodes().map((node) => node.id);
    const bounds = measureGraphBounds(nodeIds, this.positions, (nodeId) => this.nodeHaloSize(nodeId) + 56);

    if (!bounds) {
      return createGraphViewport(size.width, size.height, 0.82);
    }

    return fitGraphBounds(bounds, size, 92);
  }

  private createEntityFocusedGraphViewport(): GraphViewport | null {
    const graph = this.graph();
    const size = this.graphSize();
    if (!graph || !size.width || !size.height) {
      return null;
    }

    const fitted = this.createFittedGraphViewport();
    if (!fitted) {
      return null;
    }

    return focusGraphPoint({ x: 0, y: 0 }, size, fitted.scale);
  }

  private scheduleInitialEntityFocus(): void {
    if (!this.isBrowser || !this.pendingInitialEntityFocus) {
      return;
    }

    const graph = this.graph();
    const size = this.graphSize();
    if (!graph || !size.width || !size.height) {
      return;
    }

    this.positions[graph.centerId] = { x: 0, y: 0 };
    this.focusCurrentEntity(false);
    this.initialFocusPasses = 0;

    if (this.initialFocusFrameId !== null) {
      cancelAnimationFrame(this.initialFocusFrameId);
    }

    const runPass = () => {
      const latestGraph = this.graph();
      if (!latestGraph) {
        this.initialFocusFrameId = null;
        return;
      }

      this.positions[latestGraph.centerId] = { x: 0, y: 0 };
      this.velocities[latestGraph.centerId] = { x: 0, y: 0 };
      this.focusCurrentEntity(false);
      this.initialFocusPasses += 1;

      if (this.initialFocusPasses < 3) {
        this.initialFocusFrameId = requestAnimationFrame(runPass);
        return;
      }

      this.pendingInitialEntityFocus = false;
      this.initialFocusFrameId = null;
    };

    this.initialFocusFrameId = requestAnimationFrame(runPass);
  }

  private applyInitialGraphViewport(animate = false): void {
    const size = this.graphSize();
    const graph = this.graph();
    if (!graph || !size.width || !size.height) {
      return;
    }

    const next = this.createEntityFocusedGraphViewport();
    if (!next) {
      return;
    }

    if (animate) {
      this.targetGraphViewport = next;
      return;
    }

    this.targetGraphViewport = null;
    this.graphViewport.set(next);
    this.graphViewportReady = true;
  }

  private syncImageViewport(
    mapViewport?: (current: ImageViewport) => ImageViewport,
    animate = false,
    forceFit = false,
  ): void {
    const asset = this.imageAsset();
    const size = this.imageSize();
    if (!asset || !size.width || !size.height) {
      return;
    }

    const fit = createImageViewport(size, asset);
    const current = mapViewport ? mapViewport(this.imageViewport()) : this.imageViewport();
    const restored = !forceFit && !this.imageViewportReady ? restoreImageViewport(this.persistedState?.image, size, asset) : null;
    const shouldFit = forceFit || !this.imageViewportReady || current.scale <= current.fitScale * 1.02;
    const next = shouldFit
      ? restored ?? fit
      : clampImageViewport(
          {
            ...current,
            fitScale: fit.fitScale,
            scale: Math.max(current.scale, fit.fitScale),
          },
          size,
          asset,
        );

    if (animate) {
      this.targetImageViewport = next;
    } else {
      this.targetImageViewport = null;
      this.imageViewport.set(next);
      this.persistExplorerState();
    }

    this.imageViewportReady = true;
  }

  private persistExplorerState(): void {
    const graph = this.graph();
    const graphSize = this.graphSize();
    if (!this.slug || !graph || !graphSize.width || !graphSize.height) {
      return;
    }

    const state: ExplorerPersistedState = {
      updatedAt: Date.now(),
      graph: {
        ...serializeGraphViewport(this.targetGraphViewport ?? this.graphViewport(), graphSize),
        positions: { ...this.positions },
        selectedNodeId: this.selectedNodeId(),
        labelsMode: this.labelsMode(),
        entityTypeFilters: this.entityTypeFilters(),
        relationTypeFilters: this.relationTypeFilters(),
      },
    };

    const asset = this.imageAsset();
    const imageSize = this.imageSize();
    if (asset && imageSize.width && imageSize.height && this.imageViewportReady) {
      state.image = serializeImageViewport(this.targetImageViewport ?? this.imageViewport(), imageSize);
    }

    this.persistedState = state;
    saveExplorerState(this.slug, state);
  }
}
