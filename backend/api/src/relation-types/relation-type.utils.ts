export type RelationTypeIdentity = {
  relationType: {
    key: string;
    directed?: boolean | null;
  };
};

const UNDIRECTED_KEYS = new Set(['RELATED_TO', 'ASSOCIATED_WITH', 'SIMILAR_TO', 'CURATED_WITH']);

export function canonicalRelationKey(relation: RelationTypeIdentity): string {
  return relation.relationType.key;
}

export function canonicalRelationDirected(relation: RelationTypeIdentity): boolean {
  return relation.relationType.directed ?? !UNDIRECTED_KEYS.has(canonicalRelationKey(relation));
}

export function canonicalRelationTypeFilter(keys: readonly string[]) {
  const normalized = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];

  return { relationType: { key: { in: normalized } } };
}
