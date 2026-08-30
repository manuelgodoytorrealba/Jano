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
  const allowedEndpoints: Record<string, ReadonlyArray<readonly [string, string]>> = {
    CREATED_BY: [
      ['ARTWORK', 'ARTIST'],
      ['ARTWORK', 'PERSON'],
    ],
    BELONGS_TO_MOVEMENT: [
      ['ARTWORK', 'MOVEMENT'],
      ['ARTIST', 'MOVEMENT'],
      ['PERSON', 'MOVEMENT'],
    ],
    BELONGS_TO_PERIOD: [
      ['ARTWORK', 'PERIOD'],
      ['ARTIST', 'PERIOD'],
      ['PERSON', 'PERIOD'],
      ['MOVEMENT', 'PERIOD'],
      ['EVENT', 'PERIOD'],
      ['CONCEPT', 'PERIOD'],
    ],
    ABOUT_CONCEPT: [
      ['ARTWORK', 'CONCEPT'],
      ['ARTIST', 'CONCEPT'],
      ['PERSON', 'CONCEPT'],
      ['MOVEMENT', 'CONCEPT'],
      ['EVENT', 'CONCEPT'],
      ['CONCEPT', 'CONCEPT'],
    ],
    LOCATED_IN: [
      ['ARTWORK', 'PLACE'],
      ['ARTWORK', 'ORGANIZATION'],
      ['ORGANIZATION', 'PLACE'],
    ],
    USES_TECHNIQUE: [['ARTWORK', 'CONCEPT']],
    USES_MATERIAL: [['ARTWORK', 'CONCEPT']],
    HAS_SUBJECT: [['ARTWORK', 'CONCEPT']],
    INFLUENCED_BY: [
      ['ARTIST', 'ARTIST'],
      ['MOVEMENT', 'MOVEMENT'],
    ],
  };
  for (const relation of relations) {
    if (!bySlug.has(relation.from) || !bySlug.has(relation.to))
      errors.push(`Broken endpoint: ${relation.from} → ${relation.to}`);
    const key = `${relation.from}:${relation.type}:${relation.to}`;
    if (seen.has(key)) errors.push(`Duplicate relation: ${key}`);
    seen.add(key);
    if (relation.from === relation.to) errors.push(`Self relation: ${key}`);
    const from = bySlug.get(relation.from);
    const to = bySlug.get(relation.to);
    const allowed = allowedEndpoints[relation.type];
    if (
      from &&
      to &&
      allowed &&
      !allowed.some(([fromType, toType]) => from.type === fromType && to.type === toType)
    )
      errors.push(
        `Invalid endpoints for ${relation.type}: ${relation.from} (${from.type}) → ${relation.to} (${to.type})`,
      );
    if (
      relation.type === 'CREATED_BY' &&
      from?.startYear != null &&
      to?.endYear != null &&
      from.startYear > to.endYear
    )
      errors.push(
        `Creator predates work impossibly: ${relation.from} (${from.startYear}) → ${relation.to} (${to.endYear})`,
      );
    if (
      relation.type === 'BELONGS_TO_PERIOD' &&
      from?.startYear != null &&
      to?.endYear != null &&
      from.startYear > to.endYear
    )
      errors.push(
        `Entity starts after period: ${relation.from} (${from.startYear}) → ${relation.to} (${to.endYear})`,
      );
    if (
      relation.type === 'BELONGS_TO_PERIOD' &&
      from?.endYear != null &&
      to?.startYear != null &&
      from.endYear < to.startYear
    )
      errors.push(
        `Entity ends before period: ${relation.from} (${from.endYear}) → ${relation.to} (${to.startYear})`,
      );
  }
  for (const slug of foundationalExpectations)
    if (!bySlug.has(slug)) errors.push(`Missing foundational node: ${slug}`);
  if (errors.length) throw new Error(`Invalid foundational catalog:\n${errors.join('\n')}`);
}

if (require.main === module) {
  validateCatalog();
  console.log(`Catalog valid: ${entities.length} entities, ${relations.length} relations.`);
}
