const fs = require('node:fs');
const { PrismaService } = require('../src/prisma/prisma.service');
const { ResearchService } = require('../src/research/research.service');

const projectId = 'cmtpuhs8o0000uwsscb5k3u69';
const ids = ['W003-B01-020', 'W003-B01-024', 'W003-B01-028', 'W003-B01-030', 'W003-B01-032'];

(async () => {
  const db = new PrismaService();
  try {
    const counts = async () => ({
      entities: await db.entity.count(), relations: await db.relation.count(), assertions: await db.canonicalAssertion.count(),
      sourceRefs: await db.sourceRef.count(), citations: await db.citation.count(), proposals: await db.researchFindingProposal.count(),
    });
    const before = await counts();
    if (before.entities !== 824 || before.relations !== 1388 || before.assertions !== 40 || before.sourceRefs !== 866 || before.citations !== 1427) throw Error(`Canonical baseline drift: ${JSON.stringify(before)}`);
    const decisions = await db.researchEvidenceDecision.findMany({ where: { projectId, logicalReviewId: { in: ids } }, select: { logicalReviewId: true, decision: true, evidenceId: true } });
    if (decisions.length !== 5 || decisions.some((row) => row.decision !== 'APPROVE_CLAIM')) throw Error(`Approved Evidence state drift: ${JSON.stringify(decisions)}`);
    const service = new ResearchService(db, null, null, null, null);
    const first = await service.promoteApprovedEvidenceToProposals(projectId, ids);
    const second = await service.promoteApprovedEvidenceToProposals(projectId, ids);
    const after = await counts();
    if (first.filter((row) => row.created).length > 5 || second.some((row) => row.created)) throw Error('Proposal idempotency/count failure');
    if (JSON.stringify({ ...before, proposals: undefined }) !== JSON.stringify({ ...after, proposals: undefined })) throw Error(`Canonical mutation: ${JSON.stringify(after)}`);
    const rows = await db.researchFindingProposal.findMany({ where: { projectId, proposalKey: { startsWith: 'evidence-review:' } }, include: { evidence: { include: { evidence: { select: { id: true, sourceId: true, quote: true } } } } }, orderBy: { proposalKey: 'asc' } });
    if (rows.length !== 5 || rows.some((row) => row.evidence.length !== 1)) throw Error(`Proposal lineage failure: ${rows.length}`);
    const artifact = { projectId, wave: '003', attempt: 'RETRY_01', operation: 'EVIDENCE_TO_PROPOSAL', approvedEvidence: 5, created: first.filter((row) => row.created).length, secondRunCreated: second.filter((row) => row.created).length, idempotency: 'PASS', before, after, proposals: rows.map((row) => ({ id: row.id, proposalKey: row.proposalKey, title: row.title, type: row.type, claimKind: row.claimKind, projectId: row.projectId, evidence: row.evidence.map((link) => link.evidence) })), provenanceOnly: { logicalReviewId: 'W003-B01-010', evidenceId: 'cmtpvti7m000b3bssl3sag8zn', canonicalAssertionId: 'cmtomoik3000h7nss9xnxshc5', action: 'ADDITIONAL_PROVENANCE_PREVIEW_ONLY' }, entityProposalsCreated: 0, relationProposalsCreated: 0, canonicalMutations: 0 };
    fs.writeFileSync('/app/artifacts/feed-wave-003-evidence-to-proposal-result.json', JSON.stringify(artifact, null, 2));
    console.log(JSON.stringify({ created: artifact.created, secondRunCreated: artifact.secondRunCreated, proposals: rows.length, before, after }));
  } finally { await db.onModuleDestroy(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
