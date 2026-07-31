import { GraphEdgeDto, GraphNodeDto } from '../../core/api/graph.models';
import { GraphPoint } from './graph-primitives';

export type GraphEntityShape = 'circle' | 'square' | 'diamond' | 'hexagon' | 'triangle';
export type GraphLineStyle = 'solid' | 'dashed' | 'dotted';

export interface GraphEntityVisualConfig {
  label: string;
  color: string;
  accent: string;
  textColor: string;
  halo: string;
  icon: string;
  shape: GraphEntityShape;
}

export interface GraphRelationVisualConfig {
  label: string;
  color: string;
  width: number;
  style: GraphLineStyle;
  directed: boolean;
}

export interface GraphTypeMeta {
  label: string;
  color: string;
}

export interface GraphNode extends GraphNodeDto {
  degree: number;
}

export function graphNodeTypeKey(
  node: Pick<GraphNodeDto, 'type' | 'kind'> | null | undefined,
): string {
  return node?.kind ?? node?.type ?? '';
}

export interface GraphEdge extends GraphEdgeDto {
  label: string;
  directed: boolean;
  weight: number;
  parallelIndex: number;
  parallelTotal: number;
}

export interface GraphData {
  centerId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  entityTypes: string[];
  relationTypes: string[];
}

export type { GraphPoint } from './graph-primitives';

export interface GraphViewport {
  x: number;
  y: number;
  scale: number;
}

export interface GraphTooltip {
  kind: 'node' | 'edge';
  x: number;
  y: number;
  title: string;
  subtitle: string;
  body?: string | null;
}

export interface GraphAmbientField {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  opacity: number;
  emphasis: 'focus' | 'mid' | 'far';
}

export interface GraphRenderedEdge {
  edge: GraphEdge;
  path: string;
  labelPoint: GraphPoint;
  muted: boolean;
  depthTier: 'focus' | 'mid' | 'far';
  relationVisual: GraphRelationVisualConfig;
  markerId: string;
  dasharray: string;
  displayLabel: string;
}

export interface GraphRenderedNode {
  node: GraphNode;
  point: GraphPoint;
  transform: string;
  selected: boolean;
  muted: boolean;
  depthTier: 'focus' | 'mid' | 'far';
  size: number;
  haloSize: number;
  shapePath: string;
  labelTransform: string;
  labelTextAnchor: 'start' | 'end';
  nodeVisual: GraphEntityVisualConfig;
  titleLabel: string;
  typeLabel: string;
}

export interface GraphMarkerDef {
  id: string;
  color: string;
}
