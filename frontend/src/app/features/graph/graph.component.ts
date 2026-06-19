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
import {
  currentDraggedNodeId,
  GraphStageRect,
  GraphPointerSession,
} from './graph-interaction';
import {
  ForceLayoutScratch,
} from './graph-layout';
import {
  graphViewportTransform,
  panGraphViewport,
  zoomGraphViewport,
} from './graph-viewport';
import {
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
  GraphRenderedEdge,
  GraphRenderedNode,
  GraphResponseDto,
  GraphTooltip,
  GraphViewport,
} from './graph.models';
import {
  ExplorerPersistedState,
  saveExplorerState,
} from './graph-persistence';
import { GraphControlsBarComponent } from './graph-controls-bar.component';
import { GraphInspectorPanelComponent } from './graph-inspector-panel.component';
import { GraphSceneComponent } from './graph-scene.component';
import {
  animateGraphViewportStep,
  DEFAULT_GRAPH_VIEWPORT_ANIMATION,
  FAST_GRAPH_VIEWPORT_ANIMATION,
  graphLabelScaleBucket,
  GraphViewportAnimationConfig,
  shouldEnsureInitialGraphFit,
} from './graph-camera';
import { GraphInitialFocusController } from './graph-initial-focus';
import { GraphSelectionSource, GraphViewportFocusPlan } from './graph-focus';
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
import { GraphTooltipController, GraphViewportController } from './graph-runtime-controllers';
import { initializeLoadedGraphState, warmupPreparedGraphLayout } from './graph-setup';
import {
  createExplorerPersistedState,
  resolveLiveStageSize,
} from './graph-state';
import { advanceExplorerLoop } from './graph-loop-runtime';
import {
  syncImageViewportRuntime,
} from './graph-image-runtime';
import {
  buildLoadedGraphRuntime,
  resetGraphRuntimeState,
  resetImageRuntimeState,
  resolveGraphInputChangesRuntime,
} from './graph-load';
import {
  measureGraphStageRuntime,
  measureImageStageRuntime,
  setupResizeObserverRuntime,
} from './graph-stage-runtime';
import {
  applyGraphViewportFocusPlanRuntime,
  cancelGraphViewportAutomationRuntime,
  flushPendingGraphViewportRuntime,
  scheduleGraphViewportUpdateRuntime,
  scheduleTooltipPositionRuntime,
  startGraphViewportAnimationRuntime,
} from './graph-viewport-runtime';
import { setAllGraphFilters, toggleGraphFilter } from './graph-filters';
import {
  runAdjustGraphZoomRuntime,
  runAdjustImageZoomRuntime,
  runCenterSelectionRuntime,
  runFocusCurrentEntityRuntime,
  runFocusNodeRuntime,
  runGraphWheelRuntime,
  runImageWheelRuntime,
  runOpenSelectedEntityRuntime,
  runResetImageViewRuntime,
} from './graph-shell-runtime';
import {
  runGraphStagePointerDownRuntime,
  runGraphStagePointerMoveRuntime,
  runGraphStagePointerUpRuntime,
  runImagePointerCancelRuntime,
  runImagePointerDownRuntime,
  runImagePointerMoveRuntime,
  runImagePointerUpRuntime,
  runNodePointerCancelRuntime,
  runNodePointerDownRuntime,
  runNodePointerMoveRuntime,
  runNodePointerUpRuntime,
} from './graph-pointer-runtime';
import {
  runClearHoverRuntime,
  runEdgeHoverRuntime,
  runNodeHoverRuntime,
  runTooltipMoveRuntime,
} from './graph-hover-runtime';
import {
  runCancelPendingInitialGraphFocusRuntime,
  runEnsureInitialGraphFitRuntime,
  runScheduleInitialEntityFocusRuntime,
} from './graph-focus-runtime';

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
  imports: [CommonModule, GraphControlsBarComponent, GraphSceneComponent, GraphInspectorPanelComponent],
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
  @Output() workspaceFocusToggle = new EventEmitter<void>();

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
  private frameId: number | null = null;
  private targetImageViewport: ImageViewport | null = null;
  private positions: Record<string, GraphPoint> = {};
  private velocities: Record<string, GraphPoint> = {};
  private pointerSession: GraphPointerSession | null = null;
  private lastNodeActivation: { nodeId: string; at: number } | null = null;
  private lastEdgeActivation: { edgeId: string; at: number } | null = null;
  private graphPointers = new Map<number, GraphPoint>();
  private graphPinchGesture: {
    startDistance: number;
    startCenter: GraphPoint;
    startViewport: GraphViewport;
  } | null = null;
  private imagePointers = new Map<number, GraphPoint>();
  private imagePinchGesture: {
    startDistance: number;
    startCenter: GraphPoint;
    startAnchor: GraphPoint;
    startViewport: ImageViewport;
  } | null = null;
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
      viewportScale: this.graphViewport().scale,
      overviewMode: this.overviewMode,
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
  readonly resolvedNodeLabelVisibility = computed(() => resolveNodeLabelOcclusion({
    nodes: this.renderedNodes(),
    requestedVisibility: this.graphDerived().nodeLabelVisibility,
    centerId: this.graph()?.centerId ?? null,
    selectedNodeId: this.selectedNodeId(),
    hoveredNodeId: this.hoveredNodeId(),
    scale: this.graphViewport().scale,
  }));
  readonly resolvedEdgeLabelVisibility = computed(() => resolveEdgeLabelOcclusion({
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
  }));
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
      (changes['workspaceMode'] && changes['workspaceMode'].currentValue !== 'image')
      || (changes['isMobileViewport'] && changes['isMobileViewport'].currentValue === false)
    ) {
      this.imageInfoOpen.set(false);
    }

    if (
      (changes['workspaceMode'] && !changes['workspaceMode'].firstChange)
      || (changes['workspaceFocused'] && !changes['workspaceFocused'].firstChange)
      || changes['workspaceTransitioning']?.currentValue === true
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
      this.viewportController.clearTarget();
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

    const incomingGraphData = changes['graphData']?.currentValue as GraphResponseDto | null | undefined;
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

    if (this.frameId !== null && this.isBrowser) {
      cancelAnimationFrame(this.frameId);
    }

    this.viewportController.destroy(this.isBrowser);
    this.tooltipController.destroy(this.isBrowser);
    this.initialFocusController.destroy(this.isBrowser);
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
    const loadedState = buildLoadedGraphRuntime({
      initialized: initializeLoadedGraphState(response, this.persistedState?.graph),
    });

    this.graph.set(loadedState.graph);
    this.layoutScratch = loadedState.layoutScratch;
    this.positions = loadedState.positions;
    this.velocities = loadedState.velocities;
    this.pinCenterNode();
    this.warmupGraphLayout();

    this.entityTypeFilters.set(loadedState.entityTypeFilters);
    this.relationTypeFilters.set(loadedState.relationTypeFilters);
    this.labelsMode.set(loadedState.labelsMode);

    this.selectedNodeSource = loadedState.selectedNodeSource;
    this.selectedNodeId.set(loadedState.selectedNodeId);
    this.hoveredNodeId.set(null);
    this.hoveredEdgeId.set(null);
    this.tooltip.set(null);

    this.pendingInitialEntityFocus = loadedState.pendingInitialEntityFocus;
    this.hasUserAdjustedGraphView = loadedState.hasUserAdjustedGraphView;
    this.viewportController.clearTarget();
    this.graphViewportReady = loadedState.graphViewportReady;
    this.initialGraphViewportReady.set(false);
    this.graphLayoutActive = loadedState.graphLayoutActive;
    this.graphLayoutFrames = loadedState.graphLayoutFrames;
    this.graphSettledFrames = loadedState.graphSettledFrames;
    this.focusCurrentEntity(false);

    this.loading.set(false);
    this.error.set(null);
    this.startAnimationLoop();
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
      const loop = advanceExplorerLoop({
        graph: this.graph(),
        positions: this.positions,
        velocities: this.velocities,
        layoutScratch: this.layoutScratch,
        pointerSession: this.pointerSession,
        ambientMotion: this.ambientMotion,
        selectedNodeId: this.selectedNodeId(),
        loopState: {
          graphLayoutActive: this.graphLayoutActive,
          graphLayoutFrames: this.graphLayoutFrames,
          graphSettledFrames: this.graphSettledFrames,
        },
        pinCenterNode: () => this.pinCenterNode(),
        viewportController: this.viewportController,
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
      if (loop.nextImageViewport) {
        this.imageViewport.set(loop.nextImageViewport);
      }
      this.targetImageViewport = loop.nextImageTarget;
      if (loop.imageAnimationDone) {
        this.imageViewportReady = true;
        this.persistExplorerState();
      }

      if (loop.shouldRender) {
        this.renderTick.update((value) => value + 1);
      }

      if (!loop.shouldContinue) {
        this.frameId = null;
        return;
      }

      this.frameId = requestAnimationFrame(frame);
    };

    this.frameId = requestAnimationFrame(frame);
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
      targetViewport: this.viewportController.target,
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
    return node ? graphNodeHaloSize(node, this.graph()?.centerId ?? null, this.selectedNodeId()) : 34;
  }

  resetGraphView(animate = true): void {
    this.focusCurrentEntity(animate);
  }

  resetImageView(animate = true): void {
    runResetImageViewRuntime({
      animate,
      size: this.currentImageStageSize(),
      asset: this.imageAsset(),
      viewportOptions: this.imageViewportOptions(),
      setTargetImageViewport: (viewport) => {
        this.targetImageViewport = viewport;
      },
      setImageViewport: (viewport) => this.imageViewport.set(viewport),
      markImageViewportReady: () => {
        this.imageViewportReady = true;
      },
      startAnimationLoop: () => this.startAnimationLoop(),
      persist: () => this.persistExplorerState(),
    });
  }

  centerSelection(): void {
    runCenterSelectionRuntime({
      graph: this.graph(),
      currentScale: this.currentGraphViewportState().scale,
      getNodePoint: (nodeId) => this.nodePosition(nodeId),
      createViewportCenteredOnPoint: (point, scale) => this.createViewportCenteredOnPoint(point, scale),
      applyPlan: (plan) => this.applyGraphViewportFocusPlan(plan),
    });
  }

  focusCurrentEntity(animate = false): void {
    runFocusCurrentEntityRuntime({
      graph: this.graph(),
      animate,
      pendingInitialEntityFocus: this.pendingInitialEntityFocus,
      createEntityFocusedGraphViewport: () => this.createEntityFocusedGraphViewport(),
      applyPlan: (plan) => this.applyGraphViewportFocusPlan(plan),
    });
  }

  focusNode(nodeId: string): void {
    runFocusNodeRuntime({
      graph: this.graph(),
      node: this.graphDerived().nodeMap.get(nodeId) ?? null,
      nodeId,
      currentScale: this.currentGraphViewportState().scale,
      getNodePoint: (targetNodeId) => this.nodePosition(targetNodeId),
      createViewportCenteredOnPoint: (point, scale) => this.createViewportCenteredOnPoint(point, scale),
      applyPlan: (plan) => this.applyGraphViewportFocusPlan(plan),
    });
  }

  openSelectedEntity(): void {
    runOpenSelectedEntityRuntime({
      router: this.router,
      node: this.graphDerived().contextualNode,
    });
  }

  adjustGraphZoom(factor: number): void {
    runAdjustGraphZoomRuntime({
      rect: this.currentGraphStageRect(),
      currentViewport: this.currentGraphViewportState(),
      factor,
      cancelPendingInitialGraphFocus: () => this.cancelPendingInitialGraphFocus(true),
      clearViewportTarget: () => this.viewportController.clearTarget(),
      scheduleViewport: (viewport) => this.scheduleGraphViewportUpdate(viewport),
    });
  }

  adjustImageZoom(factor: number): void {
    runAdjustImageZoomRuntime({
      factor,
      stage: this.imageStage?.nativeElement,
      current: this.imageViewport(),
      size: this.currentImageStageSize(),
      asset: this.imageAsset(),
      setTargetImageViewport: (viewport) => {
        this.targetImageViewport = viewport;
      },
      setImageViewport: (viewport) => this.imageViewport.set(viewport),
      markImageViewportReady: () => {
        this.imageViewportReady = true;
      },
      persist: () => this.persistExplorerState(),
    });
  }

  onGraphWheel(event: WheelEvent): void {
    this.markGraphInteractionActive(180);
    runGraphWheelRuntime({
      event,
      rect: this.currentGraphStageRect(),
      currentViewport: this.currentGraphViewportState(),
      cancelPendingInitialGraphFocus: () => this.cancelPendingInitialGraphFocus(true),
      clearViewportTarget: () => this.viewportController.clearTarget(),
      scheduleViewport: (viewport) => this.scheduleGraphViewportUpdate(viewport),
    });
  }

  onImageWheel(event: WheelEvent): void {
    runImageWheelRuntime({
      event,
      stage: this.imageStage?.nativeElement,
      current: this.imageViewport(),
      size: this.currentImageStageSize(),
      asset: this.imageAsset(),
      setTargetImageViewport: (viewport) => {
        this.targetImageViewport = viewport;
      },
      setImageViewport: (viewport) => this.imageViewport.set(viewport),
      markImageViewportReady: () => {
        this.imageViewportReady = true;
      },
      persist: () => this.persistExplorerState(),
    });
  }

  onGraphStagePointerDown(event: PointerEvent): void {
    this.trackGraphPointer(event);
    if (this.tryStartOrUpdateGraphPinch(event)) {
      this.markGraphInteractionActive(240);
      return;
    }

    this.markGraphInteractionActive(240);
    runGraphStagePointerDownRuntime({
      event,
      cancelPendingInitialGraphFocus: () => this.cancelPendingInitialGraphFocus(true),
      setPointerSession: (session) => {
        this.pointerSession = session;
      },
      clearTooltip: () => this.tooltip.set(null),
    });
  }

  onGraphStagePointerMove(event: PointerEvent): void {
    if (this.updateGraphPinch(event)) {
      this.markGraphInteractionActive(180);
      return;
    }

    if (this.pointerSession?.kind === 'graph-pan') {
      this.markGraphInteractionActive(180);
    }
    runGraphStagePointerMoveRuntime({
      pointerSession: this.pointerSession,
      event,
      currentViewport: this.currentGraphViewportState(),
      setPointerSession: (session) => {
        this.pointerSession = session;
      },
      clearViewportTarget: () => this.viewportController.clearTarget(),
      scheduleViewport: (viewport) => this.scheduleGraphViewportUpdate(viewport),
    });
  }

  onGraphStagePointerUp(event: PointerEvent): void {
    if (this.finishGraphPinch(event)) {
      this.markGraphInteractionActive(120);
      return;
    }

    runGraphStagePointerUpRuntime({
      pointerSession: this.pointerSession,
      event,
      flushPendingGraphViewport: () => this.flushPendingGraphViewport(),
      persist: () => this.persistExplorerState(),
      clearPointerSession: () => {
        this.pointerSession = null;
      },
    });
    this.untrackGraphPointer(event);
    this.markGraphInteractionActive(120);
  }

  onNodePointerDown(event: PointerEvent, nodeId: string): void {
    this.markGraphInteractionActive(240);
    runNodePointerDownRuntime({
      event,
      nodeId,
      stage: this.graphStage?.nativeElement,
      currentViewport: this.currentGraphViewportState(),
      nodePoint: this.nodePosition(nodeId),
      cancelPendingInitialGraphFocus: () => this.cancelPendingInitialGraphFocus(true),
      setPointerSession: (session) => {
        this.pointerSession = session;
      },
      activateLayout: () => {
        this.graphLayoutActive = true;
        this.graphLayoutFrames = 0;
        this.graphSettledFrames = 0;
      },
      startAnimationLoop: () => this.startAnimationLoop(),
      clearTooltip: () => this.tooltip.set(null),
    });
  }

  onNodePointerMove(event: PointerEvent): void {
    if (this.pointerSession?.kind === 'node-drag') {
      this.markGraphInteractionActive(180);
    }
    runNodePointerMoveRuntime({
      pointerSession: this.pointerSession,
      event,
      graph: this.graph(),
      currentViewport: this.currentGraphViewportState(),
      pinCenterNode: () => this.pinCenterNode(),
      bumpRenderTick: () => this.renderTick.update((value) => value + 1),
      setNodePosition: (nodeId, point) => {
        this.positions[nodeId] = point;
      },
      setPointerSession: (session) => {
        this.pointerSession = session;
      },
    });
  }

  onNodePointerUp(event: PointerEvent, nodeId: string): void {
    runNodePointerUpRuntime({
      pointerSession: this.pointerSession,
      event,
      focusNode: () => this.handleNodeActivation(nodeId),
      activateLayout: () => {
        this.graphLayoutActive = true;
        this.graphLayoutFrames = 0;
        this.graphSettledFrames = 0;
      },
      startAnimationLoop: () => this.startAnimationLoop(),
      persist: () => this.persistExplorerState(),
      clearPointerSession: () => {
        this.pointerSession = null;
      },
    });
    this.markGraphInteractionActive(140);
  }

  onNodePointerCancel(event: PointerEvent): void {
    runNodePointerCancelRuntime({
      pointerSession: this.pointerSession,
      event,
      persist: () => this.persistExplorerState(),
      clearPointerSession: () => {
        this.pointerSession = null;
      },
    });
  }

  onImagePointerDown(event: PointerEvent): void {
    this.trackImagePointer(event);
    if (this.tryStartOrUpdateImagePinch(event)) {
      return;
    }

    runImagePointerDownRuntime({
      event,
      asset: this.imageAsset(),
      setPointerSession: (session) => {
        this.pointerSession = session;
      },
    });
  }

  onImagePointerMove(event: PointerEvent): void {
    if (this.updateImagePinch(event)) {
      return;
    }

    runImagePointerMoveRuntime({
      pointerSession: this.pointerSession,
      event,
      current: this.imageViewport(),
      size: this.currentImageStageSize(),
      asset: this.imageAsset(),
      setPointerSession: (session) => {
        this.pointerSession = session;
      },
      setTargetImageViewport: (viewport) => {
        this.targetImageViewport = viewport;
      },
      setImageViewport: (viewport) => this.imageViewport.set(viewport),
    });
  }

  onImagePointerUp(event: PointerEvent): void {
    if (this.finishImagePinch(event)) {
      return;
    }

    runImagePointerUpRuntime({
      pointerSession: this.pointerSession,
      event,
      persist: () => this.persistExplorerState(),
      clearPointerSession: () => {
        this.pointerSession = null;
      },
    });
  }

  onImagePointerCancel(event: PointerEvent): void {
    if (this.finishImagePinch(event)) {
      return;
    }

    runImagePointerCancelRuntime({
      pointerSession: this.pointerSession,
      event,
      persist: () => this.persistExplorerState(),
      clearPointerSession: () => {
        this.pointerSession = null;
      },
    });
  }

  onNodeHover(event: PointerEvent, nodeId: string): void {
    this.clearHoverClearTimer();
    runNodeHoverRuntime({
      pointerSession: this.pointerSession,
      event,
      node: this.graphDerived().nodeMap.get(nodeId) ?? null,
      interruptGraphViewportAutomation: () => this.interruptGraphViewportAutomation(),
      setHoveredNodeId: (value) => this.hoveredNodeId.set(value),
      setHoveredEdgeId: (value) => this.hoveredEdgeId.set(value),
      setTooltip: (tooltip) => this.tooltip.set(tooltip),
    });
  }

  onEdgeHover(event: PointerEvent, edge: GraphEdge): void {
    this.clearHoverClearTimer();
    runEdgeHoverRuntime({
      pointerSession: this.pointerSession,
      event,
      edge,
      interruptGraphViewportAutomation: () => this.interruptGraphViewportAutomation(),
      setHoveredNodeId: (value) => this.hoveredNodeId.set(value),
      setHoveredEdgeId: (value) => this.hoveredEdgeId.set(value),
      setTooltip: (tooltip) => this.tooltip.set(tooltip),
    });
  }

  onEdgeActivate(event: PointerEvent, edge: GraphEdge): void {
    if (!this.isMobileViewport || event.pointerType === 'mouse') {
      return;
    }

    const now = Date.now();
    const isDoubleActivation =
      this.lastEdgeActivation?.edgeId === edge.id
      && now - this.lastEdgeActivation.at <= GraphComponent.EDGE_DOUBLE_ACTIVATION_MS;

    if (!isDoubleActivation) {
      this.lastEdgeActivation = { edgeId: edge.id, at: now };
      return;
    }

    this.lastEdgeActivation = null;
    this.clearHoverClearTimer();
    runEdgeHoverRuntime({
      pointerSession: this.pointerSession,
      event,
      edge,
      interruptGraphViewportAutomation: () => this.interruptGraphViewportAutomation(),
      setHoveredNodeId: (value) => this.hoveredNodeId.set(value),
      setHoveredEdgeId: (value) => this.hoveredEdgeId.set(value),
      setTooltip: (tooltip) => this.tooltip.set(tooltip),
    });
  }

  onTooltipMove(event: PointerEvent): void {
    this.clearHoverClearTimer();
    runTooltipMoveRuntime({
      pointerSession: this.pointerSession,
      tooltip: this.tooltip(),
      event,
      interruptGraphViewportAutomation: () => this.interruptGraphViewportAutomation(),
      scheduleTooltipPosition: (point) => this.scheduleTooltipPosition(point),
    });
  }

  clearHover(): void {
    this.clearHoverClearTimer();
    this.hoverClearTimer = setTimeout(() => {
      this.hoverClearTimer = null;
      runClearHoverRuntime({
        pointerSession: this.pointerSession,
        clearTooltipController: () => this.tooltipController.clear(),
        setHoveredNodeId: (value) => this.hoveredNodeId.set(value),
        setHoveredEdgeId: (value) => this.hoveredEdgeId.set(value),
        setTooltip: (tooltip) => this.tooltip.set(tooltip),
      });
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
      this.lastNodeActivation?.nodeId === nodeId
      && now - this.lastNodeActivation.at <= GraphComponent.NODE_DOUBLE_ACTIVATION_MS;

    this.stabilizeGraphLayout();
    this.focusNode(nodeId);

    if (isDoubleActivation) {
      this.lastNodeActivation = null;
      this.openNodeEntity(nodeId);
      return;
    }

    this.lastNodeActivation = { nodeId, at: now };
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

    for (const nodeId of Object.keys(this.velocities)) {
      const velocity = this.velocities[nodeId];
      if (!velocity) {
        continue;
      }

      velocity.x = 0;
      velocity.y = 0;
    }

    this.pinCenterNode();
  }

  private createFittedGraphViewport(): GraphViewport | null {
    return createGraphFocusedViewport({
      graph: this.graph(),
      size: this.currentGraphStageSize(),
      positions: this.positions,
      filteredNodeIds: this.graphDerived().filteredNodes.map((node) => node.id),
      haloSizeForNode: (nodeId) => this.nodeHaloSize(nodeId) + (this.overviewMode ? 92 : 56),
      preferBoundsCenter: this.isMobileViewport || this.overviewMode,
      padding: this.isMobileViewport ? 76 : this.overviewMode ? this.overviewViewportPadding() : 108,
    });
  }

  private overviewViewportPadding(): number {
    const size = this.currentGraphStageSize();
    const shortestSide = Math.max(0, Math.min(size.width, size.height));
    return Math.max(112, Math.min(168, Math.round(shortestSide * 0.18)));
  }

  private trackGraphPointer(event: PointerEvent): void {
    if (!this.isMobileViewport) {
      return;
    }

    const currentTarget = event.currentTarget as HTMLElement | null;
    currentTarget?.setPointerCapture?.(event.pointerId);
    this.graphPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  private tryStartOrUpdateGraphPinch(event: PointerEvent): boolean {
    if (!this.isMobileViewport || this.graphPointers.size < 2 || !this.graphStage?.nativeElement) {
      return false;
    }

    const pointers = Array.from(this.graphPointers.values());
    const rect = this.graphStage.nativeElement.getBoundingClientRect();
    const centerClient = {
      x: (pointers[0].x + pointers[1].x) / 2,
      y: (pointers[0].y + pointers[1].y) / 2,
    };

    this.pointerSession = null;
    this.viewportController.clearTarget();
    this.graphPinchGesture = {
      startDistance: Math.hypot(pointers[1].x - pointers[0].x, pointers[1].y - pointers[0].y),
      startCenter: {
        x: centerClient.x - rect.left,
        y: centerClient.y - rect.top,
      },
      startViewport: this.currentGraphViewportState(),
    };
    event.preventDefault();
    return true;
  }

  private updateGraphPinch(event: PointerEvent): boolean {
    if (!this.graphPointers.has(event.pointerId)) {
      return false;
    }

    this.graphPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!this.graphPinchGesture || !this.graphStage?.nativeElement || this.graphPointers.size < 2) {
      return false;
    }

    const pointers = Array.from(this.graphPointers.values());
    const rect = this.graphStage.nativeElement.getBoundingClientRect();
    const currentDistance = Math.hypot(pointers[1].x - pointers[0].x, pointers[1].y - pointers[0].y);
    const currentCenter = {
      x: (pointers[0].x + pointers[1].x) / 2 - rect.left,
      y: (pointers[0].y + pointers[1].y) / 2 - rect.top,
    };
    const anchorClientX = rect.left + this.graphPinchGesture.startCenter.x;
    const anchorClientY = rect.top + this.graphPinchGesture.startCenter.y;
    const zoomed = zoomGraphViewport(
      this.graphPinchGesture.startViewport,
      currentDistance / Math.max(this.graphPinchGesture.startDistance, 1),
      anchorClientX,
      anchorClientY,
      rect,
    );

    this.viewportController.clearTarget();
    this.graphViewport.set(
      panGraphViewport(
        zoomed,
        currentCenter.x - this.graphPinchGesture.startCenter.x,
        currentCenter.y - this.graphPinchGesture.startCenter.y,
      ),
    );
    this.graphViewportReady = true;
    this.initialGraphViewportReady.set(true);
    this.hasUserAdjustedGraphView = true;
    event.preventDefault();
    return true;
  }

  private finishGraphPinch(event: PointerEvent): boolean {
    if (!this.graphPointers.has(event.pointerId)) {
      return false;
    }

    this.untrackGraphPointer(event);
    if (!this.graphPinchGesture) {
      return false;
    }

    if (this.graphPointers.size < 2) {
      this.graphPinchGesture = null;
      this.persistExplorerState();
    }

    return true;
  }

  private untrackGraphPointer(event: PointerEvent): void {
    this.graphPointers.delete(event.pointerId);
    const currentTarget = event.currentTarget as HTMLElement | null;
    if (currentTarget?.hasPointerCapture?.(event.pointerId)) {
      currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  private trackImagePointer(event: PointerEvent): void {
    const currentTarget = event.currentTarget as HTMLElement | null;
    currentTarget?.setPointerCapture?.(event.pointerId);
    this.imagePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  private tryStartOrUpdateImagePinch(event: PointerEvent): boolean {
    if (this.imagePointers.size < 2 || !this.imageStage?.nativeElement || !this.imageAsset()) {
      return false;
    }

    const pointers = Array.from(this.imagePointers.values());
    const centerClient = {
      x: (pointers[0].x + pointers[1].x) / 2,
      y: (pointers[0].y + pointers[1].y) / 2,
    };
    const rect = this.imageStage.nativeElement.getBoundingClientRect();

    this.pointerSession = null;
    this.targetImageViewport = null;
    this.imagePinchGesture = {
      startDistance: Math.hypot(pointers[1].x - pointers[0].x, pointers[1].y - pointers[0].y),
      startCenter: {
        x: centerClient.x - rect.left,
        y: centerClient.y - rect.top,
      },
      startAnchor: {
        x: centerClient.x - rect.left,
        y: centerClient.y - rect.top,
      },
      startViewport: this.imageViewport(),
    };
    event.preventDefault();
    return true;
  }

  private updateImagePinch(event: PointerEvent): boolean {
    if (!this.imagePointers.has(event.pointerId)) {
      return false;
    }

    this.imagePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!this.imagePinchGesture || !this.imageStage?.nativeElement || !this.imageAsset() || this.imagePointers.size < 2) {
      return false;
    }

    const pointers = Array.from(this.imagePointers.values());
    const currentDistance = Math.hypot(pointers[1].x - pointers[0].x, pointers[1].y - pointers[0].y);
    const rect = this.imageStage.nativeElement.getBoundingClientRect();
    const currentCenter = {
      x: (pointers[0].x + pointers[1].x) / 2 - rect.left,
      y: (pointers[0].y + pointers[1].y) / 2 - rect.top,
    };

    const zoomed = zoomImageViewport(
      this.imagePinchGesture.startViewport,
      currentDistance / Math.max(this.imagePinchGesture.startDistance, 1),
      this.imagePinchGesture.startAnchor,
      this.currentImageStageSize(),
      this.imageAsset(),
    );
    if (!zoomed) {
      return true;
    }

    this.imageViewport.set(
      panImageViewport(
        zoomed,
        currentCenter.x - this.imagePinchGesture.startCenter.x,
        currentCenter.y - this.imagePinchGesture.startCenter.y,
        this.currentImageStageSize(),
        this.imageAsset(),
      ),
    );
    this.imageViewportReady = true;
    event.preventDefault();
    return true;
  }

  private finishImagePinch(event: PointerEvent): boolean {
    if (!this.imagePointers.has(event.pointerId)) {
      return false;
    }

    this.imagePointers.delete(event.pointerId);
    const currentTarget = event.currentTarget as HTMLElement | null;
    if (currentTarget?.hasPointerCapture?.(event.pointerId)) {
      currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!this.imagePinchGesture) {
      return false;
    }

    if (this.imagePointers.size < 2) {
      this.imagePinchGesture = null;
      this.persistExplorerState();
    }

    return true;
  }

  private createViewportCenteredOnPoint(point: GraphPoint, scale: number): GraphViewport | null {
    return createGraphViewportFromPoint(point, this.currentGraphStageSize(), scale);
  }

  private createEntityFocusedGraphViewport(): GraphViewport | null {
    return this.createFittedGraphViewport();
  }

  private scheduleInitialEntityFocus(): void {
    runScheduleInitialEntityFocusRuntime({
      schedule: (payload) => this.initialFocusController.schedule(payload),
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

  private ensureInitialGraphFit(attempt = 0): void {
    void attempt;
    runEnsureInitialGraphFitRuntime({
      ensureFit: (payload) => this.initialFocusController.ensureFit(payload),
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
    runCancelPendingInitialGraphFocusRuntime({
      cancel: (payload) => this.initialFocusController.cancel(payload),
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

  private syncImageViewport(
    mapViewport?: (current: ImageViewport) => ImageViewport,
    animate = false,
    forceFit = false,
  ): void {
    const next = syncImageViewportRuntime({
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
