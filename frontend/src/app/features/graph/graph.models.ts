export type GraphEntityType =
  | 'ARTIST'
  | 'ARTWORK'
  | 'MOVEMENT'
  | 'CONCEPT'
  | 'PERIOD'
  | 'PLACE'
  | 'TEXT'
  | string;

export type GraphEntityShape = 'circle' | 'square' | 'diamond' | 'hexagon' | 'triangle';
export type GraphLineStyle = 'solid' | 'dashed' | 'dotted';

export interface GraphNodeMetadata {
  summary?: string | null;
  startYear?: number | null;
  endYear?: number | null;
}

export interface GraphNodeDto {
  id: string;
  label: string;
  type: GraphEntityType;
  slug: string;
  image?: string | null;
  metadata?: GraphNodeMetadata | null;
}

export interface GraphEdgeDto {
  id: string;
  source: string;
  target: string;
  relationType: string;
  label?: string;
  directed?: boolean;
  weight?: number;
  justification?: string | null;
}

export interface GraphResponseDto {
  centerId: string;
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
  filters?: {
    entityTypes: string[];
    relationTypes: string[];
  };
}

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

export interface GraphPoint {
  x: number;
  y: number;
}

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

export interface GraphRenderedEdge {
  edge: GraphEdge;
  path: string;
  labelPoint: GraphPoint;
  muted: boolean;
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
  size: number;
  haloSize: number;
  shapePath: string;
  labelTransform: string;
  nodeVisual: GraphEntityVisualConfig;
  titleLabel: string;
  typeLabel: string;
}

export interface GraphMarkerDef {
  id: string;
  color: string;
}
