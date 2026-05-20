import { ExplorerPersistedState } from './graph-persistence';
import { getRelationTypeConfig, humanizeGraphKey } from './graph.config';
import {
  createForceLayoutScratch,
  createInitialPositions,
  ForceLayoutScratch,
  normalizeGraphData,
  stepForceLayout,
} from './graph-layout';
import { GraphData, GraphPoint, GraphResponseDto } from './graph.models';

export interface PreparedGraphState {
  graph: GraphData;
  positions: Record<string, GraphPoint>;
  velocities: Record<string, GraphPoint>;
  layoutScratch: ForceLayoutScratch;
}

export interface InitializedLoadedGraphState extends PreparedGraphState {
  entityTypeFilters: Record<string, boolean>;
  relationTypeFilters: Record<string, boolean>;
  labelsMode: 'auto' | 'always' | 'hidden';
  selectedNodeId: string;
  pendingInitialEntityFocus: boolean;
  graphLayoutActive: boolean;
  graphSettledFrames: number;
}

export function toGraphData(response: GraphResponseDto): GraphData {
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

export function prepareGraphState(graph: GraphData): PreparedGraphState {
  const seededPositions = createInitialPositions(graph);
  const positions = graph.nodes.reduce<Record<string, GraphPoint>>((acc, node) => {
    acc[node.id] =
      node.id === graph.centerId
        ? { x: 0, y: 0 }
        : seededPositions[node.id] ?? { x: 0, y: 0 };
    return acc;
  }, {});

  return {
    graph,
    positions,
    velocities: {},
    layoutScratch: createForceLayoutScratch(graph),
  };
}

export function initializeLoadedGraphState(
  response: GraphResponseDto,
  persistedGraph?: ExplorerPersistedState['graph'],
): InitializedLoadedGraphState {
  const graph = toGraphData(response);
  const prepared = prepareGraphState(graph);

  return {
    ...prepared,
    entityTypeFilters: createFilterMap(graph.entityTypes, persistedGraph?.entityTypeFilters),
    relationTypeFilters: createFilterMap(graph.relationTypes, persistedGraph?.relationTypeFilters),
    labelsMode: persistedGraph?.labelsMode ?? 'auto',
    selectedNodeId: graph.centerId,
    pendingInitialEntityFocus: true,
    graphLayoutActive: true,
    graphSettledFrames: 0,
  };
}

export function createEnabledMap(values: string[]): Record<string, boolean> {
  return values.reduce<Record<string, boolean>>((acc, value) => {
    acc[value] = true;
    return acc;
  }, {});
}

export function createFilterMap(values: string[], persisted?: Record<string, boolean>): Record<string, boolean> {
  const defaults = createEnabledMap(values);
  if (!persisted) {
    return defaults;
  }

  return values.reduce<Record<string, boolean>>((acc, value) => {
    acc[value] = persisted[value] !== false;
    return acc;
  }, {});
}

export function resolveGraphWarmupPasses(graph: GraphData, passes?: number): number {
  if (typeof passes === 'number') {
    return passes;
  }

  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;
  return nodeCount >= 34 || edgeCount >= 52
    ? 30
    : nodeCount >= 20 || edgeCount >= 28
      ? 26
      : 36;
}

export function warmupPreparedGraphLayout(
  graph: GraphData,
  positions: Record<string, GraphPoint>,
  velocities: Record<string, GraphPoint>,
  pinCenterNode: (graph: GraphData) => void,
  layoutScratch?: ForceLayoutScratch,
  passes?: number,
): void {
  const resolvedPasses = resolveGraphWarmupPasses(graph, passes);

  for (let index = 0; index < resolvedPasses; index += 1) {
    stepForceLayout(graph, positions, velocities, null, layoutScratch);
    pinCenterNode(graph);
  }
}
