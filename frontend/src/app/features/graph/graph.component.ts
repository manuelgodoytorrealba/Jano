import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
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
import { EntityRouteArtworkTransitionService } from '../../core/entity-route-artwork-transition.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { MediaLike, resolveMediaPresentation } from '../../shared/media/media.utils';
import { GraphStageRect } from './graph-interaction';
import { ForceLayoutScratch } from './graph-layout';
import { graphViewportTransform } from './graph-viewport';
import { imageViewportTransform, ImageAssetSize, ImageViewport } from './image-viewport';
import {
  GraphData,
  GraphEdge,
  GraphPoint,
  GraphRenderedEdge,
  GraphRenderedNode,
  GraphTooltip,
  GraphViewport,
} from './graph.models';
import { GraphResponseDto } from '../../core/api/graph.models';
import { ExplorerPersistedState, saveExplorerState } from './graph-persistence';
import { GraphControlsBarComponent } from './graph-controls-bar.component';
import { GraphInspectorPanelComponent } from './graph-inspector-panel.component';
import { GraphSceneComponent } from './graph-scene.component';
import {
  DEFAULT_GRAPH_VIEWPORT_ANIMATION,
  graphLabelScaleBucket,
  GraphViewportAnimationConfig,
  shouldEnsureInitialGraphFit,
} from './graph-camera';
import {
  createCenterSelectionPlan,
  createCurrentEntityFocusPlan,
  createNodeFocusPlan,
  GraphSelectionSource,
  GraphViewportFocusPlan,
} from './graph-focus';
import { buildGraphDerivedState, ensureGraphSelectionVisible } from './graph-derived';
import {
  buildGraphAmbientFields,
  buildRenderedGraphEdges,
  buildRenderedGraphNodes,
  graphImageBackdrop,
  graphNodeHaloSize,
  graphNodeSize,
  graphTooltipStyle,
} from './graph-render';
import {
  resolveEdgeLabelOcclusion,
  resolveNodeLabelOcclusion,
  visibleLabelBoxes,
} from './graph-label-layout';
import {
  createGraphFocusedViewport,
  createGraphNodePosition,
  createGraphViewportFromPoint,
} from './graph-geometry';
import { GraphCameraRuntime } from './graph-camera-runtime';
import {
  initializeLoadedGraphState,
  pinGraphCenter,
  reconcileGraphFilters,
  reuseGraphPositions,
  stopGraphMotion,
  warmupPreparedGraphLayout,
} from './graph-setup';
import { createExplorerPersistedState, resolveLiveStageSize } from './graph-state';
import { advanceExplorerLoop } from './graph-loop';
import {
  createImageWheelAnchor,
  createResetImageViewport,
  syncGraphImageViewport,
  zoomGraphImageViewport,
} from './graph-image';
import { buildLoadedGraphRuntime, resolveGraphInputChangesRuntime } from './graph-load';
import {
  measureGraphStageRuntime,
  measureImageStageRuntime,
  setupResizeObserverRuntime,
} from './graph-stage';
import { setAllGraphFilters, toggleGraphFilter } from './graph-filters';
import {
  canHandleHover,
  createEdgeHoverTooltip,
  createGraphWheelViewport,
  createGraphZoomViewport,
  createNodeHoverTooltip,
} from './graph-stage-interactions';
import { GraphInteractionRuntime } from './graph-interaction-runtime';

type ImageMeta = {
  source?: string | null;
  photoBy?: string | null;
  license?: string | null;
};

type GraphWorkspaceMode = 'split' | 'image' | 'graph';
type GraphEntityInfo = {
  title: string;
  subtitle: string | null;
  summary: string | null;
  badges: string[];
};

@Component({
  standalone: true,
  selector: 'app-graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GraphControlsBarComponent,
    GraphSceneComponent,
    GraphInspectorPanelComponent,
  ],
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
})
export class GraphComponent implements OnChanges, AfterViewInit, OnDestroy {
  private static readonly NODE_DOUBLE_ACTIVATION_MS = 320;
  private static readonly EDGE_DOUBLE_ACTIVATION_MS = 320;

  private readonly api = inject(EntitiesApi);
  readonly artworkTransition = inject(EntityRouteArtworkTransitionService);
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  @Input() slug = '';
  @Input() graphData: GraphResponseDto | null = null;
  @Input() workspaceMode: GraphWorkspaceMode = 'split';
  @Input() imageMedia: MediaLike | null = null;
  @Input() imageUrl: string | null = null;
  @Input() imageAlt = '';
  @Input() entityTitle = '';
  @Input() entityType = '';
  @Input() imageMeta: ImageMeta | null = null;
  @Input() workspaceFocused = false;
  @Input() workspaceTransitioning = false;
  @Input() isMobileViewport = false;
  @Input() entityInfo: GraphEntityInfo | null = null;
  @Input() overviewMode = false;
  @Input() ambientMotion = false;
  @Input() allowNodeOpen = true;
  @Input() showControls = true;
  @Input() showInspector = true;
  @Input() hideImagePane = false;
  @Input() disableSelectionZoom = true;
  @Input() preserveRuntimeOnGraphChange = false;
  @Input() showAllOverviewRelations = false;
  @Output() workspaceFocusToggle = new EventEmitter<void>();
  @Output() nodeSelect = new EventEmitter<string>();

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
  readonly imageLoading = signal(false);
  readonly entityTypeFilters = signal<Record<string, boolean>>({});
  readonly relationTypeFilters = signal<Record<string, boolean>>({});
  readonly renderTick = signal(0);
  readonly initialGraphViewportReady = signal(true);
  readonly graphViewportAnimating = signal(false);
  readonly inspectorVisible = signal(false);
  readonly imageInfoOpen = signal(false);
  readonly graphInteractionActive = signal(false);
  readonly artworkRouteArrivalActive = computed(() => this.artworkTransition.isForSlug(this.slug));

  private loadSub?: Subscription;
  private graphResizeObserver?: ResizeObserver;
  private imageResizeObserver?: ResizeObserver;
  private graphStageRectCache: GraphStageRect | null = null;
  private hoverClearTimer: ReturnType<typeof setTimeout> | null = null;
  private graphInteractionSettleTimer: ReturnType<typeof setTimeout> | null = null;
  private workspaceTransitionSettleTimer: ReturnType<typeof setTimeout> | null = null;
  private workspaceResizePaused = false;
  private pendingGraphMeasure = false;
  private pendingImageMeasure = false;
  private targetImageViewport: ImageViewport | null = null;
  private positions: Record<string, GraphPoint> = {};
  private velocities: Record<string, GraphPoint> = {};
  private lastNodeActivation: { nodeId: string; at: number } | null = null;
  private lastEdgeActivation: { edgeId: string; at: number } | null = null;
  private imageViewportReady = false;
  private graphViewportReady = false;
  private persistedState: ExplorerPersistedState | null = null;
  private layoutScratch: ForceLayoutScratch | null = null;
  private pendingInitialEntityFocus = false;
  private appliedGraphData: GraphResponseDto | null = null;
  private selectedNodeSource: GraphSelectionSource = 'center';
  private hasUserAdjustedGraphView = false;
  private graphLayoutActive = false;
  private graphLayoutFrames = 0;
  private graphSettledFrames = 0;
  private readonly camera = new GraphCameraRuntime();
  private readonly interactions = new GraphInteractionRuntime();
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
      viewportScale: this.graphViewport().scale,
      overviewMode: this.overviewMode,
      showAllOverviewRelations: this.showAllOverviewRelations,
    }),
  );

  readonly renderedEdges = computed<GraphRenderedEdge[]>(() => {
    this.renderTick();
    return buildRenderedGraphEdges({
      edges: this.graphDerived().filteredEdges,
      positions: this.positions,
      centerId: this.graph()?.centerId ?? null,
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
  readonly ambientFields = computed(() =>
    buildGraphAmbientFields({
      nodes: this.graphDerived().filteredNodes,
      positions: this.positions,
      centerId: this.graph()?.centerId ?? null,
      selectedNodeId: this.selectedNodeId(),
      selectedNeighbors: this.graphDerived().selectedNeighbors,
    }),
  );

  readonly labelScaleBucket = computed(() => graphLabelScaleBucket(this.graphViewport().scale));
  readonly imagePresentation = computed(() => resolveMediaPresentation(this.imageMedia));
  readonly inspectorFocusedNodeIsCenter = computed(() => {
    const derived = this.graphDerived();
    const centerId = this.graph()?.centerId ?? null;
    return !derived.selectedNode || derived.selectedNode.id === centerId;
  });
  readonly hasImageSource = computed(() => !!(this.imagePresentation().src || this.imageUrl));
  readonly resolvedNodeLabelVisibility = computed(() =>
    resolveNodeLabelOcclusion({
      nodes: this.renderedNodes(),
      requestedVisibility: this.graphDerived().nodeLabelVisibility,
      centerId: this.graph()?.centerId ?? null,
      selectedNodeId: this.selectedNodeId(),
      hoveredNodeId: this.hoveredNodeId(),
      scale: this.graphViewport().scale,
    }),
  );
  readonly resolvedEdgeLabelVisibility = computed(() =>
    resolveEdgeLabelOcclusion({
      edges: this.renderedEdges(),
      requestedVisibility: this.graphDerived().edgeLabelVisibility,
      centerId: this.graph()?.centerId ?? null,
      selectedNodeId: this.selectedNodeId(),
      hoveredEdgeId: this.hoveredEdgeId(),
      scale: this.graphViewport().scale,
      occupiedBoxes: visibleLabelBoxes({
        nodes: this.renderedNodes(),
        nodeVisibility: this.resolvedNodeLabelVisibility(),
      }),
    }),
  );
  readonly activeEdgeLabelVisibility = computed(() => {
    if (this.isMobileViewport) {
      return {};
    }

    return this.graphInteractionActive() ? {} : this.resolvedEdgeLabelVisibility();
  });
  readonly activeNodeLabelVisibility = computed(() => {
    if (this.isMobileViewport) {
      return this.graphDerived().filteredNodes.reduce<Record<string, boolean>>((visible, node) => {
        visible[node.id] = true;
        return visible;
      }, {});
    }

    const derived = this.graphDerived();
    if (!this.graphInteractionActive()) {
      return this.resolvedNodeLabelVisibility();
    }

    const visible: Record<string, boolean> = {};
    if (derived.centerNode) {
      visible[derived.centerNode.id] = true;
    }
    if (derived.selectedNode) {
      visible[derived.selectedNode.id] = true;
    }
    return visible;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['workspaceMode'] && changes['workspaceMode'].currentValue !== 'image') ||
      (changes['isMobileViewport'] && changes['isMobileViewport'].currentValue === false)
    ) {
      this.imageInfoOpen.set(false);
    }

    if (
      (changes['workspaceMode'] && !changes['workspaceMode'].firstChange) ||
      (changes['workspaceFocused'] && !changes['workspaceFocused'].firstChange) ||
      changes['workspaceTransitioning']?.currentValue === true
    ) {
      this.beginWorkspaceTransitionSettle();
    }

    const next = resolveGraphInputChangesRuntime({
      changes,
      slug: this.slug,
      persistedState: this.persistedState,
    });

    if (next.slugState) {
      const nextState = next.slugState;
      this.persistedState = nextState.persistedState;
      this.graphViewportReady = nextState.graphViewportReady;
      this.imageViewportReady = nextState.imageViewportReady;
      this.camera.clearViewportTarget();
      this.targetImageViewport = nextState.targetImageViewport;
      this.imageAsset.set(null);
      this.imageLoading.set(this.hasImageSource());
      this.imageViewport.set(nextState.imageViewport);
      this.layoutScratch = nextState.layoutScratch;
      this.selectedNodeSource = nextState.selectedNodeSource;
      this.hasUserAdjustedGraphView = nextState.hasUserAdjustedGraphView;
      this.pendingInitialEntityFocus = nextState.pendingInitialEntityFocus;
    }

    if (next.imageState) {
      const nextState = next.imageState;
      this.persistedState = nextState.persistedState;
      this.imageAsset.set(null);
      this.imageLoading.set(this.hasImageSource());
      this.imageViewportReady = nextState.imageViewportReady;
      this.targetImageViewport = nextState.targetImageViewport;
      this.imageViewport.set(nextState.imageViewport);
    }

    const incomingGraphData = changes['graphData']?.currentValue as
      | GraphResponseDto
      | null
      | undefined;
    if (incomingGraphData && incomingGraphData !== this.appliedGraphData) {
      this.appliedGraphData = incomingGraphData;
      this.applyGraphResponse(incomingGraphData);
      return;
    }

    if (next.shouldLoadGraph && !this.graphData) {
      this.loadGraph();
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

    this.camera.destroy(this.isBrowser);
    this.interactions.destroy(this.isBrowser);
    this.clearHoverClearTimer();
    this.clearGraphInteractionSettleTimer();
    this.clearWorkspaceTransitionSettleTimer();
  }

  private loadGraph(): void {
    if (!this.slug) {
      return;
    }

    this.loading.set(true);
    this.initialGraphViewportReady.set(false);
    this.graph.set(null);
    this.error.set(null);
    this.clearHoverClearTimer();
    this.hoveredNodeId.set(null);
    this.hoveredEdgeId.set(null);
    this.tooltip.set(null);
    this.loadSub?.unsubscribe();

    this.loadSub = this.api.graph(this.slug).subscribe({
      next: (response) => this.applyGraphResponse(response),
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el grafo.');
      },
    });
  }

  private applyGraphResponse(response: GraphResponseDto): void {
    const previousGraph = this.graph();
    const previousSelectedNodeId = this.selectedNodeId();
    const shouldPreserveRuntime = this.preserveRuntimeOnGraphChange && !!previousGraph;
    const loadedState = buildLoadedGraphRuntime({
      initialized: initializeLoadedGraphState(response, this.persistedState?.graph),
    });

    this.graph.set(loadedState.graph);
    this.layoutScratch = loadedState.layoutScratch;
    this.positions = shouldPreserveRuntime
      ? reuseGraphPositions(loadedState.graph, this.positions, loadedState.positions)
      : loadedState.positions;
    this.velocities = {};
    this.pinCenterNode();
    this.warmupGraphLayout(shouldPreserveRuntime ? 10 : undefined);

    this.entityTypeFilters.set(
      shouldPreserveRuntime
        ? reconcileGraphFilters(loadedState.graph.entityTypes, this.entityTypeFilters())
        : loadedState.entityTypeFilters,
    );
    this.relationTypeFilters.set(
      shouldPreserveRuntime
        ? reconcileGraphFilters(loadedState.graph.relationTypes, this.relationTypeFilters())
        : loadedState.relationTypeFilters,
    );
    this.labelsMode.set(loadedState.labelsMode);

    const nextSelectedNodeId =
      shouldPreserveRuntime &&
      previousSelectedNodeId &&
      loadedState.graph.nodes.some((node) => node.id === previousSelectedNodeId)
        ? previousSelectedNodeId
        : loadedState.selectedNodeId;

    this.selectedNodeSource =
      nextSelectedNodeId === loadedState.graph.centerId ? 'center' : 'explicit';
    this.selectedNodeId.set(nextSelectedNodeId);
    this.hoveredNodeId.set(null);
    this.hoveredEdgeId.set(null);
    this.tooltip.set(null);

    this.pendingInitialEntityFocus = shouldPreserveRuntime
      ? false
      : loadedState.pendingInitialEntityFocus;
    this.hasUserAdjustedGraphView = shouldPreserveRuntime
      ? true
      : loadedState.hasUserAdjustedGraphView;
    this.camera.clearViewportTarget();
    this.graphViewportReady = shouldPreserveRuntime
      ? this.graphViewportReady
      : loadedState.graphViewportReady;
    this.initialGraphViewportReady.set(shouldPreserveRuntime);
    this.graphLayoutActive = loadedState.graphLayoutActive;
    this.graphLayoutFrames = loadedState.graphLayoutFrames;
    this.graphSettledFrames = loadedState.graphSettledFrames;

    if (!shouldPreserveRuntime) {
      this.focusCurrentEntity(false);
    }

    this.loading.set(false);
    this.error.set(null);
    this.startAnimationLoop();

    if (shouldPreserveRuntime) {
      this.renderTick.update((value) => value + 1);
      this.persistExplorerState();
      return;
    }

    this.scheduleInitialEntityFocus();
    this.ensureInitialGraphFit();
  }

  private pinCenterNode(): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    this.pinGraphCenterNode(graph);
  }

  private pinGraphCenterNode(graph: GraphData): void {
    pinGraphCenter(graph, this.positions, this.velocities);
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
    this.interactions.startLoop(this.isBrowser, () => this.advanceAnimationFrame());
  }

  private advanceAnimationFrame(): boolean {
    const loop = advanceExplorerLoop({
      graph: this.graph(),
      positions: this.positions,
      velocities: this.velocities,
      layoutScratch: this.layoutScratch,
      pointerSession: this.interactions.pointerSession,
      ambientMotion: this.ambientMotion,
      selectedNodeId: this.selectedNodeId(),
      loopState: {
        graphLayoutActive: this.graphLayoutActive,
        graphLayoutFrames: this.graphLayoutFrames,
        graphSettledFrames: this.graphSettledFrames,
      },
      pinCenterNode: () => this.pinCenterNode(),
      camera: this.camera,
      currentGraphViewport: this.graphViewport(),
      applyGraphViewport: (viewport) => this.graphViewport.set(viewport),
      onGraphViewportDone: () => {
        this.graphViewportReady = true;
        this.graphViewportAnimating.set(false);
        this.persistExplorerState();
      },
      currentImageViewport: this.imageViewport(),
      targetImageViewport: this.targetImageViewport,
    });

    this.graphLayoutActive = loop.graphLayoutActive;
    this.graphLayoutFrames = loop.graphLayoutFrames;
    this.graphSettledFrames = loop.graphSettledFrames;
    if (loop.nextImageViewport) this.imageViewport.set(loop.nextImageViewport);
    this.targetImageViewport = loop.nextImageTarget;
    if (loop.imageAnimationDone) {
      this.imageViewportReady = true;
      this.persistExplorerState();
    }
    if (loop.shouldRender) this.renderTick.update((value) => value + 1);
    return loop.shouldContinue;
  }

  private setupGraphStage(): void {
    const graphStage = this.graphStage?.nativeElement;
    this.graphResizeObserver = setupResizeObserverRuntime({
      isBrowser: this.isBrowser,
      observer: this.graphResizeObserver,
      host: graphStage,
      onMeasure: () => this.measureGraphStage(graphStage),
    });

    if (!graphStage) {
      return;
    }

    if (
      shouldEnsureInitialGraphFit({
        isBrowser: this.isBrowser,
        hasUserAdjustedGraphView: this.hasUserAdjustedGraphView,
      }) &&
      this.graph()
    ) {
      this.pendingInitialEntityFocus = true;
      this.scheduleInitialEntityFocus();
      this.ensureInitialGraphFit();
    }
  }

  private setupImageStage(): void {
    const imageStage = this.imageStage?.nativeElement;
    this.imageResizeObserver = setupResizeObserverRuntime({
      isBrowser: this.isBrowser,
      observer: this.imageResizeObserver,
      host: imageStage,
      onMeasure: () => this.measureImageStage(imageStage),
    });

    if (imageStage) {
      this.reportArtworkTransitionTarget(imageStage);
    }
  }
  private measureGraphStage(host = this.graphStage?.nativeElement, force = false): void {
    if (this.workspaceResizePaused && !force) {
      this.pendingGraphMeasure = true;
      return;
    }

    const measured = measureGraphStageRuntime({
      host,
      previousSize: this.graphSize(),
      graphViewportReady: this.graphViewportReady,
      currentViewport: this.graphViewport(),
      targetViewport: this.camera.viewportTarget,
    });
    const nextSize = measured.nextSize;
    if (!nextSize) {
      return;
    }

    this.graphSize.set(nextSize);
    this.graphStageRectCache = null;

    if (!this.graph()) {
      return;
    }

    if (this.pendingInitialEntityFocus) {
      this.scheduleInitialEntityFocus();
      return;
    }

    if (!measured.restored) {
      return;
    }

    const restored = measured.restored;
    this.graphViewport.set(restored.current);
    if (restored.target) {
      this.camera.restoreViewportTarget(restored.target);
      return;
    }

    this.camera.clearViewportTarget();
    if (restored.shouldMarkGraphViewportReady) {
      this.graphViewportReady = true;
    }
    if (restored.shouldMarkInitialGraphViewportReady) {
      this.initialGraphViewportReady.set(true);
    }
  }

  private measureImageStage(host = this.imageStage?.nativeElement, force = false): void {
    if (this.workspaceResizePaused && !force) {
      this.pendingImageMeasure = true;
      return;
    }

    const measured = measureImageStageRuntime({
      host,
      previousSize: this.imageSize(),
      imageViewportReady: this.imageViewportReady,
      viewport: this.imageViewport(),
      asset: this.imageAsset(),
      viewportOptions: this.imageViewportOptions(),
    });
    const nextSize = measured.nextSize;
    if (!nextSize) {
      return;
    }

    this.imageSize.set(nextSize);
    if (host) {
      this.reportArtworkTransitionTarget(host);
    }
    if (measured.shouldSyncViewport) {
      this.syncImageViewport(undefined, false);
      return;
    }

    if (!measured.nextViewport) {
      return;
    }

    this.targetImageViewport = null;
    this.imageViewport.set(measured.nextViewport);
    this.imageViewportReady = true;
  }

  private beginWorkspaceTransitionSettle(): void {
    if (!this.isBrowser) {
      return;
    }

    if (this.isMobileViewport) {
      this.workspaceResizePaused = false;
      this.clearWorkspaceTransitionSettleTimer();
      requestAnimationFrame(() => this.flushWorkspaceTransitionMeasurements());
      this.workspaceTransitionSettleTimer = setTimeout(() => {
        this.workspaceTransitionSettleTimer = null;
        this.flushWorkspaceTransitionMeasurements();
      }, 240);
      return;
    }

    this.workspaceResizePaused = true;
    this.clearWorkspaceTransitionSettleTimer();
    this.workspaceTransitionSettleTimer = setTimeout(() => {
      this.workspaceResizePaused = false;
      this.workspaceTransitionSettleTimer = null;
      this.flushWorkspaceTransitionMeasurements();
    }, 320);
  }

  private flushWorkspaceTransitionMeasurements(): void {
    if (this.pendingGraphMeasure || this.graphStage?.nativeElement) {
      this.pendingGraphMeasure = false;
      this.measureGraphStage(undefined, true);
    }

    if (this.pendingImageMeasure || this.imageStage?.nativeElement) {
      this.pendingImageMeasure = false;
      this.measureImageStage(undefined, true);
    }
  }

  private clearWorkspaceTransitionSettleTimer(): void {
    if (!this.workspaceTransitionSettleTimer) {
      return;
    }

    clearTimeout(this.workspaceTransitionSettleTimer);
    this.workspaceTransitionSettleTimer = null;
  }

  onImageLoaded(event: Event): void {
    const image = event.target as HTMLImageElement;
    this.imageAsset.set({
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    });
    this.imageLoading.set(false);
    if (this.imageStage?.nativeElement) {
      this.reportArtworkTransitionTarget(this.imageStage.nativeElement);
    }
    this.targetImageViewport = null;
    this.imageViewportReady = false;
    this.syncImageViewport(undefined, false, true);
  }

  private reportArtworkTransitionTarget(host: HTMLDivElement): void {
    if (!this.artworkTransition.isForSlug(this.slug)) {
      return;
    }

    const rect = host.getBoundingClientRect();
    this.artworkTransition.reportDestinationFrame(this.slug, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }

  graphViewportTransform(): string {
    return graphViewportTransform(this.graphViewport());
  }

  imageTransform(): string {
    return imageViewportTransform(this.imageViewport());
  }

  imageBackdrop(): string | null {
    return graphImageBackdrop(this.imagePresentation().src ?? this.imageUrl);
  }

  nodePosition(nodeId: string): GraphPoint {
    this.renderTick();
    return createGraphNodePosition(this.positions, nodeId);
  }

  nodeSize(nodeId: string): number {
    const node = this.graphDerived().nodeMap.get(nodeId);
    return node ? graphNodeSize(node, this.graph()?.centerId ?? null, this.selectedNodeId()) : 22;
  }

  nodeHaloSize(nodeId: string): number {
    const node = this.graphDerived().nodeMap.get(nodeId);
    return node
      ? graphNodeHaloSize(node, this.graph()?.centerId ?? null, this.selectedNodeId())
      : 34;
  }

  resetGraphView(animate = true): void {
    this.focusCurrentEntity(animate);
  }

  resetImageView(animate = true): void {
    const next = createResetImageViewport({
      size: this.currentImageStageSize(),
      asset: this.imageAsset(),
      viewportOptions: this.imageViewportOptions(),
    });
    if (!next) return;
    if (animate) {
      this.targetImageViewport = next;
      this.startAnimationLoop();
      this.persistExplorerState();
      return;
    }
    this.applyImageViewport(next);
  }

  centerSelection(): void {
    const graph = this.graph();
    if (!graph) return;
    const plan = createCenterSelectionPlan({
      graph,
      currentScale: this.currentGraphViewportState().scale,
      getNodePoint: (nodeId) => this.nodePosition(nodeId),
      createViewportCenteredOnPoint: (point, scale) =>
        this.createViewportCenteredOnPoint(point, scale),
    });
    if (plan) this.applyGraphViewportFocusPlan(plan);
  }

  focusCurrentEntity(animate = false): void {
    const graph = this.graph();
    if (!graph) return;
    const plan = createCurrentEntityFocusPlan({
      graph,
      animate,
      pendingInitialEntityFocus: this.pendingInitialEntityFocus,
      createEntityFocusedGraphViewport: () => this.createEntityFocusedGraphViewport(),
    });
    if (plan) this.applyGraphViewportFocusPlan(plan);
  }

  focusNode(nodeId: string): void {
    const graph = this.graph();
    if (!graph || !this.graphDerived().nodeMap.has(nodeId)) return;
    const plan = createNodeFocusPlan({
      graph,
      nodeId,
      currentScale: this.currentGraphViewportState().scale,
      getNodePoint: (targetNodeId) => this.nodePosition(targetNodeId),
      createViewportCenteredOnPoint: (point, scale) =>
        this.createViewportCenteredOnPoint(point, scale),
    });
    if (plan) this.applyGraphViewportFocusPlan(plan);
  }

  openSelectedEntity(): void {
    const node = this.graphDerived().contextualNode;
    if (node) void this.router.navigate(['/entity', node.slug]);
  }

  adjustGraphZoom(factor: number): void {
    const rect = this.currentGraphStageRect();
    if (!rect) return;
    const next = createGraphZoomViewport({
      currentViewport: this.currentGraphViewportState(),
      factor,
      rect,
    });
    this.cancelPendingInitialGraphFocus(true);
    this.camera.clearViewportTarget();
    this.scheduleGraphViewportUpdate(next);
  }

  adjustImageZoom(factor: number): void {
    const stage = this.imageStage?.nativeElement;
    const asset = this.imageAsset();
    if (!stage || !asset) return;
    const rect = stage.getBoundingClientRect();
    const next = zoomGraphImageViewport({
      current: this.imageViewport(),
      factor,
      anchor: { x: rect.width / 2, y: rect.height / 2 },
      size: this.currentImageStageSize(),
      asset,
    });
    if (next) this.applyImageViewport(next);
  }

  onGraphWheel(event: WheelEvent): void {
    this.markGraphInteractionActive(180);
    event.preventDefault();
    const rect = this.currentGraphStageRect();
    if (!rect) return;
    this.cancelPendingInitialGraphFocus(true);
    this.camera.clearViewportTarget();
    this.scheduleGraphViewportUpdate(
      createGraphWheelViewport({
        currentViewport: this.currentGraphViewportState(),
        factor: event.deltaY < 0 ? 1.1 : 0.92,
        clientX: event.clientX,
        clientY: event.clientY,
        rect,
      }),
    );
  }

  onImageWheel(event: WheelEvent): void {
    event.preventDefault();
    const stage = this.imageStage?.nativeElement;
    const asset = this.imageAsset();
    if (!stage || !asset) return;
    const next = zoomGraphImageViewport({
      current: this.imageViewport(),
      factor: event.deltaY < 0 ? 1.08 : 0.92,
      anchor: createImageWheelAnchor(event, stage.getBoundingClientRect()),
      size: this.currentImageStageSize(),
      asset,
    });
    if (next) this.applyImageViewport(next);
  }

  onGraphStagePointerDown(event: PointerEvent): void {
    this.interactions.graphStagePointerDown({
      event,
      isMobile: this.isMobileViewport,
      stage: this.graphStage?.nativeElement,
      currentViewport: this.currentGraphViewportState(),
      cancelInitialFocus: () => this.cancelPendingInitialGraphFocus(true),
      clearViewportTarget: () => this.camera.clearViewportTarget(),
      clearTooltip: () => this.tooltip.set(null),
    });
    this.markGraphInteractionActive(240);
  }

  onGraphStagePointerMove(event: PointerEvent): void {
    const active = this.interactions.graphStagePointerMove({
      event,
      stage: this.graphStage?.nativeElement,
      currentViewport: this.currentGraphViewportState(),
      clearViewportTarget: () => this.camera.clearViewportTarget(),
      setViewport: (viewport) => this.graphViewport.set(viewport),
      scheduleViewport: (viewport) => this.scheduleGraphViewportUpdate(viewport),
      markReady: () => {
        this.graphViewportReady = true;
        this.initialGraphViewportReady.set(true);
        this.hasUserAdjustedGraphView = true;
      },
    });
    if (active) {
      this.markGraphInteractionActive(180);
    }
  }

  onGraphStagePointerUp(event: PointerEvent): void {
    this.interactions.graphStagePointerUp({
      event,
      flushViewport: () => this.flushPendingGraphViewport(),
      persist: () => this.persistExplorerState(),
    });
    this.markGraphInteractionActive(120);
  }

  onNodePointerDown(event: PointerEvent, nodeId: string): void {
    this.markGraphInteractionActive(240);
    this.interactions.nodePointerDown({
      event,
      nodeId,
      stage: this.graphStage?.nativeElement,
      currentViewport: this.currentGraphViewportState(),
      nodePoint: this.nodePosition(nodeId),
      cancelInitialFocus: () => this.cancelPendingInitialGraphFocus(true),
      activateLayout: () => {
        this.graphLayoutActive = true;
        this.graphLayoutFrames = 0;
        this.graphSettledFrames = 0;
      },
      startLoop: () => this.startAnimationLoop(),
      clearTooltip: () => this.tooltip.set(null),
    });
  }

  onNodePointerMove(event: PointerEvent): void {
    if (this.interactions.pointerSession?.kind === 'node-drag') {
      this.markGraphInteractionActive(180);
    }
    this.interactions.nodePointerMove({
      event,
      graph: this.graph(),
      currentViewport: this.currentGraphViewportState(),
      pinCenterNode: () => this.pinCenterNode(),
      bumpRenderTick: () => this.renderTick.update((value) => value + 1),
      setNodePosition: (nodeId, point) => {
        this.positions[nodeId] = point;
      },
    });
  }

  onNodePointerUp(event: PointerEvent): void {
    this.interactions.nodePointerUp({
      event,
      focusNode: (targetNodeId) => this.handleNodeActivation(targetNodeId),
      activateLayout: () => {
        this.graphLayoutActive = true;
        this.graphLayoutFrames = 0;
        this.graphSettledFrames = 0;
      },
      startLoop: () => this.startAnimationLoop(),
      persist: () => this.persistExplorerState(),
    });
    this.markGraphInteractionActive(140);
  }

  onNodePointerCancel(event: PointerEvent): void {
    this.interactions.nodePointerCancel(event, () => this.persistExplorerState());
  }

  onImagePointerDown(event: PointerEvent): void {
    this.interactions.imagePointerDown({
      event,
      stage: this.imageStage?.nativeElement,
      asset: this.imageAsset(),
      currentViewport: this.imageViewport(),
      clearTarget: () => {
        this.targetImageViewport = null;
      },
    });
  }

  onImagePointerMove(event: PointerEvent): void {
    this.interactions.imagePointerMove({
      event,
      stage: this.imageStage?.nativeElement,
      currentViewport: this.imageViewport(),
      size: this.currentImageStageSize(),
      asset: this.imageAsset(),
      setTarget: (viewport) => {
        this.targetImageViewport = viewport;
      },
      setViewport: (viewport) => this.imageViewport.set(viewport),
      markReady: () => {
        this.imageViewportReady = true;
      },
    });
  }

  onImagePointerUp(event: PointerEvent): void {
    this.interactions.imagePointerEnd(event, () => this.persistExplorerState());
  }

  onImagePointerCancel(event: PointerEvent): void {
    this.interactions.imagePointerEnd(event, () => this.persistExplorerState());
  }

  onNodeHover(event: PointerEvent, nodeId: string): void {
    this.clearHoverClearTimer();
    const node = this.graphDerived().nodeMap.get(nodeId);
    if (!node || !canHandleHover(this.interactions.pointerSession)) return;
    this.interruptGraphViewportAutomation();
    this.hoveredNodeId.set(node.id);
    this.hoveredEdgeId.set(null);
    this.tooltip.set(
      createNodeHoverTooltip({
        event,
        title: node.label,
        type: node.type,
        body: node.metadata?.summary ?? null,
      }),
    );
  }

  onEdgeHover(event: PointerEvent, edge: GraphEdge): void {
    this.clearHoverClearTimer();
    this.applyEdgeHover(event, edge);
  }

  onEdgeActivate(event: PointerEvent, edge: GraphEdge): void {
    if (!this.isMobileViewport || event.pointerType === 'mouse') {
      return;
    }

    const now = Date.now();
    const isDoubleActivation =
      this.lastEdgeActivation?.edgeId === edge.id &&
      now - this.lastEdgeActivation.at <= GraphComponent.EDGE_DOUBLE_ACTIVATION_MS;

    if (!isDoubleActivation) {
      this.lastEdgeActivation = { edgeId: edge.id, at: now };
      return;
    }

    this.lastEdgeActivation = null;
    this.clearHoverClearTimer();
    this.applyEdgeHover(event, edge);
  }

  onTooltipMove(event: PointerEvent): void {
    this.clearHoverClearTimer();
    if (!canHandleHover(this.interactions.pointerSession) || !this.tooltip()) return;
    this.interruptGraphViewportAutomation();
    this.scheduleTooltipPosition({ x: event.clientX, y: event.clientY });
  }

  clearHover(): void {
    this.clearHoverClearTimer();
    this.hoverClearTimer = setTimeout(() => {
      this.hoverClearTimer = null;
      if (!canHandleHover(this.interactions.pointerSession)) return;
      this.hoveredNodeId.set(null);
      this.hoveredEdgeId.set(null);
      this.camera.clearTooltip();
      this.tooltip.set(null);
    }, 72);
  }

  tooltipStyle(): Record<string, string> {
    return graphTooltipStyle(this.tooltip(), this.graphStage?.nativeElement);
  }

  toggleEntityType(type: string): void {
    this.entityTypeFilters.update((filters) => toggleGraphFilter(filters, type));
    this.ensureSelectionVisible();
    this.persistExplorerState();
  }

  toggleRelationType(type: string): void {
    this.relationTypeFilters.update((filters) => toggleGraphFilter(filters, type));
    this.persistExplorerState();
  }

  setAllEntityTypes(enabled: boolean): void {
    const nextFilters = setAllGraphFilters(this.graph(), 'entity', enabled);
    if (!nextFilters) {
      return;
    }

    this.entityTypeFilters.set(nextFilters);
    this.ensureSelectionVisible();
    this.persistExplorerState();
  }

  setAllRelationTypes(enabled: boolean): void {
    const nextFilters = setAllGraphFilters(this.graph(), 'relation', enabled);
    if (!nextFilters) {
      return;
    }

    this.relationTypeFilters.set(nextFilters);
    this.persistExplorerState();
  }

  setLabelsMode(mode: 'auto' | 'always' | 'hidden'): void {
    this.labelsMode.set(mode);
    this.persistExplorerState();
  }

  toggleInspector(): void {
    if (!this.showInspector) {
      return;
    }

    this.inspectorVisible.update((value) => !value);
  }

  openImageInfo(): void {
    if (!this.isMobileViewport || !this.entityInfo) {
      return;
    }

    this.imageInfoOpen.set(true);
  }

  closeImageInfo(): void {
    this.imageInfoOpen.set(false);
  }

  toggleWorkspaceFocusStage(): void {
    if (!this.isMobileViewport) {
      return;
    }

    this.workspaceFocusToggle.emit();
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

  private handleNodeActivation(nodeId: string): void {
    const now = Date.now();
    const isDoubleActivation =
      this.lastNodeActivation?.nodeId === nodeId &&
      now - this.lastNodeActivation.at <= GraphComponent.NODE_DOUBLE_ACTIVATION_MS;

    this.stabilizeGraphLayout();
    if (this.disableSelectionZoom) {
      this.selectNodeWithoutViewportChange(nodeId);
    } else {
      this.focusNode(nodeId);
    }
    this.emitNodeSelection(nodeId);

    if (isDoubleActivation) {
      this.lastNodeActivation = null;
      if (this.allowNodeOpen) {
        this.openNodeEntity(nodeId);
      }
      return;
    }

    this.lastNodeActivation = { nodeId, at: now };
  }

  private emitNodeSelection(nodeId: string): void {
    const node = this.graphDerived().nodeMap.get(nodeId) ?? null;
    if (!node?.slug) {
      return;
    }

    this.nodeSelect.emit(node.slug);
  }

  private selectNodeWithoutViewportChange(nodeId: string): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }

    this.selectedNodeSource = nodeId === graph.centerId ? 'center' : 'explicit';
    this.selectedNodeId.set(nodeId);
    this.renderTick.update((value) => value + 1);
  }

  private openNodeEntity(nodeId: string): void {
    const node = this.graphDerived().nodeMap.get(nodeId) ?? null;
    if (!node) {
      return;
    }

    void this.router.navigate(['/entity', node.slug]);
  }

  private stabilizeGraphLayout(): void {
    this.graphLayoutActive = false;
    this.graphLayoutFrames = 0;
    this.graphSettledFrames = 0;
    stopGraphMotion(this.graph(), this.positions, this.velocities);
  }

  private createFittedGraphViewport(): GraphViewport | null {
    return createGraphFocusedViewport({
      graph: this.graph(),
      size: this.currentGraphStageSize(),
      positions: this.positions,
      filteredNodeIds: this.graphDerived().filteredNodes.map((node) => node.id),
      haloSizeForNode: (nodeId) => this.nodeHaloSize(nodeId) + (this.overviewMode ? 92 : 56),
      preferBoundsCenter: this.isMobileViewport || this.overviewMode,
      padding: this.isMobileViewport
        ? 76
        : this.overviewMode
          ? this.overviewViewportPadding()
          : 108,
    });
  }

  private overviewViewportPadding(): number {
    const size = this.currentGraphStageSize();
    const shortestSide = Math.max(0, Math.min(size.width, size.height));
    return Math.max(112, Math.min(168, Math.round(shortestSide * 0.18)));
  }

  private createViewportCenteredOnPoint(point: GraphPoint, scale: number): GraphViewport | null {
    return createGraphViewportFromPoint(point, this.currentGraphStageSize(), scale);
  }

  private createEntityFocusedGraphViewport(): GraphViewport | null {
    return this.createFittedGraphViewport();
  }

  private scheduleInitialEntityFocus(): void {
    this.camera.scheduleInitialFocus({
      isBrowser: this.isBrowser,
      pendingInitialEntityFocus: this.pendingInitialEntityFocus,
      hasUserAdjustedGraphView: this.hasUserAdjustedGraphView,
      hasGraph: !!this.graph(),
      size: this.graphSize(),
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

  private ensureInitialGraphFit(): void {
    this.camera.ensureInitialFit({
      isBrowser: this.isBrowser,
      hasUserAdjustedGraphView: this.hasUserAdjustedGraphView,
      hasGraphNow: () => !!this.graph(),
      pinCenterNode: () => this.pinCenterNode(),
      computeNextViewport: () => this.createEntityFocusedGraphViewport(),
      applyViewport: (next) => {
        this.camera.clearViewportTarget();
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
    this.camera.cancelInitialFocus({
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
    this.camera.cancelViewportTarget(
      (value) => this.graphViewportAnimating.set(value),
      (value) => {
        this.graphViewportReady = value;
      },
    );
  }

  private interruptGraphViewportAutomation(): void {
    this.cancelPendingInitialGraphFocus(true);
    this.cancelGraphViewportTarget();
  }

  private applyGraphViewportFocusPlan(plan: GraphViewportFocusPlan): void {
    this.camera.applyFocusPlan({
      plan,
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
      cancelPendingInitialFocus: () => this.cancelPendingInitialGraphFocus(true),
      startAnimation: (next, config) => this.startGraphViewportAnimation(next, config),
      persist: () => this.persistExplorerState(),
    });
  }

  private startGraphViewportAnimation(
    next: GraphViewport,
    config: GraphViewportAnimationConfig = DEFAULT_GRAPH_VIEWPORT_ANIMATION,
  ): void {
    this.camera.startViewportAnimation({
      viewport: next,
      config,
      apply: (viewport) => this.graphViewport.set(viewport),
      setAnimating: (value) => this.graphViewportAnimating.set(value),
      startLoop: () => this.startAnimationLoop(),
    });
  }

  private currentGraphViewportState(): GraphViewport {
    return this.camera.currentViewport(this.graphViewport());
  }

  private currentGraphStageRect(): GraphStageRect | null {
    if (this.graphStageRectCache) {
      return this.graphStageRectCache;
    }

    const rect = this.graphStage?.nativeElement.getBoundingClientRect();
    if (!rect) {
      return null;
    }

    this.graphStageRectCache = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
    return this.graphStageRectCache;
  }

  private markGraphInteractionActive(settleMs: number): void {
    if (!this.isBrowser) {
      return;
    }

    if (!this.graphInteractionActive()) {
      this.graphInteractionActive.set(true);
    }

    this.clearGraphInteractionSettleTimer();
    this.graphInteractionSettleTimer = setTimeout(() => {
      this.graphInteractionActive.set(false);
      this.graphInteractionSettleTimer = null;
    }, settleMs);
  }

  private clearGraphInteractionSettleTimer(): void {
    if (this.graphInteractionSettleTimer) {
      clearTimeout(this.graphInteractionSettleTimer);
      this.graphInteractionSettleTimer = null;
    }
  }

  private clearHoverClearTimer(): void {
    if (this.hoverClearTimer) {
      clearTimeout(this.hoverClearTimer);
      this.hoverClearTimer = null;
    }
  }

  private applyEdgeHover(event: PointerEvent, edge: GraphEdge): void {
    if (!canHandleHover(this.interactions.pointerSession)) return;
    this.interruptGraphViewportAutomation();
    this.hoveredNodeId.set(null);
    this.hoveredEdgeId.set(edge.id);
    this.tooltip.set(createEdgeHoverTooltip(event, edge));
  }

  private scheduleGraphViewportUpdate(next: GraphViewport): void {
    this.camera.scheduleViewport(next, this.isBrowser, (viewport) =>
      this.graphViewport.set(viewport),
    );
  }

  private flushPendingGraphViewport(): void {
    this.camera.flushViewport((viewport) => this.graphViewport.set(viewport));
  }

  private scheduleTooltipPosition(point: GraphPoint): void {
    this.camera.scheduleTooltip(
      point,
      this.isBrowser,
      () => this.tooltip(),
      (tooltip) => this.tooltip.set(tooltip),
    );
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
      viewportOptions: this.imageViewportOptions(),
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

  private applyImageViewport(next: ImageViewport): void {
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

  private imageViewportOptions() {
    const presentation = this.imagePresentation();
    return {
      entityType: this.entityType,
      focusX: presentation.focusX,
      focusY: presentation.focusY,
      zoom: presentation.zoom,
    };
  }

  private persistExplorerState(): void {
    const state = createExplorerPersistedState({
      slug: this.slug,
      graph: this.graph(),
      graphSize: this.currentGraphStageSize(),
      graphViewport: this.camera.currentOrTargetViewport(this.graphViewport()),
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
