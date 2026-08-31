import {
  AIProviderSemanticEvidenceModel,
  HybridSemanticEvidenceClassifier,
  resolveSupportQuote,
  type SemanticModelOutput,
} from './hybrid-semantic-evidence-classifier';
import { STRUCTURED_REFERENCE_PURPOSE } from './semantic-evidence-classifier';

const input = {
  excerpt:
    'Picasso and Braque developed a radically fragmented pictorial language in their paintings.',
  sourcePurpose: 'DOCUMENTARY_TEXT',
  source: { title: 'Cubism', locator: 'p. 1' },
  candidateEntity: { id: 'picasso', canonicalName: 'Pablo Picasso', type: 'PERSON' },
};
const supportQuote = 'Picasso and Braque developed a radically fragmented pictorial language';
const semanticKeep: SemanticModelOutput = {
  relevanceRole: 'PRIMARY_SUBJECT',
  evidenceProposition:
    'Picasso y Braque desarrollaron un lenguaje pictórico radicalmente fragmentado.',
  supportedDimension: 'HISTORICAL_CONTEXT',
  confidence: 'HIGH',
  decision: 'KEEP',
  reason: 'The quote directly supports the proposition.',
  supportQuote,
};

describe('HybridSemanticEvidenceClassifier V3', () => {
  it('preserves a deterministic SAFE_KEEP without invoking the semantic model', async () => {
    const classify = jest.fn(async () => semanticKeep);
    const safeInput = {
      ...input,
      source: { title: 'Geometric abstraction', locator: 'p. 1' },
      candidateEntity: {
        id: 'abstraction',
        canonicalName: 'Geometric abstraction',
        type: 'CONCEPT',
      },
      excerpt:
        'Geometric abstraction is an artistic approach that organizes visual form through non-representational geometric structures.',
    };

    const result = await new HybridSemanticEvidenceClassifier({ classify }).classify(
      safeInput,
      'HYBRID',
    );

    expect(result.decision).toBe('KEEP');
    expect(result.compositionSource).toBe('DETERMINISTIC_SAFE_KEEP');
    expect(classify).not.toHaveBeenCalled();
  });

  it('does not let the semantic model rescue a deterministic HARD_REJECT', async () => {
    const classify = jest.fn(async () => semanticKeep);
    const result = await new HybridSemanticEvidenceClassifier({ classify }).classify(
      { ...input, sourcePurpose: STRUCTURED_REFERENCE_PURPOSE },
      'HYBRID',
    );

    expect(result.decision).toBe('REJECT');
    expect(result.compositionSource).toBe('DETERMINISTIC_HARD_REJECT');
    expect(classify).not.toHaveBeenCalled();
  });

  it('invokes semantics only for deterministic uncertainty and can recover KEEP', async () => {
    const classify = jest.fn(async () => semanticKeep);
    const result = await new HybridSemanticEvidenceClassifier({ classify }).classify(
      input,
      'HYBRID',
    );

    expect(result.decision).toBe('KEEP');
    expect(result.compositionSource).toBe('SEMANTIC_RECOVERY');
    expect(classify).toHaveBeenCalledTimes(1);
  });

  it('preserves an explicit semantic REVIEW as MODEL_REVIEW', async () => {
    const result = await new HybridSemanticEvidenceClassifier({
      classify: async () => ({ ...semanticKeep, decision: 'REVIEW', confidence: 'MEDIUM' }),
    }).classify(input, 'HYBRID');

    expect(result.decision).toBe('REVIEW');
    expect(result.reviewKind).toBe('MODEL_REVIEW');
  });

  it('preserves an explicit semantic REJECT', async () => {
    const result = await new HybridSemanticEvidenceClassifier({
      classify: async () => ({
        ...semanticKeep,
        decision: 'REJECT',
        relevanceRole: 'UNRELATED',
        supportQuote: null,
        evidenceProposition: null,
        supportedDimension: null,
      }),
    }).classify(input, 'HYBRID');

    expect(result.decision).toBe('REJECT');
  });

  it('accepts a literal quote with a grounded paraphrased proposition', async () => {
    const result = await new HybridSemanticEvidenceClassifier({
      classify: async () => semanticKeep,
    }).classify(input, 'HYBRID');

    expect(result.decision).toBe('KEEP');
    expect(result.evidenceProposition?.statement).toBe(semanticKeep.evidenceProposition);
    expect(result.supportSpan).toEqual({
      start: 0,
      end: supportQuote.length,
      text: supportQuote,
    });
    expect(result.supportQuoteStatus).toBe('VALID_EXACT');
    expect(result.unsupportedAddition).toBe('NONE');
  });

  it('cannot KEEP a correct proposition with a bad quote', async () => {
    const result = await new HybridSemanticEvidenceClassifier({
      classify: async () => ({ ...semanticKeep, supportQuote: 'This quote is not present.' }),
    }).classify(input, 'SEMANTIC_ONLY');

    expect(result.decision).toBe('REVIEW');
    expect(result.supportSpan).toBeNull();
    expect(result.supportQuoteStatus).toBe('INVALID');
  });

  it('cannot KEEP a literal quote with an unsupported proposition', async () => {
    const result = await new HybridSemanticEvidenceClassifier({
      classify: async () => ({
        ...semanticKeep,
        evidenceProposition:
          'Picasso y Braque inventaron el cubismo en París en 1907 por encargo del Estado.',
      }),
    }).classify(input, 'SEMANTIC_ONLY');

    expect(result.decision).toBe('REVIEW');
    expect(result.unsupportedAddition).toBe('CRITICAL');
  });

  it('cannot bypass the structured-reference hard gate', async () => {
    const result = await new HybridSemanticEvidenceClassifier({
      classify: async () => semanticKeep,
    }).classify({ ...input, sourcePurpose: STRUCTURED_REFERENCE_PURPOSE }, 'HYBRID');

    expect(result.decision).toBe('REJECT');
  });

  it('rejects authority metadata even when its purpose was misclassified', async () => {
    const excerpt =
      'Cy Twombly occupation artist identifier Q12345 VIAF 49234268 retrieved 2024 member of Academy 0 references genre abstract art 1 reference.';
    const result = await new HybridSemanticEvidenceClassifier({
      classify: async () => ({
        ...semanticKeep,
        supportQuote: excerpt,
        evidenceProposition: 'Cy Twombly fue un artista abstracto.',
        supportedDimension: 'DEFINITION_OR_IDENTITY',
      }),
    }).classify(
      {
        ...input,
        excerpt,
        sourcePurpose: 'GENERAL_REFERENCE',
        source: { title: 'Cy Twombly — authority record', locator: null },
        candidateEntity: { id: 'twombly', canonicalName: 'Cy Twombly', type: 'PERSON' },
      },
      'HYBRID',
    );

    expect(result.decision).toBe('REJECT');
  });

  it('hard-rejects authority UI labels without invoking semantics', async () => {
    const classify = jest.fn(async () => semanticKeep);
    const excerpt =
      'Surname Given Name edit Language Label Description Also known as default for all languages Example Person – English Example Person painter and sculptor (1900–1980).';
    const result = await new HybridSemanticEvidenceClassifier({ classify }).classify(
      {
        ...input,
        excerpt,
        sourcePurpose: 'GENERAL_REFERENCE',
        source: { title: 'Authority record', locator: null },
        candidateEntity: { id: 'person', canonicalName: 'Example Person', type: 'PERSON' },
      },
      'HYBRID',
    );

    expect(result.decision).toBe('REJECT');
    expect(result.deterministicReasonCode).toBe('HARD_METADATA_DUMP');
    expect(classify).not.toHaveBeenCalled();
  });

  it('does not recover promotional chrome as KEEP', async () => {
    const excerpt =
      'Explore food and drink in Madrid. Discover shopping, tickets, membership and what’s on.';
    const result = await new HybridSemanticEvidenceClassifier({
      classify: async () => ({
        ...semanticKeep,
        supportQuote: excerpt,
        evidenceProposition: 'Madrid ofrece actividades culturales y comerciales.',
        supportedDimension: 'HISTORICAL_CONTEXT',
      }),
    }).classify(
      {
        ...input,
        excerpt,
        sourcePurpose: 'GENERAL_REFERENCE',
        source: { title: 'Madrid Destino', locator: null },
        candidateEntity: { id: 'madrid', canonicalName: 'Madrid', type: 'PLACE' },
      },
      'HYBRID',
    );

    expect(result.decision).toBe('REJECT');
  });

  it('handles repeated identical quotes safely', async () => {
    const excerpt = 'Picasso worked in Paris. Picasso worked in Paris.';
    const result = await new HybridSemanticEvidenceClassifier({
      classify: async () => ({
        ...semanticKeep,
        supportQuote: 'Picasso worked in Paris.',
        evidenceProposition: 'Picasso trabajó en París.',
      }),
    }).classify({ ...input, excerpt }, 'SEMANTIC_ONLY');

    expect(result.decision).toBe('REVIEW');
    expect(result.supportQuoteStatus).toBe('AMBIGUOUS');
    expect(result.reviewKind).toBe('SYSTEM_FAILSAFE_REVIEW');
  });

  it('normalizes Unicode and whitespace while preserving original offsets', () => {
    const excerpt = 'Pablo  Picass\u006f\u0301\r\ntrabajó en París.';
    const resolution = resolveSupportQuote(excerpt, 'Pablo Picassó trabajó en París.');

    expect(resolution.status).toBe('VALID_NORMALIZED');
    expect(resolution.span?.text).toBe(excerpt);
    expect(excerpt.slice(resolution.span!.start, resolution.span!.end)).toBe(excerpt);
  });

  it('rejects unknown V3 properties before semantic classification', async () => {
    const model = new AIProviderSemanticEvidenceModel({
      metadata: () => ({ provider: 'fixture', model: 'fixture' }),
      isAvailable: () => true,
      runStructured: async () => ({ output: { ...semanticKeep, unexpected: true } }),
    });

    await expect(model.classify(input)).rejects.toThrow('MODEL_OUTPUT_INVALID');
  });
});
