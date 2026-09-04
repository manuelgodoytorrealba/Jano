export type TargetStatus =
  | 'TARGET_CONFIRMED'
  | 'TARGET_LIKELY'
  | 'TARGET_AMBIGUOUS'
  | 'TARGET_MISMATCH'
  | 'TARGET_NOT_ENTITY_CENTERED'
  | 'MULTI_ENTITY_VALID';

export type TargetSubjectRole =
  | 'PRIMARY_SUBJECT'
  | 'ABOUT'
  | 'SUPPORTS_RELATION'
  | 'CONTEXT_FOR'
  | 'MENTION'
  | 'UNRESOLVED';

export type TargetCandidate = {
  id: string;
  name: string;
  type: string;
  aliases?: string[];
};

export type TargetRoutingInput = {
  excerptId: string;
  excerpt: string;
  candidate: TargetCandidate;
  catalog?: TargetCandidate[];
  sourceTitle?: string;
};

export type TargetRoutingResult = {
  excerptId: string;
  candidateEntityId?: string;
  candidateEntityName?: string;
  subjectRole: TargetSubjectRole;
  targetStatus: TargetStatus;
  targetConfidence: number;
  supportSpan: string | null;
  reason: string;
  alternateTargets: Array<{ id: string; name: string }>;
  promotionEligible: boolean;
  reviewRoute?: 'REROUTE_ENTITY' | 'RESOLVE_CONTEXT' | 'REVIEW';
};

const normalize = (value: string) =>
  value
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const entityNames = (candidate: TargetCandidate) =>
  [candidate.name, ...(candidate.aliases ?? [])].map(normalize).filter(Boolean);

const mentions = (text: string, candidate: TargetCandidate) => {
  const value = ` ${normalize(text)} `;
  return entityNames(candidate).some((name) => value.includes(` ${name} `));
};

const ARCHITECTURE =
  /\b(planta|alminar|mamposter[ií]a|campanario|torre|friso|arcos?|columnillas?|iglesia|fachada|nave|bóveda)\b/i;
const ARTWORK_TYPES = /^(ARTWORK|WORK)$/i;
const NOT_ENTITY_CENTERED =
  /\b(cookie|suscr[ií]b|men[uú]|entradas|horario|copyright|todos los derechos|newsletter)\b/i;

export class EntityTargetRouter {
  route(input: TargetRoutingInput): TargetRoutingResult {
    const excerpt = input.excerpt.trim();
    const alternateTargets = (input.catalog ?? [])
      .filter((item) => item.id !== input.candidate.id && mentions(excerpt, item))
      .map(({ id, name }) => ({ id, name }));
    const candidateMentioned = mentions(excerpt, input.candidate);
    const supportSpan = excerpt || null;
    const base = {
      excerptId: input.excerptId,
      candidateEntityId: input.candidate.id,
      candidateEntityName: input.candidate.name,
      supportSpan,
      alternateTargets,
    };

    if (!excerpt || NOT_ENTITY_CENTERED.test(excerpt))
      return {
        ...base,
        subjectRole: 'UNRESOLVED',
        targetStatus: 'TARGET_NOT_ENTITY_CENTERED',
        targetConfidence: 0.98,
        reason: 'The excerpt is empty or documentary chrome, not entity-centered evidence.',
        promotionEligible: false,
        reviewRoute: 'REVIEW',
      };

    if (
      ARTWORK_TYPES.test(input.candidate.type) &&
      ARCHITECTURE.test(excerpt) &&
      !candidateMentioned
    )
      return {
        ...base,
        subjectRole: 'CONTEXT_FOR',
        targetStatus: 'TARGET_MISMATCH',
        targetConfidence: 0.97,
        reason: 'The support span describes architecture rather than the candidate artwork.',
        promotionEligible: false,
        reviewRoute: alternateTargets.length ? 'REROUTE_ENTITY' : 'RESOLVE_CONTEXT',
      };

    if (candidateMentioned && alternateTargets.length)
      return {
        ...base,
        subjectRole: 'SUPPORTS_RELATION',
        targetStatus: 'MULTI_ENTITY_VALID',
        targetConfidence: 0.9,
        reason: 'The support span explicitly concerns the candidate and other known entities.',
        promotionEligible: true,
      };

    if (candidateMentioned)
      return {
        ...base,
        subjectRole: 'PRIMARY_SUBJECT',
        targetStatus: 'TARGET_CONFIRMED',
        targetConfidence: 0.98,
        reason: 'The support span explicitly names the candidate or a known alias.',
        promotionEligible: true,
      };

    if (alternateTargets.length)
      return {
        ...base,
        subjectRole: 'CONTEXT_FOR',
        targetStatus: 'TARGET_MISMATCH',
        targetConfidence: 0.95,
        reason: 'The support span names another known entity but not the candidate.',
        promotionEligible: false,
        reviewRoute: 'REROUTE_ENTITY',
      };

    const sourceNamesCandidate = input.sourceTitle
      ? entityNames(input.candidate).some((name) => normalize(input.sourceTitle!).includes(name))
      : false;
    if (sourceNamesCandidate && excerpt.length >= 80)
      return {
        ...base,
        subjectRole: 'ABOUT',
        targetStatus: 'TARGET_LIKELY',
        targetConfidence: 0.72,
        reason: 'The source is candidate-centered, but the support span needs contextual review.',
        promotionEligible: false,
        reviewRoute: 'RESOLVE_CONTEXT',
      };

    return {
      ...base,
      subjectRole: 'UNRESOLVED',
      targetStatus: 'TARGET_AMBIGUOUS',
      targetConfidence: 0.35,
      reason: 'No explicit subject can be resolved from the available support span.',
      promotionEligible: false,
      reviewRoute: 'RESOLVE_CONTEXT',
    };
  }
}
