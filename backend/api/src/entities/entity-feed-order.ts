import { createHash } from 'node:crypto';

export function feedOrder(ids: string[], seed: string): string[] {
  return ids
    .map((id) => ({ id, rank: createHash('sha256').update(`${seed}:${id}`).digest('hex') }))
    .sort((a, b) => a.rank.localeCompare(b.rank) || a.id.localeCompare(b.id))
    .map(({ id }) => id);
}
