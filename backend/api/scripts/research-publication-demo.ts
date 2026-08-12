import {
  KnowledgeEntityKind,
  ResearchOutlineSectionStatus,
  ResearchProposalReviewState,
  SourceType,
} from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';

const DEMO_TITLE = '[DEMO] Materia, memoria y umbral';
const DEMO_SOURCE_PREFIX = '[DEMO] Publicación Research';

const assets = {
  cover: '/assets/home/museum-room.jpg',
  entry: '/assets/home/artwork.jpg',
  archive: '/assets/home/concept.jpg',
  movement: '/assets/home/artist.jpg',
};

const sections = [
  {
    key: 'entrada',
    title: 'La casa como archivo incompleto',
    imageUrl: assets.entry,
    content: `La casa no conserva el pasado como una vitrina. Conserva cambios de luz, objetos desplazados y huecos que una mirada posterior intenta interpretar.

Esta investigación observa cómo ciertas prácticas visuales convierten esos restos en una forma de lectura: no para restaurar una historia completa, sino para dejar visibles sus ausencias.`,
  },
  {
    key: 'materia',
    title: 'Materia que recuerda',
    imageUrl: assets.archive,
    content: `Las fotografías, los sobres y los registros de voz no aparecen aquí como pruebas cerradas. Funcionan como materiales que cambian de significado cuando se reúnen.

La memoria doméstica nombra esa inestabilidad: una marca puede ser testimonio de uso, pero también el rastro de una restauración posterior. El trabajo editorial consiste en sostener ambas posibilidades sin resolverlas antes de tiempo.`,
  },
  {
    key: 'umbral',
    title: 'El umbral y la decisión corporal',
    imageUrl: assets.movement,
    content: `Un umbral no es solamente una línea arquitectónica. Es el lugar donde entrar, esperar o retroceder deja una huella en el espacio.

Las obras reunidas en esta investigación desplazan esa experiencia hacia el lector: cada relación pide comprobar qué evidencia la sostiene y qué interpretación sigue abierta.`,
  },
  {
    key: 'coda',
    title: 'Notas para una lectura situada',
    imageUrl: null,
    content: `Una publicación nacida de Research Studio no convierte el corpus en certeza automática. Presenta una lectura editorial y conserva la posibilidad de volver a sus fuentes, entidades y relaciones.

La publicación es, por tanto, una forma de hacer legible una investigación sin borrar el trabajo que todavía queda por hacer.`,
  },
] as const;

function assertSafeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const url = new URL(databaseUrl);
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (process.env.NODE_ENV === 'production' || !isLocal || /prod/i.test(url.pathname)) {
    throw new Error('The publication demo only runs against a local non-production database');
  }
}

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

async function ownerFor(prisma: PrismaService) {
  const email = argument('--owner-email');
  const owner = email
    ? await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } })
    : await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, email: true },
      });
  if (!owner) {
    throw new Error('No admin owner found. Run again with --owner-email <admin-email>.');
  }
  return owner;
}

async function createDraft(
  prisma: PrismaService,
  projectId: string,
  sectionId: string,
  authorId: string,
  content: string,
) {
  const draft = await prisma.researchDraft.create({
    data: { projectId, sectionId, title: null },
    select: { id: true },
  });
  const revision = await prisma.researchDraftRevision.create({
    data: { draftId: draft.id, authorId, number: 1, content },
    select: { id: true },
  });
  await prisma.researchDraft.update({
    where: { id: draft.id },
    data: { currentRevisionId: revision.id },
  });
}

async function cleanup(prisma: PrismaService, ownerId?: string) {
  const projects = await prisma.researchProject.findMany({
    where: { title: DEMO_TITLE, ...(ownerId ? { ownerId } : {}) },
    select: { id: true },
  });
  if (projects.length) {
    await prisma.researchProject.deleteMany({
      where: { id: { in: projects.map((project) => project.id) } },
    });
  }
  await prisma.source.deleteMany({ where: { title: { startsWith: DEMO_SOURCE_PREFIX } } });
}

async function run() {
  assertSafeDatabase();
  const prisma = new PrismaService();
  try {
    const owner = await ownerFor(prisma);
    if (process.argv.includes('cleanup')) {
      await cleanup(prisma, owner.id);
      process.stdout.write('Publication demo removed.\n');
      return;
    }

    await cleanup(prisma, owner.id);
    const project = await prisma.researchProject.create({
      data: {
        ownerId: owner.id,
        title: DEMO_TITLE,
        objective:
          'Una lectura editorial sobre los rastros domésticos, la memoria material y la experiencia del umbral.',
        scope: 'Demo local y reproducible para probar la pantalla de Publicación.',
        coverImageUrl: assets.cover,
      },
      select: { id: true },
    });

    for (const [sortOrder, section] of sections.entries()) {
      const created = await prisma.researchOutlineSection.create({
        data: {
          projectId: project.id,
          title: section.title,
          imageUrl: section.imageUrl,
          sortOrder,
          status: ResearchOutlineSectionStatus.COMPLETED,
          objective: 'Desarrollar la lectura editorial de esta parte.',
        },
        select: { id: true },
      });
      await createDraft(prisma, project.id, created.id, owner.id, section.content);
    }

    const sourceRecords = await Promise.all([
      prisma.source.create({
        data: {
          type: SourceType.CATALOG,
          title: `${DEMO_SOURCE_PREFIX}: Inventario doméstico`,
          author: 'Archivo de trabajo',
          publisher: 'JANO Demo',
          year: 2026,
        },
        select: { id: true },
      }),
      prisma.source.create({
        data: {
          type: SourceType.ARTICLE,
          title: `${DEMO_SOURCE_PREFIX}: Umbrales y marcas`,
          author: 'Cuaderno editorial',
          publisher: 'JANO Demo',
          year: 2026,
        },
        select: { id: true },
      }),
      prisma.source.create({
        data: {
          type: SourceType.PAPER,
          title: `${DEMO_SOURCE_PREFIX}: Memoria material`,
          author: 'Mesa de investigación',
          publisher: 'JANO Demo',
          year: 2026,
        },
        select: { id: true },
      }),
    ]);
    await prisma.researchProjectSource.createMany({
      data: sourceRecords.map((sourceId) => ({ projectId: project.id, sourceId: sourceId.id })),
    });

    const evidence = await Promise.all(
      sourceRecords.map((source, index) =>
        prisma.researchEvidence.create({
          data: {
            projectId: project.id,
            sourceId: source.id,
            sourceVersion: 'demo-v1',
            locator: `Sección ${index + 1}`,
            quote: [
              'Las marcas conservan tanto el uso como la modificación posterior.',
              'El umbral concentra decisiones corporales y espaciales.',
              'La memoria material no equivale a una colección estable.',
            ][index],
            fingerprint: `publication-demo-evidence-${index + 1}`,
          },
          select: { id: true },
        }),
      ),
    );

    const entities = await Promise.all([
      prisma.researchEntity.create({
        data: {
          projectId: project.id,
          kind: KnowledgeEntityKind.ABSTRACTION,
          title: 'Memoria doméstica',
          summary:
            'Una forma de leer rastros de cuidado, cambio y sustitución en materiales cotidianos.',
          mentionCount: 4,
          confidence: 0.92,
          reviewState: ResearchProposalReviewState.REVIEWED,
          evidence: { create: [{ evidenceId: evidence[0].id }, { evidenceId: evidence[2].id }] },
        },
        select: { id: true },
      }),
      prisma.researchEntity.create({
        data: {
          projectId: project.id,
          kind: KnowledgeEntityKind.ABSTRACTION,
          title: 'Umbral',
          summary: 'El lugar donde una decisión corporal deja una huella espacial y narrativa.',
          mentionCount: 3,
          confidence: 0.88,
          reviewState: ResearchProposalReviewState.REVIEWED,
          evidence: { create: [{ evidenceId: evidence[1].id }] },
        },
        select: { id: true },
      }),
      prisma.researchEntity.create({
        data: {
          projectId: project.id,
          kind: KnowledgeEntityKind.WORK,
          title: 'Casa de sal',
          summary:
            'Una instalación imaginaria que organiza imágenes, mesas y registros sonoros para pensar la ausencia.',
          mentionCount: 3,
          confidence: 0.86,
          reviewState: ResearchProposalReviewState.REVIEWED,
          evidence: { create: [{ evidenceId: evidence[0].id }] },
        },
        select: { id: true },
      }),
      prisma.researchEntity.create({
        data: {
          projectId: project.id,
          kind: KnowledgeEntityKind.PLACE,
          title: 'Puerto Niebla',
          summary: 'Contexto portuario ficticio desde el que se articula la lectura doméstica.',
          mentionCount: 2,
          confidence: 0.8,
          reviewState: ResearchProposalReviewState.REVIEWED,
          evidence: { create: [{ evidenceId: evidence[1].id }] },
        },
        select: { id: true },
      }),
    ]);
    const relatedType = await prisma.relationType.findFirst({
      where: { key: 'RELATED_TO' },
      select: { id: true },
    });
    await prisma.researchRelation.createMany({
      data: [
        {
          projectId: project.id,
          fromEntityId: entities[2].id,
          toEntityId: entities[0].id,
          relationTypeId: relatedType?.id,
          explanation:
            'La instalación explora la memoria doméstica mediante materiales y ausencias.',
          reviewState: ResearchProposalReviewState.REVIEWED,
        },
        {
          projectId: project.id,
          fromEntityId: entities[2].id,
          toEntityId: entities[1].id,
          relationTypeId: relatedType?.id,
          explanation: 'La experiencia del umbral organiza la lectura espacial de la obra.',
          reviewState: ResearchProposalReviewState.REVIEWED,
        },
        {
          projectId: project.id,
          fromEntityId: entities[3].id,
          toEntityId: entities[2].id,
          relationTypeId: relatedType?.id,
          explanation: 'El contexto portuario sitúa la obra y sus materiales.',
          reviewState: ResearchProposalReviewState.REVIEWED,
        },
      ],
    });

    process.stdout.write(
      `Publication demo created for ${owner.email}: /admin/research/${project.id}?mode=publication\n`,
    );
  } finally {
    await prisma.onModuleDestroy();
  }
}

void run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
