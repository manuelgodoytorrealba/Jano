import type { AIProviderPort, AIStructuredRequest } from '../ai/ai.provider';
import {
  DeterministicSemanticEvidenceClassifier,
  type SemanticEvidenceInput,
  type SemanticEvidenceResult,
  type RelevanceRole,
  type EvidenceDecision,
  validateEvidenceProposition,
  STRUCTURED_REFERENCE_PURPOSE,
} from './semantic-evidence-classifier';

export type ClassificationMode = 'DETERMINISTIC_ONLY' | 'SEMANTIC_ONLY' | 'HYBRID';
export type SemanticModelOutput = {
  relevanceRole: RelevanceRole;
  evidenceProposition: {
    statement: string;
    supportedDimension: string;
    evidenceRole: string;
  } | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  decision: EvidenceDecision;
  reason: string;
  supportSpan: { start: number; end: number; text: string } | null;
};

export interface SemanticEvidenceModel {
  classify(input: SemanticEvidenceInput): Promise<SemanticModelOutput>;
}

export class AIProviderSemanticEvidenceModel implements SemanticEvidenceModel {
  constructor(private readonly provider: AIProviderPort) {}
  async classify(input: SemanticEvidenceInput): Promise<SemanticModelOutput> {
    const request: AIStructuredRequest = {
      task: 'semantic_evidence_classification',
      schemaVersion: 'semantic-evidence-v1',
      input: {
        sourcePurpose: input.sourcePurpose,
        source: { title: input.source.title, locator: input.source.locator },
        excerpt: input.excerpt,
        candidateEntity: input.candidateEntity,
        relationContext: input.relationContext ?? null,
      },
      outputSchema: {
        type: 'object',
        required: [
          'relevanceRole',
          'evidenceProposition',
          'confidence',
          'decision',
          'reason',
          'supportSpan',
        ],
      },
      maxOutputTokens: 500,
    };
    return (await this.provider.runStructured(request)).output as SemanticModelOutput;
  }
}

export class HybridSemanticEvidenceClassifier {
  constructor(
    private readonly semanticModel?: SemanticEvidenceModel,
    private readonly deterministic = new DeterministicSemanticEvidenceClassifier(),
  ) {}

  async classify(
    input: SemanticEvidenceInput,
    mode: ClassificationMode = 'HYBRID',
  ): Promise<
    SemanticEvidenceResult & { supportSpan: { start: number; end: number; text: string } | null }
  > {
    const safety = await this.deterministic.classify(input);
    if (mode === 'DETERMINISTIC_ONLY' || !this.semanticModel)
      return {
        ...safety,
        supportSpan: safety.evidenceProposition
          ? this.spanFor(input.excerpt, safety.evidenceProposition.statement)
          : null,
      };
    if (
      safety.decision === 'REJECT' &&
      (input.sourcePurpose === STRUCTURED_REFERENCE_PURPOSE || safety.signals.noise === 1)
    )
      return { ...safety, supportSpan: null };
    const semantic = await this.semanticModel.classify(input);
    const propositionValid = validateEvidenceProposition(semantic.evidenceProposition, input).valid;
    const supportValid = Boolean(
      semantic.supportSpan &&
      input.excerpt.slice(semantic.supportSpan.start, semantic.supportSpan.end) ===
        semantic.supportSpan.text,
    );
    if (mode === 'SEMANTIC_ONLY')
      return {
        ...semantic,
        evidenceProposition: propositionValid ? semantic.evidenceProposition : null,
        decision:
          semantic.decision === 'KEEP' && (!propositionValid || !supportValid)
            ? 'REVIEW'
            : semantic.decision,
        supportSpan: supportValid ? semantic.supportSpan : null,
        signals: safety.signals,
      };
    if (semantic.decision === 'KEEP' && safety.decision !== 'KEEP')
      return {
        ...semantic,
        decision:
          propositionValid && supportValid && safety.decision !== 'REJECT' ? 'REVIEW' : 'REVIEW',
        evidenceProposition: propositionValid ? semantic.evidenceProposition : null,
        supportSpan: supportValid ? semantic.supportSpan : null,
        signals: safety.signals,
        reason: 'Semantic KEEP downgraded because deterministic safety was not a KEEP.',
      };
    if (!propositionValid || !supportValid)
      return {
        ...semantic,
        decision: semantic.decision === 'REJECT' ? 'REJECT' : 'REVIEW',
        evidenceProposition: propositionValid ? semantic.evidenceProposition : null,
        supportSpan: supportValid ? semantic.supportSpan : null,
        signals: safety.signals,
        reason: 'Proposition or support span failed deterministic validation.',
      };
    return { ...semantic, signals: safety.signals, supportSpan: semantic.supportSpan };
  }

  private spanFor(excerpt: string, statement: string) {
    const start = excerpt.indexOf(statement);
    return start < 0 ? null : { start, end: start + statement.length, text: statement };
  }
}
