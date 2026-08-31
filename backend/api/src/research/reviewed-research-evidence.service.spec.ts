import { ReviewedResearchEvidenceService } from './reviewed-research-evidence.service';

describe('ReviewedResearchEvidenceService', () => {
  const input = {
    projectId: 'project-1',
    sourceId: 'source-1',
    excerptId: 'excerpt-1',
    canonicalEntityId: 'entity-1',
    supportQuote: 'Exact quote',
    proposition: 'Supported proposition',
    dimension: 'CHRONOLOGY',
    reviewItemId: 'item-1',
    role: 'ABOUT',
    decisionSource: 'USER_CONFIRMED_REVIEW' as const,
    originalProposition: 'Original',
    originalDimension: null,
  };

  it('reuses the stable fingerprint without creating duplicate private Evidence', async () => {
    const prisma: any = {
      source: { findUnique: jest.fn().mockResolvedValue({ id: 'source-1' }) },
      entity: { findUnique: jest.fn().mockResolvedValue({ id: 'entity-1', title: 'Entity' }) },
      libraryExcerpt: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'excerpt-1',
          text: 'Exact quote',
          locator: 'p1',
          materialVersion: { id: 'v1', version: 1, materialId: 'm1' },
        }),
      },
      researchEvidence: { findUnique: jest.fn().mockResolvedValue({ id: 'evidence-1' }) },
    };
    const result = await new ReviewedResearchEvidenceService(prisma).materialize(input);
    expect(result).toMatchObject({ evidenceId: 'evidence-1', created: false });
  });

  it('rejects an approved item whose quote is not in the stored excerpt', async () => {
    const prisma: any = {
      source: { findUnique: jest.fn().mockResolvedValue({ id: 'source-1' }) },
      entity: { findUnique: jest.fn().mockResolvedValue({ id: 'entity-1', title: 'Entity' }) },
      libraryExcerpt: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'excerpt-1',
          text: 'Different text',
          locator: 'p1',
          materialVersion: { id: 'v1', version: 1, materialId: 'm1' },
        }),
      },
    };
    await expect(new ReviewedResearchEvidenceService(prisma).materialize(input)).rejects.toThrow(
      'INVALID_SUPPORT_QUOTE:item-1',
    );
  });
});
