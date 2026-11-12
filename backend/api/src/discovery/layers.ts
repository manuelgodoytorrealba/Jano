import { BadRequestException } from '@nestjs/common';

export const LAYER_KEYS = [
  'type',
  'period',
  'movement',
  'author',
  'institution',
  'nationality',
  'technique',
  'material',
  'tag',
  'color',
  'contentLevel',
] as const;
export type LayerKey = (typeof LAYER_KEYS)[number];
export type Layers = Partial<Record<LayerKey, string[]>>;
export type FacetItem = { id: string; values: Layers };
export type DiscoveryFacet = {
  key: LayerKey;
  options: { value: string; label: string; count: number }[];
};

export function parseLayers(raw?: string): Layers {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    const result: Layers = {};
    for (const [key, options] of Object.entries(value)) {
      if (
        !LAYER_KEYS.includes(key as LayerKey) ||
        !Array.isArray(options) ||
        options.length > 16 ||
        options.some((v) => typeof v !== 'string' || !v.trim() || v.length > 360)
      )
        throw new Error();
      if (options.length) result[key as LayerKey] = [...new Set(options as string[])];
    }
    return result;
  } catch {
    throw new BadRequestException('Invalid exploration layers');
  }
}

export function matchesLayers(item: FacetItem, layers: Layers, skip?: LayerKey): boolean {
  return LAYER_KEYS.every(
    (key) =>
      key === skip ||
      !layers[key]?.length ||
      layers[key].some((value) => item.values[key]?.includes(value)),
  );
}

export function facetCounts(items: FacetItem[], layers: Layers): DiscoveryFacet[] {
  return LAYER_KEYS.map((key) => {
    const counts = new Map<string, number>();
    // Keep selected zero-result values removable; count a facet without its own restriction.
    layers[key]?.forEach((value) => counts.set(value, 0));
    for (const item of items) {
      if (!matchesLayers(item, layers, key)) continue;
      for (const value of new Set(item.values[key] ?? []))
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return {
      key,
      options: [...counts]
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    };
  });
}
