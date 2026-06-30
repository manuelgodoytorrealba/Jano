import {
  canonicalRelationKey,
  type RelationTypeIdentity,
} from '../relation-types/relation-type.utils';

export const CONCEPTUAL_ENTITY_TYPES = ['CONCEPT', 'MOVEMENT', 'PERIOD'] as const;
export const CURATED_RELATION_TYPES = [
  'ABOUT_CONCEPT',
  'ASSOCIATED_WITH',
  'BELONGS_TO_MOVEMENT',
  'BELONGS_TO_PERIOD',
  'CREATED_BY',
  'RELATED_TO',
  'MENTIONS',
] as const;

type RankableEntity = { id: string; title: string; type: string };
type RankableRelation<T extends RankableEntity> = RelationTypeIdentity & {
  weight?: number | null;
  from: T | null;
  to: T | null;
};

export type RankedCandidate<T extends RankableEntity> = { entity: T; score: number };

const conceptualTypes = new Set<string>(CONCEPTUAL_ENTITY_TYPES);
const keyRelationTypes = new Set<string>(CURATED_RELATION_TYPES);

export function collectCuratedCandidates<T extends RankableEntity>(
  relations: RankableRelation<T>[],
  excludedIds: Set<string>,
  multiplier = 1,
): Map<string, RankedCandidate<T>> {
  const scores = new Map<string, RankedCandidate<T>>();

  for (const relation of relations) {
    const relationWeight = Number(relation.weight ?? 0.5);
    for (const entity of [relation.from, relation.to]) {
      if (!entity || excludedIds.has(entity.id)) continue;

      const typeBonus = conceptualTypes.has(entity.type)
        ? 0.12
        : entity.type === 'ARTWORK' || entity.type === 'ARTIST'
          ? 0.16
          : 0;
      const relationBonus = keyRelationTypes.has(canonicalRelationKey(relation)) ? 0.18 : 0;
      const score =
        (scores.get(entity.id)?.score ?? 0) +
        (relationWeight + typeBonus + relationBonus) * multiplier;
      scores.set(entity.id, { entity, score });
    }
  }

  return scores;
}

export function mergeCuratedCandidates<T extends RankableEntity>(
  base: Map<string, RankedCandidate<T>>,
  extra: Map<string, RankedCandidate<T>>,
): Map<string, RankedCandidate<T>> {
  const merged = new Map(base);
  for (const [id, candidate] of extra) {
    merged.set(id, {
      entity: candidate.entity,
      score: (merged.get(id)?.score ?? 0) + candidate.score,
    });
  }
  return merged;
}

export function rankCuratedCandidates<T extends RankableEntity>(
  candidates: Map<string, RankedCandidate<T>>,
): RankedCandidate<T>[] {
  return [...candidates.values()].sort(
    (a, b) => b.score - a.score || a.entity.title.localeCompare(b.entity.title),
  );
}

export function pickCuratedByType<T extends RankableEntity>(
  candidates: RankedCandidate<T>[],
  types: readonly string[],
  limit: number,
): T[] {
  const allowedTypes = new Set(types);
  const seen = new Set<string>();
  return candidates
    .filter(({ entity }) => {
      if (!allowedTypes.has(entity.type) || seen.has(entity.id)) return false;
      seen.add(entity.id);
      return true;
    })
    .slice(0, limit)
    .map(({ entity }) => entity);
}

export function pickDiverseCurated<T extends RankableEntity>(
  candidates: RankedCandidate<T>[],
  limit: number,
  excludedTypes: Set<string>,
): T[] {
  const selected: T[] = [];
  const selectedTypes = new Set<string>();
  const selectedIds = new Set<string>();

  for (const { entity } of candidates) {
    if (selected.length >= limit) break;
    if (excludedTypes.has(entity.type) || selectedIds.has(entity.id)) continue;
    if (selectedTypes.has(entity.type) && selected.length < 4) continue;
    selected.push(entity);
    selectedTypes.add(entity.type);
    selectedIds.add(entity.id);
  }

  for (const { entity } of candidates) {
    if (selected.length >= limit) break;
    if (excludedTypes.has(entity.type) || selectedIds.has(entity.id)) continue;
    selected.push(entity);
    selectedIds.add(entity.id);
  }

  return selected;
}
