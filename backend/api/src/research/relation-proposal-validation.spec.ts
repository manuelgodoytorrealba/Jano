import type { Prisma } from '@prisma/client';
import { validateRelationProposal } from './relation-proposal-validation';

describe('relation proposal action boundary', () => {
  function fixture() {
    const quote = 'Dan Flavin pertenece al movimiento Minimalismo.';
    const db = {
      researchFindingProposal: {
        findFirstOrThrow: jest.fn().mockResolvedValue({ jobId: 'job', relationFromKey: 'a', relationToKey: 'b', relationTypeId: 'rt', relationType: { key: 'BELONGS_TO_MOVEMENT' }, explanation: quote, evidence: [{ evidence: { projectId: 'p', quote } }] }),
        findMany: jest.fn().mockResolvedValue([
          { proposalKey: 'a', title: 'Dan Flavin', entityKind: 'PERSON', decisions: [{ action: 'RESOLVE_TO_EXISTING', payload: { canonicalEntityId: 'artist' } }] },
          { proposalKey: 'b', title: 'Minimalism', entityKind: 'ABSTRACTION', decisions: [{ action: 'REROUTE', payload: { canonicalEntityId: 'movement' } }] },
        ]),
      },
      entity: { findUnique: jest.fn().mockImplementation(({ where }) => where.id === 'artist' ? { id: 'artist', title: 'Dan Flavin', type: 'ARTIST' } : { id: 'movement', title: 'Minimalismo', type: 'MOVEMENT' }) },
      relation: { findUnique: jest.fn().mockResolvedValue({ id: 'existing' }) },
    };
    return db;
  }
  it('uses resolved canonical types/titles and checks dedup after semantic validation', async () => {
    const db = fixture();
    const result = await validateRelationProposal(db as unknown as Prisma.TransactionClient, 'p', 'proposal');
    expect(result.classification).toBe('VALID_RELATION');
    expect(result.canonicalAction).toBe('ADDITIONAL_PROVENANCE_CANDIDATE');
    expect(db.relation.findUnique).toHaveBeenCalledWith({ where: { fromId_relationTypeId_toId: { fromId: 'artist', relationTypeId: 'rt', toId: 'movement' } }, select: { id: true } });
  });
  it('does not reuse identity resolution as approval of unsupported knowledge', async () => {
    const db = fixture();
    const proposal = await db.researchFindingProposal.findFirstOrThrow();
    proposal.evidence[0].evidence.quote = 'Dan Flavin and Minimalismo appear in navigation.';
    const result = await validateRelationProposal(db as unknown as Prisma.TransactionClient, 'p', 'proposal');
    expect(result.classification).toBe('REVIEW_MAPPING');
    expect(db.relation.findUnique).not.toHaveBeenCalled();
  });
  it('preserves deferred dependencies', async () => {
    const db = fixture();
    const endpoints = await db.researchFindingProposal.findMany();
    endpoints[1].decisions[0].action = 'DEFER';
    expect((await validateRelationProposal(db as unknown as Prisma.TransactionClient, 'p', 'proposal')).classification).toBe('BLOCKED_BY_ENTITY');
  });
  it('does not treat a private approved-new entity as a canonical endpoint', async () => {
    const db = fixture();
    db.researchFindingProposal.findMany.mockResolvedValueOnce([
      { proposalKey: 'a', title: 'Dan Flavin', entityKind: 'PERSON', decisions: [{ action: 'APPROVE_NEW_ENTITY', payload: {} }], convertedEntity: { canonicalEntityId: null, canonicalEntity: null } },
      { proposalKey: 'b', title: 'Minimalism', entityKind: 'ABSTRACTION', decisions: [{ action: 'REROUTE', payload: { canonicalEntityId: 'movement' } }], convertedEntity: { canonicalEntityId: 'movement', canonicalEntity: { id: 'movement', title: 'Minimalismo', type: 'MOVEMENT' } } },
    ]);
    expect((await validateRelationProposal(db as unknown as Prisma.TransactionClient, 'p', 'proposal')).classification).toBe('BLOCKED_BY_ENTITY');
  });
});
