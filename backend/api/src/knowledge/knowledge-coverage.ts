import { createHash } from 'node:crypto';

export type CoverageState = 'MISSING' | 'WEAK' | 'ADEQUATE' | 'STRONG';
export type CoverageDimension =
  | 'IDENTITY'
  | 'DOCUMENTARY_SOURCES'
  | 'CANONICAL_KNOWLEDGE'
  | 'RELATIONS'
  | 'CHRONOLOGY'
  | 'PRACTICE_OR_CHARACTERISTICS'
  | 'RECEPTION_OR_CONTEXT'
  | 'MEDIA'
  | 'EDITORIAL'
  | 'PROVENANCE';
export type ResearchNeed =
  | 'NEEDS_DOCUMENTARY_SOURCE'
  | 'NEEDS_IDENTITY_DEPTH'
  | 'NEEDS_CHRONOLOGY'
  | 'NEEDS_RELATIONS'
  | 'NEEDS_RECEPTION'
  | 'NEEDS_MEDIA'
  | 'NEEDS_EDITORIAL_REGENERATION'
  | 'NEEDS_PROVENANCE_DEPTH';

export type CoverageInput = {
  id: string;
  title: string;
  type: string;
  kind?: string | null;
  status: string;
  startYear?: number | null;
  endYear?: number | null;
  summary?: string | null;
  content?: string | null;
  contentLevel?: string | null;
  sources: number;
  citations: number;
  assertions: number;
  attributes: number;
  relations: number;
  media: number;
  contextAssertions?: number;
};

const state = (value: number, adequate: number, strong: number): CoverageState =>
  value <= 0 ? 'MISSING' : value < adequate ? 'WEAK' : value < strong ? 'ADEQUATE' : 'STRONG';

const chronologyApplies = (type: string) =>
  /ARTIST|ARTWORK|MOVEMENT|PERIOD|EVENT|PERSON|WORK/.test(type);

export function computeCoverage(input: CoverageInput) {
  const dimensions: Record<
    CoverageDimension,
    { state: CoverageState; why: string; applicable: boolean }
  > = {
    IDENTITY: {
      state:
        input.title && input.type && input.kind
          ? 'STRONG'
          : input.title && input.type
            ? 'ADEQUATE'
            : 'MISSING',
      why: input.kind
        ? 'Canonical title, type and knowledge kind are present.'
        : 'Knowledge kind or canonical identity depth is missing.',
      applicable: true,
    },
    DOCUMENTARY_SOURCES: {
      state: state(input.sources, 2, 3),
      why: `${input.sources} documentary SourceRef(s).`,
      applicable: true,
    },
    CANONICAL_KNOWLEDGE: {
      state: state(input.assertions + input.attributes, 2, 5),
      why: `${input.assertions} assertion(s) and ${input.attributes} structured attribute(s).`,
      applicable: true,
    },
    RELATIONS: {
      state: state(input.relations, 3, 8),
      why: `${input.relations} canonical relation(s).`,
      applicable: true,
    },
    CHRONOLOGY: {
      state:
        input.startYear || input.endYear
          ? input.startYear && input.endYear
            ? 'STRONG'
            : 'ADEQUATE'
          : 'MISSING',
      why:
        input.startYear || input.endYear
          ? 'At least one canonical chronology boundary is present.'
          : 'No canonical chronology boundary is present.',
      applicable: chronologyApplies(`${input.type} ${input.kind ?? ''}`),
    },
    PRACTICE_OR_CHARACTERISTICS: {
      state: state(input.attributes + input.assertions, 2, 5),
      why: 'Derived from canonical attributes and assertions, never generated prose.',
      applicable: true,
    },
    RECEPTION_OR_CONTEXT: {
      state: state(input.contextAssertions ?? 0, 1, 3),
      why: `${input.contextAssertions ?? 0} context/reception assertion(s).`,
      applicable: true,
    },
    MEDIA: {
      state: input.media ? (input.media >= 2 ? 'STRONG' : 'ADEQUATE') : 'MISSING',
      why: `${input.media} canonical media link(s).`,
      applicable: true,
    },
    EDITORIAL: {
      state:
        input.summary && input.content
          ? input.contentLevel === 'ADVANCED'
            ? 'STRONG'
            : 'ADEQUATE'
          : input.summary || input.content
            ? 'WEAK'
            : 'MISSING',
      why:
        input.summary && input.content
          ? `Summary and ${input.contentLevel ?? 'unlevelled'} content are present.`
          : 'Summary or body content is incomplete.',
      applicable: true,
    },
    PROVENANCE: {
      state: state(input.citations + input.sources, 2, 5),
      why: `${input.citations} citation(s) and ${input.sources} SourceRef(s).`,
      applicable: true,
    },
  };
  const needs = new Set<ResearchNeed>();
  if (dimensions.DOCUMENTARY_SOURCES.state !== 'STRONG') needs.add('NEEDS_DOCUMENTARY_SOURCE');
  if (dimensions.IDENTITY.state === 'MISSING' || dimensions.IDENTITY.state === 'WEAK')
    needs.add('NEEDS_IDENTITY_DEPTH');
  if (dimensions.CHRONOLOGY.applicable && dimensions.CHRONOLOGY.state === 'MISSING')
    needs.add('NEEDS_CHRONOLOGY');
  if (dimensions.RELATIONS.state === 'MISSING' || dimensions.RELATIONS.state === 'WEAK')
    needs.add('NEEDS_RELATIONS');
  if (dimensions.RECEPTION_OR_CONTEXT.state === 'MISSING') needs.add('NEEDS_RECEPTION');
  if (dimensions.MEDIA.state === 'MISSING') needs.add('NEEDS_MEDIA');
  if (dimensions.EDITORIAL.state === 'MISSING' || dimensions.EDITORIAL.state === 'WEAK')
    needs.add('NEEDS_EDITORIAL_REGENERATION');
  if (dimensions.PROVENANCE.state === 'MISSING' || dimensions.PROVENANCE.state === 'WEAK')
    needs.add('NEEDS_PROVENANCE_DEPTH');
  const applicable = Object.values(dimensions).filter((item) => item.applicable);
  const rank: Record<CoverageState, number> = { MISSING: 0, WEAK: 1, ADEQUATE: 2, STRONG: 3 };
  const mean = applicable.reduce((sum, item) => sum + rank[item.state], 0) / applicable.length;
  const overall: CoverageState =
    mean < 0.75 ? 'MISSING' : mean < 1.5 ? 'WEAK' : mean < 2.5 ? 'ADEQUATE' : 'STRONG';
  const contextFingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return { entityId: input.id, overall, dimensions, needs: [...needs], contextFingerprint };
}

export function researchPriority(profile: ReturnType<typeof computeCoverage>, relations: number) {
  const missing = Object.values(profile.dimensions).filter(
    (item) => item.applicable && item.state === 'MISSING',
  ).length;
  const weak = Object.values(profile.dimensions).filter(
    (item) => item.applicable && item.state === 'WEAK',
  ).length;
  const orphanRisk = relations === 0 ? 20 : relations === 1 ? 8 : 0;
  return missing * 10 + weak * 4 + orphanRisk;
}
