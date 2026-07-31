import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Library contract', () => {
  const apiRoot = join(__dirname, '..', '..');
  const schema = readFileSync(join(apiRoot, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(apiRoot, 'prisma/migrations/20260728130000_add_library_contract/migration.sql'),
    'utf8',
  );

  it('protects Library foreign keys and uniqueness in the additive schema', () => {
    expect(schema).toContain('model LibraryMaterial');
    expect(schema).toContain('model LibraryMaterialVersion');
    expect(schema).toContain('model LibraryExcerpt');
    expect(schema).toContain('model ResearchLibraryMaterial');
    expect(schema).toContain('@@unique([materialId, version])');
    expect(schema).toContain('@@unique([materialVersionId, fingerprint])');
    expect(schema).toContain('@@id([projectId, materialId])');
    expect(migration).toContain(
      'FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("materialId") REFERENCES "LibraryMaterial"("id") ON DELETE RESTRICT',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("materialVersionId") REFERENCES "LibraryMaterialVersion"("id")',
    );
    expect(migration).toContain('FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id")');
  });

  it('has no legacy material model after Contract', () => {
    expect(schema).not.toContain(['Research', 'Material'].join(''));
  });
});
