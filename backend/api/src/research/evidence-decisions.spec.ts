import { ResearchService } from './research.service';
import { ResearchEvidenceDecisionAction } from '@prisma/client';

describe('Evidence review decisions', () => {
  let db: any, service: ResearchService;
  const input = (decision = 'DEFER') => ({ evidenceId: 'e', logicalReviewId: 'W003-B01-001',
    decision: decision as ResearchEvidenceDecisionAction, reason: 'Human reviewed',
    payload: { targetEntityId: 'target', proposition: 'proposition', exactSupport: 'support', canonicalAssertionId: 'assertion' } });
  beforeEach(() => {
    db = {
      researchProject: { findUnique: jest.fn().mockResolvedValue({ id: 'p' }) },
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'ADMIN', accountStatus: 'ACTIVE' }) },
      researchEvidence: { findFirst: jest.fn().mockResolvedValue({ id: 'e', quote: 'exact support text' }) },
      entity: { findUnique: jest.fn().mockResolvedValue({ id: 'target' }), create: jest.fn() },
      relation: { create: jest.fn() },
      canonicalAssertion: { findUnique: jest.fn().mockResolvedValue({ entityId: 'target', proposition: 'proposition' }), create: jest.fn() },
      researchFindingProposal: { create: jest.fn() },
      researchEvidenceDecision: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'decision', ...data })), findMany: jest.fn().mockResolvedValue([]) },
      researchProposalDecision: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    };
    service = new ResearchService(db, null!, null!, null!, null!);
  });
  it.each(['APPROVE_CLAIM', 'ADDITIONAL_PROVENANCE', 'DEFER', 'REJECT_SOURCE_CONTEXT', 'REJECT_TARGET_MISMATCH', 'REJECT_INSUFFICIENT_SUPPORT'])('%s persists Evidence review only', async action => {
    expect((await service.recordEvidenceDecision('p', 'admin', input(action))).created).toBe(true);
    for (const model of ['researchFindingProposal', 'entity', 'relation', 'canonicalAssertion', 'researchProposalDecision']) expect(db[model].create).not.toHaveBeenCalled();
  });
  it('rejects wrong project Evidence', async () => {
    db.researchEvidence.findFirst.mockResolvedValue(null);
    await expect(service.recordEvidenceDecision('p', 'admin', input())).rejects.toThrow('Evidence does not belong');
    expect(db.researchEvidence.findFirst).toHaveBeenCalledWith({ where: { id: 'e', projectId: 'p' } });
  });
  it('rejects invalid reviewer', async () => {
    db.user.findUnique.mockResolvedValue({ role: 'USER', accountStatus: 'ACTIVE' });
    await expect(service.recordEvidenceDecision('p', 'admin', input())).rejects.toThrow('Active admin');
  });
  it('checkpoint retry is idempotent and conflicting replay is rejected', async () => {
    const first = await service.recordEvidenceDecision('p', 'admin', input());
    db.researchEvidenceDecision.findUnique.mockResolvedValue(first.decision);
    expect((await service.recordEvidenceDecision('p', 'admin', input())).created).toBe(false);
    await expect(service.recordEvidenceDecision('p', 'admin', input('APPROVE_CLAIM'))).rejects.toThrow('different decision');
    expect(db.researchEvidenceDecision.create).toHaveBeenCalledTimes(1);
  });
  it('handles concurrent identical retries', async () => {
    db.researchEvidenceDecision.create.mockRejectedValue({ code: 'P2002' });
    db.researchEvidenceDecision.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...input(), reviewerId: 'admin' });
    expect((await service.recordEvidenceDecision('p', 'admin', input())).created).toBe(false);
  });
  it.each(['W001', 'W002'])('reads %s proposal history without rewriting', async wave => {
    db.researchProposalDecision.findMany.mockResolvedValue([{ id: 'd', proposalId: 'p1', payload: { reviewId: `${wave}-E001` } }]);
    const read = await service.readReviewDecisions('p', [`${wave}-E001`, 'pending']);
    expect(read.totalDecided).toBe(1); expect(read.remainingUndecided).toBe(1);
    expect(db.researchProposalDecision.create).not.toHaveBeenCalled();
  });
  it('labels legacy anchors and combines independent decision counts', async () => {
    db.researchProposalDecision.findMany.mockResolvedValue([{ id: 'd', proposalId: 'p1', payload: { reviewId: 'W002-D001', decisionScope: 'DEFERRED_EVIDENCE_REVIEW' } }]);
    db.researchEvidenceDecision.findMany.mockResolvedValue([{ logicalReviewId: 'W003-B01-001' }]);
    const read = await service.readReviewDecisions('p', ['W002-D001', 'W003-B01-001', 'pending']);
    expect(read.totalDecided).toBe(2); expect(read.remainingUndecided).toBe(1);
    expect(read.proposalDecisions[0].legacyReviewAnchor).toBe('LEGACY_REVIEW_ANCHOR');
  });
  it('rejects malformed approval and provenance payloads', async () => {
    await expect(service.recordEvidenceDecision('p', 'admin', { ...input('APPROVE_CLAIM'), payload: {} })).rejects.toThrow('required');
    db.canonicalAssertion.findUnique.mockResolvedValue({ entityId: 'wrong', proposition: 'proposition' });
    await expect(service.recordEvidenceDecision('p', 'admin', input('ADDITIONAL_PROVENANCE'))).rejects.toThrow('mismatch');
  });
  it('rejects unsupported quotes, missing projects and invalid enum', async () => {
    await expect(service.recordEvidenceDecision('p', 'admin', input('INVALID'))).rejects.toThrow();
    await expect(service.recordEvidenceDecision('p', 'admin', { ...input('APPROVE_CLAIM'), payload: { ...input().payload, exactSupport: 'invented' } })).rejects.toThrow('Support');
    db.researchProject.findUnique.mockResolvedValue(null);
    await expect(service.recordEvidenceDecision('p', 'admin', input())).rejects.toThrow('project not found');
  });
});
