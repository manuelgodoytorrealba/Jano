import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ResearchService } from './research.service';

describe('Research phase-zero invariants', () => {
  it('archives without deleting private Research state', async () => {
    const prisma = { researchProject: { update: jest.fn() } };
    const service = new ResearchService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    jest.spyOn(service, 'getProject').mockResolvedValue({ id: 'research-1' } as never);

    await service.archiveProject('research-1', 'user-1');

    expect(prisma.researchProject.update).toHaveBeenCalledWith({
      where: { id: 'research-1' },
      data: expect.objectContaining({ status: 'ARCHIVED', archivedById: 'user-1' }),
    });
    expect(prisma.researchProject.update.mock.calls[0][0].data.archivedAt).toBeInstanceOf(Date);
  });

  it('keeps the approved backfill idempotent and the legacy POC isolated', () => {
    const apiRoot = join(__dirname, '..', '..');
    const migration = readFileSync(
      join(apiRoot, 'prisma/migrations/20260728120000_add_research_ownership/migration.sql'),
      'utf8',
    );
    const routes = readFileSync(
      join(apiRoot, '..', '..', 'frontend/src/app/app.routes.ts'),
      'utf8',
    );

    expect(migration).toContain('AND "ownerId" IS NULL');
    expect(migration).toContain('ALTER COLUMN "ownerId" SET NOT NULL');
    expect(routes).toContain('research/prototype/:screen');
    expect(routes).not.toContain('research/studio');
  });
});
