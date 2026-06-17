import { getRelationTypeConfig } from './graph.config';
import {
  graphEdgeLabelBudget,
  graphNodeLabelBudget,
  selectRankedGraphLabels,
  shouldRenderGraphLabel,
} from './graph-labels';
import {
  GraphData,
  GraphEdge,
  GraphNode,
  GraphTypeMeta,
} from './graph.models';
import { buildGraphTypeMeta, contextualGraphTypeMeta, graphEdgeMarkerId } from './graph-render';

export interface GraphDerivedState {
  filteredNodes: GraphNode[];
  visibleNodeIds: Set<string>;
  filteredEdges: GraphEdge[];
  contextualEdges: GraphEdge[];
  nodeMap: Map<string, GraphNode>;
  selectedNode: GraphNode | null;
  centerNode: GraphNode | null;
  contextualNode: GraphNode | null;
  selectedNeighbors: Set<string>;
  edgeLabelVisibility: Record<string, boolean>;
  nodeLabelVisibility: Record<string, boolean>;
  entityTypeMeta: Record<string, GraphTypeMeta>;
  relationTypeMeta: Record<string, GraphTypeMeta>;
  contextualNodeMeta: GraphTypeMeta | null;
  relationMarkerDefs: Array<{ id: string; color: string }>;
  isDenseGraph: boolean;
  hasVisibleSelection: boolean;
}

export function buildGraphDerivedState(options: {
  graph: GraphData | null;
  entityTypeFilters: Record<string, boolean>;
  relationTypeFilters: Record<string, boolean>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  labelsMode: 'auto' | 'always' | 'hidden';
  labelScaleBucket: number;
}): GraphDerivedState {
  const graph = options.graph;
  const nodeMap = new Map(graph?.nodes.map((node) => [node.id, node]) ?? []);

  if (!graph) {
    return {
      filteredNodes: [],
      visibleNodeIds: new Set<string>(),
      filteredEdges: [],
      contextualEdges: [],
      nodeMap,
      selectedNode: null,
      centerNode: null,
      contextualNode: null,
      selectedNeighbors: new Set<string>(),
      edgeLabelVisibility: {},
      nodeLabelVisibility: {},
      entityTypeMeta: {},
      relationTypeMeta: {},
      contextualNodeMeta: null,
      relationMarkerDefs: [],
      isDenseGraph: false,
      hasVisibleSelection: false,
    };
  }

  const filteredNodes = graph.nodes.filter(
    (node) => node.id === graph.centerId || options.entityTypeFilters[node.type] !== false,
  );
  const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));
  const filteredEdges = graph.edges.filter(
    (edge) =>
      options.relationTypeFilters[edge.relationType] !== false &&
      visibleNodeIds.has(edge.source) &&
      visibleNodeIds.has(edge.target),
  );

  const selectedNode = options.selectedNodeId ? nodeMap.get(options.selectedNodeId) ?? null : null;
  const centerNode = nodeMap.get(graph.centerId) ?? null;
  const contextualNode = selectedNode ?? centerNode;
  const contextualNodeId = contextualNode ? normalizeGraphNodeId(contextualNode.id) : null;
  const contextualEdges = contextualNodeId
    ? filteredEdges.filter(
        (edge) =>
          normalizeGraphNodeId(edge.source) === contextualNodeId || normalizeGraphNodeId(edge.target) === contextualNodeId,
      )
    : [];

  const selectedNeighbors = new Set<string>();
  if (options.selectedNodeId) {
    for (const edge of filteredEdges) {
      if (edge.source === options.selectedNodeId) {
        selectedNeighbors.add(edge.target);
      }
      if (edge.target === options.selectedNodeId) {
        selectedNeighbors.add(edge.source);
      }
    }
  }

  const isDenseGraph = filteredNodes.length >= 42 || filteredEdges.length >= 84;
  const edgeCount = filteredEdges.length;
  const edgeLabelVisibility = buildEdgeLabelVisibility({
    graph,
    filteredEdges,
    selectedNodeId: options.selectedNodeId,
    hoveredEdgeId: options.hoveredEdgeId,
    labelsMode: options.labelsMode,
    labelScaleBucket: options.labelScaleBucket,
    edgeCount,
  });

  const nodeLabelVisibility = buildNodeLabelVisibility({
    graph,
    filteredNodes,
    selectedNodeId: options.selectedNodeId,
    hoveredNodeId: options.hoveredNodeId,
    selectedNeighbors,
    labelsMode: options.labelsMode,
    labelScaleBucket: options.labelScaleBucket,
    edgeCount,
  });

  return {
    filteredNodes,
    visibleNodeIds,
    filteredEdges,
    contextualEdges,
    nodeMap,
    selectedNode,
    centerNode,
    contextualNode,
    selectedNeighbors,
    edgeLabelVisibility,
    nodeLabelVisibility,
    entityTypeMeta: buildGraphTypeMeta(graph.entityTypes, 'entity'),
    relationTypeMeta: buildGraphTypeMeta(graph.relationTypes, 'relation'),
    contextualNodeMeta: contextualGraphTypeMeta(contextualNode),
    relationMarkerDefs: graph.relationTypes.map((type) => ({
      id: graphEdgeMarkerId(type),
      color: getRelationTypeConfig(type).color,
    })),
    isDenseGraph,
    hasVisibleSelection: options.selectedNodeId ? visibleNodeIds.has(options.selectedNodeId) : false,
  };
}

function normalizeGraphNodeId(value: unknown): string {
  return String(value ?? '').trim();
}

export function ensureGraphSelectionVisible(
  graph: GraphData | null,
  selectedNodeId: string | null,
  visibleNodeIds: Set<string>,
): string | null {
  if (!graph || !selectedNodeId) {
    return null;
  }

  return visibleNodeIds.has(selectedNodeId) ? selectedNodeId : graph.centerId;
}

function buildNodeLabelVisibility(options: {
  graph: GraphData;
  filteredNodes: GraphNode[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  selectedNeighbors: Set<string>;
  labelsMode: 'auto' | 'always' | 'hidden';
  labelScaleBucket: number;
  edgeCount: number;
}): Record<string, boolean> {
  if (options.labelsMode === 'hidden') {
    return {};
  }

  if (options.labelsMode === 'always') {
    return options.filteredNodes.reduce<Record<string, boolean>>((acc, node) => {
      acc[node.id] = true;
      return acc;
    }, {});
  }

  const budget = graphNodeLabelBudget({
    scale: options.labelScaleBucket,
    nodeCount: options.filteredNodes.length,
    edgeCount: options.edgeCount,
  });

  return selectRankedGraphLabels(
    options.filteredNodes.map((node) => {
      const isCenter = node.id === options.graph.centerId;
      const isSelected = node.id === options.selectedNodeId;
      const isHovered = node.id === options.hoveredNodeId;
      const isNeighbor = options.selectedNeighbors.has(node.id);
      const priority =
        (isCenter ? 1000 : 0)
        + (isSelected ? 840 : 0)
        + (isHovered ? 760 : 0)
        + (isNeighbor ? 260 : 0)
        + Math.min(node.degree ?? 0, 8) * 28;

      return {
        id: node.id,
        priority,
        forced: isCenter || isSelected || isHovered,
      };
    }),
    budget,
  );
}

function buildEdgeLabelVisibility(options: {
  graph: GraphData;
  filteredEdges: GraphEdge[];
  selectedNodeId: string | null;
  hoveredEdgeId: string | null;
  labelsMode: 'auto' | 'always' | 'hidden';
  labelScaleBucket: number;
  edgeCount: number;
}): Record<string, boolean> {
  if (options.labelsMode === 'hidden') {
    return {};
  }

  if (options.labelsMode === 'always') {
    return options.filteredEdges.reduce<Record<string, boolean>>((acc, edge) => {
      acc[edge.id] = true;
      return acc;
    }, {});
  }

  const sparseVisibility = options.filteredEdges.reduce<Record<string, boolean>>((acc, edge) => {
    acc[edge.id] = shouldRenderGraphLabel({
      mode: options.labelsMode,
      scale: options.labelScaleBucket,
      edgeCount: options.edgeCount,
      highlighted: options.hoveredEdgeId === edge.id,
      connectedToSelection:
        edge.source === options.selectedNodeId || edge.target === options.selectedNodeId,
    });
    return acc;
  }, {});

  if (options.filteredEdges.length <= 10) {
    return sparseVisibility;
  }

  const budget = graphEdgeLabelBudget({
    scale: options.labelScaleBucket,
    edgeCount: options.edgeCount,
  });

  return selectRankedGraphLabels(
    options.filteredEdges
      .filter((edge) => sparseVisibility[edge.id])
      .map((edge) => {
        const relationVisual = getRelationTypeConfig(edge.relationType);
        const isHovered = edge.id === options.hoveredEdgeId;
        const connectedToSelected =
          edge.source === options.selectedNodeId || edge.target === options.selectedNodeId;
        const connectedToCenter =
          edge.source === options.graph.centerId || edge.target === options.graph.centerId;
        const hasJustification = !!edge.justification;
        const priority =
          (isHovered ? 1000 : 0)
          + (connectedToSelected ? 720 : 0)
          + (connectedToCenter ? 520 : 0)
          + (hasJustification ? 120 : 0)
          + Math.round((edge.weight ?? 1) * 40)
          + Math.round(relationVisual.width * 26);

        return {
          id: edge.id,
          priority,
          forced: isHovered,
        };
      }),
    budget,
  );
}
