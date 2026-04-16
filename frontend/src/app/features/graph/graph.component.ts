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
import {
  clearPointerCapture,
  currentDraggedNodeId,
  createImagePanSession,
  GraphPointerSession,
  shouldSuppressHover,
  updateImagePanSession,
} from './graph-interaction';
import {
} from './graph.config';
import {
  ForceLayoutScratch,
  measureGraphBounds,
} from './graph-layout';
import {
  createGraphViewport,
  fitGraphBounds,
  graphViewportTransform,
} from './graph-viewport';
import {
  createImageViewport,
  imageViewportTransform,
  ImageAssetSize,
  ImageViewport,
  interpolateImageViewport,
} from './image-viewport';
import {
  GraphData,
  GraphEdge,
  GraphPoint,
  GraphRenderedEdge,
  GraphRenderedNode,
  GraphTooltip,
  GraphViewport,
} from './graph.models';
import {
  ExplorerPersistedState,
  loadExplorerState,
  saveExplorerState,
} from './graph-persistence';
import { buildImageSyncOverlay } from './image-graph-sync';
import {
  prepareExplorerStateForSlugChange,
  readMeasuredStageSize,
  reconnectResizeObserver,
  restoreResizedGraphStageView,
  restoreResizedImageStageView,
  shouldRestoreGraphStageAfterResize,
  shouldSyncImageStageAfterResize,
} from './graph-lifecycle';
import { GraphControlsBarComponent } from './graph-controls-bar.component';
import { GraphInspectorPanelComponent } from './graph-inspector-panel.component';
import { GraphSceneComponent } from './graph-scene.component';
import {
  animateGraphViewportStep,
  createCenteredGraphViewport,
  DEFAULT_GRAPH_VIEWPORT_ANIMATION,
  FAST_GRAPH_VIEWPORT_ANIMATION,
  graphLabelScaleBucket,
  GraphViewportAnimationConfig,
  shouldEnsureInitialGraphFit,
} from './graph-camera';
import {
  createImageWheelAnchor,
  createResetImageViewport,
  panGraphImageViewport,
  syncGraphImageViewport,
  zoomGraphImageViewport,
} from './graph-image';
import { GraphInitialFocusController } from './graph-initial-focus';
import {
  beginGraphPanSession,
  beginNodeDragSession,
  canHandleHover,
  createEdgeHoverTooltip,
  createGraphWheelViewport,
  createGraphZoomViewport,
  createNodeHoverTooltip,
  endGraphPointerSession,
  graphClientToWorld,
  moveGraphPanSession,
  moveNodeDragSession,
} from './graph-stage-interactions';
import {
  createCenterSelectionPlan,
  createCurrentEntityFocusPlan,
  createNodeFocusPlan,
  GraphSelectionSource,
  GraphViewportFocusPlan,
} from './graph-focus';
import { buildGraphDerivedState, ensureGraphSelectionVisible } from './graph-derived';
import {
  buildRenderedGraphEdges,
  buildRenderedGraphNodes,
  graphImageBackdrop,
  graphNodeHaloSize,
  graphNodeSize,
  graphTooltipStyle,
} from './graph-render';
import { stepGraphLayoutFrame } from './graph-animation';
import { GraphTooltipController, GraphViewportController } from './graph-runtime-controllers';
import { initializeLoadedGraphState, warmupPreparedGraphLayout } from './graph-setup';
import {
  advanceImageViewportAnimation,
  createExplorerPersistedState,
  resolveLiveStageSize,
} from './graph-state';
import {
  applyGraphViewportFocusPlanRuntime,
  cancelGraphViewportAutomationRuntime,
  flushPendingGraphViewportRuntime,
  flushPendingTooltipPositionRuntime,
  scheduleGraphViewportUpdateRuntime,
  scheduleTooltipPositionRuntime,
  startGraphViewportAnimationRuntime,
} from './graph-viewport-runtime';

type ImageMeta = {
  source?: string | null;
  photoBy?: string | null;
  license?: string | null;
};

@Component({
  standalone: true,
  selector: 'app-graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, GraphControlsBarComponent, GraphSceneComponent, GraphInspectorPanelComponent],
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
  readonly graphViewportAnimating = signal(false);

  private loadSub?: Subscription;
  private graphResizeObserver?: ResizeObserver;
  private imageResizeObserver?: ResizeObserver;
  private frameId: number | null = null;
  private targetImageViewport: ImageViewport | null = null;
  private positions: Record<string, GraphPoint> = {};
  private velocities: Record<string, GraphPoint> = {};
  private pointerSession: GraphPointerSession | null = null;
  private imageViewportReady = false;
  private graphViewportReady = false;
  private persistedState: ExplorerPersistedState | null = null;
  private layoutScratch: ForceLayoutScratch | null = null;
  private pendingInitialEntityFocus = false;
  private selectedNodeSource: GraphSelectionSource = 'center';
  private hasUserAdjustedGraphView = false;
  private graphLayoutActive = false;
  private graphSettledFrames = 0;
  private readonly viewportController = new GraphViewportController();
  private readonly tooltipController = new GraphTooltipController();
  private readonly initialFocusController = new GraphInitialFocusController();
  readonly graphDerived = computed(() =>
    buildGraphDerivedState({
      graph: this.graph(),
      entityTypeFilters: this.entityTypeFilters(),
      relationTypeFilters: this.relationTypeFilters(),
      selectedNodeId: this.selectedNodeId(),
      hoveredNodeId: this.hoveredNodeId(),
      hoveredEdgeId: this.hoveredEdgeId(),
      labelsMode: this.labelsMode(),
      labelScaleBucket: this.labelScaleBucket(),
    }),
  );

  readonly imageSyncOverlay = computed(() =>
    buildImageSyncOverlay(
      this.graphDerived().centerNode,
      this.selectedNodeSource === 'explicit' ? this.graphDerived().selectedNode : null,
      shouldSuppressHover(this.pointerSession),
    ),
  );

  readonly renderedEdges = computed<GraphRenderedEdge[]>(() => {
    this.renderTick();
    return buildRenderedGraphEdges({
      edges: this.graphDerived().filteredEdges,
      positions: this.positions,
      selectedNodeId: this.selectedNodeId(),
    });
  });

  readonly renderedNodes = computed<GraphRenderedNode[]>(() => {
    this.renderTick();

    const graph = this.graph();
    const selectedNodeId = this.selectedNodeId();
    const selectedNeighbors = this.graphDerived().selectedNeighbors;
    const centerId = graph?.centerId ?? null;

    return buildRenderedGraphNodes({
      nodes: this.graphDerived().filteredNodes,
      positions: this.positions,
      centerId,
      selectedNodeId,
      selectedNeighbors,
    });
  });

  readonly labelScaleBucket = computed(() => graphLabelScaleBucket(this.graphViewport().scale));

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slug']?.currentValue) {
      this.persistedState = prepareExplorerStateForSlugChange(loadExplorerState(this.slug));

      this.graphViewportReady = false;
      this.imageViewportReady = false;
      this.viewportController.clearTarget();
      this.targetImageViewport = null;
      this.imageAsset.set(null);
      this.imageViewport.set({ x: 0, y: 0, scale: 1, fitScale: 1 });
      this.layoutScratch = null;
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
    this.flushPendingGraphViewport();
    this.persistExplorerState();
    this.loadSub?.unsubscribe();
    this.graphResizeObserver?.disconnect();
    this.imageResizeObserver?.disconnect();

    if (this.frameId !== null && this.isBrowser) {
      cancelAnimationFrame(this.frameId);
    }

    this.viewportController.destroy(this.isBrowser);
    this.tooltipController.destroy(this.isBrowser);
    this.initialFocusController.destroy(this.isBrowser);
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
        const initialized = initializeLoadedGraphState(response, this.persistedState?.graph);

        this.graph.set(initialized.graph);
        this.layoutScratch = initialized.layoutScratch;
        this.positions = initialized.positions;
        this.velocities = initialized.velocities;
        this.pinCenterNode();
        this.warmupGraphLayout();

        this.entityTypeFilters.set(initialized.entityTypeFilters);
        this.relationTypeFilters.set(initialized.relationTypeFilters);
        this.labelsMode.set(initialized.labelsMode);

        this.selectedNodeSource = 'center';
        this.selectedNodeId.set(initialized.selectedNodeId);
        this.hoveredNodeId.set(null);
        this.hoveredEdgeId.set(null);
        this.tooltip.set(null);

        this.pendingInitialEntityFocus = initialized.pendingInitialEntityFocus;
        this.hasUserAdjustedGraphView = false;
        this.viewportController.clearTarget();
        this.graphViewportReady = false;
        this.graphLayoutActive = initialized.graphLayoutActive;
        this.graphSettledFrames = initialized.graphSettledFrames;
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

  private pinCenterNode(): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    this.pinGraphCenterNode(graph);
  }

  private pinGraphCenterNode(graph: GraphData): void {
    this.positions[graph.centerId] = { x: 0, y: 0 };
    this.velocities[graph.centerId] = { x: 0, y: 0 };
  }

  private warmupGraphLayout(passes?: number): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    warmupPreparedGraphLayout(
      graph,
      this.positions,
      this.velocities,
      (currentGraph) => this.pinGraphCenterNode(currentGraph),
      this.layoutScratch ?? undefined,
      passes,
    );
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
        const draggingNodeId = currentDraggedNodeId(this.pointerSession);
        const layoutFrame = stepGraphLayoutFrame({
          graph,
          positions: this.positions,
          velocities: this.velocities,
          draggingNodeId,
          layoutScratch: this.layoutScratch ?? undefined,
          state: {
            graphLayoutActive: this.graphLayoutActive,
            graphSettledFrames: this.graphSettledFrames,
          },
          pinCenterNode: () => this.pinCenterNode(),
        });

        this.graphLayoutActive = layoutFrame.graphLayoutActive;
        this.graphSettledFrames = layoutFrame.graphSettledFrames;
        shouldRender ||= layoutFrame.shouldRender;
        shouldContinue ||= layoutFrame.shouldContinue;
      }

      if (this.viewportController.target) {
        this.animateGraphViewport();
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

    const graphStage = this.graphStage?.nativeElement;
    this.graphResizeObserver = reconnectResizeObserver({
      observer: this.graphResizeObserver,
      host: graphStage,
      onMeasure: () => this.measureGraphStage(graphStage),
    });

    if (!graphStage) {
      return;
    }

    if (shouldEnsureInitialGraphFit({
      isBrowser: this.isBrowser,
      hasUserAdjustedGraphView: this.hasUserAdjustedGraphView,
    }) && this.graph()) {
      this.pendingInitialEntityFocus = true;
      this.scheduleInitialEntityFocus();
      this.ensureInitialGraphFit();
    }
  }

  private setupImageStage(): void {
    if (!this.isBrowser) {
      return;
    }

    const imageStage = this.imageStage?.nativeElement;
    this.imageResizeObserver = reconnectResizeObserver({
      observer: this.imageResizeObserver,
      host: imageStage,
      onMeasure: () => this.measureImageStage(imageStage),
    });
  }

  private animateGraphViewport(): void {
    if (!this.viewportController.target) {
      return;
    }

    this.viewportController.animate(
      this.graphViewport(),
      (next) => this.graphViewport.set(next),
      () => {
        this.graphViewportReady = true;
        this.graphViewportAnimating.set(false);
        this.persistExplorerState();
      },
    );
  }

  private animateImageViewport(): void {
    const animation = advanceImageViewportAnimation(this.imageViewport(), this.targetImageViewport);
    if (!animation) {
      return;
    }

    this.imageViewport.set(animation.nextViewport);
    this.targetImageViewport = animation.nextTarget;

    if (animation.done) {
      this.imageViewportReady = true;
      this.persistExplorerState();
    }
  }

  private measureGraphStage(host = this.graphStage?.nativeElement): void {
    const nextSize = readMeasuredStageSize(host);
    if (!nextSize) {
      return;
    }

    const previous = this.graphSize();
    this.graphSize.set(nextSize);

    if (!this.graph()) {
      return;
    }

    if (this.pendingInitialEntityFocus) {
      this.scheduleInitialEntityFocus();
      return;
    }

    if (!shouldRestoreGraphStageAfterResize({
      previousSize: previous,
      graphViewportReady: this.graphViewportReady,
    })) {
      return;
    }

    const restored = restoreResizedGraphStageView({
      previousSize: previous,
      nextSize,
      currentViewport: this.graphViewport(),
      targetViewport: this.viewportController.target,
    });
    if (!restored) {
      return;
    }

    this.graphViewport.set(restored.current);
    if (restored.target) {
      this.viewportController.restoreTarget(restored.target);
      return;
    }

    this.viewportController.clearTarget();
    if (restored.shouldMarkGraphViewportReady) {
      this.graphViewportReady = true;
    }
    if (restored.shouldMarkInitialGraphViewportReady) {
      this.initialGraphViewportReady.set(true);
    }
  }

  private measureImageStage(host = this.imageStage?.nativeElement): void {
    const nextSize = readMeasuredStageSize(host);
    if (!nextSize) {
      return;
    }

    const previous = this.imageSize();
    this.imageSize.set(nextSize);

    const asset = this.imageAsset();
    if (!asset) {
      return;
    }

    if (!shouldSyncImageStageAfterResize({
      previousSize: previous,
      imageViewportReady: this.imageViewportReady,
    })) {
      this.syncImageViewport(undefined, false);
      return;
    }

    this.targetImageViewport = null;
    this.imageViewport.set(
      restoreResizedImageStageView({
        previousSize: previous,
        nextSize,
        viewport: this.imageViewport(),
        asset,
        entityType: this.entityType,
      }) ?? createImageViewport(nextSize, asset, { entityType: this.entityType }),
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
    return graphImageBackdrop(this.imageUrl);
  }

  nodePosition(nodeId: string): GraphPoint {
    this.renderTick();
    return this.positions[nodeId] ?? { x: 0, y: 0 };
  }

  nodeSize(nodeId: string): number {
    const node = this.graphDerived().nodeMap.get(nodeId);
    return node ? graphNodeSize(node, this.graph()?.centerId ?? null, this.selectedNodeId()) : 22;
  }

  nodeHaloSize(nodeId: string): number {
    const node = this.graphDerived().nodeMap.get(nodeId);
    return node ? graphNodeHaloSize(node, this.graph()?.centerId ?? null, this.selectedNodeId()) : 34;
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
    const next = createResetImageViewport({
      size,
      asset: this.imageAsset(),
      entityType: this.entityType,
    });
    if (!next) {
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

    const plan = createCenterSelectionPlan({
      graph,
      currentScale: this.currentGraphViewportState().scale,
      getNodePoint: (nodeId) => this.nodePosition(nodeId),
      createViewportCenteredOnPoint: (point, scale) => this.createViewportCenteredOnPoint(point, scale),
    });
    if (!plan) {
      return;
    }

    this.applyGraphViewportFocusPlan(plan);
  }

  focusCurrentEntity(animate = false): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    const plan = createCurrentEntityFocusPlan({
      graph,
      animate,
      pendingInitialEntityFocus: this.pendingInitialEntityFocus,
      createEntityFocusedGraphViewport: () => this.createEntityFocusedGraphViewport(),
    });
    if (!plan) {
      return;
    }

    this.applyGraphViewportFocusPlan(plan);
  }

  focusNode(nodeId: string): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    const node = this.graphDerived().nodeMap.get(nodeId);
    if (!node) {
      return;
    }

    const plan = createNodeFocusPlan({
      graph,
      nodeId,
      currentScale: this.currentGraphViewportState().scale,
      getNodePoint: (targetNodeId) => this.nodePosition(targetNodeId),
      createViewportCenteredOnPoint: (point, scale) => this.createViewportCenteredOnPoint(point, scale),
    });
    if (!plan) {
      return;
    }

    this.applyGraphViewportFocusPlan(plan);
  }

  openSelectedEntity(): void {
    const node = this.graphDerived().contextualNode;
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
    this.viewportController.clearTarget();
    this.scheduleGraphViewportUpdate(
      createGraphZoomViewport({
        currentViewport: this.currentGraphViewportState(),
        factor,
        rect,
      }),
    );
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
    this.viewportController.clearTarget();
    this.scheduleGraphViewportUpdate(
      createGraphWheelViewport({
        currentViewport: this.currentGraphViewportState(),
        factor,
        clientX: event.clientX,
        clientY: event.clientY,
        rect: stage.getBoundingClientRect(),
      }),
    );
  }

  onImageWheel(event: WheelEvent): void {
    event.preventDefault();
    const stage = this.imageStage?.nativeElement;
    if (!stage || !this.imageAsset()) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    this.applyImageZoom(event.deltaY < 0 ? 1.08 : 0.92, createImageWheelAnchor(event, rect));
  }

  onGraphStagePointerDown(event: PointerEvent): void {
    const session = beginGraphPanSession(event);
    if (!session) {
      return;
    }

    this.cancelPendingInitialGraphFocus(true);
    this.pointerSession = session;
    this.tooltip.set(null);
  }

  onGraphStagePointerMove(event: PointerEvent): void {
    if (this.pointerSession?.kind !== 'graph-pan' || this.pointerSession.pointerId !== event.pointerId) {
      return;
    }

    const moved = moveGraphPanSession({
      session: this.pointerSession,
      client: { x: event.clientX, y: event.clientY },
      currentViewport: this.currentGraphViewportState(),
    });

    this.pointerSession = moved.nextSession;
    if (!moved.nextViewport) {
      return;
    }

    this.viewportController.clearTarget();
    this.scheduleGraphViewportUpdate(moved.nextViewport);
  }

  onGraphStagePointerUp(event: PointerEvent): void {
    if (this.pointerSession?.kind !== 'graph-pan' || this.pointerSession.pointerId !== event.pointerId) {
      return;
    }

    endGraphPointerSession(event);
    this.flushPendingGraphViewport();
    this.persistExplorerState();
    this.pointerSession = null;
  }

  onNodePointerDown(event: PointerEvent, nodeId: string): void {
    event.stopPropagation();

    const stage = this.graphStage?.nativeElement;
    if (!stage) {
      return;
    }

    this.cancelPendingInitialGraphFocus(true);
    this.pointerSession = beginNodeDragSession({
      event,
      nodeId,
      rect: stage.getBoundingClientRect(),
      currentViewport: this.currentGraphViewportState(),
      nodePoint: this.nodePosition(nodeId),
    });
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

    const moved = moveNodeDragSession({
      session: this.pointerSession,
      event,
      graph,
      rect: stage.getBoundingClientRect(),
      currentViewport: this.currentGraphViewportState(),
    });

    if (!moved.moved) {
      return;
    }

    if (moved.shouldPinCenter) {
      this.pinCenterNode();
      this.renderTick.update((value) => value + 1);
      return;
    }

    if (!moved.nextNodePoint) {
      return;
    }

    this.positions[this.pointerSession.nodeId] = moved.nextNodePoint;
    this.pointerSession = moved.nextSession;
    this.renderTick.update((value) => value + 1);
  }

  onNodePointerUp(event: PointerEvent): void {
    if (this.pointerSession?.kind !== 'node-drag' || this.pointerSession.pointerId !== event.pointerId) {
      return;
    }

    endGraphPointerSession(event);
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
      endGraphPointerSession(event);
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
    this.pointerSession = createImagePanSession(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  onImagePointerMove(event: PointerEvent): void {
    if (this.pointerSession?.kind !== 'image-pan' || this.pointerSession.pointerId !== event.pointerId) {
      return;
    }

    const asset = this.imageAsset();
    if (!asset) {
      return;
    }

    const update = updateImagePanSession(this.pointerSession, { x: event.clientX, y: event.clientY });

    if (!update.moved) {
      this.pointerSession = update.nextSession;
      return;
    }

    const next = panGraphImageViewport({
      current: this.imageViewport(),
      deltaX: update.deltaX,
      deltaY: update.deltaY,
      size: this.currentImageStageSize(),
      asset,
    });
    if (!next) {
      return;
    }

    this.targetImageViewport = null;
    this.imageViewport.set(next);
    this.pointerSession = update.nextSession;
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
    if (!canHandleHover(this.pointerSession)) {
      return;
    }

    this.interruptGraphViewportAutomation();
    const node = this.graphDerived().nodeMap.get(nodeId);
    if (!node) {
      return;
    }

    this.hoveredNodeId.set(nodeId);
    this.hoveredEdgeId.set(null);
    this.tooltip.set(createNodeHoverTooltip({
      event,
      title: node.label,
      type: node.type,
      body: node.metadata?.summary || null,
    }));
  }

  onEdgeHover(event: PointerEvent, edge: GraphEdge): void {
    if (!canHandleHover(this.pointerSession)) {
      return;
    }

    this.interruptGraphViewportAutomation();
    this.hoveredNodeId.set(null);
    this.hoveredEdgeId.set(edge.id);
    this.tooltip.set(createEdgeHoverTooltip(event, edge));
  }

  onTooltipMove(event: PointerEvent): void {
    if (!canHandleHover(this.pointerSession)) {
      return;
    }

    this.interruptGraphViewportAutomation();
    const tooltip = this.tooltip();
    if (!tooltip) {
      return;
    }

    this.scheduleTooltipPosition({ x: event.clientX, y: event.clientY });
  }

  clearHover(): void {
    if (!canHandleHover(this.pointerSession)) {
      return;
    }

    this.hoveredNodeId.set(null);
    this.hoveredEdgeId.set(null);
    this.tooltipController.clear();
    this.tooltip.set(null);
  }

  tooltipStyle(): Record<string, string> {
    return graphTooltipStyle(this.tooltip(), this.graphStage?.nativeElement);
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

  private ensureSelectionVisible(): void {
    const nextSelectedNodeId = ensureGraphSelectionVisible(
      this.graph(),
      this.selectedNodeId(),
      this.graphDerived().visibleNodeIds,
    );
    if (!nextSelectedNodeId || nextSelectedNodeId === this.selectedNodeId()) {
      return;
    }

    this.selectedNodeSource = 'center';
    this.selectedNodeId.set(nextSelectedNodeId);
  }

  private createFittedGraphViewport(): GraphViewport | null {
    const size = this.currentGraphStageSize();
    if (!size.width || !size.height) {
      return null;
    }

    const nodeIds = this.graphDerived().filteredNodes.map((node) => node.id);
    const bounds = measureGraphBounds(nodeIds, this.positions, (nodeId) => this.nodeHaloSize(nodeId) + 56);

    if (!bounds) {
      return createGraphViewport(size.width, size.height, 0.82);
    }

    return fitGraphBounds(bounds, size, 92);
  }

  private createViewportCenteredOnPoint(point: GraphPoint, scale: number): GraphViewport | null {
    return createCenteredGraphViewport(point, this.currentGraphStageSize(), scale);
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
    const size = this.graphSize();
    this.initialFocusController.schedule({
      isBrowser: this.isBrowser,
      pendingInitialEntityFocus: this.pendingInitialEntityFocus,
      hasUserAdjustedGraphView: this.hasUserAdjustedGraphView,
      hasGraph: !!this.graph(),
      size,
      runFocusPass: () => {
        this.pinCenterNode();
        this.resetGraphView(false);
      },
      hasGraphNow: () => !!this.graph(),
      onComplete: () => {
        this.pinCenterNode();
        this.resetGraphView(false);
        this.pendingInitialEntityFocus = false;
        this.initialGraphViewportReady.set(true);
        this.ensureInitialGraphFit();
        this.renderTick.update((value) => value + 1);
        this.persistExplorerState();
      },
    });
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
      this.viewportController.restoreTarget(next);
      return;
    }

    this.viewportController.clearTarget();
    this.graphViewport.set(next);
    this.graphViewportReady = true;
  }

  private ensureInitialGraphFit(attempt = 0): void {
    void attempt;
    this.initialFocusController.ensureFit({
      isBrowser: this.isBrowser,
      hasUserAdjustedGraphView: this.hasUserAdjustedGraphView,
      hasGraphNow: () => !!this.graph(),
      pinCenterNode: () => this.pinCenterNode(),
      computeNextViewport: () => this.createEntityFocusedGraphViewport(),
      applyViewport: (next) => {
        this.viewportController.clearTarget();
        this.graphViewport.set(next);
        this.graphViewportReady = true;
      },
      onApplied: () => {
        this.renderTick.update((value) => value + 1);
        this.persistExplorerState();
      },
    });
  }

  private cancelPendingInitialGraphFocus(markUserAdjusted = false): void {
    this.initialFocusController.cancel({
      isBrowser: this.isBrowser,
      markUserAdjusted,
      onMarkUserAdjusted: () => {
        this.hasUserAdjustedGraphView = true;
      },
      onCancelPending: () => {
        this.pendingInitialEntityFocus = false;
        this.initialGraphViewportReady.set(true);
      },
    });
  }

  private cancelGraphViewportTarget(): void {
    cancelGraphViewportAutomationRuntime({
      viewportController: this.viewportController,
      setAnimating: (value) => this.graphViewportAnimating.set(value),
      setGraphViewportReady: (value) => {
        this.graphViewportReady = value;
      },
    });
  }

  private interruptGraphViewportAutomation(): void {
    this.cancelPendingInitialGraphFocus(true);
    this.cancelGraphViewportTarget();
  }

  private applyGraphViewportFocusPlan(plan: GraphViewportFocusPlan): void {
    applyGraphViewportFocusPlanRuntime({
      plan,
      viewportController: this.viewportController,
      setSelectedNodeSource: () => {
        this.selectedNodeSource = plan.selectedNodeSource;
      },
      setSelectedNodeId: () => {
        this.selectedNodeId.set(plan.selectedNodeId);
      },
      pinCenterNode: () => this.pinCenterNode(),
      setViewport: (viewport) => this.graphViewport.set(viewport),
      setGraphViewportReady: (value) => {
        this.graphViewportReady = value;
      },
      setInitialGraphViewportReady: (value) => this.initialGraphViewportReady.set(value),
      bumpRenderTick: () => this.renderTick.update((value) => value + 1),
      onCancelPendingInitialFocus: () => this.cancelPendingInitialGraphFocus(true),
      onStartAnimation: (next, config) => this.startGraphViewportAnimation(next, config),
      onPersist: () => this.persistExplorerState(),
    });
  }

  private startGraphViewportAnimation(
    next: GraphViewport,
    config: GraphViewportAnimationConfig = DEFAULT_GRAPH_VIEWPORT_ANIMATION,
  ): void {
    startGraphViewportAnimationRuntime({
      viewportController: this.viewportController,
      next,
      config,
      setViewport: (viewport) => this.graphViewport.set(viewport),
      setAnimating: (value) => this.graphViewportAnimating.set(value),
      startLoop: () => this.startAnimationLoop(),
    });
  }

  private currentGraphViewportState(): GraphViewport {
    return this.viewportController.current(this.graphViewport());
  }

  private scheduleGraphViewportUpdate(next: GraphViewport): void {
    scheduleGraphViewportUpdateRuntime({
      viewportController: this.viewportController,
      next,
      isBrowser: this.isBrowser,
      setViewport: (viewport) => this.graphViewport.set(viewport),
    });
  }

  private flushPendingGraphViewport(): void {
    flushPendingGraphViewportRuntime({
      viewportController: this.viewportController,
      setViewport: (viewport) => this.graphViewport.set(viewport),
    });
  }

  private scheduleTooltipPosition(point: GraphPoint): void {
    scheduleTooltipPositionRuntime({
      tooltipController: this.tooltipController,
      point,
      isBrowser: this.isBrowser,
      getTooltip: () => this.tooltip(),
      setTooltip: (tooltip) => this.tooltip.set(tooltip),
    });
  }

  private flushPendingTooltipPosition(): void {
    flushPendingTooltipPositionRuntime({
      tooltipController: this.tooltipController,
      getTooltip: () => this.tooltip(),
      setTooltip: (tooltip) => this.tooltip.set(tooltip),
    });
  }

  private syncImageViewport(
    mapViewport?: (current: ImageViewport) => ImageViewport,
    animate = false,
    forceFit = false,
  ): void {
    const next = syncGraphImageViewport({
      asset: this.imageAsset(),
      size: this.currentImageStageSize(),
      current: this.imageViewport(),
      persistedImage: this.persistedState?.image,
      entityType: this.entityType,
      imageViewportReady: this.imageViewportReady,
      forceFit,
      mapViewport,
    });
    if (!next) {
      return;
    }

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
    const next = zoomGraphImageViewport({
      current: this.imageViewport(),
      factor,
      anchor,
      size: this.currentImageStageSize(),
      asset: this.imageAsset(),
    });
    if (!next) {
      return;
    }

    this.targetImageViewport = null;
    this.imageViewport.set(next);
    this.imageViewportReady = true;
    this.persistExplorerState();
  }

  private currentGraphStageSize(): { width: number; height: number } {
    return resolveLiveStageSize(this.graphStage?.nativeElement, this.graphSize());
  }

  private currentImageStageSize(): { width: number; height: number } {
    return resolveLiveStageSize(this.imageStage?.nativeElement, this.imageSize());
  }

  private persistExplorerState(): void {
    const state = createExplorerPersistedState({
      slug: this.slug,
      graph: this.graph(),
      graphSize: this.currentGraphStageSize(),
      graphViewport: this.viewportController.currentOrTarget(this.graphViewport()),
      positions: this.positions,
      selectedNodeId: this.selectedNodeId(),
      labelsMode: this.labelsMode(),
      entityTypeFilters: this.entityTypeFilters(),
      relationTypeFilters: this.relationTypeFilters(),
      asset: this.imageAsset(),
      imageSize: this.currentImageStageSize(),
      imageViewport: this.imageViewport(),
      targetImageViewport: this.targetImageViewport,
      imageViewportReady: this.imageViewportReady,
    });
    if (!state) {
      return;
    }

    this.persistedState = state;
    saveExplorerState(this.slug, state);
  }
}
