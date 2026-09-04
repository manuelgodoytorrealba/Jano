import {
  buildClaimLockedSentenceRequest,
  canonicalPublicProposition,
  editorialContextFingerprint,
  buildEditorialRealizerRequest,
  normalizeMappedSentenceIds,
  normalizeRichLinks,
  buildUncertainSentenceRepairRequest,
  editorialAssemblyLocations,
  validateSingleMappedSentence,
  validateSentenceEntailment,
  publicOutputFromMapped,
  realizeClaimWithFallback,
  isEditoriallyClaimableRelation,
  validateClaimPlan,
  validateMappedEditorialOutput,
  uniqueSentenceClaimPairs,
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
  it('builds a one-claim, one-sentence request with a closed schema', () => {
    const request = buildClaimLockedSentenceRequest({
      entity,
      claim,
      allowedLinkedEntities: [],
      locale: 'es',
    });
    expect(request.outputSchema.properties.claimId).toEqual({ type: 'string', const: 'c1' });
    expect(request.outputSchema.properties.sentence).toEqual({ type: 'string' });
    expect(request.maxOutputTokens).toBeLessThanOrEqual(180);
    expect((request.input as any).CLAIM_ID).toBe('c1');
  });
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

  it('deduplicates only the same normalized sentence and claim mapping', () => {
    const sentences = [
      { id: 'definition', text: 'Pablo Picasso fue un artista.', claimIds: ['c1'] },
      { id: 'summary', text: '  Pablo Picasso fue un artista. ', claimIds: ['c1'] },
      { id: 'body', text: 'Picasso fue un artista.', claimIds: ['c1'] },
    ];
    expect(uniqueSentenceClaimPairs(sentences).map(({ id }) => id)).toEqual(['definition', 'body']);
  });

  it('keeps summary and body locations while auditing an exact reuse once', () => {
    const sentence = { id: 'claim-1', text: 'Pablo Picasso fue un artista.', claimIds: ['c1'] };
    const output = {
      definition: sentence,
      summary: [sentence],
      sections: [{ heading: 'Contexto', sentences: [] }],
    };
    expect(editorialAssemblyLocations(output)).toEqual([['definition', 'summary']]);
    expect(
      uniqueSentenceClaimPairs(validateMappedEditorialOutput(output, [claim], entity, [])),
    ).toHaveLength(1);
  });

  it('reaches and accepts the exact canonical fallback after one rejected repair', async () => {
    const audit = jest.fn(async (sentence) => {
      const supported = sentence.text === claim.statement;
      return {
        sentence,
        result: {
          sentenceId: sentence.id,
          verdict: supported ? ('SUPPORTED' as const) : ('UNCERTAIN' as const),
          reason: supported ? 'Exact claim.' : 'Scope changed.',
        },
        supported,
      };
    });
    const result = await realizeClaimWithFallback({
      claim,
      writerSentence: { id: 's', text: 'Picasso nació.', claimIds: ['c1'] },
      audit,
      repair: async () => ({ id: 's', text: 'Picasso nació en torno a 1881.', claimIds: ['c1'] }),
    });
    expect(result.acceptedBy).toBe('CANONICAL_FALLBACK');
    expect(result.canonicalFallback?.sentence.text).toBe(claim.statement);
    expect(audit).toHaveBeenCalledTimes(3);
  });

  it('uses promoted public propositions and preserves qualified relation scope', () => {
    expect(
      canonicalPublicProposition(
        'Raw quote',
        '[RELATION] El cubismo estuvo parcialmente influido.',
      ),
    ).toBe('El cubismo estuvo parcialmente influido.');
    const qualified = {
      ...claim,
      statement: 'El cubismo estuvo parcialmente influido por la obra tardía de Paul Cézanne.',
    };
    expect(() =>
      validateSingleMappedSentence(
        { id: 's', text: 'El cubismo estuvo influido por Paul Cézanne.', claimIds: ['c1'] },
        [qualified],
        entity,
        [],
      ),
    ).toThrow('loses required qualifier');
  });

  it('keeps precise supported relations out of the navigational-only filter', () => {
    expect(
      isEditoriallyClaimableRelation(
        'El cubismo estuvo parcialmente influido por la obra tardía de Paul Cézanne.',
      ),
    ).toBe(true);
    expect(
      isEditoriallyClaimableRelation(
        'Pablo Picasso se comprende en diálogo con la influencia de Paul Cézanne.',
      ),
    ).toBe(false);
  });
});
