import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  JsonCheckpointStore,
  KnowledgeBatchOrchestrator,
} from '../src/knowledge/knowledge-batch-orchestrator';

const localHost = (url: string) =>
  ['localhost', '127.0.0.1', '::1', 'db'].includes(new URL(url).hostname);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !localHost(databaseUrl) || new URL(databaseUrl).pathname !== '/jano')
    throw new Error('DATABASE_SAFETY_BLOCK: expected local jano');
  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const sources = await prisma.source.findMany({
    take: 100,
    orderBy: { id: 'asc' },
    select: { id: true },
  });
  if (sources.length < 100) throw new Error(`BATCH_100_UNAVAILABLE:${sources.length}`);
  const checkpointPath =
    process.env.CHECKPOINT_PATH ?? '/tmp/jano-scale-ready-5000-batch-100-checkpoint.json';
  const store = new JsonCheckpointStore(checkpointPath);
  const stageCalls: string[] = [];
  const orchestrator = new KnowledgeBatchOrchestrator(store, async (sourceId, stage) => {
    stageCalls.push(`${sourceId}:${stage}`);
  });
  const first = await orchestrator.run(sources.map((source) => source.id));
  const second = await orchestrator.run(sources.map((source) => source.id));
  const report = {
    workload: 'scale-ready-5000-batch-100-dry-run',
    database: { host: new URL(databaseUrl).hostname, name: 'jano' },
    autoCreateEntities: 0,
    autoCreateRelations: 0,
    autoPromoteAssertions: 0,
    autoEditorialApply: 0,
    firstRun: { ...first.metrics, modelCalls: 0, cacheHits: 0, cacheMisses: 0, pass: first.pass },
    secondRun: {
      ...second.metrics,
      modelCalls: 0,
      checkpointResumes: second.metrics.stagesResumed,
      cacheHits: 0,
      cacheMisses: 0,
      pass: second.pass,
    },
    stageCallsFirstRun: stageCalls.length,
    resumePass: second.pass && second.metrics.stagesResumed === sources.length * 11,
    writes: 0,
  };
  await mkdir(resolve(process.cwd(), '../../artifacts'), { recursive: true });
  await writeFile(
    resolve(process.cwd(), '../../artifacts/scale-ready-5000-batch-100-dry-run.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await prisma.$disconnect();
  await pool.end();
  console.log(JSON.stringify(report, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
