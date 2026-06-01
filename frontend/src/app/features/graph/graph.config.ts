import {
  GraphEntityShape,
  GraphEntityVisualConfig,
  GraphRelationVisualConfig,
} from './graph.models';

function graphLocale(): 'es' | 'en' {
  if (typeof document === 'undefined') {
    return 'es';
  }

  return document.documentElement.lang?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

function localizedEntityTypeLabel(type: string): string | null {
  const locale = graphLocale();
  const labels: Record<string, { es: string; en: string }> = {
    ARTIST: { es: 'Artista', en: 'Artist' },
    ARTWORK: { es: 'Obra', en: 'Artwork' },
    ARTICLE: { es: 'Artículo', en: 'Article' },
    MOVEMENT: { es: 'Movimiento', en: 'Movement' },
    CONCEPT: { es: 'Concepto', en: 'Concept' },
    PERIOD: { es: 'Periodo', en: 'Period' },
    PLACE: { es: 'Lugar', en: 'Place' },
    TEXT: { es: 'Texto', en: 'Text' },
  };

  return labels[type]?.[locale] ?? null;
}

function localizedRelationTypeLabel(type: string): string | null {
  const locale = graphLocale();
  const labels: Record<string, { es: string; en: string }> = {
    CREATED_BY: { es: 'Creado por', en: 'Created by' },
    BELONGS_TO_MOVEMENT: { es: 'Pertenece al movimiento', en: 'Belongs to movement' },
    BELONGS_TO_PERIOD: { es: 'Pertenece al periodo', en: 'Belongs to period' },
    ABOUT_CONCEPT: { es: 'Explora el concepto', en: 'Explores concept' },
    LOCATED_IN: { es: 'Ubicado en', en: 'Located in' },
    RELATED_TO: { es: 'Relacionado con', en: 'Related to' },
    MENTIONS: { es: 'Menciona', en: 'Mentions' },
    ASSOCIATED_WITH: { es: 'Asociado con', en: 'Associated with' },
    INSPIRED_BY: { es: 'Inspirado por', en: 'Inspired by' },
    INFLUENCED_BY: { es: 'Influenciado por', en: 'Influenced by' },
    PART_OF: { es: 'Forma parte de', en: 'Part of' },
    DEPICTS: { es: 'Representa', en: 'Depicts' },
    SIMILAR_TO: { es: 'Similar a', en: 'Similar to' },
    USES_TECHNIQUE: { es: 'Usa técnica', en: 'Uses technique' },
    USES_MATERIAL: { es: 'Usa material', en: 'Uses material' },
    HAS_SUBJECT: { es: 'Tiene tema', en: 'Has subject' },
    CURATED_WITH: { es: 'Curado junto a', en: 'Curated with' },
  };

  return labels[type]?.[locale] ?? null;
}

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
  ARTICLE: {
    label: 'Articulo',
    color: '#b35c2e',
    accent: '#f7ddcf',
    textColor: '#fff6f1',
    halo: 'rgba(179, 92, 46, 0.22)',
    icon: 'R',
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
  const config = GRAPH_ENTITY_TYPE_CONFIG[type] ?? {
    ...DEFAULT_ENTITY_STYLE,
    label: humanizeGraphKey(type),
  };

  return {
    ...config,
    label: localizedEntityTypeLabel(type) ?? config.label,
  };
}

export function getRelationTypeConfig(type: string): GraphRelationVisualConfig {
  const config = GRAPH_RELATION_TYPE_CONFIG[type] ?? {
    ...DEFAULT_RELATION_STYLE,
    label: humanizeGraphKey(type),
  };

  return {
    ...config,
    label: localizedRelationTypeLabel(type) ?? config.label,
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
