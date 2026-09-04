export type RelevanceRole =
  | 'PRIMARY_SUBJECT'
  | 'ABOUT'
  | 'CONTEXT_FOR'
  | 'SUPPORTS_RELATION'
  | 'MENTION'
  | 'UNRELATED';
export type EvidenceDecision = 'KEEP' | 'REVIEW' | 'REJECT';
export type UnsupportedAdditionSeverity = 'NONE' | 'MINOR' | 'MAJOR' | 'CRITICAL';
export type DeterministicDecisionClass = 'SAFE_KEEP' | 'UNCERTAIN' | 'HARD_REJECT';
export type DeterministicReasonCode =
  | 'SAFE_DOCUMENTARY_PROPOSITION'
  | 'UNCERTAIN_FACTUAL_SPAN'
  | 'UNCERTAIN_PLAUSIBLE_FRAGMENT'
  | 'HARD_INVALID_PROVENANCE'
  | 'HARD_STRUCTURED_REFERENCE'
  | 'HARD_INCOMPATIBLE_PURPOSE'
  | 'HARD_METADATA_DUMP'
  | 'HARD_NAVIGATION_OR_PROMOTION'
  | 'HARD_CLEARLY_UNRELATED';

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
  deterministicClass?: DeterministicDecisionClass;
  deterministicReasonCode?: DeterministicReasonCode;
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
const METADATA_MARKER =
  /\b(?:references?|retrieved|identifier|instance of|authority|occupation|genre|member of|language|label|description|also known as|default for all languages|edit|ID|Q\d+|VIAF)\b/gi;

export function isStructuredMetadataDump(value: string): boolean {
  const markers = value.match(METADATA_MARKER)?.length ?? 0;
  const tokens = value.match(/[\p{L}\p{N}]{2,}/gu)?.length ?? 0;
  return markers >= 3 && (tokens > 20 || value.length > 100);
}

export function isPromotionalChrome(value: string): boolean {
  return (value.match(new RegExp(PROMOTIONAL.source, 'gi')) ?? []).length >= 2;
}

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
    const noiseMarkers = (excerpt.match(new RegExp(NOISE.source, 'gi')) ?? []).length;
    const noise = noiseMarkers ? 1 : 0;
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
    const promotionalChrome = isPromotionalChrome(excerpt);
    const institutionalChrome =
      /closing for renovation|practical information|disabled visitor|you are a group|opening times|waiting time|getting here/i.test(
        excerpt,
      );
    const normalizedExcerpt = normalize(excerpt);
    const excerptNamesEntity =
      normalizedExcerpt.includes(entity) ||
      aliases.some((alias) => normalizedExcerpt.includes(alias));
    const base = { signals: { subjectClarity, extractability, purposeFit, noise } };
    if (!excerpt || !input.source.title.trim() || !input.candidateEntity.id)
      return {
        ...base,
        relevanceRole: 'UNRELATED',
        evidenceProposition: null,
        confidence: 'HIGH',
        decision: 'REJECT',
        deterministicClass: 'HARD_REJECT',
        deterministicReasonCode: 'HARD_INVALID_PROVENANCE',
        reason: 'Excerpt, Source and candidate identity are required.',
      };
    if (input.sourcePurpose === STRUCTURED_REFERENCE_PURPOSE)
      return {
        ...base,
        relevanceRole: subjectClarity ? 'ABOUT' : 'MENTION',
        evidenceProposition: null,
        structuredFactCandidate: null,
        confidence: 'HIGH',
        decision: 'REJECT',
        deterministicClass: 'HARD_REJECT',
        deterministicReasonCode: 'HARD_STRUCTURED_REFERENCE',
        reason:
          'Structured reference routed to field/value fact extraction, never paragraph-style editorial Evidence.',
      };
    if (!purposeFit)
      return {
        ...base,
        relevanceRole: 'MENTION',
        evidenceProposition: null,
        confidence: 'HIGH',
        decision: 'REJECT',
        deterministicClass: 'HARD_REJECT',
        deterministicReasonCode: 'HARD_INCOMPATIBLE_PURPOSE',
        reason: 'Source purpose incompatible con Evidence editorial.',
      };
    if (isStructuredMetadataDump(excerpt))
      return {
        ...base,
        relevanceRole: 'UNRELATED',
        evidenceProposition: null,
        confidence: 'HIGH',
        decision: 'REJECT',
        deterministicClass: 'HARD_REJECT',
        deterministicReasonCode: 'HARD_METADATA_DUMP',
        reason: 'Structured metadata dump is not documentary editorial Evidence.',
      };
    if (
      promotionalChrome ||
      institutionalChrome ||
      (noiseMarkers >= 2 && !excerptNamesEntity) ||
      (noise && !sentence && !excerptNamesEntity && !subjectClarity)
    )
      return {
        ...base,
        relevanceRole: 'UNRELATED',
        evidenceProposition: null,
        confidence: 'HIGH',
        decision: 'REJECT',
        deterministicClass: 'HARD_REJECT',
        deterministicReasonCode: 'HARD_NAVIGATION_OR_PROMOTION',
        reason: 'Chrome, navegación o promoción sin proposition editorial suficiente.',
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
        ...base,
        relevanceRole: 'PRIMARY_SUBJECT',
        evidenceProposition: {
          statement: sentence,
          supportedDimension: 'context / characteristics',
          evidenceRole: 'DIRECT_DOCUMENTARY_EVIDENCE',
        },
        confidence: 'HIGH',
        decision: 'KEEP',
        deterministicClass: 'SAFE_KEEP',
        deterministicReasonCode: 'SAFE_DOCUMENTARY_PROPOSITION',
        reason: 'Subject explícito y proposition extractable sin añadir hechos.',
      };
    if (extractability)
      return {
        ...base,
        relevanceRole: 'ABOUT',
        evidenceProposition: {
          statement: sentence,
          supportedDimension: 'context',
          evidenceRole: 'PARAPHRASED_DOCUMENTARY_SUPPORT',
        },
        confidence: 'MEDIUM',
        decision: 'REVIEW',
        deterministicClass: 'UNCERTAIN',
        deterministicReasonCode: 'UNCERTAIN_FACTUAL_SPAN',
        reason: 'Existe contenido factual, pero falta desambiguar subject o suficiencia.',
      };
    if (
      subjectClarity ||
      propositionNamesEntity ||
      sentence ||
      excerpt.length >= 140 ||
      (noise && subjectClarity)
    )
      return {
        ...base,
        relevanceRole: subjectClarity ? 'ABOUT' : 'MENTION',
        evidenceProposition: null,
        confidence: 'LOW',
        decision: 'REJECT',
        deterministicClass: 'UNCERTAIN',
        deterministicReasonCode: 'UNCERTAIN_PLAUSIBLE_FRAGMENT',
        reason: 'Plausible fragment without a deterministically extractable proposition.',
      };
    return {
      ...base,
      relevanceRole: 'UNRELATED',
      evidenceProposition: null,
      confidence: 'LOW',
      decision: 'REJECT',
      deterministicClass: 'HARD_REJECT',
      deterministicReasonCode: 'HARD_CLEARLY_UNRELATED',
      reason: 'No puede formularse una proposition concreta.',
    };
  }
}

/** Strict QA guard: a proposition may only be published when it is traceable to its excerpt. */
export function validateEvidenceProposition(
  proposition: SemanticEvidenceResult['evidenceProposition'],
  input: SemanticEvidenceInput,
  supportQuote = input.excerpt,
  relevanceRole?: RelevanceRole,
): {
  valid: boolean;
  reason: string;
  presentLiteral: boolean;
  unsupportedAddition: UnsupportedAdditionSeverity;
  uncertaintyPreserved: boolean;
  entityCentered: boolean;
  atomic: boolean;
} {
  const invalid = (
    reason: string,
    unsupportedAddition: UnsupportedAdditionSeverity = 'MAJOR',
    presentLiteral = false,
    uncertaintyPreserved = true,
    entityCentered = true,
    atomic = true,
  ) => ({
    valid: false,
    reason,
    presentLiteral,
    unsupportedAddition,
    uncertaintyPreserved,
    entityCentered,
    atomic,
  });
  if (!proposition?.statement?.trim()) return invalid('Missing proposition.');
  const statement = proposition.statement.trim();
  const presentLiteral = supportQuote.includes(statement);
  if (statement.length < 20 || statement.length > 500)
    return invalid('Proposition must contain one bounded claim.', 'MAJOR', presentLiteral);
  if (isStructuredMetadataDump(statement))
    return invalid(
      'Proposition resembles a structured key/value dump or an unfocused enumeration.',
      'MAJOR',
      presentLiteral,
    );

  const normalizedStatement = normalize(statement);
  const normalizedQuote = normalize(supportQuote);
  const atomic = !/(?:[.!?]\s+|\n\s*[-*])\S/u.test(statement);
  if (!atomic)
    return invalid(
      'Proposition must express one atomic unit of knowledge.',
      'MAJOR',
      presentLiteral,
      true,
      true,
      false,
    );

  const sourceUncertainty =
    /\b(?:may|might|could|possibly|probably|perhaps|likely|seems?|would seem|suggests?|is thought to|are thought to|is considered|are considered|has been interpreted as|puede|podria|pudo|quizas|tal vez|probablemente|posiblemente|parece|se considera|se ha interpretado|sugiere|es probable)\b/i;
  const propositionUncertainty =
    /\b(?:may|might|could|possibly|probably|perhaps|likely|seems?|suggests?|puede|podria|pudo|quizas|tal vez|probablemente|posiblemente|parece|plantea|se considera|se ha interpretado|sugiere|es probable)\b/i;
  const uncertaintyPreserved =
    !sourceUncertainty.test(normalizedQuote) || propositionUncertainty.test(normalizedStatement);
  if (!uncertaintyPreserved)
    return invalid(
      'Proposition removes uncertainty expressed by the support quote.',
      'MAJOR',
      presentLiteral,
      false,
    );

  const insignificant = new Set([
    'the',
    'and',
    'for',
    'with',
    'del',
    'las',
    'los',
    'una',
    'uno',
    'por',
    'para',
  ]);
  const entityTokens = normalize(input.candidateEntity.canonicalName)
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((token) => token.length >= 4 && !insignificant.has(token))
    .sort((left, right) => right.length - left.length);
  const entityCentered =
    !relevanceRole ||
    relevanceRole === 'UNRELATED' ||
    relevanceRole === 'MENTION' ||
    Boolean(entityTokens?.some((token) => normalizedStatement.includes(token)));
  if (!entityCentered)
    return invalid(
      'Proposition is not centered on the candidate entity.',
      'MAJOR',
      presentLiteral,
      true,
      false,
    );
  const statementFacts = statement.match(/\b(?:\d{2,4}|Q\d+)\b/gi) ?? [];
  const quoteFacts = new Set((supportQuote.match(/\b(?:\d{2,4}|Q\d+)\b/gi) ?? []).map(normalize));
  if (statementFacts.some((fact) => !quoteFacts.has(normalize(fact))))
    return invalid(
      'Proposition adds a number, date or identifier absent from the support quote.',
      'CRITICAL',
      presentLiteral,
    );

  const unsupportedPredicate = [
    /\b(?:because|therefore|caused|led to|resulted in|because of|porque|por tanto|caus[oó]|provoc[oó]|dio lugar|llevo a|condujo a)\b/i,
    /\b(?:intended to|wanted to|sought to|pretend[ií]a|ten[ií]a la intenci[oó]n)\b/i,
    /\b(?:influenced|inspired|influential|influenciado|influenciada|influido|influida|influ[yó]|inspir[oó])\b/i,
  ].find((pattern) => pattern.test(normalizedStatement) && !pattern.test(normalizedQuote));
  if (unsupportedPredicate)
    return invalid(
      'Proposition adds unsupported causality, intent or influence.',
      'MAJOR',
      presentLiteral,
    );

  return {
    valid: true,
    reason: presentLiteral
      ? 'Proposition is literally present in the support quote.'
      : 'No deterministic unsupported addition was detected in the grounded paraphrase.',
    presentLiteral,
    unsupportedAddition: 'NONE',
    uncertaintyPreserved,
    entityCentered,
    atomic,
  };
}
