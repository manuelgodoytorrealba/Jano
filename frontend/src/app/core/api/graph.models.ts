export type GraphEntityType =
  | 'ARTIST'
  | 'ARTWORK'
  | 'ARTICLE'
  | 'MOVEMENT'
  | 'CONCEPT'
  | 'PERIOD'
  | 'PLACE'
  | 'TEXT'
  | string;

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
