import {
  GraphEntityShape,
  GraphEntityVisualConfig,
  GraphRelationVisualConfig,
} from './graph.models';

const DEFAULT_ENTITY_STYLE: GraphEntityVisualConfig = {
  label: 'Entidad',
  color: '#94a3b8',
  accent: '#e2e8f0',
  textColor: '#e5eef8',
  halo: 'rgba(148, 163, 184, 0.18)',
  icon: '•',
  shape: 'circle',
};

const DEFAULT_RELATION_STYLE: GraphRelationVisualConfig = {
  label: 'Relaciona',
  color: '#7dd3fc',
  width: 1.7,
  style: 'solid',
  directed: true,
};

export const GRAPH_ENTITY_TYPE_CONFIG: Record<string, GraphEntityVisualConfig> = {
  ARTIST: {
    label: 'Artista',
    color: '#d97757',
    accent: '#f8d7c8',
    textColor: '#fff3ee',
    halo: 'rgba(217, 119, 87, 0.22)',
    icon: 'A',
    shape: 'circle',
  },
  ARTWORK: {
    label: 'Obra',
    color: '#4f8fba',
    accent: '#d2edf9',
    textColor: '#ecf8ff',
    halo: 'rgba(79, 143, 186, 0.22)',
    icon: 'O',
    shape: 'square',
  },
  MOVEMENT: {
    label: 'Movimiento',
    color: '#8f6ed5',
    accent: '#efe4ff',
    textColor: '#f7f2ff',
    halo: 'rgba(143, 110, 213, 0.2)',
    icon: 'M',
    shape: 'hexagon',
  },
  CONCEPT: {
    label: 'Concepto',
    color: '#33a177',
    accent: '#d8f5e9',
    textColor: '#edfff8',
    halo: 'rgba(51, 161, 119, 0.2)',
    icon: 'C',
    shape: 'diamond',
  },
  PERIOD: {
    label: 'Periodo',
    color: '#d0a248',
    accent: '#f9ebc9',
    textColor: '#fff8e8',
    halo: 'rgba(208, 162, 72, 0.22)',
    icon: 'P',
    shape: 'triangle',
  },
  PLACE: {
    label: 'Lugar',
    color: '#4197a3',
    accent: '#d7f4f7',
    textColor: '#edfeff',
    halo: 'rgba(65, 151, 163, 0.22)',
    icon: 'L',
    shape: 'diamond',
  },
  TEXT: {
    label: 'Texto',
    color: '#a46a90',
    accent: '#f5dced',
    textColor: '#fff4fb',
    halo: 'rgba(164, 106, 144, 0.22)',
    icon: 'T',
    shape: 'square',
  },
};

export const GRAPH_RELATION_TYPE_CONFIG: Record<string, GraphRelationVisualConfig> = {
  CREATED_BY: {
    label: 'Creado por',
    color: '#f59e0b',
    width: 2.2,
    style: 'solid',
    directed: true,
  },
  BELONGS_TO_MOVEMENT: {
    label: 'Pertenece al movimiento',
    color: '#8b5cf6',
    width: 1.9,
    style: 'dashed',
    directed: true,
  },
  BELONGS_TO_PERIOD: {
    label: 'Pertenece al periodo',
    color: '#eab308',
    width: 1.9,
    style: 'dashed',
    directed: true,
  },
  ABOUT_CONCEPT: {
    label: 'Explora el concepto',
    color: '#10b981',
    width: 1.8,
    style: 'solid',
    directed: true,
  },
  LOCATED_IN: {
    label: 'Ubicado en',
    color: '#06b6d4',
    width: 1.8,
    style: 'dotted',
    directed: true,
  },
  RELATED_TO: {
    label: 'Relacionado con',
    color: '#94a3b8',
    width: 1.5,
    style: 'solid',
    directed: false,
  },
  MENTIONS: {
    label: 'Menciona',
    color: '#f97316',
    width: 1.7,
    style: 'dotted',
    directed: true,
  },
  ASSOCIATED_WITH: {
    label: 'Asociado con',
    color: '#c084fc',
    width: 1.7,
    style: 'dashed',
    directed: false,
  },
  INSPIRED_BY: {
    label: 'Inspirado por',
    color: '#38bdf8',
    width: 1.9,
    style: 'solid',
    directed: true,
  },
  INFLUENCED_BY: {
    label: 'Influenciado por',
    color: '#60a5fa',
    width: 1.9,
    style: 'solid',
    directed: true,
  },
  PART_OF: {
    label: 'Forma parte de',
    color: '#f472b6',
    width: 1.9,
    style: 'dashed',
    directed: true,
  },
  DEPICTS: {
    label: 'Representa',
    color: '#22c55e',
    width: 1.8,
    style: 'solid',
    directed: true,
  },
};

export function getEntityTypeConfig(type: string): GraphEntityVisualConfig {
  return GRAPH_ENTITY_TYPE_CONFIG[type] ?? {
    ...DEFAULT_ENTITY_STYLE,
    label: humanizeGraphKey(type),
  };
}

export function getRelationTypeConfig(type: string): GraphRelationVisualConfig {
  return GRAPH_RELATION_TYPE_CONFIG[type] ?? {
    ...DEFAULT_RELATION_STYLE,
    label: humanizeGraphKey(type),
  };
}

export function lineDasharray(style: GraphRelationVisualConfig['style']): string {
  switch (style) {
    case 'dashed':
      return '10 8';
    case 'dotted':
      return '3 8';
    default:
      return '';
  }
}

export function graphNodeShapePath(shape: GraphEntityShape, size: number): string {
  switch (shape) {
    case 'square':
      return `M ${-size} ${-size} L ${size} ${-size} L ${size} ${size} L ${-size} ${size} Z`;
    case 'diamond':
      return `M 0 ${-size * 1.2} L ${size * 1.08} 0 L 0 ${size * 1.2} L ${-size * 1.08} 0 Z`;
    case 'hexagon':
      return `M ${-size * 0.95} 0 L ${-size * 0.5} ${-size * 0.86} L ${size * 0.5} ${-size * 0.86} L ${size * 0.95} 0 L ${size * 0.5} ${size * 0.86} L ${-size * 0.5} ${size * 0.86} Z`;
    case 'triangle':
      return `M 0 ${-size * 1.22} L ${size * 1.08} ${size * 0.95} L ${-size * 1.08} ${size * 0.95} Z`;
    default:
      return `M 0 ${-size} A ${size} ${size} 0 1 1 0 ${size} A ${size} ${size} 0 1 1 0 ${-size}`;
  }
}

export function humanizeGraphKey(value: string): string {
  return (value ?? '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
