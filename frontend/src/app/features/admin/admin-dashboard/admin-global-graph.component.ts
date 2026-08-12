import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import * as THREE from 'three';
import { getEntityTypeConfig, getRelationTypeConfig } from '../../graph/graph.config';
import { graphNodeTypeKey } from '../../graph/graph.models';
import { GraphNodeDto, GraphResponseDto } from '../../../core/api/graph.models';
import { AdminGlobalGraphLayout, createAdminGlobalGraphLayout } from './admin-global-graph-layout';

type GraphTooltipState = { node: GraphNodeDto; x: number; y: number };
type EdgeVertexRef = { attribute: THREE.BufferAttribute; index: number };

@Component({
  standalone: true,
  selector: 'app-admin-global-graph',
  templateUrl: './admin-global-graph.component.html',
  styleUrl: './admin-global-graph.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminGlobalGraphComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) graphData: GraphResponseDto | null = null;
  @Output() readonly selectionChange = new EventEmitter<GraphNodeDto | null>();
  @ViewChild('canvasHost', { static: true }) private canvasHost!: ElementRef<HTMLDivElement>;

  readonly tooltip = signal<GraphTooltipState | null>(null);
  readonly selectedNode = signal<GraphNodeDto | null>(null);
  readonly nodeCount = signal(0);
  readonly relationCount = signal(0);
  readonly visiblePercent = signal(100);
  readonly infoOpen = signal(false);
  readonly entityTypes = signal<string[]>([]);
  readonly relationTypes = signal<string[]>([]);
  readonly entityTypeFilters = signal<Record<string, boolean>>({});
  readonly relationTypeFilters = signal<Record<string, boolean>>({});

  private readonly isBrowser: boolean;
  private readonly router: Router;
  private scene?: THREE.Scene;
  private camera?: THREE.OrthographicCamera;
  private renderer?: THREE.WebGLRenderer;
  private graphGroup?: THREE.Group;
  private points?: THREE.Points;
  private structuralEdges?: THREE.LineSegments;
  private semanticEdges?: THREE.LineSegments;
  private pointNodes: GraphNodeDto[] = [];
  private selectionRing?: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private resizeObserver?: ResizeObserver;
  private width = 1;
  private height = 1;
  private zoom = 1;
  private userAdjusted = false;
  private pointerId: number | null = null;
  private pointerStart = { x: 0, y: 0 };
  private groupStart = { x: 0, y: 0 };
  private dragged = false;
  private draggedNodeIndex: number | null = null;
  private nodeStart = { x: 0, y: 0 };
  private edgeVertices = new Map<string, EdgeVertexRef[]>();
  private layoutPositions?: Record<string, { x: number; y: number }>;
  private initialPositions?: Record<string, { x: number; y: number }>;
  private nodeTypes = new Map<string, string>();
  private animationFrame?: number;
  private layoutWorker?: Worker;
  private layoutRequestId = 0;

  constructor(@Inject(PLATFORM_ID) platformId: object, router: Router) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.router = router;
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.initRenderer();
    this.rebuildScene();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['graphData'] && this.renderer) this.rebuildScene();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.detachEvents();
    this.layoutWorker?.terminate();
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.disposeGraph();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }

  resetView(): void {
    this.userAdjusted = false;
    this.fitGraph();
  }

  resetGraph(): void {
    if (!this.initialPositions) return;
    this.pointNodes.forEach((node, index) => {
      const point = this.initialPositions?.[node.id];
      if (point) this.setNodePosition(index, point.x, point.y, false);
    });
    this.entityTypeFilters.set(this.enabledMap(this.entityTypes()));
    this.relationTypeFilters.set(this.enabledMap(this.relationTypes()));
    this.selectedNode.set(null);
    this.selectionChange.emit(null);
    if (this.selectionRing) this.selectionRing.visible = false;
    this.updateFocus(null);
    this.userAdjusted = false;
    this.applyFilters();
    this.fitGraph();
    this.animateEntrance();
  }

  toggleInfo(): void {
    this.infoOpen.update((open) => !open);
  }

  toggleEntityType(type: string): void {
    this.entityTypeFilters.update((filters) => ({ ...filters, [type]: filters[type] === false }));
    this.applyFilters();
  }

  toggleRelationType(type: string): void {
    this.relationTypeFilters.update((filters) => ({ ...filters, [type]: filters[type] === false }));
    this.applyFilters();
  }

  enableAllEntityTypes(): void {
    this.entityTypeFilters.set(this.enabledMap(this.entityTypes()));
    this.applyFilters();
  }

  enableAllRelationTypes(): void {
    this.relationTypeFilters.set(this.enabledMap(this.relationTypes()));
    this.applyFilters();
  }

  entityTypeLabel(type: string): string {
    return getEntityTypeConfig(type).label;
  }

  entityTypeColor(type: string): string {
    return getEntityTypeConfig(type).color;
  }

  nodeTypeLabel(node: GraphNodeDto): string {
    return this.entityTypeLabel(node.type);
  }

  relationTypeLabel(type: string): string {
    return getRelationTypeConfig(type).label;
  }

  relationTypeColor(type: string): string {
    return getRelationTypeConfig(type).color;
  }

  zoomBy(factor: number): void {
    this.setZoom(this.zoom * factor, 0, 0);
  }

  openSelected(): void {
    const node = this.selectedNode();
    if (node && !node.id.startsWith('workspace-')) {
      void this.router.navigate(['/admin/entities', node.id, 'edit'], {
        queryParams: { returnTo: '/admin' },
      });
    }
  }

  private initRenderer(): void {
    const host = this.canvasHost.nativeElement;
    this.width = Math.max(1, host.clientWidth);
    this.height = Math.max(1, host.clientHeight);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(
      -this.width / 2,
      this.width / 2,
      this.height / 2,
      -this.height / 2,
      -10,
      10,
    );
    this.camera.position.z = 2;
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height, false);
    host.replaceChildren(this.renderer.domElement);
    this.attachEvents();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
  }

  private rebuildScene(): void {
    if (!this.scene || !this.renderer || !this.graphData) return;
    this.disposeGraph();

    const graph = this.graphData;
    const requestId = ++this.layoutRequestId;
    const cacheKey = this.layoutCacheKey(graph);
    let cached: string | null = null;
    try {
      cached = sessionStorage.getItem(cacheKey);
    } catch {
      // ponytail: storage can be unavailable; the Worker remains the source of truth.
    }
    if (cached) {
      try {
        const layout = JSON.parse(cached) as AdminGlobalGraphLayout;
        if (Object.keys(layout.positions).length === graph.nodes.length) {
          this.buildGraph(graph, layout);
          return;
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    this.layoutWorker ??= this.createLayoutWorker();
    if (!this.layoutWorker) {
      this.buildGraph(graph, createAdminGlobalGraphLayout(graph));
      return;
    }
    this.layoutWorker.onmessage = ({
      data,
    }: MessageEvent<{ id: number; layout: AdminGlobalGraphLayout }>) => {
      if (data.id !== requestId || this.graphData !== graph) return;
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data.layout));
      } catch {
        // ponytail: cache is optional; layout correctness does not depend on storage availability.
      }
      this.buildGraph(graph, data.layout);
    };
    this.layoutWorker.onerror = () => {
      if (this.graphData !== graph) return;
      this.layoutWorker?.terminate();
      this.layoutWorker = undefined;
      this.buildGraph(graph, createAdminGlobalGraphLayout(graph));
    };
    this.layoutWorker.postMessage({ id: requestId, graph });
  }

  private buildGraph(graph: GraphResponseDto, layout: AdminGlobalGraphLayout): void {
    if (!this.scene || !this.renderer || this.graphData !== graph) return;
    this.disposeGraph();
    this.edgeVertices.clear();
    this.layoutPositions = layout.positions;
    this.initialPositions = Object.fromEntries(
      Object.entries(layout.positions).map(([id, point]) => [id, { ...point }]),
    );
    this.nodeTypes = new Map(graph.nodes.map((node) => [node.id, node.type]));
    this.entityTypes.set(
      [
        ...new Set(
          graph.nodes.filter((node) => !node.id.startsWith('workspace-')).map((node) => node.type),
        ),
      ].sort(),
    );
    this.relationTypes.set([...new Set(graph.edges.map((edge) => edge.relationType))].sort());
    this.entityTypeFilters.set(this.enabledMap(this.entityTypes()));
    this.relationTypeFilters.set(this.enabledMap(this.relationTypes()));
    const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
    this.nodeCount.set(graph.nodes.filter((node) => !node.id.startsWith('workspace-')).length);
    this.relationCount.set(
      graph.edges.filter(
        (edge) => edge.relationType !== 'PART_OF' && edge.relationType !== 'ASSOCIATED_WITH',
      ).length,
    );

    this.graphGroup = new THREE.Group();
    this.scene.add(this.graphGroup);
    this.structuralEdges = this.createEdges(graph, layout.positions, nodeMap, true);
    this.semanticEdges = this.createEdges(graph, layout.positions, nodeMap, false);
    this.graphGroup.add(this.structuralEdges, this.semanticEdges);
    this.points = this.createPoints(graph.nodes, layout.positions);
    this.graphGroup.add(this.points);

    this.selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(12, 15, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      }),
    );
    this.selectionRing.visible = false;
    this.selectionRing.position.z = 0.5;
    this.graphGroup.add(this.selectionRing);

    this.graphGroup.userData['layout'] = layout;
    this.selectedNode.set(null);
    this.selectionChange.emit(null);
    this.tooltip.set(null);
    this.userAdjusted = false;
    this.fitGraph();
    this.animateEntrance();
  }

  private createLayoutWorker(): Worker | undefined {
    try {
      return new Worker(new URL('./admin-global-graph-layout.worker', import.meta.url), {
        type: 'module',
      });
    } catch {
      return undefined;
    }
  }

  private layoutCacheKey(graph: GraphResponseDto): string {
    const topology = [
      graph.centerId,
      ...graph.nodes.map((node) => node.id + ':' + graphNodeTypeKey(node)),
      ...graph.edges.map(
        ({ source, target, relationType }) => source + ':' + target + ':' + relationType,
      ),
    ].join('|');
    let hash = 2166136261;
    for (let index = 0; index < topology.length; index += 1) {
      hash ^= topology.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return 'jano:admin-graph-layout:v2:' + (hash >>> 0);
  }

  private createPoints(
    nodes: GraphNodeDto[],
    positions: Record<string, { x: number; y: number }>,
  ): THREE.Points {
    this.pointNodes = nodes;
    const vertices = new Float32Array(nodes.length * 3);
    const colors = new Float32Array(nodes.length * 3);
    const sizes = new Float32Array(nodes.length);
    const focuses = new Float32Array(nodes.length).fill(1);

    nodes.forEach((node, index) => {
      const point = positions[node.id] ?? { x: 0, y: 0 };
      const color = new THREE.Color(getEntityTypeConfig(node.type).color);
      vertices.set([point.x, point.y, 0], index * 3);
      colors.set([color.r, color.g, color.b], index * 3);
      sizes[index] =
        node.id === this.graphData?.centerId
          ? 15
          : node.id.startsWith('workspace-kind-') || node.id.startsWith('workspace-type-')
            ? 11
            : 7;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('pointSize', new THREE.BufferAttribute(sizes, 1));
    geometry.userData['baseSizes'] = sizes.slice();
    geometry.setAttribute('focus', new THREE.BufferAttribute(focuses, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      uniforms: {
        pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        zoom: { value: this.zoom },
      },
      vertexShader: `
        attribute float pointSize;
        attribute float focus;
        varying vec3 vColor;
        varying float vFocus;
        uniform float pixelRatio;
        uniform float zoom;
        void main() {
          vColor = color;
          vFocus = focus;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = pointSize * pixelRatio * clamp(sqrt(zoom), 0.78, 1.55) * clamp(focus, 0.72, 1.38);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vFocus;
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float alpha = 1.0 - smoothstep(0.38, 0.5, distanceToCenter);
          float glow = 1.0 - smoothstep(0.0, 0.48, distanceToCenter);
          gl_FragColor = vec4(mix(vColor, vec3(1.0), glow * (vFocus > 1.3 ? 0.48 : 0.18)), alpha * 0.96 * clamp(vFocus, 0.22, 1.0));
        }
      `,
    });

    return new THREE.Points(geometry, material);
  }

  private createEdges(
    graph: GraphResponseDto,
    positions: Record<string, { x: number; y: number }>,
    nodeMap: Map<string, GraphNodeDto>,
    structural: boolean,
  ): THREE.LineSegments {
    const edges = graph.edges.filter((edge) =>
      structural
        ? edge.relationType === 'PART_OF' || edge.relationType === 'ASSOCIATED_WITH'
        : edge.relationType !== 'PART_OF' && edge.relationType !== 'ASSOCIATED_WITH',
    );
    const vertices = new Float32Array(edges.length * 6);
    const colors = new Float32Array(edges.length * 6);

    edges.forEach((edge, index) => {
      const source = positions[edge.source] ?? { x: 0, y: 0 };
      const target = positions[edge.target] ?? { x: 0, y: 0 };
      const sourceColor = new THREE.Color(
        getEntityTypeConfig(nodeMap.get(edge.source)?.type ?? '').color,
      );
      const targetColor = new THREE.Color(
        getEntityTypeConfig(nodeMap.get(edge.target)?.type ?? '').color,
      );
      vertices.set([source.x, source.y, -0.2, target.x, target.y, -0.2], index * 6);
      colors.set(
        [sourceColor.r, sourceColor.g, sourceColor.b, targetColor.r, targetColor.g, targetColor.b],
        index * 6,
      );
    });

    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(vertices, 3);
    geometry.setAttribute('position', positionAttribute);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.userData['edges'] = edges;
    geometry.userData['baseColors'] = colors.slice();
    edges.forEach((edge, index) => {
      this.trackEdgeVertex(edge.source, positionAttribute, index * 2);
      this.trackEdgeVertex(edge.target, positionAttribute, index * 2 + 1);
    });
    const baseOpacity = structural ? 0.1 : 0.28;
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: baseOpacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    material.userData['baseOpacity'] = baseOpacity;
    return new THREE.LineSegments(geometry, material);
  }

  private animateEntrance(): void {
    if (!this.points || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    const position = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const targets = this.pointNodes.map((_, index) => ({
      x: position.getX(index),
      y: position.getY(index),
    }));
    const starts = targets.map(({ x, y }, index) => {
      const radius = Math.hypot(x, y);
      const angle = radius < 1 ? index * 2.399 : Math.atan2(y, x);
      const scale = 0.7 + ((index * 7) % 13) / 100;
      const tangent = 20 + (index % 5) * 9;
      return radius < 1
        ? { x: Math.cos(angle) * 38, y: Math.sin(angle) * 38 }
        : {
            x: x * scale - Math.sin(angle) * tangent,
            y: y * scale + Math.cos(angle) * tangent,
          };
    });
    const startedAt = performance.now();

    const step = (now: number): void => {
      const time = Math.min(1, (now - startedAt) / 1900);
      targets.forEach((target, index) => {
        const start = starts[index];
        const delay = (index % 9) * 0.015;
        const localTime = Math.min(1, Math.max(0, (time - delay) / (1 - delay)));
        const frequency = 8.5 + (index % 4) * 0.55;
        const progress = Math.min(
          1.08,
          1 - Math.exp(-6.5 * localTime) * Math.cos(frequency * localTime),
        );
        this.setNodePosition(
          index,
          start.x + (target.x - start.x) * progress,
          start.y + (target.y - start.y) * progress,
          false,
        );
      });
      this.render();
      if (time < 1) this.animationFrame = requestAnimationFrame(step);
      else {
        targets.forEach((target, index) => this.setNodePosition(index, target.x, target.y, false));
        this.animationFrame = undefined;
        this.render();
      }
    };

    this.animationFrame = requestAnimationFrame(step);
  }

  private trackEdgeVertex(nodeId: string, attribute: THREE.BufferAttribute, index: number): void {
    const refs = this.edgeVertices.get(nodeId) ?? [];
    refs.push({ attribute, index });
    this.edgeVertices.set(nodeId, refs);
  }

  private setNodePosition(index: number, x: number, y: number, persist = true): void {
    if (!this.points) return;
    const position = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    position.setXY(index, x, y);
    position.needsUpdate = true;
    const node = this.pointNodes[index];
    for (const ref of this.edgeVertices.get(node.id) ?? []) {
      ref.attribute.setXY(ref.index, x, y);
      ref.attribute.needsUpdate = true;
    }
    if (persist && this.layoutPositions?.[node.id]) this.layoutPositions[node.id] = { x, y };
  }

  private fitGraph(): void {
    const layout = this.graphGroup?.userData['layout'] as
      | ReturnType<typeof createAdminGlobalGraphLayout>
      | undefined;
    if (!this.graphGroup || !layout) return;
    const padding = 72;
    this.zoom = Math.min(
      1.35,
      Math.max(
        0.12,
        Math.min(
          (this.width - padding * 2) / layout.width,
          (this.height - padding * 2) / layout.height,
        ),
      ),
    );
    this.graphGroup.scale.setScalar(this.zoom);
    this.graphGroup.position.set(-layout.centerX * this.zoom, -layout.centerY * this.zoom, 0);
    this.updateZoomUniform();
    this.updateEdgeLod();
    this.render();
  }

  private resize(): void {
    if (!this.renderer || !this.camera) return;
    const host = this.canvasHost.nativeElement;
    this.width = Math.max(1, host.clientWidth);
    this.height = Math.max(1, host.clientHeight);
    this.camera.left = -this.width / 2;
    this.camera.right = this.width / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
    if (!this.userAdjusted) this.fitGraph();
    else this.render();
  }

  private setZoom(nextZoom: number, screenX: number, screenY: number): void {
    if (!this.graphGroup) return;
    const resolved = Math.min(6, Math.max(0.08, nextZoom));
    const worldX = (screenX - this.graphGroup.position.x) / this.zoom;
    const worldY = (screenY - this.graphGroup.position.y) / this.zoom;
    this.zoom = resolved;
    this.graphGroup.scale.setScalar(this.zoom);
    this.graphGroup.position.x = screenX - worldX * this.zoom;
    this.graphGroup.position.y = screenY - worldY * this.zoom;
    this.userAdjusted = true;
    this.updateZoomUniform();
    this.updateEdgeLod();
    this.render();
  }

  private updateZoomUniform(): void {
    const material = this.points?.material as THREE.ShaderMaterial | undefined;
    if (material) material.uniforms['zoom'].value = this.zoom;
  }

  private updateEdgeLod(): void {
    if (this.structuralEdges) this.structuralEdges.visible = this.zoom >= 0.28;
    if (this.semanticEdges) this.semanticEdges.visible = this.zoom >= 0.12;
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const rect = this.canvasHost.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = -(event.clientY - rect.top - rect.height / 2);
    this.setZoom(this.zoom * Math.exp(-event.deltaY * 0.0012), x, y);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.graphGroup || !this.points) return;
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = undefined;
    this.pointerId = event.pointerId;
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.groupStart = { x: this.graphGroup.position.x, y: this.graphGroup.position.y };
    this.draggedNodeIndex = this.hitNodeIndex(event);
    if (this.draggedNodeIndex !== null) {
      const position = this.points.geometry.getAttribute('position');
      this.nodeStart = {
        x: position.getX(this.draggedNodeIndex),
        y: position.getY(this.draggedNodeIndex),
      };
    }
    this.dragged = false;
    this.renderer?.domElement.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.pointerId === event.pointerId && this.graphGroup) {
      const dx = event.clientX - this.pointerStart.x;
      const dy = event.clientY - this.pointerStart.y;
      this.dragged ||= Math.hypot(dx, dy) > 4;
      if (this.dragged && this.draggedNodeIndex !== null) {
        this.setNodePosition(
          this.draggedNodeIndex,
          this.nodeStart.x + dx / this.zoom,
          this.nodeStart.y - dy / this.zoom,
        );
        const node = this.pointNodes[this.draggedNodeIndex];
        if (this.selectedNode()?.id === node.id && this.selectionRing) {
          const position = this.points?.geometry.getAttribute('position');
          if (position)
            this.selectionRing.position.set(
              position.getX(this.draggedNodeIndex),
              position.getY(this.draggedNodeIndex),
              0.5,
            );
        }
        this.tooltip.set(null);
        this.render();
        return;
      }
      if (this.dragged) {
        this.graphGroup.position.set(this.groupStart.x + dx, this.groupStart.y - dy, 0);
        this.userAdjusted = true;
        this.tooltip.set(null);
        this.render();
        return;
      }
    }
    this.updateHover(event);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.pointerId !== event.pointerId) return;
    this.renderer?.domElement.releasePointerCapture(event.pointerId);
    const nodeIndex = this.draggedNodeIndex;
    this.pointerId = null;
    this.draggedNodeIndex = null;
    if (nodeIndex !== null) this.selectNode(nodeIndex);
    else if (!this.dragged) this.selectHovered();
  };

  private readonly onDoubleClick = (): void => this.openSelected();

  private hitNodeIndex(event: PointerEvent): number | null {
    if (!this.points || !this.camera || !this.renderer) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: Math.max(5, 11 / this.zoom) };
    raycaster.setFromCamera(pointer, this.camera);
    const index = raycaster
      .intersectObject(this.points, false)
      .map((hit) => hit.index)
      .find(
        (hitIndex): hitIndex is number =>
          typeof hitIndex === 'number' && this.isNodeIdVisible(this.pointNodes[hitIndex].id),
      );
    return typeof index === 'number' ? index : null;
  }

  private updateHover(event: PointerEvent): void {
    if (!this.renderer) return;
    const index = this.hitNodeIndex(event);
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.renderer.domElement.style.cursor = index === null ? 'grab' : 'pointer';
    this.tooltip.set(
      index === null
        ? null
        : {
            node: this.pointNodes[index],
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          },
    );
  }

  private selectHovered(): void {
    const hovered = this.tooltip()?.node;
    const index = hovered ? this.pointNodes.findIndex((node) => node.id === hovered.id) : -1;
    if (index >= 0) this.selectNode(index);
  }

  private selectNode(index: number): void {
    if (!this.selectionRing || !this.points) return;
    const node = this.pointNodes[index];
    const position = this.points.geometry.getAttribute('position');
    this.selectedNode.set(node);
    this.selectionChange.emit(node);
    this.selectionRing.position.set(position.getX(index), position.getY(index), 0.5);
    this.selectionRing.visible = true;
    this.updateFocus(node.id);
    this.render();
  }

  private enabledMap(values: string[]): Record<string, boolean> {
    return Object.fromEntries(values.map((value) => [value, true]));
  }

  private isNodeIdVisible(nodeId: string): boolean {
    if (nodeId === this.graphData?.centerId) return true;
    const type = this.nodeTypes.get(nodeId);
    return !type || this.entityTypeFilters()[type] !== false;
  }

  private applyFilters(): void {
    if (!this.points || !this.graphData) return;
    const sizes = this.points.geometry.getAttribute('pointSize') as THREE.BufferAttribute;
    const baseSizes = this.points.geometry.userData['baseSizes'] as Float32Array;
    this.pointNodes.forEach((node, index) =>
      sizes.setX(index, this.isNodeIdVisible(node.id) ? baseSizes[index] : 0),
    );
    sizes.needsUpdate = true;

    const selected = this.selectedNode();
    if (selected && !this.isNodeIdVisible(selected.id)) {
      this.selectedNode.set(null);
      this.selectionChange.emit(null);
      if (this.selectionRing) this.selectionRing.visible = false;
      this.updateFocus(null);
    }
    this.updateEdgeFocus(this.structuralEdges, this.selectedNode()?.id ?? null);
    this.updateEdgeFocus(this.semanticEdges, this.selectedNode()?.id ?? null);

    const realNodes = this.graphData.nodes.filter((node) => !node.id.startsWith('workspace-'));
    const visibleNodes = realNodes.filter((node) => this.isNodeIdVisible(node.id));
    const visibleRelations = this.graphData.edges.filter(
      (edge) =>
        edge.relationType !== 'PART_OF' &&
        edge.relationType !== 'ASSOCIATED_WITH' &&
        this.relationTypeFilters()[edge.relationType] !== false &&
        this.isNodeIdVisible(edge.source) &&
        this.isNodeIdVisible(edge.target),
    );
    this.nodeCount.set(visibleNodes.length);
    this.relationCount.set(visibleRelations.length);
    this.visiblePercent.set(
      Math.round((visibleNodes.length / Math.max(realNodes.length, 1)) * 100),
    );
    this.render();
  }

  private updateFocus(selectedId: string | null): void {
    if (!this.points) return;
    const connected = new Set<string>(selectedId ? [selectedId] : []);
    if (selectedId) {
      for (const edge of this.graphData?.edges ?? []) {
        if (edge.source === selectedId) connected.add(edge.target);
        if (edge.target === selectedId) connected.add(edge.source);
      }
    }
    const focus = this.points.geometry.getAttribute('focus') as THREE.BufferAttribute;
    this.pointNodes.forEach((node, index) => {
      const value = !selectedId
        ? 1
        : node.id === selectedId
          ? 1.55
          : connected.has(node.id)
            ? 1.22
            : 0.32;
      focus.setX(index, value);
    });
    focus.needsUpdate = true;
    this.updateEdgeFocus(this.structuralEdges, selectedId);
    this.updateEdgeFocus(this.semanticEdges, selectedId);
  }

  private updateEdgeFocus(line: THREE.LineSegments | undefined, selectedId: string | null): void {
    if (!line) return;
    const edges = line.geometry.userData['edges'] as GraphResponseDto['edges'];
    const baseColors = line.geometry.userData['baseColors'] as Float32Array;
    const colors = line.geometry.getAttribute('color') as THREE.BufferAttribute;
    edges.forEach((edge, edgeIndex) => {
      const visible =
        this.relationTypeFilters()[edge.relationType] !== false &&
        this.isNodeIdVisible(edge.source) &&
        this.isNodeIdVisible(edge.target);
      const active =
        visible && !!selectedId && (edge.source === selectedId || edge.target === selectedId);
      for (let endpoint = 0; endpoint < 2; endpoint += 1) {
        const colorIndex = (edgeIndex * 2 + endpoint) * 3;
        const resolve = (channel: number): number => {
          const base = baseColors[colorIndex + channel];
          if (!visible) return 0;
          if (!selectedId) return base;
          return active ? base + (1 - base) * 0.7 : base * 0.025;
        };
        colors.setXYZ(edgeIndex * 2 + endpoint, resolve(0), resolve(1), resolve(2));
      }
    });
    colors.needsUpdate = true;
    const material = line.material as THREE.LineBasicMaterial;
    material.opacity = selectedId ? 0.82 : (material.userData['baseOpacity'] as number);
  }

  private attachEvents(): void {
    const canvas = this.renderer!.domElement;
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('dblclick', this.onDoubleClick);
  }

  private detachEvents(): void {
    const canvas = this.renderer?.domElement;
    if (!canvas) return;
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointercancel', this.onPointerUp);
    canvas.removeEventListener('dblclick', this.onDoubleClick);
  }

  private disposeGraph(): void {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = undefined;
    if (!this.graphGroup || !this.scene) return;
    this.graphGroup.traverse((child) => {
      const object = child as THREE.Mesh;
      object.geometry?.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : object.material
          ? [object.material]
          : [];
      materials.forEach((material) => material.dispose());
    });
    this.scene.remove(this.graphGroup);
    this.graphGroup = undefined;
    this.points = undefined;
    this.structuralEdges = undefined;
    this.semanticEdges = undefined;
    this.edgeVertices.clear();
    this.layoutPositions = undefined;
    this.selectionRing = undefined;
  }

  private render(): void {
    if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  }
}
