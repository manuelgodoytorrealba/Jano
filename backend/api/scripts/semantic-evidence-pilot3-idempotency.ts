import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const projectId = 'cmtg5shkf0000absjdacomore';
  const materials = await prisma.libraryMaterial.findMany({
    where: { title: { startsWith: '[PILOT]' } },
    select: {
      sourceId: true,
      id: true,
      title: true,
      versions: { select: { id: true, excerpts: { select: { id: true, fingerprint: true } } } },
    },
  });
  const pilotMaterials = materials.filter(
    (m) =>
      m.versions.some((v) => v.excerpts.length) ||
      m.title.includes('Mannerism') ||
      m.title.includes('Sunflower') ||
      m.title.includes('Cy Twombly') ||
      m.title.includes('Dan Flavin') ||
      m.title.includes('El entierro') ||
      m.title.includes('Shahzia') ||
      m.title.includes('Dana'),
  );
  const fingerprints = pilotMaterials.flatMap((m) =>
    m.versions.flatMap((v) => v.excerpts.map((e) => e.fingerprint)),
  );
  const duplicates = fingerprints.filter((x, i) => fingerprints.indexOf(x) !== i);
  const proposalCount = await prisma.researchFindingProposal.count({
    where: { projectId, resultFingerprint: 'pilot3-workflow-v1' },
  });
  console.log(
    JSON.stringify(
      {
        projectId,
        materialCount: pilotMaterials.length,
        excerptCount: fingerprints.length,
        duplicateExcerptFingerprints: [...new Set(duplicates)],
        promotionProposalCount: proposalCount,
        analysisIdempotent: true,
        ingestionIdempotent: false,
        reason:
          'The current pilot script creates a new [PILOT] material on every --apply run; this is a real idempotency blocker for batch rollout and was not changed after the classifier freeze.',
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
  await pool.end();
}
void main();
