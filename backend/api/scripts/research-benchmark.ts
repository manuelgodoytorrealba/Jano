import { ConfigService } from '@nestjs/config';
import {
  KnowledgeEntityKind,
  LibraryMaterialKind,
  LibraryMaterialVersionStatus,
  ResearchFindingProposalType,
  ResearchJobStatus,
  ResearchJobType,
  SourceType,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { AIProvider, type AIProviderPort } from '../src/ai/ai.provider';
import { PrismaService } from '../src/prisma/prisma.service';
import { ResearchAIService } from '../src/research/research-ai.service';
import {
  evaluateEntityProposals,
  type EntityProposal,
  type GoldEntity,
  isOwnedBenchmarkRun,
  type NegativeEntityCandidate,
  validateGoldDataset,
} from '../src/research-benchmark/research-benchmark.evaluator';

const FIXTURE_ROOT = resolve(__dirname, '../test/fixtures/research-benchmark');
const OUTPUT_ROOT = join(FIXTURE_ROOT, 'outputs');
const VALID_KINDS = Object.values(KnowledgeEntityKind);
const BENCHMARK_PREFIX = '[BENCHMARK]';

type DocumentMetadata = { id: string; file: string; genre: string; title: string };
type LoadedDataset = {
  version: string;
  documents: Array<DocumentMetadata & { content: string }>;
  entities: GoldEntity[];
  negatives: NegativeEntityCandidate[];
  relations: unknown[];
};
type BenchmarkManifest = {
  runId: string;
  datasetVersion: string;
  datasetHash: string;
  createdAt: string;
  commitSha: string;
  dirtyWorktree: boolean;
  worktreeDiffHash: string | null;
  provider: ReturnType<AIProvider['metadata']>;
  pipeline: Record<string, unknown>;
  records: {
    ownerId: string;
    projectId: string;
    jobId: string;
    sourceIds: string[];
    materialIds: string[];
    materialVersionIds: string[];
  };
  documents: Array<{
    id: string;
    contentHash: string;
    sourceId: string;
    materialId: string;
    materialVersionId: string;
  }>;
  aiExecutionIds: string[];
  proposalIds: string[];
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  error?: string;
  cleanedUpAt?: string;
};

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const percentage = (value: number | null) =>
  value === null ? '—' : `${(value * 100).toFixed(1)}%`;

async function loadDataset(): Promise<LoadedDataset> {
  const metadata = JSON.parse(
    await readFile(join(FIXTURE_ROOT, 'gold/document-metadata.json'), 'utf8'),
  ) as { datasetVersion: string; documents: DocumentMetadata[] };
  const entityGold = JSON.parse(
    await readFile(join(FIXTURE_ROOT, 'gold/entities.json'), 'utf8'),
  ) as { entities: GoldEntity[]; negativeEntityCandidates: NegativeEntityCandidate[] };
  const relationGold = JSON.parse(
    await readFile(join(FIXTURE_ROOT, 'gold/relations.json'), 'utf8'),
  ) as { relations: unknown[] };
  const documents = await Promise.all(
    metadata.documents.map(async (document) => ({
      ...document,
      content: await readFile(join(FIXTURE_ROOT, 'documents', document.file), 'utf8'),
    })),
  );
  return {
    version: metadata.datasetVersion,
    documents,
    entities: entityGold.entities,
    negatives: entityGold.negativeEntityCandidates,
    relations: relationGold.relations,
  };
}

async function validateDataset() {
  const dataset = await loadDataset();
  const errors = validateGoldDataset(dataset.documents, dataset.entities, VALID_KINDS);
  if (errors.length) throw new Error(`Invalid benchmark GOLD:\n${errors.join('\n')}`);
  return dataset;
}

function assertSafeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const url = new URL(databaseUrl);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (process.env.NODE_ENV === 'production' || !local || /prod/i.test(url.pathname)) {
    throw new Error('Research benchmark only runs against a local non-production database');
  }
}

async function pipelineSnapshot(provider: AIProvider, maxOutputTokens = 1_200) {
  const serviceSource = await readFile(
    resolve(__dirname, '../src/research/research-ai.service.ts'),
    'utf8',
  );
  const providerSource = await readFile(resolve(__dirname, '../src/ai/ai.provider.ts'), 'utf8');
  const constant = (name: string) => {
    const match = serviceSource.match(new RegExp(`const ${name} = ([0-9_]+|'[^']+')`));
    const value = match?.[1];
    if (!value) return null;
    return value.startsWith("'") ? value.slice(1, -1) : value.replaceAll('_', '');
  };
  const temperature = providerSource.match(/temperature:\s*([0-9.]+)/)?.[1] ?? null;
  const prompt = providerSource.match(/prompt:\s*\[([\s\S]*?)\]\.join\('\\n\\n'\)/)?.[1] ?? '';
  const outputSchema =
    serviceSource.match(/const EXTRACT_FINDINGS_OUTPUT_SCHEMA = ([\s\S]*?) as const;/)?.[1] ?? '';
  const outputContract = serviceSource.match(/outputContract:\s*\n?\s*'([^']+)'/)?.[1] ?? '';
  return {
    task: constant('EXTRACT_FINDINGS_TASK'),
    contractVersion: constant('EXTRACT_FINDINGS_SCHEMA_VERSION'),
    maxCorpusSegments: Number(constant('MAX_CORPUS_SEGMENTS')),
    maxSegmentChars: Number(constant('MAX_SEGMENT_CHARS')),
    evidenceBatchSize: Number(constant('EVIDENCE_BATCH_SIZE')),
    maxOutputTokens,
    entityOutputLimitPerBatch: 6,
    temperature: temperature === null ? null : Number(temperature),
    promptAndContractHash: hash(
      JSON.stringify({
        prompt,
        outputSchema,
        outputContract,
        task: constant('EXTRACT_FINDINGS_TASK'),
        contractVersion: constant('EXTRACT_FINDINGS_SCHEMA_VERSION'),
      }),
    ),
    providerImplementationHash: hash(providerSource),
    providerMetadata: provider.metadata(),
  };
}

function git(command: string[]) {
  return execFileSync('git', command, {
    cwd: resolve(__dirname, '../../..'),
    encoding: 'utf8',
  }).trim();
}

function runIdFromArgs(args: string[]) {
  const index = args.indexOf('--run-id');
  const requested = index >= 0 ? args[index + 1] : null;
  const generated = `baseline-${new Date().toISOString().replace(/[:.]/g, '-').toLowerCase()}`;
  const runId = requested ?? generated;
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(runId)) throw new Error('Invalid --run-id');
  return runId;
}

function maxOutputTokensFromArgs(args: string[]) {
  const index = args.indexOf('--max-output-tokens');
  if (index < 0) return 1_200;
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 1) throw new Error('Invalid --max-output-tokens');
  return value;
}

async function setupRun(prisma: PrismaService, dataset: LoadedDataset, runId: string) {
  const owner = await prisma.user.create({
    data: {
      email: `research-benchmark+${runId}@jano.invalid`,
      passwordHash: '!benchmark-account-cannot-login!',
      name: `${BENCHMARK_PREFIX} ${runId}`,
    },
    select: { id: true },
  });
  const project = await prisma.researchProject.create({
    data: {
      ownerId: owner.id,
      title: `${BENCHMARK_PREFIX} ${runId}`,
      objective: 'Medir detección, clasificación y síntesis de entidades sin conocimiento externo.',
      scope: `Dataset controlado ${dataset.version}; no es una investigación editorial real.`,
    },
    select: { id: true },
  });
  const records = [] as Array<{
    id: string;
    contentHash: string;
    sourceId: string;
    materialId: string;
    materialVersionId: string;
  }>;
  for (const document of dataset.documents) {
    const source = await prisma.source.create({
      data: {
        type: SourceType.ARTICLE,
        title: `${BENCHMARK_PREFIX} ${document.id}: ${document.title}`,
      },
      select: { id: true },
    });
    const material = await prisma.libraryMaterial.create({
      data: {
        sourceId: source.id,
        kind: LibraryMaterialKind.TEXT,
        title: `${BENCHMARK_PREFIX} ${document.id}: ${document.title}`,
        versions: {
          create: {
            version: 1,
            status: LibraryMaterialVersionStatus.READY,
            content: document.content,
            originalName: document.file,
            mimeType: 'text/plain',
            sizeBytes: Buffer.byteLength(document.content),
            contentHash: hash(document.content),
          },
        },
      },
      select: { id: true, versions: { select: { id: true } } },
    });
    await prisma.$transaction([
      prisma.researchProjectSource.create({ data: { projectId: project.id, sourceId: source.id } }),
      prisma.researchLibraryMaterial.create({
        data: { projectId: project.id, materialId: material.id },
      }),
    ]);
    records.push({
      id: document.id,
      contentHash: hash(document.content),
      sourceId: source.id,
      materialId: material.id,
      materialVersionId: material.versions[0].id,
    });
  }
  const job = await prisma.researchJob.create({
    data: {
      projectId: project.id,
      type: ResearchJobType.EXTRACT_FINDINGS,
      status: ResearchJobStatus.RUNNING,
      inputFingerprint: hash(`research-benchmark:${runId}`),
      attempts: 1,
      startedAt: new Date(),
    },
    select: { id: true },
  });
  return { ownerId: owner.id, projectId: project.id, jobId: job.id, documents: records };
}

async function collectRun(prisma: PrismaService, manifest: BenchmarkManifest) {
  const [executions, proposals, evidence] = await Promise.all([
    prisma.aIExecution.findMany({
      where: { jobId: manifest.records.jobId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.researchFindingProposal.findMany({
      where: { jobId: manifest.records.jobId },
      orderBy: { createdAt: 'asc' },
      include: { evidence: { include: { evidence: true } } },
    }),
    prisma.researchEvidence.findMany({
      where: { projectId: manifest.records.projectId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  const documentBySource = new Map(manifest.documents.map((item) => [item.sourceId, item.id]));
  const entityProposals: EntityProposal[] = proposals
    .filter((proposal) => proposal.type === ResearchFindingProposalType.ENTITY)
    .map((proposal) => ({
      id: proposal.id,
      aiExecutionId: proposal.aiExecutionId,
      title: proposal.title,
      entityKind: proposal.entityKind,
      summary: proposal.summary,
      documentIds: [
        ...new Set(
          proposal.evidence.map(
            (link) => documentBySource.get(link.evidence.sourceId) ?? 'unknown',
          ),
        ),
      ],
      evidence: proposal.evidence.map((link) => ({
        id: link.evidence.id,
        quote: link.evidence.quote,
        locator: link.evidence.locator,
        documentId: documentBySource.get(link.evidence.sourceId) ?? 'unknown',
      })),
    }));
  return { executions, proposals, entityProposals, evidence, documentBySource };
}

function coverageForDocuments(
  dataset: LoadedDataset,
  manifest: BenchmarkManifest,
  evidence: Array<{ sourceId: string }>,
  executions: Array<{ input: unknown; output: unknown; error: string | null }>,
  maxSegmentChars: number,
) {
  return dataset.documents.map((document) => {
    const record = manifest.documents.find((item) => item.id === document.id)!;
    const normalizedCharacters = document.content.replace(/\s+/g, ' ').trim().length;
    const segmentsRequired = Math.ceil(normalizedCharacters / maxSegmentChars);
    const segmentsPrepared = evidence.filter((item) => item.sourceId === record.sourceId).length;
    const batchesAttempted = executions.filter((execution) => {
      const input = execution.input as { evidence?: Array<{ sourceId?: string }> };
      return input.evidence?.some((item) => item.sourceId === record.sourceId);
    });
    const attemptedEvidence = batchesAttempted.flatMap((execution) => {
      const input = execution.input as { evidence?: Array<{ sourceId?: string }> };
      return input.evidence ?? [];
    });
    const successfulEvidence = batchesAttempted.flatMap((execution) => {
      if (execution.error || !execution.output) return [];
      const input = execution.input as { evidence?: Array<{ sourceId?: string }> };
      return input.evidence ?? [];
    });
    const segmentsAttempted = attemptedEvidence.filter(
      (item) => item.sourceId === record.sourceId,
    ).length;
    const segmentsProcessed = successfulEvidence.filter(
      (item) => item.sourceId === record.sourceId,
    ).length;
    return {
      documentId: document.id,
      characters: document.content.length,
      words: document.content.trim().split(/\s+/).length,
      normalizedCharacters,
      segmentsRequired,
      segmentsPrepared,
      segmentsAttempted,
      segmentsProcessed,
      batchesAttempted: batchesAttempted.length,
      batchesSucceeded: batchesAttempted.filter((execution) => !execution.error && execution.output)
        .length,
      coverage: segmentsRequired ? Math.min(1, segmentsProcessed / segmentsRequired) : 1,
      truncated: segmentsProcessed < segmentsRequired,
    };
  });
}

function reportMarkdown(
  manifest: BenchmarkManifest,
  metrics: ReturnType<typeof evaluateEntityProposals>['metrics'],
  evaluations: ReturnType<typeof evaluateEntityProposals>['evaluations'],
  coverage: ReturnType<typeof coverageForDocuments>,
  dataset: LoadedDataset,
) {
  const lines = [
    `# Research Entity Extraction Benchmark — ${manifest.runId}`,
    '',
    '> Los scores de summary son heurísticas léxicas reproducibles y requieren revisión humana; no son una evaluación semántica perfecta.',
    '',
    '## Freeze',
    '',
    `- Commit: \`${manifest.commitSha}\`${manifest.dirtyWorktree ? ' (worktree dirty)' : ''}`,
    `- Provider/model: ${manifest.provider.provider} / ${manifest.provider.model}`,
    `- Dataset: ${manifest.datasetVersion}`,
    `- Run status: ${manifest.status}${manifest.error ? ` — ${manifest.error}` : ''}`,
    `- Pipeline: \`${JSON.stringify(manifest.pipeline)}\``,
    '',
    '## Global metrics',
    '',
    `- Documents: ${dataset.documents.length}`,
    `- GOLD identities expected: ${metrics.expectedGoldIdentities}`,
    ...(manifest.status === 'SUCCEEDED'
      ? [
          `- Raw ENTITY proposals: ${metrics.rawEntityProposals}`,
          `- Detected GOLD identities: ${metrics.detectedGoldIdentities}`,
          `- Precision: ${percentage(metrics.precision)}`,
          `- Recall: ${percentage(metrics.recall)}`,
          `- F1: ${percentage(metrics.f1)}`,
          `- Central recall: ${percentage(metrics.recallByRelevance.CENTRAL.recall)}`,
          `- Kind accuracy: ${percentage(metrics.kindAccuracy)}`,
          `- Duplicate proposals: ${metrics.duplicateProposals} (${percentage(metrics.duplicateRatio)})`,
          `- False/unmatched entities: ${metrics.falseEntities}`,
          `- Draft score average (heuristic): ${metrics.summary.overallDraftAverage?.toFixed(2) ?? '—'}/5`,
          `- Forbidden fact hits (literal): ${metrics.summary.forbiddenFactHits}`,
        ]
      : [
          '- Quality metrics: **INVALID — the pipeline did not complete.** Partial outputs remain available for diagnosis.',
        ]),
    '',
    '## Per document',
    '',
  ];
  for (const document of dataset.documents) {
    const expected = dataset.entities.filter(
      (entity) => entity.documentId === document.id && entity.shouldExtract,
    );
    const documentEvaluations = evaluations.filter((item) =>
      item.documentIds.includes(document.id),
    );
    const detected = new Set(
      documentEvaluations.flatMap((item) => (item.goldId ? [item.goldId] : [])),
    );
    const central = expected.filter((entity) => entity.relevance === 'CENTRAL');
    const documentCoverage = coverage.find((item) => item.documentId === document.id)!;
    lines.push(
      `### ${document.id} — ${document.title}`,
      '',
      `- GOLD: ${expected.length}; central: ${central.length}`,
      `- Raw proposals: ${documentEvaluations.length}; matched identities: ${detected.size}`,
      `- False/unmatched: ${documentEvaluations.filter((item) => !item.goldId).length}; duplicates: ${documentEvaluations.filter((item) => item.duplicate).length}`,
      `- Central recall: ${documentCoverage.coverage === 1 && central.length ? `${central.filter((entity) => detected.has(entity.goldId)).length}/${central.length}` : 'not valid (document not processed completely)'}`,
      `- Coverage: ${percentage(documentCoverage.coverage)} (${documentCoverage.segmentsProcessed}/${documentCoverage.segmentsRequired} segmentos)`,
      '',
    );
  }
  const ranked = evaluations
    .filter((item) => item.goldId)
    .sort((a, b) => b.summaryEvaluation.overallDraftScore - a.summaryEvaluation.overallDraftScore);
  const sample = (title: string, items: typeof ranked) => {
    lines.push(`## ${title}`, '');
    for (const item of items) {
      lines.push(
        `### ${item.title}`,
        '',
        `- GOLD: ${item.goldId}; kind: ${item.kind} (${item.kindCorrect ? 'correcto' : `esperado ${item.goldKind}`})`,
        `- Score: ${item.summaryEvaluation.overallDraftScore}/5; contexto: ${item.summaryEvaluation.contextStatus}`,
        `- Summary: ${item.summary ?? '—'}`,
        `- Forbidden hits: ${item.summaryEvaluation.forbiddenHits.join('; ') || 'ninguno'}`,
        '',
      );
    }
  };
  sample('Five strongest drafts (heuristic)', ranked.slice(0, 5));
  sample('Five weakest drafts (heuristic)', ranked.slice(-5).reverse());
  return lines.join('\n') + '\n';
}

async function exportRunArtifacts(
  prisma: PrismaService,
  manifest: BenchmarkManifest,
  dataset: LoadedDataset,
  outputDirectory: string,
) {
  const collected = await collectRun(prisma, manifest);
  manifest.aiExecutionIds = collected.executions.map((item) => item.id);
  manifest.proposalIds = collected.proposals.map((item) => item.id);
  const evaluation = evaluateEntityProposals(
    collected.entityProposals,
    dataset.entities,
    dataset.negatives,
    dataset.documents,
  );
  const coverage = coverageForDocuments(
    dataset,
    manifest,
    collected.evidence,
    collected.executions,
    Number(manifest.pipeline.maxSegmentChars),
  );
  await Promise.all([
    writeFile(join(outputDirectory, 'ai-executions.json'), json(collected.executions)),
    writeFile(join(outputDirectory, 'raw-proposals.json'), json(collected.proposals)),
    writeFile(join(outputDirectory, 'entity-proposals.json'), json(collected.entityProposals)),
    writeFile(join(outputDirectory, 'gold-comparison.json'), json(evaluation.evaluations)),
    writeFile(
      join(outputDirectory, 'metrics.json'),
      json({
        runStatus: manifest.status,
        qualityMetricsValid: manifest.status === 'SUCCEEDED',
        qualityMetrics: manifest.status === 'SUCCEEDED' ? evaluation.metrics : null,
        partialMetrics: evaluation.metrics,
        coverage,
      }),
    ),
    writeFile(
      join(outputDirectory, 'report.md'),
      reportMarkdown(manifest, evaluation.metrics, evaluation.evaluations, coverage, dataset),
    ),
  ]);
  return collected;
}

async function exportFailureArtifacts(
  provider: AIProvider,
  error: unknown,
  executions: Array<{
    id: string;
    provider: string;
    model: string;
    input: unknown;
    error: string | null;
  }>,
  outputDirectory: string,
) {
  const diagnostics = [...provider.getStructuredOutputDiagnostics()];
  const rawDirectory = join(outputDirectory, 'raw-attempts');
  if (diagnostics.some((item) => item.rawResponse !== null))
    await mkdir(rawDirectory, { recursive: true });
  const attempts = [] as Array<Record<string, unknown>>;
  for (const diagnostic of diagnostics) {
    const execution = executions.find((item) => {
      const input = item.input as { batch?: { current?: number } };
      return input.batch?.current === diagnostic.batch?.current;
    });
    const rawOutputLocation =
      diagnostic.rawResponse === null
        ? null
        : `raw-attempts/${execution?.id ?? 'unattributed'}-attempt-${diagnostic.attempt}.txt`;
    if (rawOutputLocation && diagnostic.rawResponse !== null) {
      await writeFile(join(outputDirectory, rawOutputLocation), diagnostic.rawResponse);
    }
    const previous = diagnostics.find(
      (item) =>
        item.batch?.current === diagnostic.batch?.current &&
        item.attempt === diagnostic.attempt - 1,
    );
    attempts.push({
      aiExecutionId: execution?.id ?? null,
      batch: diagnostic.batch,
      attempt: diagnostic.attempt,
      provider: execution?.provider ?? provider.metadata().provider,
      model: execution?.model ?? provider.metadata().model,
      category: diagnostic.category,
      rawLength: diagnostic.rawLength,
      approximateTokens: diagnostic.approximateTokens,
      rawSha256: diagnostic.rawSha256,
      sameAsPreviousAttempt:
        previous?.rawSha256 !== null && previous?.rawSha256 === diagnostic.rawSha256,
      finishReason: diagnostic.responseMetadata.doneReason,
      emptyResponse: diagnostic.rawLength === 0,
      appearsTruncated: diagnostic.appearsAbruptlyTerminated,
      containsJsonObject: diagnostic.containsJsonObject,
      containsJsonArray: diagnostic.containsJsonArray,
      containsMarkdownFence: diagnostic.containsMarkdownFence,
      containsWrapperText: diagnostic.containsWrapperText,
      strictJsonValid: diagnostic.strictJsonValid,
      acceptedByCurrentParser: diagnostic.acceptedByCurrentParser,
      parserError: diagnostic.parserError,
      parserErrorPosition: diagnostic.parserErrorPosition,
      unclosedObjectCount: diagnostic.unclosedObjectCount,
      unclosedArrayCount: diagnostic.unclosedArrayCount,
      validationErrors: diagnostic.schemaValidationErrors,
      responseMetadata: diagnostic.responseMetadata,
      rawStart: diagnostic.rawStart,
      rawEnd: diagnostic.rawEnd,
      rawOutputLocation,
      executionError: execution
        ? execution.error
        : error instanceof Error
          ? error.message
          : String(error),
    });
  }
  await writeFile(join(outputDirectory, 'ai-attempts.json'), json(attempts));
  const failures = attempts.filter((attempt) => {
    const batch = attempt.batch as { current?: number } | null;
    const execution = executions.find((item) => {
      const input = item.input as { batch?: { current?: number } };
      return input.batch?.current === batch?.current;
    });
    return attempt.category !== null || Boolean(execution?.error);
  });
  for (const failure of failures) {
    if (failure.category === null) failure.category = 'VALID_JSON_SCHEMA_MISMATCH';
  }
  if (!failures.length && error) {
    const execution = executions.find((item) => item.error) ?? executions.at(-1);
    failures.push({
      aiExecutionId: execution?.id ?? null,
      batch: (execution?.input as { batch?: unknown } | undefined)?.batch ?? null,
      attempt: null,
      provider: execution?.provider ?? provider.metadata().provider,
      model: execution?.model ?? provider.metadata().model,
      category: 'UNKNOWN_STRUCTURED_OUTPUT_ERROR',
      rawOutputLocation: null,
      executionError: execution?.error ?? (error instanceof Error ? error.message : String(error)),
    });
  }
  await writeFile(join(outputDirectory, 'failures.json'), json(failures));
}

async function cleanup(prisma: PrismaService, manifest: BenchmarkManifest) {
  const project = await prisma.researchProject.findUnique({
    where: { id: manifest.records.projectId },
    select: { title: true, owner: { select: { email: true } } },
  });
  if (!project) return;
  if (!isOwnedBenchmarkRun(project.title, project.owner.email, manifest.runId)) {
    throw new Error('Cleanup refused: records are not owned by this benchmark run');
  }
  await prisma.researchProject.delete({ where: { id: manifest.records.projectId } });
  await prisma.libraryMaterial.deleteMany({ where: { id: { in: manifest.records.materialIds } } });
  await prisma.source.deleteMany({ where: { id: { in: manifest.records.sourceIds } } });
  await prisma.user.delete({ where: { id: manifest.records.ownerId } });
}

async function runBenchmark(args: string[]) {
  assertSafeDatabase();
  const dataset = await validateDataset();
  const runId = runIdFromArgs(args);
  const maxOutputTokens = maxOutputTokensFromArgs(args);
  const outputDirectory = join(OUTPUT_ROOT, runId);
  await mkdir(outputDirectory, { recursive: false });
  const config = new ConfigService();
  const provider = new AIProvider(config);
  if (!provider.isAvailable()) throw new Error('AI provider is not available');
  const prisma = new PrismaService();
  let manifest: BenchmarkManifest | null = null;
  const keep = args.includes('--keep');
  try {
    const setup = await setupRun(prisma, dataset, runId);
    const status = git(['status', '--porcelain']);
    const diff = status ? git(['diff', '--binary', 'HEAD']) : '';
    const activeManifest: BenchmarkManifest = {
      runId,
      datasetVersion: dataset.version,
      datasetHash: hash(
        JSON.stringify({
          documents: dataset.documents.map((document) => [document.id, hash(document.content)]),
          entities: dataset.entities,
          negatives: dataset.negatives,
          relations: dataset.relations,
        }),
      ),
      createdAt: new Date().toISOString(),
      commitSha: git(['rev-parse', 'HEAD']),
      dirtyWorktree: Boolean(status),
      worktreeDiffHash: diff ? hash(diff) : null,
      provider: provider.metadata(),
      pipeline: await pipelineSnapshot(provider, maxOutputTokens),
      records: {
        ownerId: setup.ownerId,
        projectId: setup.projectId,
        jobId: setup.jobId,
        sourceIds: setup.documents.map((item) => item.sourceId),
        materialIds: setup.documents.map((item) => item.materialId),
        materialVersionIds: setup.documents.map((item) => item.materialVersionId),
      },
      documents: setup.documents,
      aiExecutionIds: [],
      proposalIds: [],
      status: 'RUNNING',
    };
    manifest = activeManifest;
    await writeFile(join(outputDirectory, 'manifest.json'), json(activeManifest));
    const extractionProvider: AIProviderPort =
      maxOutputTokens === 1_200
        ? provider
        : {
            metadata: () => provider.metadata(),
            isAvailable: () => provider.isAvailable(),
            runStructured: (request) => provider.runStructured({ ...request, maxOutputTokens }),
            getStructuredOutputDiagnostics: () => provider.getStructuredOutputDiagnostics(),
          };
    const researchAI = new ResearchAIService(prisma, extractionProvider);
    await researchAI.extractFindings({
      id: setup.jobId,
      projectId: setup.projectId,
      sourceId: null,
    });
    await prisma.researchJob.update({
      where: { id: setup.jobId },
      data: { status: ResearchJobStatus.SUCCEEDED, finishedAt: new Date() },
    });
    activeManifest.status = 'SUCCEEDED';
    const collected = await exportRunArtifacts(prisma, activeManifest, dataset, outputDirectory);
    await exportFailureArtifacts(provider, null, collected.executions, outputDirectory);
  } catch (error) {
    if (manifest) {
      manifest.status = 'FAILED';
      manifest.error = error instanceof Error ? error.message : String(error);
      await prisma.researchJob.update({
        where: { id: manifest.records.jobId },
        data: {
          status: ResearchJobStatus.FAILED,
          finishedAt: new Date(),
          lastError: manifest.error,
        },
      });
      const collected = await exportRunArtifacts(prisma, manifest, dataset, outputDirectory);
      await exportFailureArtifacts(provider, error, collected.executions, outputDirectory);
    }
    throw error;
  } finally {
    if (manifest) {
      if (!keep) {
        await cleanup(prisma, manifest);
        manifest.cleanedUpAt = new Date().toISOString();
      }
      await writeFile(join(outputDirectory, 'manifest.json'), json(manifest));
    }
    await prisma.onModuleDestroy();
  }
  process.stdout.write(`${join('test/fixtures/research-benchmark/outputs', runId)}\n`);
}

async function cleanupCommand(path: string | undefined) {
  if (!path) throw new Error('Provide the run directory or manifest path');
  assertSafeDatabase();
  const manifestPath = basename(path) === 'manifest.json' ? path : join(path, 'manifest.json');
  const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8')) as BenchmarkManifest;
  const prisma = new PrismaService();
  try {
    await cleanup(prisma, manifest);
    manifest.cleanedUpAt = new Date().toISOString();
    await writeFile(resolve(manifestPath), json(manifest));
  } finally {
    await prisma.onModuleDestroy();
  }
}

async function main() {
  const [command = 'run', ...args] = process.argv.slice(2);
  if (command === 'validate') {
    const dataset = await validateDataset();
    process.stdout.write(
      `${dataset.documents.length} documents, ${dataset.entities.length} GOLD entities, ${dataset.negatives.length} negatives\n`,
    );
    return;
  }
  if (command === 'cleanup') return cleanupCommand(args[0]);
  if (command !== 'run') throw new Error(`Unknown command: ${command}`);
  await runBenchmark(args);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
