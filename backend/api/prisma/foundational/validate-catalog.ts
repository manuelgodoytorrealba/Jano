import { entities, foundationalExpectations, relations } from './catalog';

export function validateCatalog() {
  const errors: string[] = [];
  const bySlug = new Map<string, (typeof entities)[number]>();
  for (const entity of entities) {
    if (!entity.slug || !entity.title.trim() || !entity.en.trim())
      errors.push(`Incomplete entity: ${entity.slug}`);
    if (!/^[\p{L}0-9]+(?:-[\p{L}0-9]+)*$/u.test(entity.slug))
      errors.push(`Invalid slug: ${entity.slug}`);
    if (bySlug.has(entity.slug)) errors.push(`Duplicate slug: ${entity.slug}`);
    bySlug.set(entity.slug, entity);
  }
  const seen = new Set<string>();
  for (const relation of relations) {
    if (!bySlug.has(relation.from) || !bySlug.has(relation.to))
      errors.push(`Broken endpoint: ${relation.from} → ${relation.to}`);
    const key = `${relation.from}:${relation.type}:${relation.to}`;
    if (seen.has(key)) errors.push(`Duplicate relation: ${key}`);
    seen.add(key);
    if (
      relation.type === 'CREATED_BY' &&
      (bySlug.get(relation.from)?.type !== 'ARTWORK' || bySlug.get(relation.to)?.type !== 'ARTIST')
    )
      errors.push(`Invalid authorship: ${relation.from} → ${relation.to}`);
  }
  for (const slug of foundationalExpectations)
    if (!bySlug.has(slug)) errors.push(`Missing foundational node: ${slug}`);
  if (errors.length) throw new Error(`Invalid foundational catalog:\n${errors.join('\n')}`);
}

if (require.main === module) {
  validateCatalog();
  console.log(`Catalog valid: ${entities.length} entities, ${relations.length} relations.`);
}
