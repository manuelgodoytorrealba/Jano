/** Read-only Wave 002 replay: no AI imports, Evidence writes or canonical mutations. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  SourceAcquisition,
  acquisitionMetrics,
  validateDownloadedDocument,
} from '../src/library/source-acquisition';
import { AcquisitionCandidate, contentRoute } from '../src/library/source-acquisition-policy';
import { textFromHtml } from '../src/library/library-material-preparation.service';
import {
  JsonCheckpointStore,
  KnowledgeBatchOrchestrator,
} from '../src/knowledge/knowledge-batch-orchestrator';

async function main() {
  const input = resolve(process.argv[2]),
    output = resolve(process.argv[3]);
  mkdirSync(output, { recursive: true });
  const state = JSON.parse(readFileSync(input, 'utf8'));
  const rows = Object.values(state.rows) as any[];
  if (rows.length !== 134) throw new Error('Expected original 134-source checkpoint');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const acq = new SourceAcquisition(join(output, 'access-cache'));
  const counts = async () => ({
    entities: await db.entity.count(),
    relations: await db.relation.count(),
    assertions: await db.canonicalAssertion.count(),
    evidence: await db.researchEvidence.count(),
    proposals: await db.researchFindingProposal.count(),
    materials: await db.libraryMaterial.count(),
    versions: await db.libraryMaterialVersion.count(),
  });
  try {
    const before = await counts();
    const alternatives: Record<string, AcquisitionCandidate['alternatives']> = {
      'https://smarthistory.org/roman-copies-of-ancient-greek-art/': [
        {
          url: 'https://www.getty.edu/news/connecting-the-provenance-of-antiquities-collections/',
          title: 'Connecting the Provenance of Antiquities Collections',
          publisher: 'Getty',
          strategy: 'OFFICIAL_ALTERNATE',
          basis:
            'Getty institutional essay explicitly discusses Roman copies of Praxiteles; distinct, narrower documentary replacement.',
          documentaryQuality: 90,
          targetRelevance: 80,
        },
      ],
      'https://smarthistory.org/greek_intro/': [
        {
          url: 'https://www.getty.edu/publications/resources/virtuallibrary/0892364211.pdf',
          title: 'Masterpieces of the J. Paul Getty Museum — Antiquities',
          publisher: 'Getty',
          strategy: 'OFFICIAL_PDF',
          basis:
            'Getty official public scholarly catalogue; ancient Greek and Roman art. Distinct publication, not the original essay.',
          documentaryQuality: 95,
          targetRelevance: 85,
        },
      ],
      'https://smarthistory.org/benin-bronzes-theft-artistry/': [
        {
          url: 'https://resources.metmuseum.org/resources/metpublications/pdf/The_Metropolitan_Museum_of_Art_Bulletin_v_27_no_9_May_1969.pdf',
          title: 'The Metropolitan Museum of Art Bulletin, May 1969',
          publisher: 'The Metropolitan Museum of Art',
          strategy: 'OFFICIAL_PDF',
          basis:
            'Official publication with Benin artistic tradition discussion; partial research-need coverage, not equivalent provenance or restitution account.',
          documentaryQuality: 90,
          targetRelevance: 75,
        },
      ],
    };
    const results: any[] = existsSync(join(output, 'rows.json'))
      ? JSON.parse(readFileSync(join(output, 'rows.json'), 'utf8'))
      : [];
    const orchestrator = new KnowledgeBatchOrchestrator(
      new JsonCheckpointStore(join(output, 'orchestrator.json')),
      async (key, stage) => {
        const row = rows.find((r) => r.url === key)!;
        if (stage === 'SOURCE_SELECTION') return;
        if (stage === 'ACQUISITION') {
          const candidate: AcquisitionCandidate = {
            url: row.url,
            title: row.title,
            documentaryQuality: 85,
            targetRelevance: 85,
            qualityClass: /publication|catalogue/i.test(row.sourceClass)
              ? 'DENSE_PUBLICATION'
              : 'DOCUMENTARY',
            alternatives: alternatives[row.url],
          };
          const outcome = await acq.resolve(
            candidate,
            'wave002-acquisition-benchmark',
            async (access, source) => {
              const route = contentRoute(access.mime),
                bytes = acq.body(access);
              const content =
                route === 'PDF'
                  ? execFileSync('pdftotext', ['-enc', 'UTF-8', access.bodyPath!, '-'], {
                      timeout: 30000,
                      maxBuffer: 20 * 1024 * 1024,
                    }).toString()
                  : route === 'HTML'
                    ? textFromHtml(bytes.toString())
                    : route === 'JSON'
                      ? JSON.stringify(JSON.parse(bytes.toString()))
                      : bytes.toString();
              if (content.trim().length < 160)
                throw new Error(
                  'LOW_YIELD: fewer than 160 readable characters; no semantic effectiveness inferred',
                );
              return {
                preparedCapable: true,
                characters: content.length,
                sourceUrl: source.url,
                route,
                documentHash: access.documentHash,
              };
            },
            async () => {
              const v = await db.libraryMaterialVersion.findUnique({
                where: { id: row.versionId },
                select: { id: true, status: true, content: true },
              });
              return v?.status === 'READY' && v.content?.trim()
                ? {
                    versionId: v.id,
                    preparedCapable: true,
                    route: 'CACHED_DOCUMENT',
                    characters: v.content.length,
                  }
                : null;
            },
          );
          results.push({
            url: row.url,
            oldPrepared: !!row.prepared,
            oldResult: row.error ?? row.status,
            alternativeCandidates: alternatives[row.url] ?? [],
            outcome,
          });
          writeFileSync(join(output, 'rows.json'), JSON.stringify(results, null, 2));
          return;
        }
        if (stage === 'PREPARATION') return;
        throw new Error(
          'HUMAN_REVIEW_REQUIRED: acquisition-only benchmark; semantic stages prohibited',
        );
      },
      0,
    );
    await orchestrator.run(rows.map((r) => r.url));
    // Successful acquisition stages are skipped by the existing orchestrator on resume.
    const saved = JSON.parse(readFileSync(join(output, 'rows.json'), 'utf8'));
    const all = new Map(saved.map((r: any) => [r.url, r]));
    for (const r of results) all.set(r.url, r);
    const final = [...all.values()] as any[];
    // Revalidate cached acquisition bytes after a preparation-quality correction; no network or semantic calls.
    for (const row of final) {
      if (!row.outcome.cached && row.outcome.prepared && row.outcome.access?.bodyPath) {
        try {
          validateDownloadedDocument(acq.body(row.outcome.access), row.outcome.access.mime);
        } catch (error) {
          row.outcome.prepared = undefined;
          row.outcome.terminal = row.alternativeCandidates.length ? 'MANUAL_ONLY' : 'FAILED';
          row.outcome.error = (error as Error).message;
          row.outcome.access.state = 'MANUAL_ONLY';
          acq.write(`outcome:wave002-acquisition-benchmark:${row.url}`, row.outcome);
        }
      }
    }
    if (process.argv[4]) {
      const prior = JSON.parse(readFileSync(resolve(process.argv[4]), 'utf8')).rows as Array<{
        url: string;
        effective: boolean;
      }>;
      for (const row of final) {
        const old = prior.find((p) => p.url === row.url);
        if (row.outcome.cached && old) {
          row.outcome.effective = old.effective;
          acq.recordEffective('wave002-acquisition-benchmark', row.url, old.effective);
        }
      }
    }
    writeFileSync(join(output, 'rows.json'), JSON.stringify(final, null, 2));
    const after = await counts();
    if (JSON.stringify(before) !== JSON.stringify(after))
      throw new Error('NON_CANONICAL_BENCHMARK_INVARIANT_FAILED');
    const report = {
      wave002Sources: 134,
      oldAccessible: 36,
      oldPreparedCapable: 36,
      v2Accessible: final.filter(
        (r) => r.outcome.cached || r.outcome.access?.state.startsWith('ACCESSIBLE'),
      ).length,
      v2PreparedCapable: final.filter((r) => r.outcome.prepared).length,
      alternativesFound: final.filter((r) => r.alternativeCandidates.length).length,
      alternativesUsable: final.filter((r) => r.outcome.terminal === 'ALTERNATIVE_USED').length,
      blockedRemaining: final.filter((r) => r.outcome.terminal === 'MANUAL_ONLY').length,
      rateLimitedRemaining: final.filter((r) => r.outcome.terminal === 'RATE_LIMITED_EXHAUSTED')
        .length,
      otherFailures: final.filter((r) => r.outcome.terminal === 'FAILED').length,
      rows: final,
      domains: acq.profiles(),
      acquisitionMetrics: acquisitionMetrics(final.map((r) => r.outcome)),
      before,
      after,
      semanticCalls: 0,
      knowledgeYieldRate: null,
      limitation:
        'Prepared-capable means existing READY text or bounded extraction succeeded. No semantic effectiveness is inferred. Old accessible means evidenced successful acquisition, not a historical HEAD census.',
    };
    writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, rows: undefined, domains: undefined }));
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
