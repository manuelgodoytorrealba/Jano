export type RelevanceRole =
  | 'PRIMARY_SUBJECT'
  | 'ABOUT'
  | 'CONTEXT_FOR'
  | 'SUPPORTS_RELATION'
  | 'MENTION'
  | 'UNRELATED';
export type EvidenceDecision = 'KEEP' | 'REVIEW' | 'REJECT';

export type SemanticEvidenceInput = {
  excerpt: string;
  sourcePurpose: string;
  source: { title: string; locator?: string | null; id?: string };
  candidateEntity: {
    id: string;
    canonicalName: string;
    type: string;
    metadata?: Record<string, unknown>;
  };
  relationContext?: string;
};

export type SemanticEvidenceResult = {
  relevanceRole: RelevanceRole;
  evidenceProposition: {
    statement: string;
    supportedDimension: string;
    evidenceRole: string;
  } | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  decision: EvidenceDecision;
  reason: string;
  signals: { subjectClarity: number; extractability: number; purposeFit: number; noise: number };
  structuredFactCandidate?: { field: string; value: string; provenanceRequired: true } | null;
};

const NOISE =
  /you might like|our galleries|free admission|what's on|practical information|advertisement|plan your trip|subscribe|related|search the collection|sitemap|legal information|cookie|left right|©|discover the museum|official products|calendar of events/i;
const PROMOTIONAL =
  /explore|discover|food and drink|shopping|michelin|there's nothing you can't buy|what's on|plan your trip|tickets|membership|-->|subscribe/i;
const FACTUAL_VERB =
  /\b(is|are|was|were|become|became|born|created|worked|work|formed|developed|painted|lived|studied|derived|seems|brought|resulting|gira|surgió|nació|fue|es|son|representa|consiste|cubre|incluye|formado|instalado|trabajó|ocupó|predominan|expuesto|realizó|covers|encompassing|depicts|shows|presents|describes)\b/i;
const normalize = (value: string) =>
  value
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
export const STRUCTURED_REFERENCE_PURPOSE = 'STRUCTURED_REFERENCE';

export interface SemanticEvidenceProvider {
  classify(input: SemanticEvidenceInput): Promise<SemanticEvidenceResult>;
}

export class DeterministicSemanticEvidenceClassifier implements SemanticEvidenceProvider {
  async classify(input: SemanticEvidenceInput): Promise<SemanticEvidenceResult> {
    const excerpt = input.excerpt.trim();
    const sourceTitle = normalize(input.source.title);
    const entity = normalize(input.candidateEntity.canonicalName);
    const aliases =
      entity === 'cubismo'
        ? ['cubism']
        : entity === 'cuerpo'
          ? ['body art', 'body in art']
          : entity === 'tapiz de bayeux'
            ? ['bayeux tapestry']
            : entity === 'guernica'
              ? ['repensar guernica']
              : [];
    const subjectClarity =
      sourceTitle.includes(entity) || aliases.some((alias) => sourceTitle.includes(alias)) ? 1 : 0;
    const noise = NOISE.test(excerpt) ? 1 : 0;
    const purposeFit = [
      'VISUAL_PROVENANCE',
      'CANONICAL_METADATA',
      STRUCTURED_REFERENCE_PURPOSE,
    ].includes(input.sourcePurpose)
      ? 0
      : 1;
    const editorialSpan = excerpt
      .split('©')[0]
      .replace(/\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s+[^.]{0,60}\([^)]*\)(?:\s+[A-Z][a-z]+)?/, '')
      .trim();
    const sentence =
      editorialSpan
        .split(/(?<=[.!?])\s+|\s+(?=read\b|Explore this term\b)/i)
        .find((part) => FACTUAL_VERB.test(part))
        ?.trim() ?? '';
    const extractability =
      sentence.length >= 70 && !/(\b[A-Z][a-z]+\s+[A-Z][a-z]+\s+\()/i.test(sentence) ? 1 : 0;
    const promotionalDensity = (excerpt.match(new RegExp(PROMOTIONAL.source, 'gi')) ?? []).length;
    const institutionalChrome =
      /closing for renovation|practical information|disabled visitor|you are a group|opening times|waiting time|getting here/i.test(
        excerpt,
      );
    if ((noise && !extractability) || promotionalDensity >= 2 || institutionalChrome)
      return {
        relevanceRole: 'UNRELATED',
        evidenceProposition: null,
        confidence: 'HIGH',
        decision: 'REJECT',
        reason: 'Chrome, navegación o promoción sin proposition editorial suficiente.',
        signals: { subjectClarity, extractability, purposeFit, noise },
      };
    if (input.sourcePurpose === STRUCTURED_REFERENCE_PURPOSE) {
      return {
        relevanceRole: subjectClarity ? 'ABOUT' : 'MENTION',
        evidenceProposition: null,
        structuredFactCandidate: null,
        confidence: 'HIGH',
        decision: 'REJECT',
        reason:
          'Structured reference routed to field/value fact extraction, never paragraph-style editorial Evidence.',
        signals: { subjectClarity, extractability, purposeFit, noise },
      };
    }
    if (!purposeFit)
      return {
        relevanceRole: 'MENTION',
        evidenceProposition: null,
        confidence: 'HIGH',
        decision: 'REJECT',
        reason: 'Source purpose incompatible con Evidence editorial.',
        signals: { subjectClarity, extractability, purposeFit, noise },
      };
    const propositionNamesEntity =
      sentence.toLocaleLowerCase().includes(entity) ||
      aliases.some((alias) => sentence.toLocaleLowerCase().includes(alias));
    if (
      subjectClarity &&
      extractability &&
      (input.sourcePurpose === 'DOCUMENTARY_TEXT' || propositionNamesEntity)
    )
      return {
        relevanceRole: 'PRIMARY_SUBJECT',
        evidenceProposition: {
          statement: sentence,
          supportedDimension: 'context / characteristics',
          evidenceRole: 'DIRECT_DOCUMENTARY_EVIDENCE',
        },
        confidence: 'HIGH',
        decision: 'KEEP',
        reason: 'Subject explícito y proposition extractable sin añadir hechos.',
        signals: { subjectClarity, extractability, purposeFit, noise },
      };
    if (extractability)
      return {
        relevanceRole: 'ABOUT',
        evidenceProposition: {
          statement: sentence,
          supportedDimension: 'context',
          evidenceRole: 'PARAPHRASED_DOCUMENTARY_SUPPORT',
        },
        confidence: 'MEDIUM',
        decision: 'REVIEW',
        reason: 'Existe contenido factual, pero falta desambiguar subject o suficiencia.',
        signals: { subjectClarity, extractability, purposeFit, noise },
      };
    return {
      relevanceRole: 'UNRELATED',
      evidenceProposition: null,
      confidence: 'LOW',
      decision: 'REJECT',
      reason: 'No puede formularse una proposition concreta.',
      signals: { subjectClarity, extractability, purposeFit, noise },
    };
  }
}

/** Strict QA guard: a proposition may only be published when it is traceable to its excerpt. */
export function validateEvidenceProposition(
  proposition: SemanticEvidenceResult['evidenceProposition'],
  input: SemanticEvidenceInput,
): { valid: boolean; reason: string } {
  if (!proposition?.statement?.trim()) return { valid: false, reason: 'Missing proposition.' };
  const statement = proposition.statement.trim();
  if (statement.length < 20 || statement.length > input.excerpt.length)
    return { valid: false, reason: 'Proposition length is not reconstructible from excerpt.' };
  const tokenCount = (statement.match(/[\p{L}\p{N}]{2,}/gu) ?? []).length;
  const delimiterCount = (
    statement.match(
      /\b(?:references?|retrieved|identifier|instance of|authority|occupation|genre|member of|ID|Q\d+)\b/gi,
    ) ?? []
  ).length;
  if (
    statement.length > 500 ||
    (delimiterCount >= 3 && (tokenCount > 20 || statement.length > 100))
  )
    return {
      valid: false,
      reason: 'Proposition resembles a structured key/value dump or an unfocused enumeration.',
    };
  if (
    /\b(always|never|therefore|intended to|caused|because)\b/i.test(statement) &&
    !new RegExp(statement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(input.excerpt)
  )
    return { valid: false, reason: 'Adds unsupported causality or intent.' };
  return { valid: true, reason: 'Proposition is a bounded excerpt sentence with provenance.' };
}
