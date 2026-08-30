'use strict';
const { PrismaClient } = require('@prisma/client');
const apply = process.argv.includes('--apply');
const backup =
  process.argv.find((x) => x.startsWith('--backup-id='))?.split('=')[1] ||
  process.argv[process.argv.indexOf('--backup-id') + 1];
async function main() {
  const db = new PrismaClient();
  try {
    const rel = await db.relation.findFirst({
      where: {
        from: { slug: 'double-plot' },
        to: { slug: 'geta-bratescu' },
        relationType: { key: 'CREATED_BY' },
      },
      include: { from: true, to: true, relationType: true },
    });
    if (!rel) {
      console.log(JSON.stringify({ pending: false, reason: 'relation-not-found' }));
      return;
    }
    const plan = {
      pending: true,
      relation: {
        id: rel.id,
        from: rel.from.slug,
        to: rel.to.slug,
        type: rel.relationType.key,
        status: rel.status,
        createdAt: rel.createdAt,
        updatedAt: rel.updatedAt,
        justification: rel.justification,
        confidence: rel.confidence,
      },
      decision: 'DELETE_SINGLE_RELATION_NO_PROVENANCE',
    };
    if (!apply) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }
    if (!backup) throw new Error('--backup-id is required for --apply');
    await db.$transaction(async (tx) => {
      const current = await tx.relation.findUnique({
        where: { id: rel.id },
        include: { from: true, to: true, relationType: true },
      });
      if (
        !current ||
        current.from.slug !== 'double-plot' ||
        current.to.slug !== 'geta-bratescu' ||
        current.relationType.key !== 'CREATED_BY'
      )
        throw new Error('precondition changed; refusing delete');
      await tx.relation.delete({ where: { id: rel.id } });
    });
    console.log(JSON.stringify({ ...plan, applied: true, backupId: backup }, null, 2));
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
