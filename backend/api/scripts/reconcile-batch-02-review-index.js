#!/usr/bin/env node
/* Rebuild the human-review index from the packet only. No DB writes. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packetPath = path.join(
  root,
  'artifacts/controlled-entity-enrichment-batch-02-human-review-packet.json',
);
const indexPath = path.join(
  root,
  'artifacts/controlled-entity-enrichment-batch-02-review-index.json',
);
const duplicatePath = path.join(root, 'artifacts/marilyn-diptych-duplicate-resolution-plan.json');
const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
const items = packet.items || [];
const ids = items.map((item) => item.reviewItemId);
if (items.length !== 60 || new Set(ids).size !== 60)
  throw new Error(`Expected 60 unique review items, got ${items.length}/${new Set(ids).size}`);

const marilynIds = new Set(['cmqmnymur004y4vsjxtd3rfir', 'cmsvvxikl00ny85sjt1lqzv9u']);
const category = (item) => {
  if (item.compositionSource === 'DETERMINISTIC_SAFE_KEEP') return 'deterministicKeep';
  if (item.compositionSource === 'SEMANTIC_RECOVERY_KEEP') return 'semanticRecoveryKeep';
  if (item.reviewKind === 'MODEL_REVIEW') return 'modelReview';
  if (item.reviewKind === 'SYSTEM_FAILSAFE_REVIEW') return 'systemReview';
  throw new Error(`Unmapped composition for ${item.reviewItemId}`);
};
const blockers = (item) => new Set(item.contractBlockers || []);
const clean = (item) =>
  ['KEEP'].includes(item.v3Decision) &&
  item.quoteStatus &&
  item.quoteStatus !== 'INVALID' &&
  item.validatedProposition &&
  item.atomicityStatus === 'ATOMIC' &&
  item.entityCentered === true &&
  !item.dimensionReviewRequired &&
  item.normalizedDimension &&
  item.provenance &&
  !item.identityReviewRequired &&
  blockers(item).size === 0;

const groups = new Map();
for (const item of items) {
  const entity = item.entity || { id: item.entityId, title: item.entityTitle };
  if (!groups.has(entity.id))
    groups.set(entity.id, {
      entityId: entity.id,
      entityTitle: entity.title,
      uniqueItems: 0,
      deterministicKeep: 0,
      semanticRecoveryKeep: 0,
      modelReview: 0,
      systemReview: 0,
      cleanKeep: 0,
      keepWithBlockers: 0,
      identityBlocked: false,
    });
  const group = groups.get(entity.id);
  const key = category(item);
  group.uniqueItems++;
  group[key]++;
  if (item.v3Decision === 'KEEP') {
    if (clean(item)) group.cleanKeep++;
    else group.keepWithBlockers++;
  }
  group.identityBlocked ||= marilynIds.has(entity.id) || item.identityReviewRequired === true;
}
const global = {
  uniqueReviewItems: items.length,
  deterministicKeep: 0,
  semanticRecoveryKeep: 0,
  modelReview: 0,
  systemReview: 0,
  cleanKeepCandidates: 0,
  keepWithBlockers: 0,
  itemsWithAnyBlocker: 0,
};
for (const item of items) {
  const key = category(item);
  global[key]++;
  if (item.v3Decision === 'KEEP') {
    if (clean(item)) global.cleanKeepCandidates++;
    else global.keepWithBlockers++;
  }
  if (blockers(item).size) global.itemsWithAnyBlocker++;
}
const index = {
  batchId: packet.batchId,
  sourceOfTruth: path.relative(root, packetPath),
  aggregation: 'one row per unique reviewItemId; no candidate/source joins',
  global,
  byEntity: [...groups.values()],
  identityAudit: {
    classification: 'SAME_ENTITY_DUPLICATE',
    promotionBlocked: true,
    entities: [...marilynIds],
  },
  humanApproved: 0,
};
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');

// Proposal only: preserve both records and make no merge/mutation.
const duplicatePlan = {
  batchId: packet.batchId,
  canonicalSurvivorId: 'cmqmnymur004y4vsjxtd3rfir',
  duplicateEntityId: 'cmsvvxikl00ny85sjt1lqzv9u',
  comparison: {
    survivor: {
      title: 'Marilyn Diptych',
      slug: 'marilyn-diptych',
      type: 'ARTWORK',
      startYear: 1962,
      endYear: 1962,
      status: 'DRAFT',
      contentLevel: 'ADVANCED',
      summaryLength: 138,
      contentLength: 410,
      sourceRefs: 1,
      citations: 0,
      relations: 1,
      media: 1,
      aliases: 0,
    },
    duplicate: {
      title: 'Díptico de Marilyn',
      slug: 'diptico-marilyn',
      type: 'ARTWORK',
      startYear: 1962,
      endYear: null,
      status: 'PUBLISHED',
      contentLevel: 'INTERMEDIATE',
      summaryLength: 0,
      contentLength: 0,
      sourceRefs: 2,
      citations: 0,
      relations: 9,
      media: 3,
      aliases: 0,
    },
  },
  reason:
    'Same artwork and year, but survivor has the stable English public slug, complete editorial content, and a direct artwork provenance record. The Spanish record has greater graph connectivity and media and therefore requires conflict review before any merge; language alone is not the criterion.',
  relationsToMove:
    'REVIEW_REQUIRED: 9 relations on duplicate; compare edge semantics before moving',
  sourceRefsToMove:
    'REVIEW_REQUIRED: 2 duplicate SourceRefs; preserve provenance and deduplicate by source/excerpt',
  citationsToMove: 'NONE_OBSERVED',
  mediaToMove: 'REVIEW_REQUIRED: 3 media links; compare canonical media before moving',
  aliasesToCreate: ['Díptico de Marilyn'],
  redirectNeeded: true,
  conflicts: [
    'duplicate is PUBLISHED while survivor is DRAFT',
    'duplicate has more relations/media',
    'different slugs',
    'no external IDs/aliases observed',
  ],
  safeToMerge: 'NEEDS_REVIEW',
  applied: false,
};
fs.writeFileSync(duplicatePath, JSON.stringify(duplicatePlan, null, 2) + '\n');
console.log(
  JSON.stringify(
    { global, entities: index.byEntity.length, output: [indexPath, duplicatePath] },
    null,
    2,
  ),
);
