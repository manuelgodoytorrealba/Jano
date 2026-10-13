import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationsRoot = join(__dirname, '..', '..', 'prisma', 'migrations');

function migration(name: string) {
  return readFileSync(join(migrationsRoot, name, 'migration.sql'), 'utf8');
}

describe('polymorphic database integrity migrations', () => {
  it('requires exactly one typed value for entity attributes', () => {
    expect(migration('20260725120000_add_knowledge_core_foundation')).toContain(
      'CONSTRAINT "EntityAttribute_exactly_one_value" CHECK',
    );
  });

  it('requires exactly one primary editorial target for citations', () => {
    expect(migration('20260725120000_add_knowledge_core_foundation')).toContain(
      'CONSTRAINT "Citation_exactly_one_target" CHECK',
    );
  });

  it('prevents research decisions from targeting a finding and claim together', () => {
    const sql = migration('20261005162000_enforce_research_decision_target_integrity');

    expect(sql).toContain('CONSTRAINT "ResearchDecision_at_most_one_target"');
    expect(sql).toContain('num_nonnulls("findingId", "claimId") <= 1');
    expect(sql).toContain('VALIDATE CONSTRAINT "ResearchDecision_at_most_one_target"');
  });
});
