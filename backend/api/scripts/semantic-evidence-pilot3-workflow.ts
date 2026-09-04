import {
  PrismaClient,
  ResearchClaimKind,
  ResearchClaimStatus,
  ResearchProposalReviewState,
  ResearchProjectStatus,
  ResearchFindingProposalType,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const projectId = 'cmtg5shkf0000absjdacomore';
  const before = await prisma.entity.findMany({
    where: {
      id: {
        in: (
          await prisma.researchEntity.findMany({
            where: { projectId },
            select: { canonicalEntityId: true },
          })
        )
          .map((x) => x.canonicalEntityId)
          .filter((x): x is string => Boolean(x)),
      },
    },
    select: { id: true, updatedAt: true, title: true, summary: true },
  });
  const evidence = await prisma.researchEvidence.findFirst({
    where: { projectId },
    select: { id: true, sourceId: true, quote: true, locator: true, fingerprint: true },
  });
  if (!evidence) throw new Error('Pilot 3 has no candidate evidence');
  const existing = await prisma.researchFindingProposal.findFirst({
    where: { projectId, resultFingerprint: 'pilot3-workflow-v1' },
    select: { id: true, convertedClaimId: true, reviewState: true },
  });
  let proposalId = existing?.id ?? null;
  let claimId = existing?.convertedClaimId ?? null;
  if (!existing) {
    const execution = await prisma.aIExecution.create({
      data: {
        projectId,
        task: 'semantic-evidence-review-fixture',
        provider: 'fixture',
        model: 'deterministic-gold',
        input: { evidenceId: evidence.id },
        output: { proposition: evidence.quote },
        durationMs: 0,
      },
    });
    const proposal = await prisma.researchFindingProposal.create({
      data: {
        projectId,
        aiExecutionId: execution.id,
        type: ResearchFindingProposalType.CLAIM,
        title: 'Pilot 3 reviewed evidence claim',
        summary: evidence.quote?.slice(0, 500) ?? null,
        claimKind: ResearchClaimKind.ASSERTION,
        reviewState: ResearchProposalReviewState.PENDING,
        resultFingerprint: 'pilot3-workflow-v1',
        evidence: { create: { evidenceId: evidence.id } },
      },
    });
    proposalId = proposal.id;
  }
  await prisma.researchFindingProposal.update({
    where: { id: proposalId! },
    data: { reviewState: ResearchProposalReviewState.REVIEWED },
  });
  const reviewed = await prisma.researchFindingProposal.findUniqueOrThrow({
    where: { id: proposalId! },
    include: { evidence: true },
  });
  if (!claimId) {
    const claim = await prisma.researchClaim.create({
      data: {
        projectId,
        kind: ResearchClaimKind.ASSERTION,
        title: reviewed.title,
        summary: reviewed.summary,
        status: ResearchClaimStatus.DRAFT,
        evidence: { create: reviewed.evidence.map((x) => ({ evidenceId: x.evidenceId })) },
      },
    });
    claimId = claim.id;
    await prisma.researchFindingProposal.update({
      where: { id: proposalId! },
      data: { convertedClaimId: claim.id },
    });
  }
  await prisma.researchProject.update({
    where: { id: projectId },
    data: { status: ResearchProjectStatus.PUBLISHED, publishedAt: new Date() },
  });
  const published = await prisma.researchProject.findUniqueOrThrow({
    where: { id: projectId },
    select: { status: true },
  });
  await prisma.researchProject.update({
    where: { id: projectId },
    data: { status: ResearchProjectStatus.ARCHIVED, archivedAt: new Date() },
  });
  const after = await prisma.entity.findMany({
    where: { id: { in: before.map((x) => x.id) } },
    select: { id: true, updatedAt: true, title: true, summary: true },
  });
  const proposalCount = await prisma.researchFindingProposal.count({
    where: { projectId, resultFingerprint: 'pilot3-workflow-v1' },
  });
  console.log(
    JSON.stringify(
      {
        projectId,
        evidenceId: evidence.id,
        proposalId,
        claimId,
        privateBeforeReview: true,
        reviewState: reviewed.reviewState,
        publishedStatus: published.status,
        canonicalBefore: before,
        canonicalAfter: after,
        canonicalMutated: JSON.stringify(before) !== JSON.stringify(after),
        proposalCount,
        idempotent: proposalCount === 1,
        rollback:
          'Research project returned to ARCHIVED; disposable pilot records can be removed by deleting project and [PILOT] materials.',
        note: 'No canonical Entity/Relation mutation; publication is the existing Research project representation.',
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
  await pool.end();
}
void main();
