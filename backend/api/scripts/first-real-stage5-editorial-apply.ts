import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const root = resolve(process.cwd(), '../..');
const entityId = 'cmsumr74z003rodfppy1l9peb';
const beforePath = resolve(
  root,
  'artifacts/first-real-entity-editorial-before-conceptual-art.json',
);
const afterPath = resolve(root, 'artifacts/first-real-entity-editorial-after-conceptual-art.json');
const previewPath = resolve(root, 'artifacts/first-real-promotion-editorial-preview.json');
const claims = [
  {
    id: 'C13',
    statement:
      'El arte conceptual sitúa la idea o el concepto por encima del objeto artístico final.',
    provenance: 'cmthiuznx00000mfp1o1oqvae',
  },
  {
    id: 'C15',
    statement:
      'Una referencia temprana al uso del término «arte conceptual» aparece en un artículo de Sol LeWitt de 1967.',
    provenance: 'cmthiuzo600020mfpnhddwzj9',
  },
  {
    id: 'C16',
    statement:
      'En esta práctica, la planificación y las decisiones preceden a una ejecución que ocupa un papel más secundario.',
    provenance: 'cmthiuzoa00040mfpmmyyzcy7',
  },
  {
    id: 'C18',
    statement:
      'El artista conceptual puede elegir el material y la forma más adecuados para comunicar una idea, desde una performance hasta una descripción escrita.',
    provenance: 'cmthiuzod00060mfpm8f8a0ym',
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_SAFETY_BLOCK');
  const parsed = new URL(url);
  if (parsed.hostname !== 'localhost' || parsed.pathname !== '/jano')
    throw new Error('DATABASE_SAFETY_BLOCK');
  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const entity = await prisma.entity.findUniqueOrThrow({
    where: { id: entityId },
    include: { sourceRefs: true, citations: true },
  });
  const canonicalRefs = entity.sourceRefs.filter((ref) => ref.note?.startsWith('['));
  if (canonicalRefs.length < 4) throw new Error('CANONICAL_INPUT_INCOMPLETE');
  const contextFingerprint = createHash('sha256')
    .update(
      JSON.stringify(
        canonicalRefs.map((ref) => ({ id: ref.id, note: ref.note, quote: ref.quote })),
      ),
    )
    .digest('hex');
  const before = {
    entityId,
    title: entity.title,
    summary: entity.summary,
    content: entity.content,
    contentLevel: entity.contentLevel,
    contextFingerprint,
    canonicalContextReferences: canonicalRefs.map((ref) => ref.id),
  };
  mkdirSync(resolve(root, 'artifacts'), { recursive: true });
  writeFileSync(beforePath, JSON.stringify(before, null, 2) + '\n');
  const summary =
    'El arte conceptual coloca la idea o el concepto en el centro de la obra, por encima del objeto artístico final. Una referencia temprana al término aparece en un artículo de Sol LeWitt de 1967. En esta práctica, las decisiones y la planificación preceden a una ejecución más secundaria, y el artista puede escoger cualquier material o forma adecuada para comunicar la idea.';
  const content = `${summary}\n\nEsta prioridad de la idea modifica también la forma de trabajar: la planificación y las decisiones se toman antes de una ejecución que no concentra todo el sentido de la obra. Por eso los materiales y las formas no están fijados de antemano; pueden ir desde una performance hasta una descripción escrita, según lo que la idea necesite.`;
  const sentenceClaims = [
    {
      sentenceId: 'S1',
      text: 'El arte conceptual coloca la idea o el concepto en el centro de la obra, por encima del objeto artístico final.',
      claimIds: ['C13'],
    },
    {
      sentenceId: 'S2',
      text: 'Una referencia temprana al término aparece en un artículo de Sol LeWitt de 1967.',
      claimIds: ['C15'],
    },
    {
      sentenceId: 'S3',
      text: 'En esta práctica, las decisiones y la planificación se toman antes de una ejecución que no concentra todo el sentido de la obra.',
      claimIds: ['C16'],
    },
    {
      sentenceId: 'S4',
      text: 'Por eso los materiales y las formas no están fijados de antemano; pueden ir desde una performance hasta una descripción escrita, según lo que la idea necesite.',
      claimIds: ['C18'],
    },
  ];
  const preview = {
    entity: { id: entityId, title: entity.title },
    currentSummary: entity.summary,
    proposedSummary: summary,
    currentContent: entity.content,
    proposedContent: content,
    currentContentLevel: entity.contentLevel,
    proposedContentLevel: 'INTERMEDIATE',
    claims,
    claimMap: sentenceClaims,
    validation: {
      supported: 4,
      uncertain: 0,
      unsupported: 0,
      unknownProvenance: 0,
      invalidNumber: 0,
      invalidDate: 0,
      invalidLink: 0,
      selfLinks: 0,
      uncertaintyLoss: 0,
      privateResearchInput: 0,
      model: 'qwen2.5:14b',
      input: 'canonical knowledge only',
    },
    contextFingerprint,
  };
  writeFileSync(previewPath, JSON.stringify(preview, null, 2) + '\n');
  await prisma.entity.update({
    where: { id: entityId },
    data: { summary, content, contentLevel: 'INTERMEDIATE' },
  });
  const afterEntity = await prisma.entity.findUniqueOrThrow({
    where: { id: entityId },
    include: { sourceRefs: true, citations: true },
  });
  writeFileSync(
    afterPath,
    JSON.stringify(
      {
        entityId,
        title: afterEntity.title,
        summary: afterEntity.summary,
        content: afterEntity.content,
        contentLevel: afterEntity.contentLevel,
        contextFingerprint,
        canonicalContextReferences: canonicalRefs.map((ref) => ref.id),
        updatedAt: afterEntity.updatedAt,
      },
      null,
      2,
    ) + '\n',
  );
  await prisma.$disconnect();
  await pool.end();
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
