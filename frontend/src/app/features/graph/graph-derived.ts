import { getRelationTypeConfig } from './graph.config';
import { shouldRenderGraphLabel } from './graph-labels';
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

  const edgeLabelVisibility = filteredEdges.reduce<Record<string, boolean>>((acc, edge) => {
    acc[edge.id] = !isDenseGraph && shouldRenderGraphLabel({
      mode: options.labelsMode,
      scale: options.labelScaleBucket,
      edgeCount,
      highlighted: options.hoveredEdgeId === edge.id,
      connectedToSelection:
        edge.source === options.selectedNodeId || edge.target === options.selectedNodeId,
    });
    return acc;
  }, {});

  const nodeLabelVisibility = filteredNodes.reduce<Record<string, boolean>>((acc, node) => {
    acc[node.id] = shouldRenderGraphLabel({
      mode: options.labelsMode,
      scale: options.labelScaleBucket,
      edgeCount,
      highlighted: options.hoveredNodeId === node.id,
      connectedToSelection:
        node.id === graph.centerId ||
        node.id === options.selectedNodeId ||
        selectedNeighbors.has(node.id),
    });
    return acc;
  }, {});

  return {
    filteredNodes,
    visibleNodeIds,
    filteredEdges,
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
