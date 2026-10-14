/** Predicate contracts are not authorization to promote canonical knowledge. */
export const RELATION_CONTRACTS: Record<string, string> = {
  CREATED_BY:
    'Work/content → creator (ARTIST/PERSON/ORGANIZATION). Authorship only; never parenthood, teaching or influence.',
  BELONGS_TO_MOVEMENT:
    'Member/work → MOVEMENT. Explicit artistic membership/classification; never period, place or co-occurrence.',
  BELONGS_TO_PERIOD:
    'Entity → PERIOD. Explicit temporal classification; never movement membership, residence or generic association.',
  ABOUT_CONCEPT:
    'Entity/content → CONCEPT. Substantively explores the concept, not merely mentions it.',
  LOCATED_IN:
    'Object/institution → PLACE or holding institution. Physical location; not residence biography or movement membership.',
  RELATED_TO:
    'Symmetric substantive documented connection. Never a fallback for co-occurrence or an unavailable precise predicate.',
  ASSOCIATED_WITH:
    'Symmetric explicit substantive association. Never replace residence, parenthood or unsupported membership.',
  MENTIONS:
    'Content/work → entity actually mentioned by that content. Website navigation is not the artwork speaking.',
  INSPIRED_BY:
    'Inspired entity → inspiration. Requires explicit inspiration, never a critic commenting on an artist.',
  INFLUENCED_BY:
    'Influenced entity → influencer. MOVEMENT → ARTIST is legitimate. Preserve partly, late work and all scope qualifiers.',
  PART_OF: 'Constituent → whole. Explicit structural inclusion, not generic association.',
  DEPICTS:
    'Representing work/content → represented subject. Not authorship or mere topic-page co-occurrence.',
  SIMILAR_TO: 'Symmetric documented comparison. Co-occurrence is insufficient.',
  USES_TECHNIQUE: 'Work/practice → technique CONCEPT. Requires actual use, not a related link.',
  USES_MATERIAL: 'Work/object → material CONCEPT. Requires actual material use.',
  HAS_SUBJECT: 'Work/content → subject. Requires substantive thematic support.',
  CURATED_WITH: 'Symmetric explicit curatorial grouping. Not inferred from a web page listing.',
};

export type RelationEndpoint = {
  id?: string;
  title: string;
  type: string;
  canonicalType?: string;
  blocked?: boolean;
};
export type MappingInput = {
  source: RelationEndpoint;
  target: RelationEndpoint;
  predicate: string | null;
  proposition: string;
  quotes: string[];
};
export type MappingOutcome =
  | 'VALID_RELATION'
  | 'ASSERTION_INSTEAD'
  | 'NO_SUPPORTED_RELATION'
  | 'REVIEW_MAPPING'
  | 'BLOCKED_BY_ENTITY';
export type MappingResult = Pick<
  MappingInput,
  'source' | 'target' | 'predicate' | 'proposition'
> & {
  classification: MappingOutcome;
  reason: string;
  compatibility: 'VALID' | 'REVIEW' | 'INVALID';
  entailment: 'SUPPORTED' | 'UNCERTAIN';
};

export function relationTypeCompatibility(
  predicate: string | null,
  source: RelationEndpoint,
  target: RelationEndpoint,
): 'VALID' | 'REVIEW' | 'INVALID' {
  if (!predicate || !RELATION_CONTRACTS[predicate]) return 'REVIEW';
  const from = source.canonicalType ?? source.type;
  const to = target.canonicalType ?? target.type;
  if (source.id && source.id === target.id) return 'INVALID';
  if (predicate === 'BELONGS_TO_PERIOD')
    return to === 'PERIOD' ? 'VALID' : to === 'ABSTRACTION' ? 'REVIEW' : 'INVALID';
  if (predicate === 'BELONGS_TO_MOVEMENT')
    return to === 'MOVEMENT' ? 'VALID' : to === 'ABSTRACTION' ? 'REVIEW' : 'INVALID';
  if (predicate === 'CREATED_BY')
    return ['ARTWORK', 'WORK', 'ARTICLE'].includes(from) &&
      ['ARTIST', 'PERSON', 'ORGANIZATION'].includes(to)
      ? 'VALID'
      : 'INVALID';
  if (predicate === 'LOCATED_IN')
    return ['ARTWORK', 'WORK', 'ORGANIZATION'].includes(from) &&
      ['PLACE', 'ORGANIZATION'].includes(to)
      ? 'VALID'
      : 'INVALID';
  if (['ABOUT_CONCEPT', 'USES_TECHNIQUE', 'USES_MATERIAL'].includes(predicate))
    return to === 'CONCEPT' ? 'VALID' : to === 'ABSTRACTION' ? 'REVIEW' : 'INVALID';
  // Unusual influence/subject combinations need semantic evidence, not seed-matrix rejection.
  return 'VALID';
}

const normalize = (text: string) =>
  text.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/**
 * ponytail: deliberately narrow literal entailment. Unrecognized paraphrases go to review;
 * extend only with labeled fixtures, never with a model's self-reported confidence.
 * Matching the ENTIRE evidence unit avoids accepting quoted/negated/subordinate claims.
 */
export function mapRelation(input: MappingInput, allowReverse = true): MappingResult {
  const { source, target, predicate, proposition } = input;
  const compatibility = relationTypeCompatibility(predicate, source, target);
  const result = (classification: MappingOutcome, reason: string, supported = false) => ({
    classification,
    reason,
    compatibility,
    entailment: supported ? ('SUPPORTED' as const) : ('UNCERTAIN' as const),
    proposition,
    source,
    target,
    predicate,
  });
  if (source.blocked || target.blocked)
    return result('BLOCKED_BY_ENTITY', 'Endpoint requires identity review');
  if (!proposition.trim() || !input.quotes.some((quote) => quote.trim()))
    return result('NO_SUPPORTED_RELATION', 'No proposition or supporting evidence');
  if (
    allowReverse &&
    compatibility === 'INVALID' &&
    predicate &&
    ['BELONGS_TO_MOVEMENT', 'BELONGS_TO_PERIOD', 'CREATED_BY'].includes(predicate)
  ) {
    const reversed = mapRelation({ ...input, source: target, target: source }, false);
    if (reversed.classification === 'VALID_RELATION')
      return {
        ...reversed,
        reason: 'Direction normalized from explicit evidence, not mention order',
      };
  }
  const s = normalize(source.title);
  const t = normalize(target.title);
  const statements: Record<string, string[]> = {
    BELONGS_TO_MOVEMENT: [`${s} belongs to ${t}.`, `${s} pertenece al movimiento ${t}.`],
    BELONGS_TO_PERIOD: [`${s} belongs to the period ${t}.`, `${s} pertenece al periodo ${t}.`],
    CREATED_BY: [
      `${s} was created by ${t}.`,
      `${s} fue creado por ${t}.`,
      `${s} fue creada por ${t}.`,
    ],
    INFLUENCED_BY: [`${s} was influenced by ${t}.`, `${s} estuvo influido por ${t}.`],
  };
  const literal = input.quotes.some((quote) => normalize(quote) === normalize(proposition));
  if (
    literal &&
    predicate &&
    statements[predicate]?.includes(normalize(proposition)) &&
    compatibility === 'VALID'
  ) {
    return result(
      'VALID_RELATION',
      'Explicit full-unit affirmative proposition and compatible canonical direction',
      true,
    );
  }
  // Unsupported taxonomy intents remain CLAIM proposals, never a nearest-enum edge.
  if (literal && !predicate)
    return result(
      'ASSERTION_INSTEAD',
      'Literal supported proposition has no selected canonical predicate',
      true,
    );
  return result(
    'REVIEW_MAPPING',
    compatibility === 'INVALID'
      ? 'Predicate endpoint types/direction incompatible'
      : 'Independent semantic support not established',
  );
}
