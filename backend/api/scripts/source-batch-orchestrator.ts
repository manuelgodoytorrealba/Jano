import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, LibraryMaterialKind, LibraryMaterialVersionStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { AIProvider } from '../src/ai/ai.provider';
import { LibraryMaterialPreparationService } from '../src/library/library-material-preparation.service';
import {
  AIProviderSemanticEvidenceModel,
  HybridSemanticEvidenceClassifier,
} from '../src/research/hybrid-semantic-evidence-classifier';
import { STRUCTURED_REFERENCE_PURPOSE } from '../src/research/semantic-evidence-classifier';

const DEFAULT_IDS = [
  'cmt4l61eo0004q6fpw5gh0s41',
  'cmt4l3a4a0000zufptarsa0c2',
  'cmt4jjx1b000qtofp5gi588uz',
  'cmt4jjx14000mtofpcqfisfaz',
  'cmt4kq9kr00025xfp39ehkn8s',
  'cmt4khppv00008mfp8q1ajstj',
  'cmt4l61ee0000q6fpgzluop1q',
  'cmt4l4p2y0000tbfpfj9g6pi4',
  'cmt4jjx1r000xtofpryc5cvs0',
  'cmt4l0fiz0000dyfpp2rzqau2',
];
const manifestPath = process.argv.find((a) => a.startsWith('--manifest='))?.split('=')[1];
const batchId = process.env.BATCH_ID ?? 'source-batch';
const outputPath = resolve(
  process.cwd(),
  process.env.BATCH_OUTPUT ?? `../../artifacts/${batchId}.json`,
);

function localDatabase(url: string) {
  const parsed = new URL(url);
  const host = parsed.hostname;
  return ['localhost', '127.0.0.1', 'db', '::1'].includes(host) || host.endsWith('.local');
}
function purpose(title: string) {
  return /thesaurus|authority|vocabulary/i.test(title)
    ? STRUCTURED_REFERENCE_PURPOSE
    : 'DOCUMENTARY_TEXT';
}
function paragraphs(text: string) {
  return text
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ])/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 80)
    .slice(0, 12);
}
function acquisitionState(status: string, reason?: string | null) {
  if (status === 'ALREADY_PREPARED') return 'ALREADY_ACQUIRED';
  if (status === 'PREPARED') return 'ACQUIRED';
  if (/429/.test(reason ?? '')) return 'HTTP_429';
  if (/403/.test(reason ?? '')) return 'HTTP_403';
  if (/404/.test(reason ?? '')) return 'HTTP_404';
  if (/fetch failed|network/i.test(reason ?? '')) return 'NETWORK_FAILURE';
  if (status === 'PREPARED_EMPTY') return 'PREPARED_EMPTY';
  return 'EXTRACTION_FAILURE';
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !localDatabase(url))
    throw new Error('DATABASE_SAFETY_BLOCK: DATABASE_URL is not local');
  const parsed = new URL(url);
  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const beforeUrl = process.env.DATABASE_URL;
  const ids = manifestPath ? JSON.parse(readFileSync(manifestPath, 'utf8')).sourceIds : DEFAULT_IDS;
  const sources = await prisma.source.findMany({
    where: { id: { in: ids } },
    include: {
      refs: { include: { entity: true } },
      libraryMaterials: { include: { versions: true } },
    },
  });
  if (sources.length !== ids.length)
    throw new Error(`SOURCE_MANIFEST_INVALID: expected ${ids.length}, found ${sources.length}`);
  const config = new ConfigService(process.env as Record<string, unknown>);
  const provider = new AIProvider(config);
  const classifier = new HybridSemanticEvidenceClassifier(
    new AIProviderSemanticEvidenceModel(provider),
  );
  const preparation = new LibraryMaterialPreparationService(prisma as never);
  const rows: any[] = [];
  for (const source of sources) {
    const row: any = {
      source: { id: source.id, title: source.title, type: source.type, url: source.url },
      purpose: purpose(source.title),
      status: 'FAILED',
      materials: [],
      excerpts: [],
      classifications: [],
      materialCreated: false,
      versionCreated: false,
    };
    try {
      if (process.env.DATABASE_URL !== beforeUrl) throw new Error('DATABASE_URL_CHANGED');
      const kind = /\.pdf$/i.test(source.url ?? '')
        ? LibraryMaterialKind.PDF
        : LibraryMaterialKind.URL;
      let material = source.libraryMaterials.find(
        (m) =>
          m.kind === kind &&
          m.versions.some(
            (candidate) =>
              candidate.status === LibraryMaterialVersionStatus.READY && candidate.content?.trim(),
          ),
      );
      material ??= source.libraryMaterials.find(
        (m) => m.kind === kind && m.title === `[BATCH] ${source.title}`,
      );
      if (!material) {
        material = await prisma.libraryMaterial.create({
          data: { sourceId: source.id, kind, title: `[BATCH] ${source.title}` },
          include: { versions: true },
        });
        row.materialCreated = true;
      }
      let version = material.versions.find((v) => v.url === source.url);
      if (!version) {
        version = await prisma.libraryMaterialVersion.create({
          data: {
            materialId: material.id,
            version: Math.max(0, ...material.versions.map((v) => v.version)) + 1,
            url: source.url,
            status: LibraryMaterialVersionStatus.PENDING_PREPARATION,
          },
        });
        row.versionCreated = true;
      }
      if (version.status !== LibraryMaterialVersionStatus.READY) {
        await preparation.prepare(version.id);
        version = await prisma.libraryMaterialVersion.findUniqueOrThrow({
          where: { id: version.id },
        });
      }
      const texts = paragraphs(version.content ?? '');
      if (!texts.length) {
        row.status = 'PREPARED_EMPTY';
        row.acquisitionState = 'PREPARED_EMPTY';
        row.materialId = material.id;
        row.versionId = version.id;
        row.acquisitionState = 'PREPARED_EMPTY';
        rows.push(row);
        continue;
      }
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const excerpt = await prisma.libraryExcerpt.upsert({
          where: {
            materialVersionId_fingerprint: {
              materialVersionId: version.id,
              fingerprint: `${version.id}:${i + 1}`,
            },
          },
          create: {
            materialVersionId: version.id,
            locator: `paragraph-${i + 1}`,
            text,
            fingerprint: `${version.id}:${i + 1}`,
          },
          update: { text, locator: `paragraph-${i + 1}` },
        });
        row.excerpts.push(excerpt.id);
        if (row.purpose === STRUCTURED_REFERENCE_PURPOSE) {
          row.structuredRouted = true;
          continue;
        }
        for (const ref of source.refs) {
          const result = await classifier.classify(
            {
              excerpt: text,
              sourcePurpose: row.purpose,
              source: { id: source.id, title: source.title, locator: excerpt.locator },
              candidateEntity: {
                id: ref.entity.id,
                canonicalName: ref.entity.title,
                type: ref.entity.type,
              },
            },
            'HYBRID',
          );
          row.classifications.push({
            excerptId: excerpt.id,
            entity: { id: ref.entity.id, title: ref.entity.title },
            result,
          });
        }
      }
      row.status = row.materialCreated || row.versionCreated ? 'PREPARED' : 'ALREADY_PREPARED';
      row.materialId = material.id;
      row.versionId = version.id;
      row.acquisitionState = acquisitionState(row.status);
    } catch (error) {
      row.failureReason = error instanceof Error ? error.message : String(error);
      row.acquisitionState = acquisitionState(row.status, row.failureReason);
    }
    rows.push(row);
  }
  const artifact = {
    batchId,
    workingDatabase: { host: parsed.hostname, name: parsed.pathname.slice(1) },
    classifierVersion: 'semantic-evidence-v3',
    model: provider.metadata().model,
    sourceIds: ids,
    rows,
    metrics: {
      sourcesAttempted: rows.length,
      sourcesPrepared: rows.filter((r) => ['PREPARED', 'ALREADY_PREPARED'].includes(r.status))
        .length,
      sourcesFailed: rows.filter((r) => r.status === 'FAILED').length,
      materialsCreated: rows.filter((r) => r.materialCreated).length,
      versionsCreated: rows.filter((r) => r.versionCreated).length,
      excerptsCreated: rows.reduce((n, r) => n + r.excerpts.length, 0),
      semanticClassifications: rows.reduce((n, r) => n + r.classifications.length, 0),
      documentarySourcesEffective: rows.filter(
        (r) => r.purpose !== STRUCTURED_REFERENCE_PURPOSE && r.excerpts.length,
      ).length,
      structuredSources: rows.filter((r) => r.purpose === STRUCTURED_REFERENCE_PURPOSE).length,
      structuredExcerpts: rows
        .filter((r) => r.purpose === STRUCTURED_REFERENCE_PURPOSE)
        .reduce((n, r) => n + r.excerpts.length, 0),
      structuredRouted: rows
        .filter((r) => r.structuredRouted)
        .reduce((n, r) => n + r.excerpts.length, 0),
      editorialClassifications: rows.reduce((n, r) => n + r.classifications.length, 0),
      safeKeep: rows.reduce(
        (n, r) =>
          n +
          r.classifications.filter(
            (c: any) => c.result.compositionSource === 'DETERMINISTIC_SAFE_KEEP',
          ).length,
        0,
      ),
      modelReview: rows.reduce(
        (n, r) =>
          n + r.classifications.filter((c: any) => c.result.reviewKind === 'MODEL_REVIEW').length,
        0,
      ),
      systemReview: rows.reduce(
        (n, r) =>
          n +
          r.classifications.filter((c: any) => c.result.reviewKind === 'SYSTEM_FAILSAFE_REVIEW')
            .length,
        0,
      ),
      reject: rows.reduce(
        (n, r) => n + r.classifications.filter((c: any) => c.result.decision === 'REJECT').length,
        0,
      ),
      noPromotion: true,
    },
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
  };
  mkdirSync(resolve(process.cwd(), '../../artifacts'), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(artifact, null, 2), { mode: 0o600 });
  console.log(
    JSON.stringify({ outputPath, ...artifact.metrics, database: artifact.workingDatabase }),
  );
  await prisma.$disconnect();
  await pool.end();
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
