import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export const SCALE_STAGES = [
  'SOURCE_SELECTION',
  'ACQUISITION',
  'PREPARATION',
  'EXCERPT_ANALYSIS',
  'TARGETING',
  'IDENTITY_RESOLUTION',
  'PROPOSALS',
  'HUMAN_REVIEW',
  'PRIVATE_EVIDENCE',
  'PROMOTION',
  'EDITORIAL',
] as const;
export type ScaleStage = (typeof SCALE_STAGES)[number];
export type RetryCategory =
  | 'HTTP_429'
  | 'HTTP_403'
  | 'HTTP_404'
  | 'NETWORK_FAILURE'
  | 'MODEL_TIMEOUT'
  | 'MODEL_SCHEMA_FAILURE'
  | 'CUDA_RUNTIME_FAILURE'
  | 'VALIDATION_FAILURE'
  | 'HUMAN_REVIEW_REQUIRED';

export function classifyRetry(error: unknown): { category: RetryCategory; retryable: boolean } {
  const message = error instanceof Error ? error.message : String(error);
  if (/429/.test(message)) return { category: 'HTTP_429', retryable: true };
  if (/403/.test(message)) return { category: 'HTTP_403', retryable: false };
  if (/404/.test(message)) return { category: 'HTTP_404', retryable: false };
  if (/timeout|ETIMEDOUT/i.test(message)) return { category: 'MODEL_TIMEOUT', retryable: true };
  if (/CUDA|Vulkan|runtime/i.test(message))
    return { category: 'CUDA_RUNTIME_FAILURE', retryable: false };
  if (/schema|JSON/i.test(message)) return { category: 'MODEL_SCHEMA_FAILURE', retryable: false };
  if (/review|ambiguous/i.test(message))
    return { category: 'HUMAN_REVIEW_REQUIRED', retryable: false };
  if (/validation|invalid/i.test(message))
    return { category: 'VALIDATION_FAILURE', retryable: false };
  if (/network|fetch|ECONN/i.test(message)) return { category: 'NETWORK_FAILURE', retryable: true };
  return { category: 'VALIDATION_FAILURE', retryable: false };
}

export type BatchCheckpoint = {
  workloadFingerprint: string;
  sources: Record<string, Partial<Record<ScaleStage, 'SUCCEEDED' | 'FAILED'>>>;
  updatedAt: string;
};

export interface CheckpointStore {
  read(): Promise<BatchCheckpoint | null>;
  write(checkpoint: BatchCheckpoint): Promise<void>;
}

export class JsonCheckpointStore implements CheckpointStore {
  constructor(private readonly path: string) {}
  async read() {
    try {
      return JSON.parse(await readFile(this.path, 'utf8')) as BatchCheckpoint;
    } catch {
      return null;
    }
  }
  async write(checkpoint: BatchCheckpoint) {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
  }
}

export type BatchStageRunner = (sourceId: string, stage: ScaleStage) => Promise<void>;

export class KnowledgeBatchOrchestrator {
  constructor(
    private readonly store: CheckpointStore,
    private readonly runStage: BatchStageRunner,
    private readonly maxRetries = 2,
  ) {}

  async run(sourceIds: string[]) {
    const uniqueSourceIds = [...new Set(sourceIds)].sort();
    const workloadFingerprint = createHash('sha256')
      .update(uniqueSourceIds.join('|'))
      .digest('hex');
    const previous = await this.store.read();
    const checkpoint: BatchCheckpoint =
      previous?.workloadFingerprint === workloadFingerprint
        ? previous
        : { workloadFingerprint, sources: {}, updatedAt: new Date().toISOString() };
    const metrics = {
      sourcesSelected: uniqueSourceIds.length,
      sourcesEffective: 0,
      stagesResumed: 0,
      retries: 0,
      errors: 0,
    };
    for (const sourceId of uniqueSourceIds) {
      checkpoint.sources[sourceId] ??= {};
      let sourceComplete = true;
      for (const stage of SCALE_STAGES) {
        if (checkpoint.sources[sourceId][stage] === 'SUCCEEDED') {
          metrics.stagesResumed += 1;
          continue;
        }
        sourceComplete = false;
        let attempt = 0;
        while (true) {
          try {
            await this.runStage(sourceId, stage);
            checkpoint.sources[sourceId][stage] = 'SUCCEEDED';
            checkpoint.updatedAt = new Date().toISOString();
            await this.store.write(checkpoint);
            break;
          } catch (error) {
            const classified = classifyRetry(error);
            if (!classified.retryable || attempt >= this.maxRetries) {
              checkpoint.sources[sourceId][stage] = 'FAILED';
              checkpoint.updatedAt = new Date().toISOString();
              await this.store.write(checkpoint);
              metrics.errors += 1;
              break;
            }
            attempt += 1;
            metrics.retries += 1;
          }
        }
        if (checkpoint.sources[sourceId][stage] === 'FAILED') break;
      }
      if (
        sourceComplete ||
        SCALE_STAGES.every((stage) => checkpoint.sources[sourceId][stage] === 'SUCCEEDED')
      )
        metrics.sourcesEffective += 1;
    }
    return {
      workloadFingerprint,
      checkpoint,
      metrics,
      pass: metrics.errors === 0 && metrics.sourcesEffective === uniqueSourceIds.length,
    };
  }
}
