import {
  editorialContextFingerprint,
  buildEditorialRealizerRequest,
  normalizeMappedSentenceIds,
  normalizeRichLinks,
  buildUncertainSentenceRepairRequest,
  validateSingleMappedSentence,
  validateSentenceEntailment,
  publicOutputFromMapped,
  validateClaimPlan,
  validateMappedEditorialOutput,
  type EditorialClaim,
  type EditorialKnowledgeUnit,
} from './entity-editorial-claim-provenance';

const entity = { id: 'picasso', slug: 'picasso', canonicalName: 'Pablo Picasso', type: 'ARTIST' };
const units: EditorialKnowledgeUnit[] = [
  {
    id: 'FACT:birth',
    kind: 'CANONICAL_FACT',
    statement: 'Pablo Picasso nació en 1881.',
    certainty: 'DOCUMENTED',
    entityIds: ['picasso'],
    provenance: { field: 'startYear' },
  },
];
const claim: EditorialClaim = {
  id: 'c1',
  statement: units[0].statement,
  claimType: 'CHRONOLOGY',
  provenanceRefs: ['FACT:birth'],
  certainty: 'DOCUMENTED',
};

describe('claim-level editorial provenance', () => {
  it('rejects invented provenance and paraphrased planner claims', () => {
    expect(
      validateClaimPlan(
        { claims: [claim], definitionClaimIds: ['c1'], summaryClaimIds: [], sections: [] },
        units,
      ).accepted,
    ).toHaveLength(1);
    expect(
      validateClaimPlan(
        {
          claims: [{ ...claim, statement: 'Pablo Picasso revolucionó el arte moderno.' }],
          definitionClaimIds: [],
          summaryClaimIds: [],
          sections: [],
        },
        units,
      ).rejected[0].reason,
    ).toBe('CLAIM_NOT_ENTAILED');
    expect(
      validateClaimPlan(
        {
          claims: [{ ...claim, provenanceRefs: ['FACT:invented'] }],
          definitionClaimIds: [],
          summaryClaimIds: [],
          sections: [],
        },
        units,
      ).rejected[0].reason,
    ).toBe('INVALID_PROVENANCE_REF');
    expect(
      validateClaimPlan(
        {
          claims: [{ ...claim, statement: 'Unsupported' }],
          definitionClaimIds: ['c1'],
          summaryClaimIds: [],
          sections: [],
        },
        units,
      ).invalidReferences,
    ).toEqual(['c1']);
  });

  it('rejects unmapped sentences and unsupported dates while preserving natural prose', () => {
    const output = {
      definition: {
        id: 'd1',
        text: 'Pablo Picasso fue un artista nacido en 1881.',
        claimIds: ['c1'],
      },
      summary: [{ id: 's1', text: 'Nació en 1881.', claimIds: ['c1'] }],
      sections: [],
    };
    expect(
      validateMappedEditorialOutput(output, [claim], entity, [], 'IDENTITY_ONLY'),
    ).toHaveLength(2);
    expect(publicOutputFromMapped(output).summary).toBe('Nació en 1881.');
    expect(() =>
      validateMappedEditorialOutput(
        {
          ...output,
          summary: [{ id: 's1', text: 'Nació en 1881 y murió en 1973.', claimIds: ['c1'] }],
        },
        [claim],
        entity,
        [],
        'IDENTITY_ONLY',
      ),
    ).toThrow('unsupported number: 1973');
  });

  it('binds output deterministically to ordered knowledge context', () => {
    expect(editorialContextFingerprint('picasso', 'es', 'IDENTITY_ONLY', units)).toBe(
      editorialContextFingerprint('picasso', 'es', 'IDENTITY_ONLY', [...units].reverse()),
    );
  });

  it('requires prose depth and rejects unavailable rich links', () => {
    const output = {
      definition: { id: 'd1', text: 'Pablo Picasso fue un artista.', claimIds: ['c1'] },
      summary: [{ id: 's1', text: 'Nació en 1881.', claimIds: ['c1'] }],
      sections: [],
    };
    expect(() =>
      validateMappedEditorialOutput(output, [claim], entity, [], 'EDITORIAL_ENTRY'),
    ).toThrow('requires at least one section');
    expect(() =>
      validateMappedEditorialOutput(
        {
          ...output,
          definition: { ...output.definition, text: '[[Entidad inventada]] fue artista.' },
        },
        [claim],
        entity,
        [],
        'IDENTITY_ONLY',
      ),
    ).toThrow('unavailable entity');
  });

  it('normalizes duplicate transport ids without changing claim references', () => {
    const output = {
      definition: { id: 'same', text: 'Pablo Picasso fue un artista.', claimIds: ['c1'] },
      summary: [{ id: 'same', text: 'Nació en 1881.', claimIds: ['c1'] }],
      sections: [],
    };
    const normalized = normalizeMappedSentenceIds(output);
    expect(normalized.definition.id).not.toBe(normalized.summary[0].id);
    expect(normalized.summary[0].claimIds).toEqual(['c1']);
  });

  it('removes self-links, resolves related links and rejects unknown links', () => {
    const related = {
      id: 'cubismo',
      slug: 'cubismo',
      canonicalName: 'Cubismo',
      type: 'MOVEMENT',
      reasonAllowed: 'RELATION:r1',
    };
    const output = {
      definition: { id: 'd', text: 'Pablo Picasso [[Picasso]]', claimIds: ['c1'] },
      summary: [{ id: 's', text: 'Relacionado con [[Cubismo]]', claimIds: ['c1'] }],
      sections: [],
    };
    const normalized = normalizeRichLinks(output, entity, [related], ['Picasso']);
    expect(normalized.definition.text).toBe('Pablo Picasso Picasso');
    expect(normalized.summary[0].text).toBe('Relacionado con [[cubismo|Cubismo]]');
    expect(() =>
      normalizeRichLinks(
        { ...output, definition: { ...output.definition, text: '[[Unknown]]' } },
        entity,
        [related],
      ),
    ).toThrow('unavailable entity');
  });

  it('blocks strong connective composition without a supporting connective claim', () => {
    const second = { ...claim, id: 'c2', statement: 'Pablo Picasso murió en 1973.' };
    expect(() =>
      validateSingleMappedSentence(
        { id: 's', text: 'Nació en 1881 porque murió en 1973.', claimIds: ['c1', 'c2'] },
        [claim, second],
        entity,
        [],
      ),
    ).toThrow('unsupported connective');
  });

  it('closes realizer claim references to the accepted claim enum', () => {
    const request = buildEditorialRealizerRequest({
      entity,
      claims: [claim, { ...claim, id: 'c2' }, { ...claim, id: 'c3' }],
      linkableEntities: [],
      depth: 'IDENTITY_ONLY',
      locale: 'es',
    });
    const items = request.outputSchema.properties.definition.properties.claimIds.items;
    expect(items).toEqual({ type: 'string', enum: ['c1', 'c2', 'c3'] });
    expect(() =>
      validateSingleMappedSentence(
        { id: 's', text: 'Pablo Picasso fue un artista.', claimIds: ['c4'] },
        [claim],
        entity,
        [],
      ),
    ).toThrow('unknown claim');
    expect(
      validateSingleMappedSentence(
        { id: 's', text: 'Pablo Picasso fue un artista.', claimIds: ['c1'] },
        [claim],
        entity,
        [],
      ).claimIds,
    ).toEqual(['c1']);
  });

  it('builds a single constrained repair request', () => {
    const request = buildUncertainSentenceRepairRequest(
      { id: 's', text: 'La obra fue fundamental.', claimIds: ['c1'] },
      [claim],
      'La importancia no está documentada.',
    );
    expect(request.input).toEqual(expect.objectContaining({ AUDITOR_REASON: expect.any(String) }));
    expect(request.input).not.toHaveProperty('externalKnowledge');
  });

  it('fails safe when the independent entailment audit is incomplete or uncertain', () => {
    const sentences = [{ id: 's1', text: 'Nació en 1881.', claimIds: ['c1'] }];
    expect(() => validateSentenceEntailment(sentences, { results: [] })).toThrow(
      'missing sentence: s1',
    );
    expect(
      validateSentenceEntailment(sentences, {
        results: [{ sentenceId: 's1', verdict: 'UNCERTAIN', reason: 'Scope ambiguo' }],
      }).rejected,
    ).toHaveLength(1);
  });
});
