const fs = require('node:fs');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const projectId = 'cmtoojmz10000k9ss84uo6gl9';
const actorId = '55e0f530-5458-4067-8389-daad2a567b8b';
const batch = 'W002-B01';
const root = process.env.WAVE_ROOT || '/home/manuel/Desarrollos/Jano';
const review = JSON.parse(fs.readFileSync(`${root}/artifacts/feed-wave-002-review-summary.json`, 'utf8'));
const first = review.batches.find((b) => b.id === 'W002-B01').items;
const decisions = {
  'W002-E025': ['DEFER', 'The Evidence does not safely distinguish Bauhaus as institution/school from Bauhaus as movement. Do not merge those identities. Require documentary disambiguation before resolution or entity creation.'],
  'W002-E008': ['RESOLVE_TO_EXISTING', 'Identity resolution only. Associated claims and relations require independent review.'],
  'W002-E018': ['RESOLVE_TO_EXISTING', 'Resolve to the existing canonical artwork.'],
  'W002-E006': ['REJECT', 'Generic descriptive phrase, not an independently identified canonical entity. A specific artwork requires explicit documentary identification.'],
  'W002-E012': ['DEFER', 'Insufficient complete identity. Do not infer a fuller identity.'],
  'W002-E016': ['DEFER', 'Incomplete mention. Do not infer surname or canonical person identity from context alone.'],
  'W002-E033': ['DEFER', 'Incomplete/truncated identity Evidence. Do not infer identity.'],
  'W002-E013': ['APPROVE_NEW_ENTITY', 'The supporting Evidence explicitly identifies it as an exhibition. Do not classify as WORK. Final duplicate/alias check immediately before canonical creation.'],
  'W002-E017': ['APPROVE_NEW_ENTITY', 'The supporting Evidence explicitly identifies it as an exhibition. Do not classify as WORK. Final duplicate/alias check immediately before canonical creation.'],
  'W002-E032': ['DEFER', 'The phrase is too broad/underspecified for a canonical cultural concept node. Require clearer identity/scope.'],
  'W002-E002': ['RESOLVE_TO_EXISTING', 'Resolve aliases/variants to the existing canonical Arte conceptual entity. Do not create another entity.'],
  'W002-E005': ['RESOLVE_TO_EXISTING', 'Resolve to existing canonical Sol LeWitt.'],
  'W002-E007': ['RESOLVE_TO_EXISTING', 'Resolve identity only. Associated claims and relations still require independent review.'],
  'W002-E014': ['RESOLVE_TO_EXISTING', 'Resolve to existing canonical Black Mountain College.'],
  'W002-E019': ['RESOLVE_TO_EXISTING', 'Resolve to existing canonical Cubismo.'],
  'W002-E030': ['RESOLVE_TO_EXISTING', 'Resolve to existing canonical Eugène Delacroix.'],
  'W002-E031': ['RESOLVE_TO_EXISTING', 'Resolve to existing canonical Josef Albers.'],
  'W002-E001': ['APPROVE_NEW_ENTITY', 'Approve ARTIST identity pending final duplicate/alias check before canonical creation.'],
  'W002-E009': ['APPROVE_NEW_ENTITY', 'Judith Baca and Judy Baca represent the same canonical person. Final duplicate/alias check before canonical creation.'],
  'W002-E027': ['APPROVE_NEW_ENTITY', 'Approve PERSON identity pending final duplicate/alias check before canonical creation.'],
};

function fail(message) { throw new Error(message); }
function uniqueTarget(entity, expectedType) {
  if (!entity || entity.type !== expectedType) fail(`Target type mismatch for ${entity?.title ?? 'missing'}: ${entity?.type} != ${expectedType}`);
  return entity;
}

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const counts = async () => ({ entities: await db.entity.count(), relations: await db.relation.count(), assertions: await db.canonicalAssertion.count() });
    const before = await counts();
    const proposals = await db.researchFindingProposal.findMany({ where: { projectId }, select: { id: true, type: true, title: true, entityKind: true } });
    if (proposals.length !== 97 || proposals.filter((p) => p.type === 'ENTITY').length !== 42 || proposals.filter((p) => p.type === 'RELATION').length !== 25 || proposals.filter((p) => p.type === 'CLAIM').length !== 30) fail(`Unexpected proposal population: ${proposals.length}`);
    const existing = await db.researchProposalDecision.findMany({ where: { proposal: { projectId } }, select: { id: true, payload: true, proposalId: true } });
    if (existing.length !== 0) fail(`Wave 002 already has ${existing.length} decisions`);
    const admin = await db.user.findUnique({ where: { id: actorId }, select: { id: true, email: true, role: true, accountStatus: true, name: true } });
    if (!admin || admin.role !== 'ADMIN' || admin.accountStatus !== 'ACTIVE') fail('Selected reviewer is not an active local admin');
    const canonical = await db.entity.findMany({ select: { id: true, title: true, type: true } });
    const canonicalById = new Map(canonical.map((e) => [e.id, e]));
    const targetType = { 'W002-E008': 'EVENT', 'W002-E018': 'ARTWORK', 'W002-E002': 'MOVEMENT', 'W002-E005': 'ARTIST', 'W002-E007': 'ARTIST', 'W002-E014': 'ORGANIZATION', 'W002-E019': 'MOVEMENT', 'W002-E030': 'ARTIST', 'W002-E031': 'ARTIST' };
    const persisted = [];
    for (const item of first) {
      const [action, reason] = decisions[item.id] || fail(`Missing decision for ${item.id}`);
      const proposalIds = item.rawProposalIds;
      const real = proposalIds.map((id) => proposals.find((p) => p.id === id)).filter(Boolean);
      if (real.length !== proposalIds.length) fail(`Proposal lineage missing for ${item.id}`);
      const targetId = item.existingMatch || null;
      const target = targetId ? canonicalById.get(targetId) : null;
      if (targetId) uniqueTarget(target, targetType[item.id]);
      const payload = { wave: '002', batch, reviewId: item.id, proposalIds, humanReason: reason, reviewerContract: 'authenticated-admin', decisionScope: action === 'RESOLVE_TO_EXISTING' ? 'IDENTITY_ONLY' : action === 'APPROVE_NEW_ENTITY' ? 'ENTITY_IDENTITY_PENDING_CANONICAL_APPLY' : 'ENTITY_REVIEW', ...(target ? { canonicalEntityId: target.id, canonicalTitle: target.title, canonicalType: target.type } : {}), ...(action === 'APPROVE_NEW_ENTITY' ? { proposedType: item.proposedType, identityScope: item.title.includes('Quick') || item.title.includes('Last Picture') ? 'exhibition' : undefined, finalDuplicateCheckRequired: true } : {}) };
      const id = crypto.createHash('sha256').update(`${projectId}:${batch}:${item.id}`).digest('hex').slice(0, 24);
      await db.researchProposalDecision.create({ data: { id, proposalId: proposalIds[0], action, actorId, payload } });
      persisted.push({ reviewId: item.id, proposalIds, proposalId: proposalIds[0], projectId, action, canonicalEntityId: target?.id ?? null, canonicalTitle: target?.title ?? null, canonicalType: target?.type ?? null, reviewer: admin, payload });
    }
    const after = await counts();
    if (JSON.stringify(before) !== JSON.stringify(after)) fail(`Canonical counts changed: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
    const verified = await db.researchProposalDecision.findMany({ where: { proposal: { projectId } }, select: { id: true, proposalId: true, action: true, payload: true, actorId: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
    if (verified.length !== 20 || new Set(verified.map((d) => d.payload?.reviewId)).size !== 20) fail(`Expected 20 unique decisions, got ${verified.length}`);
    const out = { projectId, batch, reviewer: admin, before, after, decisionsRequested: 20, decisionsPersisted: verified.length, duplicateDecisions: 0, blockedDecisions: 0, decisions: persisted.map((x) => ({ ...x, createdAt: verified.find((d) => d.payload?.reviewId === x.reviewId)?.createdAt ?? null })), safety: { canonicalEntityCreates: 0, canonicalRelationCreates: 0, canonicalAssertionCreates: 0, canonicalSourceRefCreatesFromReviewApply: 0, canonicalCitationCreatesFromReviewApply: 0, proposalsConverted: 0, autoPromotion: 0, P0: 0, P1: 0 } };
    fs.writeFileSync(`${root}/artifacts/feed-wave-002-b01-persistence.json`, `${JSON.stringify(out, null, 2)}\n`);
    console.log(JSON.stringify({ projectId, batch, before, after, decisions: verified.length, reviewer: admin }));
  } finally { await db.$disconnect(); await pool.end(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
