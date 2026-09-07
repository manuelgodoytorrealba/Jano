// Run with ts-node/register in the verified local backend; application service owns writes.
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { PrismaService } = require('../src/prisma/prisma.service');
const { ResearchService } = require('../src/research/research.service');
const projectId = 'cmtpuhs8o0000uwsscb5k3u69';
const reviewerId = '55e0f530-5458-4067-8389-daad2a567b8b';
const actions = [
 ['REJECT_SOURCE_CONTEXT', 'The persisted Evidence only describes the Louvre Collections database. It does not support a proposition about Júpiter y Sémele.'],
 ['REJECT_SOURCE_CONTEXT', "The Evidence describes the Louvre database's ongoing research/documentation process rather than a cultural entity proposition."],
 ['REJECT_TARGET_MISMATCH', 'The proposition concerns the bombing of Gernika on 26 April 1937. The current review target does not safely represent that proposition. Do not automatically retarget.'],
 ['REJECT_TARGET_MISMATCH', "The Evidence concerns Picasso's commission for the Spanish pavilion at the International Exhibition in Paris. The current target is not safely aligned. Do not automatically retarget to Picasso, Guernica or another entity."],
 ['REJECT_TARGET_MISMATCH', 'The Evidence concerns José Gaos / Picasso / the unresolved commission context. The current target is not safely aligned. Do not automatically retarget.'],
 ['REJECT_TARGET_MISMATCH', 'The Evidence supports that news of the attack on Gernika acted as a catalyst for work on the canvas. The current target is not safely aligned. Preserve Evidence privately. Do not automatically retarget.'],
 ['REJECT_SOURCE_CONTEXT', 'The Evidence is recommendation/navigation content listing other Louise Bourgeois works. It is not documentary knowledge about Maman.'],
 ['DEFER', 'The Evidence contains potentially valuable documentary propositions about Neoclassicism, including its emergence from around 1750. However, the review packet records the target as unresolved. Do not approve knowledge without a safe canonical target. Preserve Evidence for later target resolution.'],
 ['REJECT_TARGET_MISMATCH', 'The persisted support describes the Stanze of Raphael / papal apartment. It does not establish a proposition about La escuela de Atenas itself. Do not infer artwork knowledge from room context.'],
 ['ADDITIONAL_PROVENANCE', 'The new Source independently supports the already canonical proposition. Do not create a duplicate CanonicalAssertion. Preserve the additional Source/Evidence provenance for later canonical apply. The additional wording about Picasso becoming a reference figure is NOT automatically approved as a second assertion in this decision.'],
 ['REJECT_INSUFFICIENT_SUPPORT', 'The persisted support describes the rooms themselves but does not contain a complete atomic proposition about Rafael sufficient for canonical knowledge.'],
 ['REJECT_TARGET_MISMATCH', 'The Evidence concerns Picasso receiving a government commission for a large canvas for the Spanish pavilion. It does not establish an atomic proposition about the canonical target Guerra. Do not automatically retarget.'],
 ['REJECT_SOURCE_CONTEXT', 'The persisted Evidence is a list/navigation block of related works. It does not support documentary knowledge about Fuente.'],
 ['REJECT_TARGET_MISMATCH', 'The Evidence describes the composition/iconography of The Birth of Venus. That proposition is about the artwork, not Botticelli as the current target. Do not automatically retarget.'],
 ['REJECT_SOURCE_CONTEXT', 'The Evidence is tourism/event/navigation content. Do not create canonical knowledge from it.'],
 ['REJECT_SOURCE_CONTEXT', 'The Evidence is recommendation/navigation content listing other Andy Warhol works. It does not support knowledge about Marilyn Diptych.'],
 ['REJECT_TARGET_MISMATCH', 'The Evidence describes surviving Mudéjar architectural elements of the building. It does not establish a proposition about Don Gonzalo Ruiz de Toledo. Do not automatically retarget to the church/building.'],
 ['REJECT_TARGET_MISMATCH', "The persisted Evidence concerns UNESCO's appreciation of the Chapter's response to a fire. The proposition concerns the institution/Chapter and its response, not a documentary proposition about the building itself. Do not automatically retarget."],
 ['DEFER', 'The Source contains potentially useful knowledge: "This is one of five versions of Sunflowers on display in museums and galleries across the world." However, the canonical identity scope of Los girasoles must be resolved before attaching this proposition. Determine later whether the canonical node represents a specific version, the broader Sunflowers group/series or another artwork identity. Do not guess.'],
 ['APPROVE_CLAIM', "The Source directly supports documentary knowledge about the building's genesis: after the Bauhaus moved from Weimar to Dessau, the opportunity arose to build a new school building intended to express Bauhaus ideas in architectural form. Preserve the exact Source-supported scope. Do not strengthen this into unsupported causal or ideological claims."],
];
(async () => {
 if (process.env.JANO_LOCAL_REVIEW !== '1') throw Error('Verified local execution required');
 const url = new URL(process.env.DATABASE_URL);
 if (url.hostname !== 'db' || url.pathname !== '/jano') throw Error('Unexpected database');
 const root = process.env.WAVE_ROOT;
 const raw = fs.readFileSync(`${root}/feed-wave-003-retry-01-exact-review-summary.json`);
 const packet = JSON.parse(raw);
 if (packet.items.length !== 32 || new Set(packet.items.map(i => i.reviewId)).size !== 32) throw Error('Packet population drift');
 const db = new PrismaService();
 try {
  const counts = async () => ({ entities: await db.entity.count(), relations: await db.relation.count(), assertions: await db.canonicalAssertion.count(), sourceRefs: await db.sourceRef.count(), citations: await db.citation.count(), evidence: await db.researchEvidence.count(), proposals: await db.researchFindingProposal.count() });
  const before = await counts();
  if (before.entities !== 824 || before.relations !== 1388 || before.assertions !== 40) throw Error('Canonical baseline drift');
  const history = () => db.researchProposalDecision.findMany({ orderBy: { id: 'asc' } });
  const historicalBefore = JSON.stringify(await history());
  const service = new ResearchService(db, null, null, null, null);
  const inputs = actions.map(([decision, reason], index) => {
   const id = `W003-B01-${String(index + 1).padStart(3, '0')}`;
   const item = packet.items.find(i => i.reviewId === id);
   if (!item) throw Error(`Missing ${id}`);
   const payload = { wave: '003', attempt: 'RETRY_01', batch: 'W003-B01', sourceId: item.sourceId,
    reviewPacketSha256: createHash('sha256').update(raw).digest('hex'), reviewedItem: item, canonicalApplyRequired: true, noAutomaticRetarget: true };
   if (index === 9) Object.assign(payload, { targetEntityId: item.targetEntityId, canonicalAssertionId: 'cmtomoik3000h7nss9xnxshc5', proposition: 'Picasso se instaló en París en 1904.', exactSupport: 'Instalado en París en 1904', scope: 'PROVENANCE_ONLY' });
   if (index === 19) Object.assign(payload, { targetEntityId: item.targetEntityId, proposition: item.exactSupportSpan, exactSupport: item.exactSupportSpan, scope: 'HUMAN_APPROVED_CLAIM_PENDING_APPLY' });
   return { evidenceId: item.evidenceId, logicalReviewId: id, decision, reason, payload };
  });
  // A single transaction rolls back the entire batch if any item fails its contract.
  const execute = () => db.$transaction(async tx => {
   const svc = new ResearchService(tx, null, null, null, null);
   const result = [];
   for (const dto of inputs) {
    const evidence = await tx.researchEvidence.findFirst({ where: { id: dto.evidenceId, projectId, sourceId: dto.payload.sourceId } });
    if (!evidence || evidence.quote !== dto.payload.reviewedItem.exactSupportSpan) throw Error(`Evidence lineage drift: ${dto.logicalReviewId}`);
    result.push(await svc.recordEvidenceDecision(projectId, reviewerId, dto));
   }
   return result;
  }, { timeout: 30000 });
  const first = await execute(); const second = await execute();
  if (second.some(r => r.created)) throw Error('Idempotency failed');
  const after = await counts();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('Unexpected data mutation');
  if (historicalBefore !== JSON.stringify(await history())) throw Error('Historical decisions changed');
  const review = await service.readReviewDecisions(projectId, packet.items.map(i => i.reviewId));
  if (review.totalDecided !== 20 || review.remainingUndecided !== 12) throw Error('Review count mismatch');
  const projects = await db.researchProject.findMany({ where: { findingProposals: { some: { decisions: { some: {} } } } }, select: { id: true, title: true } });
  const historical = [];
  for (const p of projects) { const r = await service.readReviewDecisions(p.id); historical.push({ ...p, count: r.proposalDecisionCount, legacyAnchors: r.proposalDecisions.filter(d => d.legacyReviewAnchor).map(d => ({ id: d.id, logicalReviewId: d.logicalReviewId, classification: d.legacyReviewAnchor })) }); }
  const result = { projectId, batch: 'W003-B01', reviewer: await db.user.findUnique({ where: { id: reviewerId }, select: { id: true, name: true, role: true, accountStatus: true } }), requested: 20, created: first.filter(r => r.created).length, persisted: 20, secondRunCreates: 0, idempotency: 'PASS', before, after, review, historical, historicalUnchanged: true, decisions: first.map(r => r.decision) };
  fs.writeFileSync(`${root}/feed-wave-003-b01-persistence.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ created: result.created, persisted: 20, secondRunCreates: 0, before, after, historical, review: { total: 32, decided: review.totalDecided, remaining: review.remainingUndecided } }));
 } finally { await db.onModuleDestroy(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
