import { BadRequestException } from '@nestjs/common';
import { ResearchEvidencePromotionService } from './research-evidence-promotion.service';

describe('ResearchEvidencePromotionService', () => {
  const transaction = jest.fn(async (callback: (tx: object) => Promise<unknown>) => callback({}));
  const prisma = {
    researchEvidenceDecision: { findMany: jest.fn() },
    $transaction: transaction,
  };
  const service = new ResearchEvidencePromotionService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('does no proposal lookup when there are no approved decisions', async () => {
    prisma.researchEvidenceDecision.findMany.mockResolvedValue([]);

    await expect(service.promote('project-1', ['review-1'])).resolves.toEqual([]);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects an approved decision without a complete proposal payload', async () => {
    prisma.researchEvidenceDecision.findMany.mockResolvedValue([
      {
        logicalReviewId: 'review-1',
        decision: 'APPROVE_CLAIM',
        payload: {},
        evidenceId: 'evidence-1',
        reviewerId: 'reviewer-1',
        evidence: { quote: 'Exact source support' },
      },
    ]);

    await expect(service.promote('project-1', ['review-1'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
