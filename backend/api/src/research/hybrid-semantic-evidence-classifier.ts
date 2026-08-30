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

export type SemanticOutputErrorCode =
  | 'MODEL_OUTPUT_INVALID'
  | 'MODEL_OUTPUT_TRUNCATED'
  | 'INVALID_ENUM'
  | 'INVALID_SUPPORT_SPAN'
  | 'INVALID_PROPOSITION'
  | 'MISSING_REQUIRED_FIELD'
  | 'OTHER';

export class SemanticModelOutputError extends Error {
  constructor(
    public readonly code: SemanticOutputErrorCode,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = 'SemanticModelOutputError';
  }
}

const RELEVANCE_ROLES: RelevanceRole[] = [
  'PRIMARY_SUBJECT',
  'ABOUT',
  'CONTEXT_FOR',
  'SUPPORTS_RELATION',
  'MENTION',
  'UNRELATED',
];
const DECISIONS: EvidenceDecision[] = ['KEEP', 'REVIEW', 'REJECT'];
const CONFIDENCES = ['HIGH', 'MEDIUM', 'LOW'] as const;
const SUPPORTED_DIMENSIONS = [
  'definition',
  'definition / chronology',
  'identity',
  'identity / chronology',
  'identity / provenance',
  'identity / visual context',
  'origin',
  'characteristics',
  'characteristics / origin',
  'context',
  'context / characteristics',
  'context / related concepts',
  'cultural context',
  'historical context',
  'architectural context',
  'examples / context',
  'influence / form',
  'interpretation',
  'provenance / commission',
] as const;

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim())
    throw new SemanticModelOutputError('MISSING_REQUIRED_FIELD', `${field} is required.`);
  if (value.length > maxLength)
    throw new SemanticModelOutputError(
      'MODEL_OUTPUT_INVALID',
      `${field} exceeds ${maxLength} characters.`,
    );
  return value.trim();
}

function parseSemanticModelOutput(value: unknown, excerpt: string): SemanticModelOutput {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new SemanticModelOutputError('MODEL_OUTPUT_INVALID', 'Output must be a JSON object.');
  const raw = value as Record<string, unknown>;
  const allowed = new Set([
    'decision',
    'relevanceRole',
    'evidenceProposition',
    'confidence',
    'reason',
    'supportSpan',
  ]);
  const unknown = Object.keys(raw).find((key) => !allowed.has(key));
  if (unknown)
    throw new SemanticModelOutputError('MODEL_OUTPUT_INVALID', `Unexpected property: ${unknown}.`);
  const decision = raw.decision;
  if (!DECISIONS.includes(decision as EvidenceDecision))
    throw new SemanticModelOutputError('INVALID_ENUM', 'decision is not a supported value.');
  const relevanceRole = raw.relevanceRole;
  if (!RELEVANCE_ROLES.includes(relevanceRole as RelevanceRole))
    throw new SemanticModelOutputError('INVALID_ENUM', 'relevanceRole is not a supported value.');
  const confidence = raw.confidence;
  if (!CONFIDENCES.includes(confidence as (typeof CONFIDENCES)[number]))
    throw new SemanticModelOutputError('INVALID_ENUM', 'confidence is not a supported value.');
  const reason = requiredString(raw.reason, 'reason', 500);
  let evidenceProposition: SemanticModelOutput['evidenceProposition'] = null;
  if (raw.evidenceProposition !== null) {
    if (!raw.evidenceProposition || typeof raw.evidenceProposition !== 'object')
      throw new SemanticModelOutputError(
        'INVALID_PROPOSITION',
        'evidenceProposition must be object or null.',
      );
    const proposition = raw.evidenceProposition as Record<string, unknown>;
    const propositionKeys = Object.keys(proposition);
    if (
      propositionKeys.some(
        (key) => !['statement', 'supportedDimension', 'evidenceRole'].includes(key),
      )
    )
      throw new SemanticModelOutputError(
        'MODEL_OUTPUT_INVALID',
        'Unexpected proposition property.',
      );
    const statement = requiredString(proposition.statement, 'evidenceProposition.statement', 500);
    const supportedDimension = requiredString(
      proposition.supportedDimension,
      'supportedDimension',
      80,
    );
    if (!SUPPORTED_DIMENSIONS.includes(supportedDimension as (typeof SUPPORTED_DIMENSIONS)[number]))
      throw new SemanticModelOutputError('INVALID_ENUM', 'supportedDimension is not supported.');
    const evidenceRole = requiredString(proposition.evidenceRole, 'evidenceRole', 80);
    evidenceProposition = { statement, supportedDimension, evidenceRole };
  }
  let supportSpan: SemanticModelOutput['supportSpan'] = null;
  if (raw.supportSpan !== null) {
    if (!raw.supportSpan || typeof raw.supportSpan !== 'object')
      throw new SemanticModelOutputError(
        'INVALID_SUPPORT_SPAN',
        'supportSpan must be object or null.',
      );
    const span = raw.supportSpan as Record<string, unknown>;
    if (Object.keys(span).some((key) => !['start', 'end', 'text'].includes(key)))
      throw new SemanticModelOutputError(
        'MODEL_OUTPUT_INVALID',
        'Unexpected supportSpan property.',
      );
    if (![span.start, span.end].every((item) => Number.isInteger(item)))
      throw new SemanticModelOutputError(
        'INVALID_SUPPORT_SPAN',
        'supportSpan offsets must be integers.',
      );
    const start = span.start as number;
    const end = span.end as number;
    const text = requiredString(span.text, 'supportSpan.text', 500);
    if (start < 0 || end <= start || end > excerpt.length || excerpt.slice(start, end) !== text)
      throw new SemanticModelOutputError(
        'INVALID_SUPPORT_SPAN',
        'supportSpan must match the excerpt literally.',
      );
    supportSpan = { start, end, text };
  }
  if (decision === 'KEEP' && (!evidenceProposition || !supportSpan))
    throw new SemanticModelOutputError(
      'INVALID_PROPOSITION',
      'KEEP requires proposition and supportSpan.',
    );
  return {
    decision: decision as EvidenceDecision,
    relevanceRole: relevanceRole as RelevanceRole,
    evidenceProposition,
    confidence: confidence as SemanticModelOutput['confidence'],
    reason,
    supportSpan,
  };
}

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
        additionalProperties: false,
        properties: {
          decision: { type: 'string', enum: DECISIONS },
          relevanceRole: { type: 'string', enum: RELEVANCE_ROLES },
          evidenceProposition: {
            type: ['object', 'null'],
            additionalProperties: false,
            properties: {
              statement: { type: 'string', minLength: 20, maxLength: 500 },
              supportedDimension: { type: 'string', enum: SUPPORTED_DIMENSIONS },
              evidenceRole: { type: 'string', minLength: 1, maxLength: 80 },
            },
            required: ['statement', 'supportedDimension', 'evidenceRole'],
          },
          confidence: { type: 'string', enum: CONFIDENCES },
          reason: { type: 'string', minLength: 1, maxLength: 500 },
          supportSpan: {
            type: ['object', 'null'],
            additionalProperties: false,
            properties: {
              start: { type: 'integer', minimum: 0 },
              end: { type: 'integer', minimum: 1 },
              text: { type: 'string', minLength: 1, maxLength: 500 },
            },
            required: ['start', 'end', 'text'],
          },
        },
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
    const result = await this.provider.runStructured(request);
    return parseSemanticModelOutput(result.output, input.excerpt);
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
    let semantic: SemanticModelOutput;
    try {
      semantic = await this.semanticModel.classify(input);
    } catch (error) {
      const code: SemanticOutputErrorCode =
        error instanceof SemanticModelOutputError
          ? error.code
          : /TRUNCATED|finishReason=length/i.test(String(error))
            ? 'MODEL_OUTPUT_TRUNCATED'
            : 'MODEL_OUTPUT_INVALID';
      const reason =
        error instanceof SemanticModelOutputError
          ? error.message
          : `${code}: provider output could not be validated.`;
      return {
        ...safety,
        decision: safety.decision === 'REJECT' ? 'REJECT' : 'REVIEW',
        evidenceProposition: null,
        supportSpan: null,
        reason,
      };
    }
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
