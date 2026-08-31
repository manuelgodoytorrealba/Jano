import type { AIProviderPort, AIStructuredRequest } from '../ai/ai.provider';
import {
  DeterministicSemanticEvidenceClassifier,
  type EvidenceDecision,
  type RelevanceRole,
  type SemanticEvidenceInput,
  type SemanticEvidenceResult,
  type UnsupportedAdditionSeverity,
  validateEvidenceProposition,
} from './semantic-evidence-classifier';

export type ClassificationMode = 'DETERMINISTIC_ONLY' | 'SEMANTIC_ONLY' | 'HYBRID';
export const SUPPORTED_DIMENSIONS = [
  'DEFINITION_OR_IDENTITY',
  'CHRONOLOGY',
  'PLACE',
  'FORM_OR_MATERIAL',
  'PRACTICE_OR_METHOD',
  'HISTORICAL_CONTEXT',
  'RELATION',
  'INTERPRETATION',
  'RECEPTION_OR_LEGACY',
  'PROVENANCE_OR_COMMISSION',
] as const;
export type SupportedDimension = (typeof SUPPORTED_DIMENSIONS)[number];

export type SemanticModelOutput = {
  decision: EvidenceDecision;
  relevanceRole: RelevanceRole;
  supportQuote: string | null;
  evidenceProposition: string | null;
  supportedDimension: SupportedDimension | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
};

export type SupportQuoteStatus =
  | 'VALID_EXACT'
  | 'VALID_NORMALIZED'
  | 'AMBIGUOUS'
  | 'INVALID'
  | 'MISSING';
export type SupportQuoteResolution = {
  status: SupportQuoteStatus;
  span: { start: number; end: number; text: string } | null;
};
export type SemanticEvidenceV3Result = SemanticEvidenceResult & {
  supportQuote: string | null;
  supportQuoteStatus: SupportQuoteStatus;
  supportSpan: { start: number; end: number; text: string } | null;
  propositionPresentLiteral: boolean;
  unsupportedAddition: UnsupportedAdditionSeverity;
  uncertaintyPreserved: boolean;
  entityCentered: boolean;
  atomic: boolean;
  reviewKind: 'MODEL_REVIEW' | 'SYSTEM_FAILSAFE_REVIEW' | null;
  compositionSource:
    | 'DETERMINISTIC_SAFE_KEEP'
    | 'DETERMINISTIC_HARD_REJECT'
    | 'DETERMINISTIC_ONLY'
    | 'SEMANTIC_RECOVERY'
    | 'SEMANTIC_DECISION';
};
export type SemanticEvidenceV2Result = SemanticEvidenceV3Result;

export type SemanticOutputErrorCode =
  | 'MODEL_OUTPUT_INVALID'
  | 'MODEL_OUTPUT_TRUNCATED'
  | 'INVALID_ENUM'
  | 'INVALID_SUPPORT_QUOTE'
  | 'AMBIGUOUS_SUPPORT_QUOTE'
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
const KEEP_RELEVANCE_ROLES: RelevanceRole[] = [
  'PRIMARY_SUBJECT',
  'ABOUT',
  'CONTEXT_FOR',
  'SUPPORTS_RELATION',
];
const DECISIONS: EvidenceDecision[] = ['KEEP', 'REVIEW', 'REJECT'];
const CONFIDENCES = ['HIGH', 'MEDIUM', 'LOW'] as const;

export const ROLE_CONTRACT = {
  PRIMARY_SUBJECT: {
    definition: 'The excerpt is mainly about the candidate entity.',
    positive: 'A paragraph defines a movement and describes its principal traits.',
    negative: 'A paragraph about an artist only names the movement once.',
    boundary:
      'Use ABOUT when the entity receives substantive information but is not the main subject.',
  },
  ABOUT: {
    definition: 'The excerpt provides substantive information directly about the candidate.',
    positive: 'A broader exhibition text explains a material used by the candidate artwork.',
    negative: 'The candidate is only present in a list of related names.',
    boundary: 'Use CONTEXT_FOR when the principal claim concerns something else.',
  },
  CONTEXT_FOR: {
    definition:
      'The main claim concerns something else but supplies necessary context for the candidate.',
    positive: 'A documented political event explains the setting in which an artwork was made.',
    negative: 'A generic period fact has no demonstrated bearing on the candidate.',
    boundary:
      'Context may be KEEP or REVIEW; use ABOUT when the claim is directly about the candidate.',
  },
  SUPPORTS_RELATION: {
    definition:
      'The excerpt explicitly supports a relation involving the candidate and another identifiable entity.',
    positive: 'A source explicitly states that a named movement influenced a named artist.',
    negative: 'Two names occur in the same paragraph without a stated connection.',
    boundary:
      'The candidate must participate explicitly; otherwise classify the entity actually discussed.',
  },
  MENTION: {
    definition: 'The candidate appears but receives no substantive knowledge.',
    positive: 'The candidate occurs in a list of participants.',
    negative: 'The sentence attributes a documented practice to the candidate.',
    boundary: 'MENTION normally leads to REJECT; use ABOUT only for reusable knowledge.',
  },
  UNRELATED: {
    definition: 'There is no sufficient editorial relation to the candidate.',
    positive: 'The fragment concerns logistics unrelated to the candidate.',
    negative: 'The fragment supplies documented context needed to understand the candidate.',
    boundary: 'Use MENTION when the candidate at least appears.',
  },
} as const;

export const DECISION_CONTRACT = {
  KEEP: 'Reusable editorial knowledge with clear entity relevance, exact quote, atomic entailed proposition, complete provenance, preserved uncertainty and no unsupported addition.',
  REVIEW:
    'Potential editorial value with real ambiguity about entity focus, interpretation, uncertainty, dimension, relation, proposition scope or Source appropriateness.',
  REJECT: 'Irrelevant, mention-only, noisy, insufficient, incompatible or hard-gated content.',
  boundary:
    'When choosing between KEEP and REJECT because value is plausible but support is ambiguous, choose REVIEW. REVIEW is an editorial decision, not a JSON-error fallback.',
} as const;

export const DIMENSION_CONTRACT: Record<
  SupportedDimension,
  { definition: string; example: string; nonExample: string }
> = {
  DEFINITION_OR_IDENTITY: {
    definition: 'What the entity is or the identifying facts that distinguish it.',
    example: 'A concise definition of a cultural practice.',
    nonExample: "A later critic's response to that practice.",
  },
  CHRONOLOGY: {
    definition: 'When the entity existed, happened, developed or changed.',
    example: 'A documented date range for a period.',
    nonExample: 'The city where an event occurred.',
  },
  PLACE: {
    definition: 'A documented geographic or spatial fact directly relevant to the entity.',
    example: 'The documented location where an artwork was produced.',
    nonExample: 'A list of unrelated venues.',
  },
  FORM_OR_MATERIAL: {
    definition: 'Observable form, composition, technique or material.',
    example: 'The material and visible construction of an object.',
    nonExample: 'Its later critical reputation.',
  },
  PRACTICE_OR_METHOD: {
    definition: 'How an artist, movement, institution or cultural practice works.',
    example: 'A documented working method used to make a body of work.',
    nonExample: 'A birth date.',
  },
  HISTORICAL_CONTEXT: {
    definition: 'Documented social, political or cultural context needed to understand it.',
    example: 'A political condition directly shaping a cultural event.',
    nonExample: 'A generic fact from the same century with no demonstrated relevance.',
  },
  RELATION: {
    definition: 'An explicit, evidenced relation involving the candidate and another entity.',
    example: 'A source explicitly documents collaboration between two creators.',
    nonExample: 'Two names merely listed together.',
  },
  INTERPRETATION: {
    definition: 'A sourced interpretation whose uncertainty and attribution are preserved.',
    example: 'A scholar suggests a possible ritual meaning.',
    nonExample: 'An unsupported assertion of ritual purpose.',
  },
  RECEPTION_OR_LEGACY: {
    definition: 'Documented reception, influence, later significance or legacy.',
    example: 'A documented account of later critical reception.',
    nonExample: 'The original material of the work.',
  },
  PROVENANCE_OR_COMMISSION: {
    definition: 'Commission, ownership, custody, attribution or provenance history.',
    example: 'A documented commission by an institution.',
    nonExample: 'A formal description of the finished object.',
  },
};

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

function optionalString(
  raw: Record<string, unknown>,
  field: string,
  maxLength: number,
): string | null {
  if (!(field in raw))
    throw new SemanticModelOutputError('MISSING_REQUIRED_FIELD', `${field} is required.`);
  return raw[field] === null ? null : requiredString(raw[field], field, maxLength);
}

function parseSemanticModelOutput(value: unknown): SemanticModelOutput {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new SemanticModelOutputError('MODEL_OUTPUT_INVALID', 'Output must be a JSON object.');
  const raw = value as Record<string, unknown>;
  const allowed = new Set([
    'decision',
    'relevanceRole',
    'supportQuote',
    'evidenceProposition',
    'supportedDimension',
    'confidence',
    'reason',
  ]);
  const unknown = Object.keys(raw).find((key) => !allowed.has(key));
  if (unknown)
    throw new SemanticModelOutputError('MODEL_OUTPUT_INVALID', `Unexpected property: ${unknown}.`);

  const decision = raw.decision;
  if (!DECISIONS.includes(decision as EvidenceDecision))
    throw new SemanticModelOutputError('INVALID_ENUM', 'decision is not a supported value.');
  const relevanceRole = raw.relevanceRole;
  if (!RELEVANCE_ROLES.includes(relevanceRole as RelevanceRole))
    throw new SemanticModelOutputError('INVALID_ENUM', 'relevanceRole is not supported.');
  const confidence = raw.confidence;
  if (!CONFIDENCES.includes(confidence as (typeof CONFIDENCES)[number]))
    throw new SemanticModelOutputError('INVALID_ENUM', 'confidence is not supported.');

  const supportQuote = optionalString(raw, 'supportQuote', 500);
  const evidenceProposition = optionalString(raw, 'evidenceProposition', 500);
  if (!('supportedDimension' in raw))
    throw new SemanticModelOutputError('MISSING_REQUIRED_FIELD', 'supportedDimension is required.');
  const supportedDimension = raw.supportedDimension;
  if (
    supportedDimension !== null &&
    !SUPPORTED_DIMENSIONS.includes(supportedDimension as SupportedDimension)
  )
    throw new SemanticModelOutputError('INVALID_ENUM', 'supportedDimension is not supported.');
  const reason = requiredString(raw.reason, 'reason', 500);

  if (decision === 'KEEP' && (!supportQuote || !evidenceProposition || !supportedDimension))
    throw new SemanticModelOutputError(
      'INVALID_PROPOSITION',
      'KEEP requires supportQuote, evidenceProposition and supportedDimension.',
    );

  return {
    decision: decision as EvidenceDecision,
    relevanceRole: relevanceRole as RelevanceRole,
    supportQuote,
    evidenceProposition,
    supportedDimension: supportedDimension as SupportedDimension | null,
    confidence: confidence as SemanticModelOutput['confidence'],
    reason,
  };
}

function occurrences(value: string, search: string): number[] {
  const matches: number[] = [];
  for (let cursor = 0; search && cursor <= value.length - search.length; ) {
    const index = value.indexOf(search, cursor);
    if (index < 0) break;
    matches.push(index);
    cursor = index + Math.max(1, search.length);
  }
  return matches;
}

function normalizedExcerpt(value: string) {
  const text: string[] = [];
  const ranges: Array<{ start: number; end: number }> = [];
  const segments = new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(value);
  for (const item of segments) {
    const end = item.index + item.segment.length;
    if (/^\s+$/u.test(item.segment)) {
      if (text.at(-1) === ' ') ranges[ranges.length - 1].end = end;
      else {
        text.push(' ');
        ranges.push({ start: item.index, end });
      }
      continue;
    }
    const normalized = item.segment.normalize('NFC');
    text.push(normalized);
    for (let index = 0; index < normalized.length; index += 1)
      ranges.push({ start: item.index, end });
  }
  return { text: text.join(''), ranges };
}

export function resolveSupportQuote(
  excerpt: string,
  supportQuote: string | null,
): SupportQuoteResolution {
  if (!supportQuote?.trim()) return { status: 'MISSING', span: null };
  const quote = supportQuote.trim();
  const exact = occurrences(excerpt, quote);
  if (exact.length > 1) return { status: 'AMBIGUOUS', span: null };
  if (exact.length === 1)
    return {
      status: 'VALID_EXACT',
      span: { start: exact[0], end: exact[0] + quote.length, text: quote },
    };

  const normalizedQuote = quote.normalize('NFC').replace(/\s+/gu, ' ').trim();
  const normalized = normalizedExcerpt(excerpt);
  const matches = occurrences(normalized.text, normalizedQuote);
  if (matches.length > 1) return { status: 'AMBIGUOUS', span: null };
  if (matches.length === 0) return { status: 'INVALID', span: null };
  const startRange = normalized.ranges[matches[0]];
  const endRange = normalized.ranges[matches[0] + normalizedQuote.length - 1];
  if (!startRange || !endRange) return { status: 'INVALID', span: null };
  const span = {
    start: startRange.start,
    end: endRange.end,
    text: excerpt.slice(startRange.start, endRange.end),
  };
  return { status: 'VALID_NORMALIZED', span };
}

export interface SemanticEvidenceModel {
  classify(input: SemanticEvidenceInput): Promise<SemanticModelOutput>;
}

export class AIProviderSemanticEvidenceModel implements SemanticEvidenceModel {
  constructor(private readonly provider: AIProviderPort) {}

  async classify(input: SemanticEvidenceInput): Promise<SemanticModelOutput> {
    const request: AIStructuredRequest = {
      task: 'semantic_evidence_classification',
      schemaVersion: 'semantic-evidence-v3',
      input: {
        contractRules: [
          'supportQuote must be copied literally from excerpt or be null; never calculate offsets.',
          'evidenceProposition is one atomic claim centered on candidateEntity and may strictly paraphrase supportQuote.',
          'Do not add facts, dates, places, causality, intention, influence or interpretation absent from supportQuote and excerpt.',
          'Preserve uncertainty: may, might, could, probably, perhaps, likely, thought, interpreted and similar wording must remain uncertain in the proposition.',
          'A proposition for candidateEntity must concern that entity directly, provide necessary context for it, or state a relation in which it explicitly participates.',
          'KEEP requires a documentary quote, a supported proposition, a compatible relevance role and HIGH or MEDIUM confidence.',
          'When value is plausible but entity focus, interpretation, uncertainty, dimension, relation, scope or Source suitability is ambiguous, choose REVIEW rather than forcing KEEP or REJECT.',
          'Decision and relevanceRole are independent: CONTEXT_FOR may be KEEP or REVIEW; MENTION normally leads to REJECT.',
        ],
        roleContract: ROLE_CONTRACT,
        decisionContract: DECISION_CONTRACT,
        dimensionContract: DIMENSION_CONTRACT,
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
          supportQuote: { type: ['string', 'null'], minLength: 1, maxLength: 500 },
          evidenceProposition: {
            type: ['string', 'null'],
            minLength: 20,
            maxLength: 500,
          },
          supportedDimension: {
            type: ['string', 'null'],
            enum: [...SUPPORTED_DIMENSIONS, null],
          },
          confidence: { type: 'string', enum: CONFIDENCES },
          reason: { type: 'string', minLength: 1, maxLength: 500 },
        },
        required: [
          'decision',
          'relevanceRole',
          'supportQuote',
          'evidenceProposition',
          'supportedDimension',
          'confidence',
          'reason',
        ],
      },
      maxOutputTokens: 500,
    };
    const result = await this.provider.runStructured(request);
    return parseSemanticModelOutput(result.output);
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
  ): Promise<SemanticEvidenceV3Result> {
    const safety = await this.deterministic.classify(input);
    if (mode === 'DETERMINISTIC_ONLY' || !this.semanticModel) {
      return this.deterministicResult(input, safety, 'DETERMINISTIC_ONLY');
    }

    if (safety.deterministicClass === 'HARD_REJECT')
      return this.deterministicResult(input, safety, 'DETERMINISTIC_HARD_REJECT');

    if (mode === 'HYBRID' && safety.deterministicClass === 'SAFE_KEEP')
      return this.deterministicResult(input, safety, 'DETERMINISTIC_SAFE_KEEP');

    let semantic: SemanticModelOutput;
    try {
      semantic = await this.semanticModel.classify(input);
    } catch (error) {
      const code = this.errorCode(error);
      return {
        ...safety,
        decision: 'REVIEW',
        evidenceProposition: null,
        supportQuote: null,
        supportQuoteStatus: 'MISSING',
        supportSpan: null,
        propositionPresentLiteral: false,
        unsupportedAddition: 'NONE',
        uncertaintyPreserved: false,
        entityCentered: false,
        atomic: false,
        reviewKind: 'SYSTEM_FAILSAFE_REVIEW',
        compositionSource: 'SEMANTIC_DECISION',
        reason:
          error instanceof SemanticModelOutputError
            ? error.message
            : `${code}: provider output could not be validated.`,
      };
    }

    const quote = resolveSupportQuote(input.excerpt, semantic.supportQuote);
    const proposition =
      semantic.evidenceProposition && semantic.supportedDimension
        ? {
            statement: semantic.evidenceProposition,
            supportedDimension: semantic.supportedDimension,
            evidenceRole: 'PARAPHRASED_DOCUMENTARY_SUPPORT',
          }
        : null;
    const propositionValidation = proposition
      ? validateEvidenceProposition(
          proposition,
          input,
          quote.span?.text ?? semantic.supportQuote ?? '',
          semantic.relevanceRole,
        )
      : {
          valid: false,
          reason: 'Missing proposition.',
          presentLiteral: false,
          unsupportedAddition: 'NONE' as const,
          uncertaintyPreserved: true,
          entityCentered: true,
          atomic: true,
        };
    const quoteValid = quote.status === 'VALID_EXACT' || quote.status === 'VALID_NORMALIZED';
    const keepEligible =
      semantic.decision === 'KEEP' &&
      quoteValid &&
      propositionValidation.valid &&
      Boolean(proposition) &&
      KEEP_RELEVANCE_ROLES.includes(semantic.relevanceRole) &&
      semantic.confidence !== 'LOW' &&
      Boolean(input.excerpt && input.source.title && input.candidateEntity.id);
    const decision = keepEligible ? 'KEEP' : semantic.decision === 'REJECT' ? 'REJECT' : 'REVIEW';
    const reviewKind =
      decision !== 'REVIEW'
        ? null
        : semantic.decision === 'REVIEW'
          ? 'MODEL_REVIEW'
          : 'SYSTEM_FAILSAFE_REVIEW';

    return {
      ...semantic,
      decision,
      evidenceProposition: propositionValidation.valid ? proposition : null,
      supportQuote: semantic.supportQuote,
      supportQuoteStatus: quote.status,
      supportSpan: quoteValid ? quote.span : null,
      propositionPresentLiteral: propositionValidation.presentLiteral,
      unsupportedAddition: propositionValidation.unsupportedAddition,
      uncertaintyPreserved: propositionValidation.uncertaintyPreserved,
      entityCentered: propositionValidation.entityCentered,
      atomic: propositionValidation.atomic,
      reviewKind,
      compositionSource:
        decision === 'KEEP' && safety.deterministicClass === 'UNCERTAIN'
          ? 'SEMANTIC_RECOVERY'
          : 'SEMANTIC_DECISION',
      signals: safety.signals,
      deterministicClass: safety.deterministicClass,
      deterministicReasonCode: safety.deterministicReasonCode,
      reason:
        semantic.decision === 'KEEP' && !keepEligible
          ? this.downgradeReason(quote.status, propositionValidation.reason)
          : semantic.reason,
    };
  }

  private deterministicResult(
    input: SemanticEvidenceInput,
    safety: SemanticEvidenceResult,
    compositionSource: SemanticEvidenceV3Result['compositionSource'],
  ): SemanticEvidenceV3Result {
    const supportQuote = safety.evidenceProposition?.statement ?? null;
    const resolution = resolveSupportQuote(input.excerpt, supportQuote);
    return {
      ...safety,
      supportQuote,
      supportQuoteStatus: resolution.status,
      supportSpan: resolution.span,
      propositionPresentLiteral: Boolean(safety.evidenceProposition),
      unsupportedAddition: 'NONE',
      uncertaintyPreserved: true,
      entityCentered: true,
      atomic: true,
      reviewKind: null,
      compositionSource,
    };
  }

  private downgradeReason(status: SupportQuoteStatus, propositionReason: string): string {
    if (status === 'AMBIGUOUS')
      return 'AMBIGUOUS_SUPPORT_QUOTE: supportQuote occurs more than once.';
    if (status === 'INVALID' || status === 'MISSING')
      return 'INVALID_SUPPORT_QUOTE: supportQuote cannot be verified in excerpt.';
    return `INVALID_PROPOSITION: ${propositionReason}`;
  }

  private errorCode(error: unknown): SemanticOutputErrorCode {
    if (error instanceof SemanticModelOutputError) return error.code;
    const message = String(error);
    if (/TRUNCATED|finishReason=length/i.test(message)) return 'MODEL_OUTPUT_TRUNCATED';
    if (/INVALID_ENUM/i.test(message)) return 'INVALID_ENUM';
    if (/INVALID_SUPPORT_QUOTE/i.test(message)) return 'INVALID_SUPPORT_QUOTE';
    if (/AMBIGUOUS_SUPPORT_QUOTE/i.test(message)) return 'AMBIGUOUS_SUPPORT_QUOTE';
    if (/INVALID_PROPOSITION/i.test(message)) return 'INVALID_PROPOSITION';
    if (/MISSING_REQUIRED_FIELD/i.test(message)) return 'MISSING_REQUIRED_FIELD';
    return 'MODEL_OUTPUT_INVALID';
  }
}
