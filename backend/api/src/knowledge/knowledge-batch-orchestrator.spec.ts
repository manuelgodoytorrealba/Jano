import {
  KnowledgeBatchOrchestrator,
  SCALE_STAGES,
  type BatchCheckpoint,
  type CheckpointStore,
} from './knowledge-batch-orchestrator';

class MemoryStore implements CheckpointStore {
  value: BatchCheckpoint | null = null;
  async read() {
    return this.value;
  }
  async write(value: BatchCheckpoint) {
    this.value = structuredClone(value);
  }
}

describe('scale batch orchestration', () => {
  it('checkpoints stages, retries transient failures and resumes idempotently', async () => {
    const store = new MemoryStore();
    const calls: string[] = [];
    let failOnce = true;
    const runner = new KnowledgeBatchOrchestrator(store, async (source, stage) => {
      calls.push(`${source}:${stage}`);
      if (failOnce && source === 's1' && stage === 'PREPARATION') {
        failOnce = false;
        throw new Error('network failure');
      }
    });
    const first = await runner.run(['s2', 's1', 's1']);
    expect(first.pass).toBe(true);
    expect(first.metrics.retries).toBe(1);
    const before = calls.length;
    const second = await runner.run(['s1', 's2']);
    expect(second.pass).toBe(true);
    expect(calls.length).toBe(before);
    expect(second.metrics.stagesResumed).toBe(SCALE_STAGES.length * 2);
  });

  it('does not retry deterministic validation or access failures', async () => {
    const store = new MemoryStore();
    const result = await new KnowledgeBatchOrchestrator(store, async () => {
      throw new Error('HTTP 403');
    }).run(['s1']);
    expect(result.pass).toBe(false);
    expect(result.metrics.retries).toBe(0);
  });
});
