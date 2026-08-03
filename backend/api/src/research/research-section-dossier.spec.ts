import { presentSectionDossiers } from './research-section-dossier';

describe('presentSectionDossiers', () => {
  it('derives only the stable Research context supported by anchored excerpts', () => {
    const [section] = presentSectionDossiers(
      [
        {
          id: 'section',
          questions: [{ id: 'question-1', text: '¿Qué cambia?' }],
          excerptReferences: [{ libraryExcerptId: 'excerpt', libraryExcerpt: { id: 'excerpt' } }],
        },
      ],
      [
        { id: 'evidence-b', libraryExcerptId: 'excerpt' },
        { id: 'evidence-a', libraryExcerptId: 'other' },
      ],
      [
        {
          id: 'claim-b',
          title: 'Claim B',
          kind: 'ASSERTION',
          status: 'DRAFT',
          evidence: [{ evidenceId: 'evidence-b' }],
        },
        {
          id: 'claim-a',
          title: 'Claim A',
          kind: 'ASSERTION',
          status: 'SUPPORTED',
          evidence: [{ evidenceId: 'evidence-a' }],
        },
      ],
      [
        { id: 'entity-b', evidence: [] },
        { id: 'entity-a', evidence: [{ evidenceId: 'evidence-b' }] },
      ],
      [
        {
          id: 'relation-b',
          fromEntityId: 'entity-b',
          toEntityId: 'entity-c',
          claims: [{ claimId: 'claim-b' }],
        },
        {
          id: 'relation-a',
          fromEntityId: 'entity-a',
          toEntityId: 'entity-b',
          claims: [{ claimId: 'claim-a' }],
        },
      ],
    );
    expect(section.dossier).toMatchObject({
      excerpts: [{ id: 'excerpt' }],
      evidence: [{ id: 'evidence-b' }],
      claims: [{ id: 'claim-b' }],
      entities: [{ id: 'entity-a' }, { id: 'entity-b' }],
      relations: [{ id: 'relation-b' }],
      review: { nextTask: { kind: 'REVIEW_CLAIM', claimId: 'claim-b' } },
      summary: {
        excerptCount: 1,
        evidenceCount: 1,
        claimCount: 1,
        supportedClaimCount: 0,
        questionedClaimCount: 0,
        contradictionCount: 0,
        questionsWithoutExplicitSupport: [{ id: 'question-1' }],
      },
    });
  });
});
