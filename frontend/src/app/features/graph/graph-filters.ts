import { GraphData } from './graph.models';

export function toggleGraphFilter(
  filters: Record<string, boolean>,
  type: string,
): Record<string, boolean> {
  return {
    ...filters,
    [type]: filters[type] === false,
  };
}

export function setAllGraphFilters(
  graph: GraphData | null,
  kind: 'entity' | 'relation',
  enabled: boolean,
): Record<string, boolean> | null {
  if (!graph) {
    return null;
  }

  const types = kind === 'entity' ? graph.entityTypes : graph.relationTypes;
  return types.reduce<Record<string, boolean>>((acc, type) => {
    acc[type] = enabled;
    return acc;
  }, {});
}
