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
import {
  GraphData,
  GraphEdge,
  GraphPoint,
  GraphResponseDto,
  GraphTooltip,
  GraphViewport,
} from './graph.models';
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

  private graphStage?: ElementRef<HTMLDivElement>;
  private imageStage?: ElementRef<HTMLDivElement>;

  @ViewChild('graphStage')
  set graphStageRef(value: ElementRef<HTMLDivElement> | undefined) {
    this.graphStage = value;
    this.setupGraphStage();
  }

  @ViewChild('imageStage')
  set imageStageRef(value: ElementRef<HTMLDivElement> | undefined) {
    this.imageStage = value;
    this.setupImageStage();
  }

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
  readonly initialGraphViewportReady = signal(true);

  private loadSub?: Subscription;
  private graphResizeObserver?: ResizeObserver;
  private imageResizeObserver?: ResizeObserver;
  private frameId: number | null = null;
  private initialFocusFrameId: number | null = null;
  private initialFocusFallbackId: number | null = null;
  private initialFitFrameId: number | null = null;
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
  private hasUserAdjustedGraphView = false;
  private graphLayoutActive = false;
  private graphSettledFrames = 0;

  readonly filteredNodes = computed(() => {
    const graph = this.graph();
    if (!graph) {
      return [];
    }

    const filters = this.entityTypeFilters();
    return graph.nodes.filter((node) => node.id === graph.centerId || filters[node.type] !== false);
  });

  readonly visibleNodeIds = computed(() => new Set(this.filteredNodes().map((node) => node.id)));

  readonly nodeMap = computed(() => {
    const graph = this.graph();
    return new Map(graph?.nodes.map((node) => [node.id, node]) ?? []);
  });

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
    const selectedNodeId = this.selectedNodeId();
    return selectedNodeId ? this.nodeMap().get(selectedNodeId) ?? null : null;
  });

  readonly contextualNode = computed(() => this.selectedNode() ?? this.centerNode());

  readonly centerNode = computed(() => {
    const graph = this.graph();
    return graph ? this.nodeMap().get(graph.centerId) ?? null : null;
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

  readonly renderedEdges = computed(() => {
    this.renderTick();

    const selectedNodeId = this.selectedNodeId();

    return this.filteredEdges().map((edge) => {
      const source = this.positions[edge.source] ?? { x: 0, y: 0 };
      const target = this.positions[edge.target] ?? { x: 0, y: 0 };
      const relationVisual = this.relationConfig(edge.relationType);
      const curve = edgeCurveOffset(edge);
      const path = edgePath(source, target, curve);

      return {
        edge,
        path,
        labelPoint: edgeMidpoint(source, target, curve),
        muted: !!selectedNodeId && edge.source !== selectedNodeId && edge.target !== selectedNodeId,
        relationVisual,
      };
    });
  });

  readonly renderedNodes = computed(() => {
    this.renderTick();

    const graph = this.graph();
    const selectedNodeId = this.selectedNodeId();
    const selectedNeighbors = this.selectedNeighbors();
    const centerId = graph?.centerId ?? null;

    return this.filteredNodes().map((node) => {
      const point = this.positions[node.id] ?? { x: 0, y: 0 };
      const nodeVisual = this.nodeConfig(node.type);
      const base = node.id === centerId ? 28 : 22;
      const degreeBoost = Math.min(node.degree ?? 0, 5) * 1.25;
      const selectedBoost = selectedNodeId === node.id ? 6 : 0;
      const size = base + degreeBoost + selectedBoost;
      const muted = !!selectedNodeId && selectedNodeId !== node.id && !selectedNeighbors.has(node.id);

      return {
        node,
        point,
        transform: `translate(${point.x} ${point.y})`,
        selected: selectedNodeId === node.id,
        muted,
        size,
        haloSize: size + 12,
        shapePath: graphNodeShapePath(nodeVisual.shape, size),
        labelTransform: `translate(${size + 18}, 0)`,
        nodeVisual,
      };
    });
  });

  readonly isDenseGraph = computed(() => this.filteredNodes().length >= 42 || this.filteredEdges().length >= 84);

  readonly hasVisibleSelection = computed(() => {
    const selectedNodeId = this.selectedNodeId();
    return selectedNodeId ? this.visibleNodeIds().has(selectedNodeId) : false;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slug']?.currentValue) {
      const loadedState = loadExplorerState(this.slug);

      this.persistedState = loadedState
        ? {
          ...loadedState,
          graph: loadedState.graph
            ? {
              ...loadedState.graph,
              positions: {},
              selectedNodeId: null,
            }
            : undefined,
          image: undefined,
        }
        : null;

      this.graphViewportReady = false;
      this.imageViewportReady = false;
      this.targetGraphViewport = null;
      this.targetImageViewport = null;
      this.imageAsset.set(null);
      this.imageViewport.set({ x: 0, y: 0, scale: 1, fitScale: 1 });
      this.selectedNodeSource = 'center';
      this.hasUserAdjustedGraphView = false;
      this.loadGraph();
    }

    if (changes['imageUrl'] && !changes['imageUrl'].firstChange) {
      this.persistedState = this.persistedState ? { ...this.persistedState, image: undefined } : null;
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

    if (this.graph()) {
      this.pinCenterNode();
      this.pendingInitialEntityFocus = true;
      this.startAnimationLoop();
      this.scheduleInitialEntityFocus();
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

    if (this.initialFocusFallbackId !== null && this.isBrowser) {
      clearTimeout(this.initialFocusFallbackId);
    }

    if (this.initialFitFrameId !== null && this.isBrowser) {
      cancelAnimationFrame(this.initialFitFrameId);
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
              : seededPositions[node.id] ?? { x: 0, y: 0 };
          return acc;
        }, {});

        this.velocities = {};
        this.pinCenterNode();
        this.warmupGraphLayout();

        this.entityTypeFilters.set(this.createFilterMap(graph.entityTypes, persistedGraph?.entityTypeFilters));
        this.relationTypeFilters.set(this.createFilterMap(graph.relationTypes, persistedGraph?.relationTypeFilters));
        this.labelsMode.set(persistedGraph?.labelsMode ?? 'auto');

        this.selectedNodeSource = 'center';
        this.selectedNodeId.set(graph.centerId);
        this.hoveredNodeId.set(null);
        this.hoveredEdgeId.set(null);
        this.tooltip.set(null);

        this.pendingInitialEntityFocus = true;
        this.hasUserAdjustedGraphView = false;
        this.targetGraphViewport = null;
        this.graphViewportReady = false;
        this.graphLayoutActive = true;
        this.graphSettledFrames = 0;
        this.focusCurrentEntity(false);

        this.loading.set(false);
        this.startAnimationLoop();
        this.scheduleInitialEntityFocus();
        this.ensureInitialGraphFit();
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

  private pinCenterNode(): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    this.positions[graph.centerId] = { x: 0, y: 0 };
    this.velocities[graph.centerId] = { x: 0, y: 0 };
  }

  private warmupGraphLayout(passes?: number): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    const nodeCount = graph.nodes.length;
    const edgeCount = graph.edges.length;
    const resolvedPasses =
      passes
      ?? (nodeCount >= 80 || edgeCount >= 140
        ? 16
        : nodeCount >= 48 || edgeCount >= 88
          ? 22
          : 36);

    for (let index = 0; index < resolvedPasses; index += 1) {
      stepForceLayout(graph, this.positions, this.velocities, null);
      this.pinCenterNode();
    }
  }

  private startAnimationLoop(): void {
    if (!this.isBrowser || this.frameId !== null) {
      return;
    }

    const frame = () => {
      const graph = this.graph();
      let shouldContinue = false;
      let shouldRender = false;

      if (graph) {
        const draggingNodeId = this.pointerSession?.kind === 'node-drag' ? this.pointerSession.nodeId : null;
        const shouldStepLayout = this.graphLayoutActive || draggingNodeId !== null;

        if (shouldStepLayout) {
          const motion = stepForceLayout(
            graph,
            this.positions,
            this.velocities,
            draggingNodeId,
          );

          this.pinCenterNode();
          shouldRender = true;

          if (draggingNodeId !== null) {
            this.graphLayoutActive = true;
            this.graphSettledFrames = 0;
          } else if (motion < 0.28) {
            this.graphSettledFrames += 1;
            if (this.graphSettledFrames >= 14) {
              this.graphLayoutActive = false;
            }
          } else {
            this.graphLayoutActive = true;
            this.graphSettledFrames = 0;
          }
        }

        shouldContinue ||= this.graphLayoutActive || draggingNodeId !== null;
      }

      if (this.targetGraphViewport) {
        this.animateGraphViewport();
        shouldRender = true;
        shouldContinue = true;
      }

      if (this.targetImageViewport) {
        this.animateImageViewport();
        shouldContinue = true;
      }

      if (shouldRender) {
        this.renderTick.update((value) => value + 1);
      }

      if (!shouldContinue) {
        this.frameId = null;
        return;
      }

      this.frameId = requestAnimationFrame(frame);
    };

    this.frameId = requestAnimationFrame(frame);
  }

  private setupGraphStage(): void {
    if (!this.isBrowser) {
      return;
    }

    this.graphResizeObserver?.disconnect();

    const graphStage = this.graphStage?.nativeElement;
    if (!graphStage) {
      return;
    }

    this.measureGraphStage();
    this.graphResizeObserver = new ResizeObserver(() => this.measureGraphStage());
    this.graphResizeObserver.observe(graphStage);

    if (this.graph() && !this.hasUserAdjustedGraphView) {
      this.pendingInitialEntityFocus = true;
      this.scheduleInitialEntityFocus();
      this.ensureInitialGraphFit();
    }
  }

  private setupImageStage(): void {
    if (!this.isBrowser) {
      return;
    }

    this.imageResizeObserver?.disconnect();

    const imageStage = this.imageStage?.nativeElement;
    if (!imageStage) {
      return;
    }

    this.measureImageStage();
    this.imageResizeObserver = new ResizeObserver(() => this.measureImageStage());
    this.imageResizeObserver.observe(imageStage);
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

    if (this.pendingInitialEntityFocus) {
      this.scheduleInitialEntityFocus();
      return;
    }

    if (this.targetGraphViewport && previous.width && previous.height) {
      const restoredCurrent = restoreGraphViewport(
        serializeGraphViewport(this.graphViewport(), previous),
        { width: rect.width, height: rect.height },
      );
      const restoredTarget = restoreGraphViewport(
        serializeGraphViewport(this.targetGraphViewport, previous),
        { width: rect.width, height: rect.height },
      );

      if (restoredCurrent && restoredTarget) {
        this.graphViewport.set(restoredCurrent);
        this.targetGraphViewport = restoredTarget;
      }
      return;
    }

    if (!previous.width || !previous.height || !this.graphViewportReady) {
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
    this.initialGraphViewportReady.set(true);
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
    this.imageViewport.set(
      restoreImageViewport(snapshot, { width: rect.width, height: rect.height }, asset, { entityType: this.entityType }),
    );
    this.imageViewportReady = true;
  }

  onImageLoaded(event: Event): void {
    const image = event.target as HTMLImageElement;
    this.imageAsset.set({
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    });
    this.targetImageViewport = null;
    this.imageViewportReady = false;
    this.syncImageViewport(undefined, false, true);
  }

  graphViewportTransform(): string {
    return graphViewportTransform(this.graphViewport());
  }

  imageTransform(): string {
    return imageViewportTransform(this.imageViewport());
  }

  imageBackdrop(): string | null {
    return this.imageUrl ? `url("${this.imageUrl}")` : null;
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
    const node = this.nodeMap().get(nodeId);
    return graphNodeShapePath(getEntityTypeConfig(node?.type ?? '').shape, this.nodeSize(nodeId));
  }

  nodeSize(nodeId: string): number {
    const graph = this.graph();
    const node = this.nodeMap().get(nodeId);
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

  shouldShowEdgeLabel(edge: GraphEdge): boolean {
    if (this.isDenseGraph()) {
      return false;
    }

    const selectedNodeId = this.selectedNodeId();

    return shouldRenderGraphLabel({
      mode: this.labelsMode(),
      scale: this.graphViewport().scale,
      edgeCount: this.filteredEdges().length,
      highlighted: this.hoveredEdgeId() === edge.id,
      connectedToSelection: edge.source === selectedNodeId || edge.target === selectedNodeId,
    });
  }

  shouldShowNodeLabel(nodeId: string): boolean {
    const graph = this.graph();
    if (!graph) {
      return false;
    }

    const selectedNodeId = this.selectedNodeId();

    return shouldRenderGraphLabel({
      mode: this.labelsMode(),
      scale: this.graphViewport().scale,
      edgeCount: this.filteredEdges().length,
      highlighted: this.hoveredNodeId() === nodeId,
      connectedToSelection:
        nodeId === graph.centerId ||
        nodeId === selectedNodeId ||
        this.selectedNeighbors().has(nodeId),
    });
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

  resetAllViews(): void {
    this.resetGraphView();
    this.resetImageView();
  }

  resetGraphView(animate = true): void {
    this.focusCurrentEntity(animate);
  }

  resetImageView(animate = true): void {
    const size = this.currentImageStageSize();
    const next = createImageViewport(size, this.imageAsset(), { entityType: this.entityType });
    if (!this.imageAsset() || !size.width || !size.height) {
      return;
    }

    if (animate) {
      this.targetImageViewport = next;
      this.startAnimationLoop();
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
      return;
    }

    this.focusNode(graph.centerId);
  }

  focusCurrentEntity(animate = false): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    this.selectedNodeSource = 'center';
    this.selectedNodeId.set(graph.centerId);

    this.pinCenterNode();

    const next = this.createEntityFocusedGraphViewport();
    if (!next) {
      return;
    }

    if (animate) {
      this.targetGraphViewport = next;
      this.startAnimationLoop();
    } else {
      this.targetGraphViewport = null;
      this.graphViewport.set(next);
      this.graphViewportReady = true;
      if (!this.pendingInitialEntityFocus) {
        this.initialGraphViewportReady.set(true);
      }
    }

    this.renderTick.update((value) => value + 1);
    this.persistExplorerState();
  }

  focusNode(nodeId: string): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    const node = this.nodeMap().get(nodeId);
    if (!node) {
      return;
    }

    this.cancelPendingInitialGraphFocus(true);
    this.selectedNodeSource = nodeId === graph.centerId ? 'center' : 'explicit';
    this.selectedNodeId.set(nodeId);
    if (nodeId === graph.centerId) {
      this.pinCenterNode();
    }

    const next = this.createViewportCenteredOnPoint(
      this.nodePosition(nodeId),
      Math.max(this.graphViewport().scale, nodeId === graph.centerId ? 0.96 : 1.08),
    );
    if (!next) {
      return;
    }

    this.targetGraphViewport = next;
    this.startAnimationLoop();
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

    this.cancelPendingInitialGraphFocus(true);
    const rect = stage.getBoundingClientRect();
    this.targetGraphViewport = null;
    this.graphViewport.set(
      zoomGraphViewport(this.graphViewport(), factor, rect.left + rect.width / 2, rect.top + rect.height / 2, rect),
    );
    this.persistExplorerState();
  }

  adjustImageZoom(factor: number): void {
    const stage = this.imageStage?.nativeElement;
    if (!stage || !this.imageAsset()) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    this.applyImageZoom(factor, { x: rect.width / 2, y: rect.height / 2 });
  }

  onGraphWheel(event: WheelEvent): void {
    event.preventDefault();
    const stage = this.graphStage?.nativeElement;
    if (!stage) {
      return;
    }

    this.cancelPendingInitialGraphFocus(true);
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
    if (!stage || !this.imageAsset()) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    this.applyImageZoom(event.deltaY < 0 ? 1.08 : 0.92, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  onGraphStagePointerDown(event: PointerEvent): void {
    if ((event.target as HTMLElement | null)?.closest('.graph-node')) {
      return;
    }

    this.cancelPendingInitialGraphFocus(true);
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

    this.cancelPendingInitialGraphFocus(true);
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
    this.graphLayoutActive = true;
    this.graphSettledFrames = 0;
    this.startAnimationLoop();
    this.tooltip.set(null);
  }

  onNodePointerMove(event: PointerEvent): void {
    if (this.pointerSession?.kind !== 'node-drag' || this.pointerSession.pointerId !== event.pointerId) {
      return;
    }

    const graph = this.graph();
    const stage = this.graphStage?.nativeElement;
    if (!graph || !stage) {
      return;
    }

    const moved =
      this.pointerSession.moved ||
      exceedsPointerThreshold(this.pointerSession.originClient, { x: event.clientX, y: event.clientY });

    if (!moved) {
      return;
    }

    if (this.pointerSession.nodeId === graph.centerId) {
      this.pinCenterNode();
      this.renderTick.update((value) => value + 1);
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
    this.graphLayoutActive = true;
    this.graphSettledFrames = 0;
    this.startAnimationLoop();
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

    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select, label')) {
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
    this.imageViewport.set(panImageViewport(this.imageViewport(), deltaX, deltaY, this.currentImageStageSize(), asset));
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

    this.cancelGraphViewportTarget();
    const node = this.nodeMap().get(nodeId);
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

    this.cancelGraphViewportTarget();
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

    this.cancelGraphViewportTarget();
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
    const size = this.currentGraphStageSize();
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

  private createViewportCenteredOnPoint(point: GraphPoint, scale: number): GraphViewport | null {
    const size = this.currentGraphStageSize();
    if (!size.width || !size.height) {
      return null;
    }

    return {
      x: size.width / 2 - point.x * scale,
      y: size.height / 2 - point.y * scale,
      scale,
    };
  }

  private createEntityFocusedGraphViewport(): GraphViewport | null {
    const graph = this.graph();
    if (!graph) {
      return null;
    }

    const fitted = this.createFittedGraphViewport();
    if (!fitted) {
      return null;
    }

    const centerPoint = this.positions[graph.centerId] ?? { x: 0, y: 0 };
    return this.createViewportCenteredOnPoint(centerPoint, fitted.scale);
  }

  private scheduleInitialEntityFocus(): void {
    if (!this.isBrowser || !this.pendingInitialEntityFocus || this.hasUserAdjustedGraphView) {
      return;
    }

    const graph = this.graph();
    const size = this.graphSize();
    if (!graph || !size.width || !size.height) {
      return;
    }

    this.pinCenterNode();
    this.resetGraphView(false);
    this.initialFocusPasses = 0;

    if (this.initialFocusFrameId !== null) {
      cancelAnimationFrame(this.initialFocusFrameId);
    }

    if (this.initialFocusFallbackId !== null) {
      clearTimeout(this.initialFocusFallbackId);
    }

    const runPass = () => {
      const latestGraph = this.graph();
      if (!latestGraph) {
        this.initialFocusFrameId = null;
        return;
      }

      this.pinCenterNode();
      this.resetGraphView(false);
      this.initialFocusPasses += 1;

      if (this.initialFocusPasses < 3) {
        this.initialFocusFrameId = requestAnimationFrame(runPass);
        return;
      }

      this.pinCenterNode();
      this.resetGraphView(false);
      this.pendingInitialEntityFocus = false;
      this.initialGraphViewportReady.set(true);
      this.ensureInitialGraphFit();
      this.renderTick.update((value) => value + 1);
      this.initialFocusFrameId = null;
      this.initialFocusFallbackId = null;
      this.persistExplorerState();
    };

    this.initialFocusFallbackId = window.setTimeout(() => {
      if (!this.pendingInitialEntityFocus) {
        this.initialFocusFallbackId = null;
        return;
      }

      this.pinCenterNode();
      this.resetGraphView(false);
      this.pendingInitialEntityFocus = false;
      this.initialGraphViewportReady.set(true);
      this.ensureInitialGraphFit();
      this.renderTick.update((value) => value + 1);
      this.initialFocusFallbackId = null;
      this.persistExplorerState();
    }, 220);

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

  private ensureInitialGraphFit(attempt = 0): void {
    if (!this.isBrowser || this.hasUserAdjustedGraphView) {
      return;
    }

    if (this.initialFitFrameId !== null) {
      cancelAnimationFrame(this.initialFitFrameId);
      this.initialFitFrameId = null;
    }

    const maxAttempts = 18;
    const run = () => {
      if (!this.graph()) {
        this.initialFitFrameId = null;
        return;
      }

      this.pinCenterNode();
      const next = this.createEntityFocusedGraphViewport();
      if (next) {
        this.targetGraphViewport = null;
        this.graphViewport.set(next);
        this.graphViewportReady = true;
        this.renderTick.update((value) => value + 1);
        this.persistExplorerState();
      }

      if (attempt >= maxAttempts || (next && next.scale < 0.8)) {
        this.initialFitFrameId = null;
        return;
      }

      attempt += 1;
      this.initialFitFrameId = requestAnimationFrame(run);
    };

    this.initialFitFrameId = requestAnimationFrame(run);
  }

  private cancelPendingInitialGraphFocus(markUserAdjusted = false): void {
    if (markUserAdjusted) {
      this.hasUserAdjustedGraphView = true;
    }

    this.pendingInitialEntityFocus = false;
    this.initialGraphViewportReady.set(true);

    if (this.initialFocusFrameId !== null && this.isBrowser) {
      cancelAnimationFrame(this.initialFocusFrameId);
      this.initialFocusFrameId = null;
    }

    if (this.initialFitFrameId !== null && this.isBrowser) {
      cancelAnimationFrame(this.initialFitFrameId);
      this.initialFitFrameId = null;
    }

    if (this.initialFocusFallbackId !== null && this.isBrowser) {
      clearTimeout(this.initialFocusFallbackId);
      this.initialFocusFallbackId = null;
    }
  }

  private cancelGraphViewportTarget(): void {
    if (!this.targetGraphViewport) {
      return;
    }

    this.targetGraphViewport = null;
    this.graphViewportReady = true;
  }

  private syncImageViewport(
    mapViewport?: (current: ImageViewport) => ImageViewport,
    animate = false,
    forceFit = false,
  ): void {
    const asset = this.imageAsset();
    const size = this.currentImageStageSize();
    if (!asset || !size.width || !size.height) {
      return;
    }

    const fit = createImageViewport(size, asset, { entityType: this.entityType });
    const current = mapViewport ? mapViewport(this.imageViewport()) : this.imageViewport();
    const restored =
      !forceFit && !this.imageViewportReady
        ? restoreImageViewport(this.persistedState?.image, size, asset, { entityType: this.entityType })
        : null;
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

  private applyImageZoom(factor: number, anchor: GraphPoint): void {
    const asset = this.imageAsset();
    const size = this.currentImageStageSize();
    if (!asset || !size.width || !size.height) {
      return;
    }

    this.targetImageViewport = null;
    this.imageViewport.set(zoomImageViewport(this.imageViewport(), factor, anchor, size, asset));
    this.imageViewportReady = true;
    this.persistExplorerState();
  }

  private currentGraphStageSize(): { width: number; height: number } {
    const host = this.graphStage?.nativeElement;
    if (host && typeof host.getBoundingClientRect === 'function') {
      const rect = host.getBoundingClientRect();
      if (rect.width && rect.height) {
        return { width: rect.width, height: rect.height };
      }
    }

    return this.graphSize();
  }

  private currentImageStageSize(): { width: number; height: number } {
    const host = this.imageStage?.nativeElement;
    if (host && typeof host.getBoundingClientRect === 'function') {
      const rect = host.getBoundingClientRect();
      if (rect.width && rect.height) {
        return { width: rect.width, height: rect.height };
      }
    }

    return this.imageSize();
  }

  private persistExplorerState(): void {
    const graph = this.graph();
    const graphSize = this.currentGraphStageSize();
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
    const imageSize = this.currentImageStageSize();
    if (asset && imageSize.width && imageSize.height && this.imageViewportReady) {
      state.image = serializeImageViewport(this.targetImageViewport ?? this.imageViewport(), imageSize);
    }

    this.persistedState = state;
    saveExplorerState(this.slug, state);
  }
}
