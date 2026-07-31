import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Research assisted proposal contract', () => {
  const root = join(__dirname, '..', '..');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      root,
      'prisma/migrations/20260731140000_add_research_assisted_proposal_contract/migration.sql',
    ),
    'utf8',
  );

  it('keeps historical proposals readable as LEGACY rows while new proposals are typed', () => {
    expect(schema).toContain('enum ResearchFindingProposalType');
    expect(schema).toContain('type               ResearchFindingProposalType @default(LEGACY)');
    expect(schema).toContain('jobId              String?');
    expect(migration).toContain("DEFAULT 'LEGACY'");
    expect(migration).toContain('ADD COLUMN "proposalKey" TEXT');
  });

  it('uses Job plus the typed result fingerprint as the persistent idempotency boundary', () => {
    expect(schema).toContain('resultFingerprint  String?');
    expect(migration).toContain('ResearchFindingProposal_jobId_resultFingerprint_key');
    expect(migration).toContain('WHERE "jobId" IS NOT NULL AND "resultFingerprint" IS NOT NULL');
  });
});
