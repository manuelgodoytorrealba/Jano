import { CanonicalPromotionService } from './canonical-promotion.service';

describe('CanonicalPromotionService', () => {
  it('does not create a SourceRef for relation or entity provenance operations', async () => {
    const tx: any = {
      researchEvidence: {
        findUnique: jest.fn().mockResolvedValue({ id: 'e', sourceId: 's', libraryExcerptId: 'x' }),
      },
      sourceRef: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      relation: { findFirst: jest.fn().mockResolvedValue({ id: 'r' }) },
      citation: { findFirst: jest.fn().mockResolvedValue({ id: 'c' }), create: jest.fn() },
      libraryExcerpt: { findUniqueOrThrow: jest.fn().mockResolvedValue({ locator: 'p' }) },
    };
    const prisma: any = { $transaction: (fn: any) => fn(tx) };
    const result = await new CanonicalPromotionService(prisma).apply([
      {
        kind: 'RELATION',
        entityId: 'a',
        targetEntityId: 'b',
        relationTypeId: 't',
        sourceId: 's',
        evidenceId: 'e',
        excerptId: 'x',
        quote: 'q',
        proposition: 'p',
        dimension: 'RELATION',
      },
      {
        kind: 'PROVENANCE_ENTITY',
        entityId: 'a',
        sourceId: 's',
        evidenceId: 'e',
        excerptId: 'x',
        quote: 'q',
        proposition: 'p',
        dimension: 'CHRONOLOGY',
      },
    ]);
    expect(tx.sourceRef.create).not.toHaveBeenCalled();
    expect(result.map((x: any) => x.action)).toEqual([
      'RELATION_ALREADY_PRESENT',
      'PROVENANCE_ATTACHED',
    ]);
  });
});
