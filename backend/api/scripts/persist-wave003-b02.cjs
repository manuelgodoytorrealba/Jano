const fs = require('node:fs');
const { PrismaService } = require('../src/prisma/prisma.service');
const { ResearchService } = require('../src/research/research.service');

const projectId = 'cmtpuhs8o0000uwsscb5k3u69';
const reviewerId = '55e0f530-5458-4067-8389-daad2a567b8b';
const actions = {
  'W003-B01-021': ['cmtpvzjuw000d67ssf9mge48a', 'REJECT_SOURCE_CONTEXT', 'The Evidence consists entirely of museum opening hours and member/public visiting information. It does not support documentary knowledge about Nighthawks.'],
  'W003-B01-022': ['cmtpvzqc3000k67ssz2738oes', 'REJECT_TARGET_MISMATCH', 'The Evidence concerns a Frank Horvat photography exhibition/event at the Baths of Caracalla. It does not support a proposition about Éxtasis de santa Teresa. Do not automatically retarget.'],
  'W003-B01-023': ['cmtpvzwt2000p67ssxcj8g983', 'REJECT_SOURCE_CONTEXT', 'The Evidence is an NYC Cultural Affairs budget/news block mixed with site navigation. Although geographically associated with New York, it does not provide stable target-centered cultural knowledge for the canonical PLACE entity. Preserve privately. Do not promote.'],
  'W003-B01-024': ['cmtpw07at000x67ss27xcum45', 'APPROVE_CLAIM', 'By the early nineteenth century, the term Romanticism was in use to describe a movement in art and literature distinguished by new interest in human psychology, expression of personal feeling, and the natural world.'],
  'W003-B01-025': ['cmtpw0brt001267ssr34diqxs', 'DEFER', 'The Evidence combines distinct propositions: an attributed evaluative judgment that Titian was the greatest painter of sixteenth-century Venice and a separate historical priority claim about an international clientele. Preserve and split in a later proposal stage.'],
  'W003-B01-026': ['cmtpw0g9v001b67ssspqdbyxx', 'REJECT_TARGET_MISMATCH', 'The Evidence promotes the 2026–2027 season at Taliesin West. It does not establish a biographical or cultural proposition about Frank Lloyd Wright.'],
  'W003-B01-027': ['cmtpw0kg5001k67sse7l0kf39', 'DEFER', "The Evidence may support that a work called Composition belongs to Lee Krasner's late-1940s Little Image breakthrough series, but Composición is not sufficiently disambiguated. Require exact canonical artwork identity."],
  'W003-B01-028': ['cmtpw0kg9001n67ss01sj49at', 'APPROVE_CLAIM', 'Behind the Gare Saint-Lazare, Paris is a work by Henri Cartier-Bresson created in 1932.'],
  'W003-B01-029': ['cmtpw0p8q001p67sss36j80lr', 'REJECT_TARGET_MISMATCH', 'The Evidence describes the specific photograph Behind the Gare Saint-Lazare, Paris, not the general concept Película fotográfica. Do not automatically retarget.'],
  'W003-B01-030': ['cmtpw0tes001s67sseu5n0hj0', 'APPROVE_CLAIM', 'The Source characterizes Divisor, dated 1968, as an emblematic work in the practice of Lygia Pape. Preserve the evaluative nature of emblematic as Source attribution.'],
  'W003-B01-031': ['cmtpw0wx3001v67ssynuhlkdw', 'REJECT_SOURCE_CONTEXT', 'The Evidence is generic navigation: Installations / Sculptures, Back to Works, Short overview. It contains no documentary proposition about Double Plot.'],
  'W003-B01-032': ['cmtpw135i001y67ssfuyy8ydq', 'APPROVE_CLAIM', 'The Walther Collection record presents Faces and Phases by Zanele Muholi, dated 2007–2013, as 15 gelatin-silver prints. Keep the collection-record scope explicit.'],
};

(async () => {
  if (process.env.JANO_LOCAL_REVIEW !== '1') throw Error('Local review guard required');
  const db = new PrismaService();
  try {
    const counts = async () => ({ entities: await db.entity.count(), relations: await db.relation.count(), assertions: await db.canonicalAssertion.count(), sourceRefs: await db.sourceRef.count(), citations: await db.citation.count(), proposals: await db.researchFindingProposal.count() });
    const before = await counts();
    if (before.entities !== 824 || before.relations !== 1388 || before.assertions !== 40 || before.sourceRefs !== 866 || before.citations !== 1427) throw Error(`Baseline drift ${JSON.stringify(before)}`);
    const packet = JSON.parse(fs.readFileSync('/app/artifacts/feed-wave-003-retry-01-exact-review-summary.json'));
    if (packet.items.length !== 32) throw Error('Review population drift');
    const service = new ResearchService(db, null, null, null, null);
    const execute = () => db.$transaction(async (tx) => {
      const svc = new ResearchService(tx, null, null, null, null);
      const result = [];
      for (const [logicalReviewId, [evidenceId, decision, reason]] of Object.entries(actions)) {
        const item = packet.items.find((entry) => entry.reviewId === logicalReviewId);
        if (!item || item.evidenceId !== evidenceId) throw Error(`Lineage mismatch ${logicalReviewId}`);
        const evidence = await tx.researchEvidence.findFirst({ where: { id: evidenceId, projectId } });
        if (!evidence) throw Error(`Evidence missing ${logicalReviewId}`);
        const payload = { wave: '003', attempt: 'RETRY_01', batch: 'W003-B02', sourceId: item.sourceId, reviewPacketId: logicalReviewId, reviewedEvidenceId: evidenceId, exactPersistedSupport: evidence.quote, canonicalApplyRequired: true };
        if (decision === 'APPROVE_CLAIM') Object.assign(payload, { targetEntityId: item.targetEntityId, proposition: reason, exactSupport: evidence.quote, scope: 'HUMAN_APPROVED_CLAIM_PENDING_APPLY' });
        result.push(await svc.recordEvidenceDecision(projectId, reviewerId, { evidenceId, logicalReviewId, decision, reason, payload }));
      }
      return result;
    });
    const first = await execute();
    const second = await execute();
    if (first.filter((row) => row.created).length !== 12 || second.some((row) => row.created)) throw Error('Idempotency failure');
    const after = await counts();
    if (JSON.stringify(before) !== JSON.stringify(after)) throw Error(`Canonical mutation ${JSON.stringify(after)}`);
    const review = await service.readReviewDecisions(projectId, packet.items.map((item) => item.reviewId));
    if (review.totalDecided !== 32 || review.remainingUndecided !== 0) throw Error(`Review mismatch ${JSON.stringify(review)}`);
    const rows = await db.researchEvidenceDecision.findMany({ where: { projectId }, select: { logicalReviewId: true, decision: true }, orderBy: { logicalReviewId: 'asc' } });
    const result = { projectId, batch: 'W003-B02', requested: 12, persisted: 12, blocked: 0, duplicates: 0, secondRunCreates: 0, idempotency: 'PASS', before, after, totalLogicalReviewItems: 32, totalEvidenceDecisions: rows.length, remainingUndecided: 0, decisionDistribution: rows.reduce((out, row) => { out[row.decision] = (out[row.decision] || 0) + 1; return out; }, {}) };
    fs.writeFileSync('/app/artifacts/feed-wave-003-b02-persistence.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await db.onModuleDestroy(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
