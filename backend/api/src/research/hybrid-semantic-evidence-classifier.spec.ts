import {
  AIProviderSemanticEvidenceModel,
  HybridSemanticEvidenceClassifier,
  type SemanticModelOutput,
} from './hybrid-semantic-evidence-classifier';
import { STRUCTURED_REFERENCE_PURPOSE } from './semantic-evidence-classifier';

const input = {
  excerpt:
    'Body art is art in which the body, often that of the artist, is the principal medium and focus.',
  sourcePurpose: 'DOCUMENTARY_TEXT',
  source: { title: 'The body in art', locator: 'p. 1' },
  candidateEntity: { id: 'body', canonicalName: 'Cuerpo', type: 'CONCEPT' },
};
const semanticKeep: SemanticModelOutput = {
  relevanceRole: 'PRIMARY_SUBJECT',
  evidenceProposition: {
    statement: input.excerpt,
    supportedDimension: 'definition',
    evidenceRole: 'DIRECT_DOCUMENTARY_EVIDENCE',
  },
  confidence: 'HIGH',
  decision: 'KEEP',
  reason: 'Explicit definition',
  supportSpan: { start: 0, end: input.excerpt.length, text: input.excerpt },
};

describe('HybridSemanticEvidenceClassifier', () => {
  it('supports deterministic-only mode without a provider', async () => {
    const result = await new HybridSemanticEvidenceClassifier().classify(
      input,
      'DETERMINISTIC_ONLY',
    );
    expect(result.decision).toBe('KEEP');
  });

  it('downgrades semantic KEEP when deterministic safety is uncertain', async () => {
    const result = await new HybridSemanticEvidenceClassifier({
      classify: async () => semanticKeep,
    }).classify(
      {
        ...input,
        sourcePurpose: 'EDITORIAL_REFERENCE',
        candidateEntity: { id: 'concept', canonicalName: 'Concepto', type: 'CONCEPT' },
      },
      'HYBRID',
    );
    expect(result.decision).toBe('REVIEW');
  });

  it('cannot bypass a structured-reference hard gate', async () => {
    const result = await new HybridSemanticEvidenceClassifier({
      classify: async () => semanticKeep,
    }).classify({ ...input, sourcePurpose: STRUCTURED_REFERENCE_PURPOSE }, 'HYBRID');
    expect(result.decision).toBe('REJECT');
  });

  it('fails safe when the provider returns an open or incomplete contract', async () => {
    const result = await new HybridSemanticEvidenceClassifier({
      classify: async () => ({
        ...semanticKeep,
        supportSpan: null,
      }),
    }).classify(input, 'SEMANTIC_ONLY');
    expect(result.decision).toBe('REVIEW');
    expect(result.supportSpan).toBeNull();
  });

  it('never keeps a span that is not a literal excerpt substring', async () => {
    const result = await new HybridSemanticEvidenceClassifier({
      classify: async () => ({
        ...semanticKeep,
        supportSpan: { start: 0, end: 4, text: 'fake' },
      }),
    }).classify(input, 'SEMANTIC_ONLY');
    expect(result.decision).toBe('REVIEW');
    expect(result.supportSpan).toBeNull();
  });

  it('rejects unknown properties before semantic classification', async () => {
    const model = new AIProviderSemanticEvidenceModel({
      metadata: () => ({ provider: 'fixture', model: 'fixture' }),
      isAvailable: () => true,
      runStructured: async () => ({
        output: { ...semanticKeep, unexpected: true },
      }),
    });
    await expect(model.classify(input)).rejects.toThrow('MODEL_OUTPUT_INVALID');
  });
});
