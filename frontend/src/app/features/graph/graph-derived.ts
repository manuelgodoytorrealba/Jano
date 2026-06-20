import { getRelationTypeConfig } from './graph.config';
import {
  graphEdgeLabelBudget,
  graphNodeLabelBudget,
  selectRankedGraphLabels,
  shouldRenderGraphLabel,
} from './graph-labels';
import { GraphData, GraphEdge, GraphNode, GraphTypeMeta } from './graph.models';
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
  viewportScale: number;
  overviewMode: boolean;
  showAllOverviewRelations: boolean;
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

  const baseFilteredNodes = graph.nodes.filter(
    (node) => node.id === graph.centerId || options.entityTypeFilters[node.type] !== false,
  );
  const baseVisibleNodeIds = new Set(baseFilteredNodes.map((node) => node.id));
  const baseFilteredEdges = graph.edges.filter(
    (edge) =>
      options.relationTypeFilters[edge.relationType] !== false &&
      baseVisibleNodeIds.has(edge.source) &&
      baseVisibleNodeIds.has(edge.target),
  );
  const overviewVisibleNodeIds = resolveOverviewVisibleNodeIds({
    graph,
    nodes: baseFilteredNodes,
    edges: baseFilteredEdges,
    selectedNodeId: options.selectedNodeId,
    hoveredNodeId: options.hoveredNodeId,
    viewportScale: options.viewportScale,
    overviewMode: options.overviewMode,
  });
  const filteredNodes = baseFilteredNodes.filter((node) => overviewVisibleNodeIds.has(node.id));
  const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));
  const filteredEdges = resolveOverviewVisibleEdges({
    graph,
    edges: baseFilteredEdges,
    visibleNodeIds,
    selectedNodeId: options.selectedNodeId,
    hoveredEdgeId: options.hoveredEdgeId,
    hoveredNodeId: options.hoveredNodeId,
    viewportScale: options.viewportScale,
    overviewMode: options.overviewMode,
    showAllOverviewRelations: options.showAllOverviewRelations,
  });

  const selectedNode = options.selectedNodeId
    ? (nodeMap.get(options.selectedNodeId) ?? null)
    : null;
  const centerNode = nodeMap.get(graph.centerId) ?? null;
  const contextualNode = selectedNode ?? centerNode;
  const contextualNodeId = contextualNode ? normalizeGraphNodeId(contextualNode.id) : null;
  const contextualEdges = contextualNodeId
    ? filteredEdges.filter(
        (edge) =>
          normalizeGraphNodeId(edge.source) === contextualNodeId ||
          normalizeGraphNodeId(edge.target) === contextualNodeId,
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
    overviewMode: options.overviewMode,
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
    hasVisibleSelection: options.selectedNodeId
      ? visibleNodeIds.has(options.selectedNodeId)
      : false,
  };
}

function resolveOverviewVisibleNodeIds(options: {
  graph: GraphData;
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  viewportScale: number;
  overviewMode: boolean;
}): Set<string> {
  const allNodeIds = new Set(options.nodes.map((node) => node.id));
  if (!options.overviewMode || options.nodes.length < 26) {
    return allNodeIds;
  }

  if (options.viewportScale >= 1.18) {
    return allNodeIds;
  }

  const nodeMap = new Map(options.nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Set<string>>();
  for (const node of options.nodes) {
    adjacency.set(node.id, new Set<string>());
  }
  for (const edge of options.edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const visible = new Set<string>([options.graph.centerId]);
  const hubNodes = options.nodes
    .filter((node) => isOverviewHubNode(node.id))
    .sort(
      (left, right) => right.degree - left.degree || left.label.localeCompare(right.label, 'es'),
    );

  for (const hub of hubNodes) {
    visible.add(hub.id);
  }

  const selectedNodeId = options.selectedNodeId;
  const selectedIsExplicit = !!selectedNodeId && selectedNodeId !== options.graph.centerId;

  if (selectedIsExplicit) {
    visible.add(selectedNodeId!);
    for (const neighborId of adjacency.get(selectedNodeId!) ?? []) {
      visible.add(neighborId);
      if (options.viewportScale >= 1.04) {
        for (const secondNeighborId of adjacency.get(neighborId) ?? []) {
          visible.add(secondNeighborId);
        }
      }
    }
    return visible;
  }

  const nodesPerHub = options.viewportScale >= 1.1 ? 6 : options.viewportScale >= 0.96 ? 4 : 2;

  for (const hub of hubNodes) {
    const clusterNodes = [...(adjacency.get(hub.id) ?? [])]
      .map((nodeId) => nodeMap.get(nodeId))
      .filter(
        (node): node is GraphNode =>
          !!node && !isOverviewHubNode(node.id) && node.id !== options.graph.centerId,
      )
      .sort(
        (left, right) => right.degree - left.degree || left.label.localeCompare(right.label, 'es'),
      )
      .slice(0, nodesPerHub);

    for (const node of clusterNodes) {
      visible.add(node.id);
    }
  }

  const overflowBudget = options.viewportScale >= 1.04 ? 10 : 4;
  const topPeripheralNodes = options.nodes
    .filter((node) => !visible.has(node.id))
    .filter(
      (node) =>
        node.degree >= (options.viewportScale >= 1.04 ? 4 : 6) || node.id === options.hoveredNodeId,
    )
    .sort(
      (left, right) => right.degree - left.degree || left.label.localeCompare(right.label, 'es'),
    )
    .slice(0, overflowBudget);

  for (const node of topPeripheralNodes) {
    visible.add(node.id);
  }

  if (options.hoveredNodeId) {
    visible.add(options.hoveredNodeId);
  }

  return visible;
}

function resolveOverviewVisibleEdges(options: {
  graph: GraphData;
  edges: GraphEdge[];
  visibleNodeIds: Set<string>;
  selectedNodeId: string | null;
  hoveredEdgeId: string | null;
  hoveredNodeId: string | null;
  viewportScale: number;
  overviewMode: boolean;
  showAllOverviewRelations: boolean;
}): GraphEdge[] {
  const visibleEdges = options.edges.filter(
    (edge) => options.visibleNodeIds.has(edge.source) && options.visibleNodeIds.has(edge.target),
  );

  if (options.showAllOverviewRelations || !options.overviewMode || options.viewportScale >= 1.18) {
    return visibleEdges;
  }

  const selectedIsExplicit =
    !!options.selectedNodeId && options.selectedNodeId !== options.graph.centerId;

  if (selectedIsExplicit) {
    return visibleEdges;
  }

  return visibleEdges.filter((edge) => {
    if (edge.id === options.hoveredEdgeId) {
      return true;
    }

    if (
      options.hoveredNodeId &&
      (edge.source === options.hoveredNodeId || edge.target === options.hoveredNodeId)
    ) {
      return true;
    }

    if (edge.relationType === 'ASSOCIATED_WITH' || edge.relationType === 'PART_OF') {
      return true;
    }

    if (options.viewportScale >= 1.06) {
      return (edge.weight ?? 1) >= 1.2;
    }

    return false;
  });
}

function isOverviewHubNode(nodeId: string): boolean {
  return nodeId.startsWith('workspace-type-');
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
  overviewMode: boolean;
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
      const isHub = options.overviewMode && isOverviewHubNode(node.id);
      const priority =
        (isCenter ? 1000 : 0) +
        (isSelected ? 840 : 0) +
        (isHovered ? 760 : 0) +
        (isHub ? 520 : 0) +
        (isNeighbor ? 260 : 0) +
        Math.min(node.degree ?? 0, 8) * 28;

      return {
        id: node.id,
        priority,
        forced: isCenter || isSelected || isHovered || isHub,
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
          (isHovered ? 1000 : 0) +
          (connectedToSelected ? 720 : 0) +
          (connectedToCenter ? 520 : 0) +
          (hasJustification ? 120 : 0) +
          Math.round((edge.weight ?? 1) * 40) +
          Math.round(relationVisual.width * 26);

        return {
          id: edge.id,
          priority,
          forced: isHovered,
        };
      }),
    budget,
  );
}
