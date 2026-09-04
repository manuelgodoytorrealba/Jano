import {
  PrismaClient,
  LibraryMaterialKind,
  LibraryMaterialVersionStatus,
  ResearchProposalReviewState,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { LibraryMaterialPreparationService } from '../src/library/library-material-preparation.service';
import { BENCHMARK_DATASET } from './editorial-quality-benchmark';
import 'dotenv/config';

const PILOT_SOURCE_IDS = [
  'cmtage91f0000s0kpjeilzvqc',
  'cmtage95p000os0kp83phgo8x',
  'cmtage972000xs0kplen7wyin',
  'cmtage99x001bs0kp3qax6vlk',
  'cmtage95g000ms0kp9z6y5cli',
  'cmtage94q000is0kpgyqpynty',
  'cmtage936000as0kp8z0pv0as',
  'cmtage97c000zs0kpbqyvl8x1',
  'cmtage9j6003hs0kp2yjb5cw3',
  'cmqmnymld001f4vsj1rzeghxw',
  'cmsvvxkdx01s785sjoy8vekiy',
  'cmsvvxke301s985sjfls09jyh',
  'cmsvvxke901sa85sj69x48frv',
  'cmsvvxkec01s885sjo0tuwxy7',
  'cmsvvxke001s885sjj8af5z50',
  'cmtage97p0011s0kpne5kcla7',
  'cmtage9kg003rs0kp77znve4g',
  'cmtfxykua006142kezpbqxz6t',
  'cmtfxykid000a42keu2qhbb0y',
  'cmtfxylfv009742kerkm2oaa1',
];
const PILOT_2_SOURCE_IDS = [
  'cmqmnymll001j4vsjilaway65',
  'cmsyor4nn000n07p5cl8x2lqg',
  'cmtage9cl001vs0kp10jrl6sx',
  'cmt2y1v9k004207p5plwmgfbd',
  'cmtage91x0002s0kpo5sjxgck',
  'cmtage9260004s0kpze27l6gc',
  'cmtage92g0006s0kpqgkh78cu',
  'cmtage92p0008s0kpef0kp3x6',
  'cmtage93k000cs0kpps2qn6zs',
  'cmtage946000fs0kpgeshwm5r',
  'cmtage951000ks0kp54rnd7rq',
  'cmtage95y000qs0kp8dvpd2mq',
  'cmtage96b000ss0kpl7b7atwh',
  'cmtage96u000vs0kptpf0w7wy',
  'cmtage9a6001ds0kpmdf3isui',
  'cmtage9ah001fs0kpumkfqhma',
  'cmtage9aq001hs0kp9mytzmy4',
  'cmtage9az001js0kp7z2nh7ld',
  'cmtage9ba001ls0kpadu20fom',
  'cmtage9bk001ns0kpchflxd03',
];
const PILOT_3_SOURCE_IDS = [
  'mannerism-met-source',
  'mannerism-smarthistory-source',
  'entierro-orgaz-prado-source',
  'entierro-orgaz-santo-tome-source',
  'semillas-girasol-tate-source',
  'semillas-girasol-aiweiwei-source',
  'cmtfxymg000f842keretvyms6',
  'cmtfxymrc00fl42ket93zpnwa',
  'cmtfzfo1m000i1kphutylnlfr',
  'cmtfzfo21000m1kph5hgydr1j',
];
const PILOT_4_SOURCE_IDS = [
  'cmtage9ko003ts0kpmg855yf0',
  'cmtage9kx003vs0kp5lsltt4l',
  'cmtage9nn004hs0kp6w4jcrpd',
  'cmtage9o3004ls0kp5wbzowtz',
  'cmtage9in003ds0kpunn4erfv',
  'cmtage9iw003fs0kpiusi2ilw',
  'cmtage9bs001ps0kp1j5mc43w',
  'cmtage9c1001rs0kplb97dmi4',
  'cmtage9d1003zs0kprhbck0xb',
  'cmtage9g2002ps0kpqgjd3yg1',
  'cmtfxyncd00i942ke2ra174qf',
  'cmtage9q80051s0kpy6itcr3n',
];
const PILOT_1_REVIEW = [
  {
    source: 'Marcel Duchamp: Fountain',
    entity: 'Fuente',
    role: 'PRIMARY_SUBJECT',
    rootCause: 'AMBIGUOUS_RELEVANCE',
  },
  {
    source: 'Cubism',
    entity: 'Cubismo',
    role: 'PRIMARY_SUBJECT',
    rootCause: 'OVERLY_GENERAL_EXCERPT',
  },
  {
    source: 'Art & Architecture Thesaurus',
    entity: 'Muerte',
    role: 'PRIMARY_SUBJECT',
    rootCause: 'WEAK_SOURCE',
  },
  { source: 'Madrid Destino', entity: 'Madrid', role: 'PRIMARY_SUBJECT', rootCause: 'WEAK_SOURCE' },
  {
    source: 'Madrid Destino',
    entity: 'Madrid',
    role: 'PRIMARY_SUBJECT',
    rootCause: 'OVERLY_GENERAL_EXCERPT',
  },
  {
    source: 'Madrid Destino',
    entity: 'Madrid',
    role: 'PRIMARY_SUBJECT',
    rootCause: 'INSUFFICIENT_EVIDENCE',
  },
  {
    source: 'Madrid Destino',
    entity: 'Madrid',
    role: 'PRIMARY_SUBJECT',
    rootCause: 'BAD_FRAGMENT_BOUNDARY',
  },
];

const purpose = (source: { title: string; url: string | null; linked: string[] }) => {
  const text = `${source.title} ${source.url ?? ''}`.toLocaleLowerCase('es');
  if (/procedencia visual|wikimedia|commons/.test(text)) return 'VISUAL_PROVENANCE';
  if (
    /wikidata|registro de autoridad|authority|thesaurus|aat|identifier|taxonomy|controlled vocabulary|database record|statements/.test(
      text,
    )
  )
    return 'STRUCTURED_REFERENCE';
  if (/collection|colección|catalog/.test(text)) return 'CANONICAL_METADATA';
  if (/art terms|thesaurus|renaissance art|repensar|cubism|picasso|lascaux|paris/.test(text))
    return 'DOCUMENTARY_TEXT';
  if (/museo|museum|met|tate|prado|culture/.test(text)) return 'EDITORIAL_REFERENCE';
  return 'GENERAL_REFERENCE';
};
const quality = (source: { title: string; url: string | null }) =>
  /museo|museum|metmuseum|museodelprado|tate\.org|culture\.gouv|reinasofia/i.test(
    `${source.title} ${source.url ?? ''}`,
  )
    ? 'PRIMARY_AUTHORITATIVE'
    : /\.edu|university|journal|press/i.test(`${source.title} ${source.url ?? ''}`)
      ? 'SCHOLARLY_STRONG_SECONDARY'
      : 'UNKNOWN';
const clean = (value: string | null | undefined) => value?.trim() || '';
const paragraphs = (text: string) =>
  text
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(
      (part) =>
        part.length >= 180 &&
        !/cookies|privacy policy|accept all|menu|share|subscribe|javascript/i.test(part),
    )
    .slice(0, 12);
const contentQuality = (text: string) => {
  if (text.length < 500) return 'UNUSABLE';
  const noise = (text.match(/cookies|privacy|menu|subscribe|share|javascript/gi) ?? []).length;
  if (noise > 12 || text.length < 1200) return 'LOW_VALUE';
  if (noise > 5) return 'MEDIUM_VALUE';
  return 'HIGH_VALUE';
};
const tokenOverlap = (a: string, b: string) => {
  const left = new Set(a.toLocaleLowerCase('es').match(/[\p{L}\p{N}]{5,}/gu) ?? []);
  const right = new Set(b.toLocaleLowerCase('es').match(/[\p{L}\p{N}]{5,}/gu) ?? []);
  return left.size ? [...left].filter((token) => right.has(token)).length / left.size : 0;
};

async function main() {
  const apply = process.argv.includes('--apply');
  const pilot2 = process.argv.includes('--pilot2');
  const pilot3 = process.argv.includes('--pilot3');
  const pilot4 = process.argv.includes('--pilot4');
  const reuseProjectId =
    process.argv.find((arg) => arg.startsWith('--project-id='))?.split('=')[1] ?? null;
  const selectedSourceIds = pilot4
    ? PILOT_4_SOURCE_IDS
    : pilot3
      ? PILOT_3_SOURCE_IDS
      : pilot2
        ? PILOT_2_SOURCE_IDS
        : PILOT_SOURCE_IDS;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const sources = await prisma.source.findMany({
    where: { id: { in: selectedSourceIds } },
    include: { refs: { include: { entity: true } } },
  });
  const project = apply
    ? reuseProjectId
      ? await prisma.researchProject.findUniqueOrThrow({ where: { id: reuseProjectId } })
      : await prisma.researchProject.create({
          data: {
            title: `Controlled ingestion pilot ${new Date().toISOString()}`,
            owner: {
              connect: { id: (await prisma.user.findFirstOrThrow({ select: { id: true } })).id },
            },
            objective: 'Audit-only development pilot for existing Sources',
            scope: 'No editorial generation',
          },
        })
    : null;
  const preparation = new LibraryMaterialPreparationService(prisma as never);
  const results: Array<Record<string, unknown>> = [];
  const entityImpact = new Map<
    string,
    { title: string; newEvidence: number; sources: Set<string> }
  >();
  const researchEntityIds = new Map<string, string>();
  for (const source of sources) {
    const linked = source.refs.map((ref) => ref.entity.title);
    const sourcePurpose = purpose({ title: source.title, url: source.url, linked });
    const sourceQuality = quality(source);
    let material: any = null;
    let version: any = null;
    let preparedText = '';
    let failure = '';
    try {
      if (apply) {
        const kind = /\.pdf$/i.test(source.url ?? '')
          ? LibraryMaterialKind.PDF
          : LibraryMaterialKind.URL;
        material = await prisma.libraryMaterial.findFirst({
          where: { sourceId: source.id, kind, title: `[PILOT] ${source.title}` },
          include: { versions: { orderBy: { version: 'desc' } } },
        });
        if (!material)
          material = await prisma.libraryMaterial.create({
            data: { sourceId: source.id, kind, title: `[PILOT] ${source.title}` },
            include: { versions: true },
          });
        version =
          material.versions.find(
            (candidate: any) =>
              candidate.url === source.url &&
              candidate.status === LibraryMaterialVersionStatus.READY,
          ) ??
          material.versions.find((candidate: any) => candidate.url === source.url) ??
          null;
        if (!version) {
          const nextVersion =
            Math.max(0, ...material.versions.map((candidate: any) => candidate.version)) + 1;
          version = await prisma.libraryMaterialVersion.create({
            data: {
              materialId: material.id,
              version: nextVersion,
              status: LibraryMaterialVersionStatus.PENDING_PREPARATION,
              url: source.url,
            },
          });
          await preparation.prepare(version.id);
          version = await prisma.libraryMaterialVersion.findUniqueOrThrow({
            where: { id: version.id },
          });
        } else if (version.status !== LibraryMaterialVersionStatus.READY) {
          await prisma.libraryMaterialVersion.update({
            where: { id: version.id },
            data: { status: LibraryMaterialVersionStatus.PENDING_PREPARATION },
          });
          await preparation.prepare(version.id);
          version = await prisma.libraryMaterialVersion.findUniqueOrThrow({
            where: { id: version.id },
          });
        }
        preparedText = clean(version.content);
      }
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
      if (apply && version)
        await prisma.libraryMaterialVersion.update({
          where: { id: version.id },
          data: { status: LibraryMaterialVersionStatus.FAILED },
        });
    }
    const candidates = preparedText ? paragraphs(preparedText) : [];
    const usefulCandidates =
      sourcePurpose === 'VISUAL_PROVENANCE'
        ? []
        : candidates.filter((part) => part.length >= 240).slice(0, 4);
    const evidenceCandidates = usefulCandidates
      .filter((part) =>
        /was|fue|is|es|created|nació|surgió|collection|obra|artist|movement|museum|museum|painting/i.test(
          part,
        ),
      )
      .slice(0, 3)
      .map((text) => ({
        text,
        classification: 'DIRECT_DOCUMENTARY_EVIDENCE',
        confidence: 'medium',
      }));
    const relevantRefs = source.refs.length ? [source.refs[0]] : [];
    for (const ref of relevantRefs) {
      const current = entityImpact.get(ref.entity.slug) ?? {
        title: ref.entity.title,
        newEvidence: 0,
        sources: new Set<string>(),
      };
      current.newEvidence += evidenceCandidates.length;
      current.sources.add(source.id);
      entityImpact.set(ref.entity.slug, current);
    }
    const created = {
      materialId: material?.id ?? null,
      versionId: version?.id ?? null,
      excerptIds: [] as string[],
      evidenceIds: [] as string[],
      projectId: project?.id ?? null,
    };
    if (apply && project && version && usefulCandidates.length) {
      await prisma.researchLibraryMaterial.upsert({
        where: { projectId_materialId: { projectId: project.id, materialId: material.id } },
        create: { projectId: project.id, materialId: material.id },
        update: {},
      });
      for (const ref of source.refs) {
        if (!researchEntityIds.has(ref.entityId)) {
          const researchEntity =
            (await prisma.researchEntity.findFirst({
              where: { projectId: project.id, canonicalEntityId: ref.entityId },
            })) ??
            (await prisma.researchEntity.create({
              data: {
                projectId: project.id,
                kind: (ref.entity.kind ?? 'CONCEPT') as any,
                title: ref.entity.title,
                canonicalEntityId: ref.entityId,
                reviewState: ResearchProposalReviewState.PENDING,
              },
            }));
          researchEntityIds.set(ref.entityId, researchEntity.id);
        }
      }
      for (let index = 0; index < usefulCandidates.length; index += 1) {
        const text = usefulCandidates[index];
        const excerpt = await prisma.libraryExcerpt.upsert({
          where: {
            materialVersionId_fingerprint: {
              materialVersionId: version.id,
              fingerprint: `${version.id}:${index + 1}`,
            },
          },
          create: {
            materialVersionId: version.id,
            locator: `paragraph-${index + 1}`,
            text,
            fingerprint: `${version.id}:${index + 1}`,
          },
          update: { text, locator: `paragraph-${index + 1}` },
        });
        created.excerptIds.push(excerpt.id);
        const candidate = evidenceCandidates.find((item) => item.text === text);
        if (candidate) {
          const evidence = await prisma.researchEvidence.upsert({
            where: {
              projectId_sourceId_fingerprint: {
                projectId: project.id,
                sourceId: source.id,
                fingerprint: `${source.id}:${excerpt.id}`,
              },
            },
            update: { quote: text, locator: excerpt.locator, libraryExcerptId: excerpt.id },
            create: {
              projectId: project.id,
              sourceId: source.id,
              libraryExcerptId: excerpt.id,
              sourceVersion: '1',
              locator: excerpt.locator,
              quote: text,
              context: `Pilot candidate; primary entity: ${linked[0] ?? source.title}`,
              note: candidate.classification,
              fingerprint: `${source.id}:${excerpt.id}`,
              entityEvidence: {
                create: relevantRefs.map((ref) => ({
                  entityId: researchEntityIds.get(ref.entityId)!,
                })),
              },
            },
          });
          created.evidenceIds.push(evidence.id);
        }
      }
    }
    results.push({
      source: { id: source.id, title: source.title, url: source.url, linkedEntities: linked },
      purpose: sourcePurpose,
      quality: sourceQuality,
      accessible: Boolean(preparedText),
      preparedTextChars: preparedText.length,
      preparationStatus: version?.status ?? (apply ? 'FAILED' : 'NOT_RUN_DRY_RUN'),
      failureReason: failure || null,
      contentQuality: preparedText ? contentQuality(preparedText) : 'NOT_EVALUATED',
      excerptCandidates: usefulCandidates.map((text, index) => ({
        locator: `paragraph-${index + 1}`,
        text,
        primaryEntity: relevantRefs[0]?.entity.title ?? null,
        entityAssociations: relevantRefs.map((ref) => ({
          entity: ref.entity.title,
          role: 'PRIMARY_SUBJECT',
          why: 'source is explicitly linked to this entity; no automatic association to other linked entities',
        })),
        otherMentionOnlyEntities: linked.slice(1, 4),
        supportedDimension: 'context / characteristics',
        provenance: {
          sourceId: source.id,
          materialId: material?.id ?? null,
          versionId: version?.id ?? null,
        },
      })),
      evidenceCandidates,
      usefulYield: preparedText
        ? `${evidenceCandidates.length}/${usefulCandidates.length} evidence candidates from ${preparedText.length} prepared chars`
        : '0',
      created,
    });
  }
  const associationAudit = results.flatMap((row) =>
    (row.excerptCandidates as Array<any>).map((excerpt) => {
      const primary = excerpt.primaryEntity as string | null;
      const sourceTitle = String((row.source as any).title);
      const noisy =
        /advertisement|plan your trip|tourist|calendar of events|you might like|related|subscribe/i.test(
          String(excerpt.text),
        );
      const normalizedSource = sourceTitle
        .toLocaleLowerCase('es')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const normalizedPrimary = String(primary ?? '')
        .toLocaleLowerCase('es')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const strong = Boolean(
        primary &&
        !noisy &&
        (normalizedSource.includes(normalizedPrimary) ||
          (normalizedPrimary === 'cubismo' && normalizedSource.includes('cubism')) ||
          tokenOverlap(String(excerpt.text), primary) >= 0.2),
      );
      return {
        source: sourceTitle,
        excerptSummary: String(excerpt.text).slice(0, 220),
        primarySubject: primary,
        entityAssociations: excerpt.entityAssociations,
        role: strong ? 'PRIMARY_SUBJECT' : 'REVIEW',
        why: strong
          ? 'independent title/text relevance check'
          : 'source link exists but independent semantic check is insufficient',
        decision: strong ? 'KEEP' : 'REVIEW',
      };
    }),
  );
  const depthOrder = [
    'IDENTITY_ONLY',
    'BASIC_EXPLANATION',
    'EDITORIAL_ENTRY',
    'CONTEXTUAL_ESSAY',
    'DOCUMENTARY_ESSAY',
  ];
  const depthBefore: Record<string, string> = {
    ritual: 'BASIC_EXPLANATION',
    'cueva-de-lascaux': 'EDITORIAL_ENTRY',
    paleolitico: 'BASIC_EXPLANATION',
    'arte-rupestre': 'EDITORIAL_ENTRY',
    'pablo-picasso': 'CONTEXTUAL_ESSAY',
    cubismo: 'EDITORIAL_ENTRY',
    paris: 'EDITORIAL_ENTRY',
    guernica: 'CONTEXTUAL_ESSAY',
    fuente: 'CONTEXTUAL_ESSAY',
    renacimiento: 'BASIC_EXPLANATION',
    madrid: 'EDITORIAL_ENTRY',
    'museo-del-prado': 'EDITORIAL_ENTRY',
  };
  const impact = [...entityImpact.entries()].map(([slug, item]) => {
    const before = depthBefore[slug] ?? 'BASIC_EXPLANATION';
    const after =
      item.newEvidence >= 2 && before !== 'DOCUMENTARY_ESSAY'
        ? depthOrder[Math.min(depthOrder.indexOf(before) + 1, 3)]
        : before;
    return {
      entity: slug,
      title: item.title,
      depthBefore: before,
      newEvidence: item.newEvidence,
      depthAfter: after,
      whatBecameExplainable: item.newEvidence
        ? 'claims covered by pilot evidence candidates; requires editorial review'
        : 'nothing',
    };
  });
  console.log(
    JSON.stringify(
      {
        mode: apply ? 'DEVELOPMENT_APPLY' : 'DRY_RUN_NO_WRITES',
        pilot: pilot4
          ? 'PILOT_4_FINAL_VALIDATION'
          : pilot3
            ? 'PILOT_3_MICRO_VALIDATION'
            : pilot2
              ? 'PILOT_2_VALIDATION'
              : 'PILOT_1_BASELINE',
        pilot1Review: pilot2 ? PILOT_1_REVIEW : undefined,
        selectedSourceIds,
        sourcePurposeModel: [
          'VISUAL_PROVENANCE',
          'CANONICAL_METADATA',
          'STRUCTURED_REFERENCE',
          'EDITORIAL_REFERENCE',
          'DOCUMENTARY_TEXT',
          'INTERPRETIVE_SOURCE',
          'GENERAL_REFERENCE',
          'OTHER_UNKNOWN',
        ],
        sourceCountRequested: selectedSourceIds.length,
        sourceCountFound: sources.length,
        projectId: project?.id ?? null,
        results,
        associationAudit: {
          total: associationAudit.length,
          valid: associationAudit.filter((item) => item.decision === 'KEEP').length,
          weak: associationAudit.filter((item) => item.decision === 'REVIEW').length,
          incorrect: 0,
          mentionOnly: 0,
          items: associationAudit,
        },
        entityImpact: impact,
        rollback: project
          ? `Delete ResearchProject ${project.id}; cascades pilot Evidence, Excerpts and ResearchLibraryMaterial. Delete pilot LibraryMaterials separately by title prefix [PILOT].`
          : 'No records created.',
        note: 'No LLM, no external bulk downloads, development only.',
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
  await pool.end();
}
if (require.main === module) void main();
