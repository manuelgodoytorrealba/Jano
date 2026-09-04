export type IdentityDisposition =
  | 'EXISTING_ENTITY'
  | 'ALIAS_OR_DUPLICATE'
  | 'NEW_ENTITY_HIGH_CONFIDENCE'
  | 'POSSIBLE_ENTITY'
  | 'MENTION_ONLY';

export type IdentityCandidate = {
  title: string;
  type?: string;
  aliases?: string[];
  dates?: string[];
  creator?: string;
  location?: string;
  externalIds?: Record<string, string>;
  sourceContext?: string;
  meaningful?: boolean;
  independentlyIdentifiable?: boolean;
};

export type CanonicalIdentity = IdentityCandidate & { id: string };

export type IdentityResolution = {
  disposition: IdentityDisposition;
  canonicalEntityId?: string;
  candidates: Array<{ id: string; title: string; signals: string[]; conflicts: string[] }>;
  confidence: number;
  humanReviewRequired: boolean;
  reason: string;
};

const normalize = (value?: string) =>
  (value ?? '')
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

export class EntityIdentityResolver {
  resolve(candidate: IdentityCandidate, catalog: CanonicalIdentity[]): IdentityResolution {
    if (!candidate.meaningful || !candidate.independentlyIdentifiable)
      return {
        disposition: 'MENTION_ONLY',
        candidates: [],
        confidence: 0.98,
        humanReviewRequired: false,
        reason: 'The mention does not merit an independently navigable cultural entity.',
      };

    const title = normalize(candidate.title);
    const matches = catalog
      .map((entity) => {
        const canonicalTitle = normalize(entity.title);
        const aliases = (entity.aliases ?? []).map(normalize);
        const signals: string[] = [];
        const conflicts: string[] = [];
        if (title === canonicalTitle) signals.push('TITLE_EXACT');
        if (aliases.includes(title)) signals.push('ALIAS_EXACT');
        if (candidate.type && entity.type && candidate.type === entity.type)
          signals.push('TYPE_MATCH');
        else if (candidate.type && entity.type) conflicts.push('TYPE_CONFLICT');
        for (const [system, value] of Object.entries(candidate.externalIds ?? {})) {
          if (entity.externalIds?.[system] === value) signals.push(`EXTERNAL_ID:${system}`);
        }
        if ((candidate.dates ?? []).some((date) => entity.dates?.includes(date)))
          signals.push('DATE_MATCH');
        if (candidate.creator && normalize(candidate.creator) === normalize(entity.creator))
          signals.push('CREATOR_MATCH');
        if (candidate.location && normalize(candidate.location) === normalize(entity.location))
          signals.push('LOCATION_MATCH');
        return { id: entity.id, title: entity.title, signals, conflicts };
      })
      .filter((match) => match.signals.length);

    const exact = matches.filter((match) =>
      match.signals.some((signal) => signal === 'TITLE_EXACT' || signal.startsWith('EXTERNAL_ID:')),
    );
    if (exact.length === 1 && !exact[0].conflicts.length)
      return {
        disposition: 'EXISTING_ENTITY',
        canonicalEntityId: exact[0].id,
        candidates: exact,
        confidence: 0.99,
        humanReviewRequired: false,
        reason: 'A unique canonical identity is established by exact stable signals.',
      };

    const alias = matches.filter((match) => match.signals.includes('ALIAS_EXACT'));
    if (alias.length || exact.length > 1)
      return {
        disposition: 'ALIAS_OR_DUPLICATE',
        candidates: alias.length ? alias : exact,
        confidence: 0.9,
        humanReviewRequired: true,
        reason: 'One or more canonical duplicate candidates require a human survivor decision.',
      };

    if (candidate.type && candidate.sourceContext?.trim())
      return {
        disposition: 'NEW_ENTITY_HIGH_CONFIDENCE',
        candidates: [],
        confidence: 0.85,
        humanReviewRequired: true,
        reason: 'The independently identifiable cultural entity has type and documentary context.',
      };

    return {
      disposition: 'POSSIBLE_ENTITY',
      candidates: matches,
      confidence: 0.45,
      humanReviewRequired: true,
      reason: 'Identity evidence is insufficient for canonical creation or resolution.',
    };
  }
}
