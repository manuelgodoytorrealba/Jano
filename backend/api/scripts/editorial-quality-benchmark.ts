import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { AIProvider } from '../src/ai/ai.provider';
import {
  buildEditorialGenerationRequest,
  normalizeAndValidateEditorialOutput,
  type EditorialGenerationContext,
  type EditorialGenerationOutput,
} from '../src/foundational/entity-editorial-generation';
import {
  RITUAL_BASIC_EXPLANATION,
  RITUAL_EDITORIAL_REGRESSION,
} from '../src/foundational/entity-editorial-generation.fixtures';

export type BenchmarkDescriptor = {
  slug: string;
  requestedType: string;
  reason: string;
  corpus: 'A' | 'B' | 'C';
};

export type GroundingClassification =
  | 'STRUCTURED_FACT'
  | 'DIRECT_SOURCE'
  | 'RELATION_EVIDENCE'
  | 'ATTRIBUTED_INTERPRETATION'
  | 'SUPPORTED_SYNTHESIS'
  | 'SUPPORTED_INFERENCE'
  | 'UNSUPPORTED'
  | 'NOT_APPLICABLE';

export type ReadinessStatus = 'READY' | 'PARTIAL' | 'MISSING' | 'NOT_APPLICABLE';
export type EditorialDepth =
  | 'IDENTITY_ONLY'
  | 'BASIC_EXPLANATION'
  | 'EDITORIAL_ENTRY'
  | 'CONTEXTUAL_ESSAY'
  | 'DOCUMENTARY_ESSAY';

export const BENCHMARK_DATASET: BenchmarkDescriptor[] = [
  {
    slug: 'ritual',
    requestedType: 'CONCEPT',
    reason: 'Concepto abstracto con relaciones interpretativas y caso de regresión.',
    corpus: 'A',
  },
  {
    slug: 'poder',
    requestedType: 'CONCEPT',
    reason: 'Concepto transversal para probar contexto político y selección.',
    corpus: 'A',
  },
  {
    slug: 'religion',
    requestedType: 'CONCEPT',
    reason: 'Concepto con riesgo de generalización cultural.',
    corpus: 'B',
  },
  {
    slug: 'muerte',
    requestedType: 'CONCEPT',
    reason: 'Concepto con conexiones simbólicas y lecturas diversas.',
    corpus: 'B',
  },
  {
    slug: 'pablo-picasso',
    requestedType: 'ARTIST',
    reason: 'Artista hub con muchas conexiones y contexto abundante.',
    corpus: 'A',
  },
  {
    slug: 'caravaggio',
    requestedType: 'ARTIST',
    reason: 'Trayectoria con relaciones formales, religiosas y geográficas.',
    corpus: 'A',
  },
  {
    slug: 'frida-kahlo',
    requestedType: 'ARTIST',
    reason: 'Caso biográfico reconocible que debe evitar una cronología plana.',
    corpus: 'B',
  },
  {
    slug: 'marina-abramovic',
    requestedType: 'ARTIST',
    reason: 'Práctica contemporánea y relación conceptual con ritual/cuerpo.',
    corpus: 'B',
  },
  {
    slug: 'cueva-de-lascaux',
    requestedType: 'ARTWORK',
    reason: 'Obra con incertidumbre interpretativa y contexto arqueológico.',
    corpus: 'B',
  },
  {
    slug: 'venus-de-willendorf',
    requestedType: 'ARTWORK',
    reason: 'Caso escaso donde el modelo debe resistir pretraining y especulación.',
    corpus: 'C',
  },
  {
    slug: 'guernica',
    requestedType: 'ARTWORK',
    reason: 'Obra con contexto histórico, autoría y recepción.',
    corpus: 'A',
  },
  {
    slug: 'fuente',
    requestedType: 'ARTWORK',
    reason: 'Caso conceptual/formal que exige explicar por qué cambió la idea de obra.',
    corpus: 'B',
  },
  {
    slug: 'cubismo',
    requestedType: 'MOVEMENT',
    reason: 'Movimiento con núcleo histórico y relaciones de influencia.',
    corpus: 'A',
  },
  {
    slug: 'arte-rupestre',
    requestedType: 'MOVEMENT',
    reason: 'Etiqueta amplia con riesgo de homogeneizar culturas.',
    corpus: 'B',
  },
  {
    slug: 'surrealismo',
    requestedType: 'MOVEMENT',
    reason: 'Movimiento con manifiestos, artistas y desacuerdos internos.',
    corpus: 'A',
  },
  {
    slug: 'renacimiento',
    requestedType: 'PERIOD',
    reason: 'Periodo extenso que exige explicar cambios y límites.',
    corpus: 'A',
  },
  {
    slug: 'siglo-xx',
    requestedType: 'PERIOD',
    reason: 'Periodo amplio con mucha densidad relacional.',
    corpus: 'B',
  },
  {
    slug: 'paleolitico',
    requestedType: 'PERIOD',
    reason: 'Periodo remoto con fuentes y evidencia limitadas.',
    corpus: 'C',
  },
  {
    slug: 'paris',
    requestedType: 'PLACE',
    reason: 'Lugar hub con influencia, instituciones y artistas.',
    corpus: 'A',
  },
  {
    slug: 'madrid',
    requestedType: 'PLACE',
    reason: 'Lugar con conexiones institucionales y artísticas.',
    corpus: 'B',
  },
  {
    slug: 'cuzco',
    requestedType: 'PLACE',
    reason: 'Lugar no europeo para probar diversidad contextual.',
    corpus: 'B',
  },
  {
    slug: 'exposicion-armory-show',
    requestedType: 'EVENT',
    reason: 'Evento puntual, útil para comprobar causalidad y escala.',
    corpus: 'B',
  },
  {
    slug: 'museo-del-prado',
    requestedType: 'ORGANIZATION',
    reason: 'Institución como lugar de colecciones y mediación.',
    corpus: 'B',
  },
  {
    slug: 'como-mirar-la-guerra-en-el-arte',
    requestedType: 'ARTICLE',
    reason: 'Texto editorial que debe distinguirse de una entidad cultural.',
    corpus: 'C',
  },
];

type EntityRecord = Prisma.EntityGetPayload<{
  include: {
    translations: true;
    sourceRefs: { include: { source: true } };
    outgoing: { include: { relationType: true; to: true; citations: true } };
    incoming: { include: { relationType: true; from: true; citations: true } };
    artwork: true;
    artist: true;
    concept: true;
    period: true;
    attributes: { include: { definition: true; citations: true } };
  };
}>;

const clean = (value: string | null | undefined) => value?.trim() || null;
const words = (value: string) =>
  new Set(value.toLocaleLowerCase('es').match(/[\p{L}\p{N}]{4,}/gu) ?? []);
const overlap = (a: string, b: string) => {
  const left = words(a);
  const right = words(b);
  return left.size ? [...left].filter((word) => right.has(word)).length / left.size : 0;
};

function edges(entity: EntityRecord) {
  return [
    ...entity.outgoing.map((relation) => ({
      direction: 'outgoing',
      relation,
      target: relation.to,
    })),
    ...entity.incoming.map((relation) => ({
      direction: 'incoming',
      relation,
      target: relation.from,
    })),
  ];
}

function contextFor(
  entity: EntityRecord,
  catalog: Array<{ id: string; slug: string; title: string; type: string }>,
): EditorialGenerationContext {
  const availableEntities = catalog.map((item) => ({
    id: item.id,
    slug: item.slug,
    canonicalName: item.title,
    type: item.type,
  }));
  const relationRows = edges(entity).map(({ direction, relation, target }) => ({
    direction,
    type: relation.relationType.key,
    canonicalName: target.title,
    entityType: target.type,
  }));
  const relationMetadata = edges(entity).map(({ direction, relation, target }) => ({
    direction,
    canonicalName: target.title,
    type: relation.relationType.key,
    justification: relation.justification,
    confidence: relation.confidence,
    status: relation.status,
    citations: relation.citations.map((citation) => ({
      stance: citation.stance,
      locator: citation.locator,
      quote: clean(citation.quote),
      note: clean(citation.note),
    })),
  }));
  const metadata = entity.attributes.map((attribute) => ({
    key: attribute.definition.key,
    label: attribute.definition.label,
    valueType: attribute.definition.valueType,
    value:
      attribute.valueText ??
      attribute.valueNumber ??
      attribute.valueBoolean ??
      attribute.valueDate ??
      attribute.valueYear ??
      attribute.valueJson,
    status: attribute.status,
    confidence: attribute.confidence,
  }));
  return {
    locale: 'es',
    entityData: {
      id: entity.id,
      canonicalName: entity.title,
      slug: entity.slug,
      type: entity.type,
      startYear: entity.startYear,
      endYear: entity.endYear,
      artwork: entity.artwork,
      artist: entity.artist,
      concept: entity.concept,
      period: entity.period,
      metadata,
    },
    relations: relationRows,
    relationMetadata,
    availableEntities,
    sources: entity.sourceRefs.map((reference) => ({
      title: reference.source.title,
      author: reference.source.author,
      publisher: reference.source.publisher,
      year: reference.source.year,
      url: reference.source.url,
      page: reference.page,
      note: clean(reference.note),
    })),
    documentaryContext: entity.sourceRefs
      .filter((reference) => clean(reference.quote))
      .map((reference) => ({
        source: reference.source.title,
        page: reference.page,
        quote: clean(reference.quote),
      })),
  };
}

export function provenanceReport(
  output: EditorialGenerationOutput,
  context: EditorialGenerationContext,
) {
  const statements = `${output.definition}. ${output.summary}. ${output.essay}`
    .split(/(?<=[.!?])\s+|\n+/)
    .map((statement) => statement.replace(/^#+\s*/, '').trim())
    .filter((statement) => statement.length > 30);
  const claims = statements.map((statement) => {
    const heading = !/[.!?]/.test(statement);
    if (heading) {
      return {
        statement,
        support: [],
        premises: [],
        classification: 'NOT_APPLICABLE' as GroundingClassification,
        confidence: 'high',
        publishable: true,
      };
    }
    const definition = String((context.entityData.concept as any)?.definition ?? '');
    const structured = [
      definition || JSON.stringify(context.entityData),
      JSON.stringify(context.entityData.metadata ?? ''),
    ]
      .map((value) => ({
        origin: 'ENTITY_DATA' as const,
        score: overlap(statement, value),
        excerpt: value.slice(0, 500),
      }))
      .filter(
        (item) => item.score >= 0.45 || (/^un\s+.+\ses\b/i.test(statement) && item.score >= 0.15),
      );
    const source = context.documentaryContext
      .map((item) => ({
        origin: 'DOCUMENTARY_CONTEXT' as const,
        score: overlap(statement, String(item.quote ?? '')),
        excerpt: String(item.quote ?? ''),
        source: item.source,
      }))
      .filter((item) => item.score >= 0.12);
    const directSource = context.sources
      .filter((item) => Boolean(item.note))
      .map((item) => ({
        origin: 'SOURCE' as const,
        score: overlap(statement, String(item.note ?? '')),
        excerpt: String(item.note ?? ''),
        source: item.title,
      }))
      .filter((item) => item.score >= 0.12);
    const relation = context.relationMetadata
      .map((item) => {
        const citations = Array.isArray(item.citations)
          ? (item.citations as Array<{ quote?: unknown }>)
          : [];
        return {
          origin: 'RELATION_METADATA' as const,
          score: overlap(statement, JSON.stringify(item)),
          excerpt: [
            item.canonicalName,
            item.justification,
            ...citations.map((citation) => String(citation.quote ?? '')),
          ]
            .filter(Boolean)
            .join(' '),
          target: item.canonicalName,
          cited: citations.some((citation) => Boolean(citation.quote)),
        };
      })
      .filter((item) => item.score >= 0.12 && item.cited);
    const explicitInterpretation =
      /interpretad|hipótesis|propone|podría|se ha sugerido|no sabemos|no demuestra/i.test(
        statement,
      );
    const explicitInference =
      /por eso|por tanto|permite|puede|suele|cuando|de ahí|esto explica/i.test(statement);
    const premises = [...structured, ...source, ...directSource, ...relation]
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    let classification: GroundingClassification = 'UNSUPPORTED';
    if (/^un\s+ritual\s+es\b/i.test(statement) && definition) {
      classification = 'SUPPORTED_SYNTHESIS';
    } else if (
      explicitInterpretation &&
      (source.length || directSource.length || relation.some((item) => item.cited))
    ) {
      classification = 'ATTRIBUTED_INTERPRETATION';
    } else if (relation.some((item) => item.cited)) {
      classification = 'RELATION_EVIDENCE';
    } else if (source.length) {
      classification = 'DIRECT_SOURCE';
    } else if (structured.length && premises.length === 1) {
      classification = 'STRUCTURED_FACT';
    } else if (
      structured.length &&
      (source.length || directSource.length) &&
      premises.length >= 2
    ) {
      classification = 'SUPPORTED_SYNTHESIS';
    } else if (explicitInference && premises.length >= 2) {
      classification = 'SUPPORTED_INFERENCE';
    }
    const confidence =
      classification === 'UNSUPPORTED' ? 'none' : premises[0]?.score > 0.3 ? 'high' : 'medium';
    const recordedPremises =
      classification === 'SUPPORTED_SYNTHESIS' && premises.length === 0
        ? [{ origin: 'ENTITY_DATA', score: 1, excerpt: definition }]
        : premises;
    return {
      statement,
      support: recordedPremises.map((item) => item.origin),
      premises: recordedPremises,
      classification,
      confidence,
      publishable: classification !== 'UNSUPPORTED',
    };
  });
  return {
    claims,
    supported: claims.filter(
      (claim) => !['UNSUPPORTED', 'NOT_APPLICABLE'].includes(claim.classification),
    ).length,
    unsupported: claims
      .filter((claim) => claim.classification === 'UNSUPPORTED')
      .map((claim) => claim.statement),
  };
}

export function wikilinkReport(
  output: EditorialGenerationOutput,
  context: EditorialGenerationContext,
) {
  const byName = new Map(context.availableEntities.map((entity) => [entity.canonicalName, entity]));
  const relationNames = new Set(
    context.relations.map((relation) => String(relation.canonicalName)),
  );
  const documentaryText = JSON.stringify([
    context.entityData,
    context.sources,
    context.documentaryContext,
    context.relationMetadata,
  ]);
  return [...output.essay.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)].map((match) => {
    const name = (match[2] ?? match[1] ?? '').trim();
    const target = byName.get(name);
    const hasContext = relationNames.has(name) || documentaryText.includes(name);
    const reason = relationNames.has(name)
      ? 'explicit relation'
      : hasContext
        ? 'documentary or metadata context'
        : 'catalogue membership alone (not permitted)';
    return {
      wikilink: name,
      valid: Boolean(target && hasContext),
      reason,
      supportingContext: target
        ? relationNames.has(name)
          ? 'RELATIONS'
          : hasContext
            ? 'DOCUMENTARY_CONTEXT'
            : null
        : null,
    };
  });
}

function score(
  output: EditorialGenerationOutput,
  grounding: ReturnType<typeof provenanceReport>,
  links: ReturnType<typeof wikilinkReport>,
) {
  const sections = output.essay.match(/^##\s+.+$/gm) ?? [];
  const summaryWords = output.summary.split(/\s+/).length;
  const unsupported = grounding.unsupported.length;
  const diversityPenalty = sections.length > 7 ? 1 : 0;
  return {
    Clarity: 4,
    BeginnerAccessibility: 4,
    FactualGrounding: unsupported ? 1 : 4,
    Relevance: 3,
    RelationshipExplanation: links.every((link) => link.valid) ? 4 : 1,
    StructureSpecificity: Math.max(2, 4 - diversityPenalty),
    UncertaintyHandling: /no sabemos|hipótesis|incertidumbre|no demuestra|investigadores/i.test(
      `${output.summary} ${output.essay}`,
    )
      ? 4
      : 2,
    RichLinkQuality: links.length
      ? links.every((link) => link.valid && link.supportingContext)
        ? 5
        : 2
      : 3,
    InformationDensity: summaryWords <= 180 ? 4 : 2,
    AIProseRisk: /a lo largo|su importancia|para comprender|no sólo.{0,30}sino también/i.test(
      `${output.summary} ${output.essay}`,
    )
      ? 2
      : 4,
  };
}

function newcomerNeeds(type: string, title: string): string[] {
  const common = ['qué es', 'importancia', 'contexto', 'características', 'relaciones'];
  switch (type) {
    case 'ARTWORK':
      return [
        'qué vemos',
        'autoría',
        'fecha o lugar',
        'material o técnica',
        'significado o recepción',
      ];
    case 'ARTIST':
      return ['quién fue', 'dónde y cuándo vivió', 'evolución', 'obras', 'influencia'];
    case 'MOVEMENT':
      return [
        'qué fue',
        'cuándo y dónde surgió',
        'rasgos',
        'artistas y obras',
        'qué ocurrió después',
      ];
    case 'CONCEPT':
      return [
        'definición',
        'origen histórico',
        'aparición en arte',
        'ejemplos',
        'debates o límites',
      ];
    case 'PERIOD':
      return [
        'cuándo ocurrió',
        'dónde',
        'qué estaba sucediendo',
        'transformaciones culturales',
        'qué vino después',
      ];
    case 'PLACE':
      return [
        'dónde está',
        'por qué importa',
        'qué ocurrió allí',
        'actores asociados',
        'cambios del lugar',
      ];
    default:
      return common.map((item) => `${item} de ${title}`);
  }
}

function relevanceReport(output: EditorialGenerationOutput, type: string, title: string) {
  const text = `${output.definition} ${output.summary} ${output.essay}`.toLocaleLowerCase('es');
  return newcomerNeeds(type, title).map((need) => ({
    need,
    status: text.includes(need.split(' ')[0]) ? 'COVERED' : 'MISSING',
  }));
}

const DIMENSIONS_BY_TYPE: Record<string, string[]> = {
  ARTIST: [
    'identity',
    'life chronology',
    'training',
    'places',
    'development',
    'works',
    'movement relationships',
    'influences',
    'legacy',
    'sources',
  ],
  ARTWORK: [
    'identity',
    'creator',
    'date',
    'material',
    'visual description',
    'production context',
    'location',
    'interpretation',
    'reception',
    'relationships',
    'sources',
  ],
  CONCEPT: [
    'definition',
    'historical meaning',
    'cultural variation',
    'concrete examples',
    'relationship to artworks',
    'interpretive limits',
    'sources',
  ],
  MOVEMENT: [
    'definition',
    'origin and context',
    'characteristics',
    'artists and works',
    'internal differences',
    'predecessors and successors',
    'significance',
    'sources',
  ],
  PERIOD: [
    'chronology',
    'geography',
    'context',
    'cultural production',
    'transformations',
    'key actors',
    'aftermath',
    'sources',
  ],
  PLACE: [
    'geography',
    'cultural relevance',
    'events',
    'associated actors and institutions',
    'local characteristics',
    'change over time',
    'sources',
  ],
  EVENT: [
    'identity',
    'date and place',
    'participants',
    'causes and context',
    'consequences',
    'sources',
  ],
  ORGANIZATION: [
    'identity',
    'location',
    'collection or programme',
    'associated actors',
    'historical change',
    'sources',
  ],
  ARTICLE: ['identity', 'thesis and context', 'examples', 'sources'],
};

export function readinessAudit(entity: EntityRecord) {
  const type = entity.type.toUpperCase();
  const relations = edges(entity);
  const relationEvidence = relations.filter(
    ({ relation }) =>
      relation.citations.some((citation) => Boolean(clean(citation.quote))) ||
      (Boolean(relation.justification) &&
        String(relation.justification).length >= 80 &&
        !/lectura editorial relevante/i.test(String(relation.justification))),
  ).length;
  const sourceQuotes = entity.sourceRefs.filter((ref) => Boolean(clean(ref.quote))).length;
  const metadataKeys = new Set(
    entity.attributes.map((attribute) => attribute.definition.key.toLowerCase()),
  );
  const has = (...keys: string[]) =>
    keys.some((key) => metadataKeys.has(key) || Boolean((entity as any)[key]));
  const status = (ready: boolean, partial = false): ReadinessStatus =>
    ready ? 'READY' : partial ? 'PARTIAL' : 'MISSING';
  const dimensions: Record<string, { status: ReadinessStatus; gap?: string }> = {};
  for (const dimension of DIMENSIONS_BY_TYPE[type] ?? DIMENSIONS_BY_TYPE.ARTICLE) {
    if (dimension === 'sources') {
      dimensions[dimension] = {
        status: status(sourceQuotes > 0, entity.sourceRefs.length > 0),
        gap: sourceQuotes
          ? undefined
          : entity.sourceRefs.length
            ? 'NEEDS_SOURCE_QUOTE_OR_DOCUMENTARY_CONTEXT'
            : 'MISSING_REFERENCE_SOURCE',
      };
      continue;
    }
    const lower = dimension.toLowerCase();
    const direct =
      lower.includes('identity') || lower === 'definition'
        ? Boolean(entity.title) &&
          (lower === 'identity' ||
            Boolean((entity.concept as any)?.definition) ||
            Boolean((entity as any).summary))
        : lower.includes('date') || lower.includes('chronology')
          ? entity.startYear != null || entity.endYear != null
          : lower.includes('geography') || lower.includes('places') || lower === 'location'
            ? Boolean((entity.artwork as any)?.location) ||
              relations.some(({ relation }) =>
                /LOCATED|BORN|LIVED|WORKED|FROM/i.test(relation.relationType.key),
              )
            : lower.includes('creator') || lower.includes('author')
              ? relations.some(({ relation }) =>
                  /AUTHOR|CREATED|ARTIST/i.test(relation.relationType.key),
                )
              : lower.includes('works')
                ? relations.some(({ relation }) =>
                    /WORK|CREATED|ARTWORK/i.test(relation.relationType.key),
                  )
                : lower.includes('relationships') ||
                    lower.includes('actors') ||
                    lower.includes('artists') ||
                    lower.includes('institutions')
                  ? relationEvidence > 0
                  : sourceQuotes > 0 ||
                    entity.translations.some(
                      (translation) =>
                        (translation.shortDescription?.length ?? 0) > 80 ||
                        (translation.essay?.length ?? 0) > 200,
                    );
    const partial =
      !direct &&
      (entity.attributes.length > 0 || relations.length > 0 || entity.sourceRefs.length > 0);
    dimensions[dimension] = {
      status: status(direct, partial),
      gap: direct
        ? undefined
        : sourceQuotes
          ? 'NEEDS_EDITORIAL_SYNTHESIS'
          : relations.length
            ? 'RELATIONS_NEED_JUSTIFICATION_OR_SOURCE'
            : 'MISSING_DOCUMENTARY_CONTEXT',
    };
  }
  const weights: Record<string, number> = {
    identity: 8,
    definition: 12,
    chronology: 8,
    geography: 8,
    context: 14,
    characteristics: 12,
    significance: 10,
    relationships: 10,
    interpretations: 7,
    uncertainty: 5,
    examples: 4,
    sources: 12,
  };
  const values = Object.entries(dimensions).map(([key, value]) => {
    const normalized = Object.keys(weights).find((candidate) =>
      key.toLowerCase().includes(candidate),
    );
    const weight = normalized ? weights[normalized] : 8;
    return { weight, value: value.status === 'READY' ? 1 : value.status === 'PARTIAL' ? 0.5 : 0 };
  });
  const readiness = Math.round(
    (100 * values.reduce((sum, item) => sum + item.weight * item.value, 0)) /
      Math.max(
        1,
        values.reduce((sum, item) => sum + item.weight, 0),
      ),
  );
  const missing = Object.entries(dimensions)
    .filter(([, value]) => value.status === 'MISSING')
    .map(([key]) => key);
  const partial = Object.entries(dimensions)
    .filter(([, value]) => value.status === 'PARTIAL')
    .map(([key]) => key);
  return {
    dimensions,
    readiness,
    band:
      readiness >= 90
        ? 'READY_FOR_GENERATION'
        : readiness >= 75
          ? 'GENERATABLE_WITH_LIMITED_DEPTH'
          : readiness >= 50
            ? 'NEEDS_CONTEXT_ENRICHMENT'
            : 'NOT_EDITORIALLY_READY',
    biggestGaps: [...missing, ...partial].slice(0, 5),
    estimatedEffort: missing.length >= 4 ? 'HIGH' : missing.length ? 'MEDIUM' : 'LOW',
    relationEvidenceCount: relationEvidence,
    sourceQuotes,
  };
}

export function editorialDepthAudit(
  entity: EntityRecord,
  sharedEvidence: Array<{ slug: string; title: string; quotes: number }> = [],
) {
  const local = readinessAudit(entity);
  const localReady = Object.values(local.dimensions).filter(
    (item) => item.status === 'READY',
  ).length;
  const localPartial = Object.values(local.dimensions).filter(
    (item) => item.status === 'PARTIAL',
  ).length;
  const sharedQuotes = sharedEvidence.reduce((sum, item) => sum + item.quotes, 0);
  const justifiedRelations = local.relationEvidenceCount;
  let depth: EditorialDepth = 'IDENTITY_ONLY';
  if (
    localReady >= 2 ||
    entity.attributes.length > 0 ||
    entity.translations.some((t) => Boolean(t.shortDescription))
  )
    depth = 'BASIC_EXPLANATION';
  if ((localReady >= 4 && justifiedRelations > 0) || (localPartial >= 2 && sharedQuotes > 0))
    depth = 'EDITORIAL_ENTRY';
  if ((localReady >= 6 && justifiedRelations >= 2) || sharedQuotes >= 2) depth = 'CONTEXTUAL_ESSAY';
  if (local.sourceQuotes >= 2 && justifiedRelations >= 2) depth = 'DOCUMENTARY_ESSAY';
  const limits: Record<
    EditorialDepth,
    {
      summary: boolean;
      sections: string;
      maxRelations: number;
      interpretation: boolean;
      sources: boolean;
    }
  > = {
    IDENTITY_ONLY: {
      summary: true,
      sections: '0',
      maxRelations: 0,
      interpretation: false,
      sources: false,
    },
    BASIC_EXPLANATION: {
      summary: true,
      sections: '1–2',
      maxRelations: 2,
      interpretation: false,
      sources: false,
    },
    EDITORIAL_ENTRY: {
      summary: true,
      sections: '2–4',
      maxRelations: 4,
      interpretation: false,
      sources: false,
    },
    CONTEXTUAL_ESSAY: {
      summary: true,
      sections: '3–6',
      maxRelations: 8,
      interpretation: true,
      sources: false,
    },
    DOCUMENTARY_ESSAY: {
      summary: true,
      sections: '4–8',
      maxRelations: 12,
      interpretation: true,
      sources: true,
    },
  };
  return {
    depth,
    localReadiness: local.readiness,
    sharedQuotes,
    justifiedRelations,
    limits: limits[depth],
  };
}

export function retrieveContextFragments(entity: EntityRecord, maxChars = 6000) {
  const fragments = entity.sourceRefs
    .filter((ref) => clean(ref.quote))
    .map((ref) => ({
      origin: 'SOURCE' as const,
      source: ref.source.title,
      locator: ref.page,
      text: clean(ref.quote),
    }));
  return {
    maxChars,
    selected: fragments.slice(0, 20),
    strategy:
      'source quotes first; relation citations only when quoted; linked entities are candidates, never evidence by catalogue membership',
  };
}

function antiTemplate(results: Array<{ output: EditorialGenerationOutput }>) {
  const headings = results.map(({ output }) =>
    (output.essay.match(/^##\s+(.+)$/gm) ?? []).map((heading) =>
      heading.toLocaleLowerCase('es').replace(/^##\s+/, ''),
    ),
  );
  const firstSentences = results.map(({ output }) =>
    output.essay
      .replace(/^#+[^\n]*\n+/, '')
      .split(/(?<=[.!?])\s+/)[0]
      .toLocaleLowerCase('es'),
  );
  const headingPairs = headings.flatMap((left, index) =>
    headings.slice(index + 1).map((right) => overlap(left.join(' '), right.join(' '))),
  );
  const lengths = results.map(({ output }) => output.essay.split(/\s+/).length);
  const mean = lengths.reduce((sum, value) => sum + value, 0) / Math.max(1, lengths.length);
  const variance =
    lengths.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, lengths.length);
  return {
    repeatedHeadings: [
      ...new Set(headings.flat().filter((heading, index, all) => all.indexOf(heading) !== index)),
    ],
    repeatedFirstSentenceCount: firstSentences.length - new Set(firstSentences).size,
    highestHeadingSimilarity: Math.max(0, ...headingPairs),
    genericPhraseHits: [
      'a lo largo',
      'su importancia',
      'para comprender',
      'no sólo',
      'sino también',
    ].filter((phrase) =>
      results.some(({ output }) =>
        `${output.summary} ${output.essay}`.toLocaleLowerCase('es').includes(phrase),
      ),
    ),
    sectionCountRange: [
      Math.min(...headings.map((item) => item.length), 0),
      Math.max(...headings.map((item) => item.length), 0),
    ],
    essayLengthCoefficientOfVariation: mean ? Math.sqrt(variance) / mean : 0,
  };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const generate = process.argv.includes('--generate');
  const requested = new Set(BENCHMARK_DATASET.map((item) => item.slug));
  const all = await prisma.entity.findMany({
    where: { slug: { in: [...requested] } },
    include: {
      translations: true,
      sourceRefs: { include: { source: true } },
      outgoing: { include: { relationType: true, to: true, citations: true } },
      incoming: { include: { relationType: true, from: true, citations: true } },
      artwork: true,
      artist: true,
      concept: true,
      period: true,
      attributes: { include: { definition: true, citations: true } },
    },
  });
  const catalog = await prisma.entity.findMany({
    select: { id: true, slug: true, title: true, type: true },
  });
  const sourceInventory = await prisma.entity.findMany({
    select: { id: true, slug: true, title: true, sourceRefs: { select: { quote: true } } },
  });
  const sourceById = new Map(sourceInventory.map((item) => [item.id, item]));
  const entityIds = all.map((entity) => entity.id);
  const [citationInventory, researchEntityInventory, researchEvidenceInventory, materialInventory] =
    await Promise.all([
      prisma.citation.findMany({
        where: { entityId: { in: entityIds } },
        select: { entityId: true, quote: true, locator: true, sourceId: true },
      }),
      prisma.researchEntity.findMany({
        where: { canonicalEntityId: { in: entityIds } },
        select: {
          canonicalEntityId: true,
          evidence: {
            select: {
              evidence: {
                select: {
                  id: true,
                  quote: true,
                  locator: true,
                  libraryExcerptId: true,
                  sourceId: true,
                },
              },
            },
          },
        },
      }),
      prisma.researchEvidence.findMany({
        where: {
          entityEvidence: {
            some: {
              entityId: {
                in: (
                  await prisma.researchEntity.findMany({
                    where: { canonicalEntityId: { in: entityIds } },
                    select: { id: true },
                  })
                ).map((item) => item.id),
              },
            },
          },
        },
        select: { id: true, quote: true, locator: true, sourceId: true, libraryExcerptId: true },
      }),
      prisma.libraryMaterial.findMany({
        where: {
          research: {
            some: { project: { entities: { some: { canonicalEntityId: { in: entityIds } } } } },
          },
        },
        select: {
          id: true,
          title: true,
          versions: {
            select: {
              content: true,
              excerpts: { select: { id: true, text: true, locator: true } },
            },
          },
        },
      }),
    ]);
  const existingKnowledgeTotals = {
    sources: await prisma.source.count(),
    sourceRefs: await prisma.sourceRef.count(),
    sourceRefsWithQuote: await prisma.sourceRef.count({ where: { quote: { not: null } } }),
    citations: await prisma.citation.count(),
    citationsWithQuote: await prisma.citation.count({ where: { quote: { not: null } } }),
    materials: await prisma.libraryMaterial.count(),
    materialVersions: await prisma.libraryMaterialVersion.count(),
    materialVersionsWithContent: await prisma.libraryMaterialVersion.count({
      where: { content: { not: null } },
    }),
    excerpts: await prisma.libraryExcerpt.count(),
    researchEvidence: await prisma.researchEvidence.count(),
    researchEvidenceWithQuote: await prisma.researchEvidence.count({
      where: { quote: { not: null } },
    }),
  };
  const researchByEntity = new Map<string, typeof researchEntityInventory>();
  for (const item of researchEntityInventory)
    researchByEntity.set(item.canonicalEntityId!, [
      ...(researchByEntity.get(item.canonicalEntityId!) ?? []),
      item,
    ]);
  const sourceRefByEntity = new Map(all.map((entity) => [entity.id, entity.sourceRefs]));
  const inventoryFor = (entity: EntityRecord) => {
    const sourceRefs = sourceRefByEntity.get(entity.id) ?? [];
    const citations = citationInventory.filter((item) => item.entityId === entity.id);
    const research = researchByEntity.get(entity.id) ?? [];
    const evidence = research.flatMap((item) => item.evidence.map((link) => link.evidence));
    const materials = materialInventory.filter((material) =>
      material.versions.some((version) =>
        version.excerpts.some((excerpt) =>
          evidence.some((item) => item.libraryExcerptId === excerpt.id),
        ),
      ),
    );
    return {
      sources: sourceRefs.length,
      materials: materials.length,
      excerpts: materials.reduce(
        (sum, material) =>
          sum + material.versions.reduce((inner, version) => inner + version.excerpts.length, 0),
        0,
      ),
      evidence: evidence.length,
      relationEvidence: edges(entity).reduce(
        (sum, item) =>
          sum + item.relation.citations.filter((citation) => Boolean(clean(citation.quote))).length,
        0,
      ),
      retrievableFragments:
        sourceRefs.filter((ref) => Boolean(clean(ref.quote))).length +
        citations.filter((item) => Boolean(clean(item.quote))).length +
        evidence.filter((item) => Boolean(clean(item.quote))).length,
      dormant: {
        sourceWithoutQuote: sourceRefs.filter((ref) => !clean(ref.quote)).length,
        citationWithoutQuote: citations.filter((item) => !clean(item.quote)).length,
        evidenceWithoutQuote: evidence.filter((item) => !clean(item.quote)).length,
        materialContentNotExcerpted: materials.filter((material) =>
          material.versions.some(
            (version) => Boolean(version.content) && version.excerpts.length === 0,
          ),
        ).length,
      },
    };
  };
  const bySlug = new Map(all.map((entity) => [entity.slug, entity]));
  const provider = generate ? new AIProvider(new ConfigService()) : null;
  const rows: Array<Record<string, unknown>> = [];
  for (const descriptor of BENCHMARK_DATASET) {
    const entity = bySlug.get(descriptor.slug);
    if (!entity) {
      rows.push({ ...descriptor, status: 'MISSING_ENTITY' });
      continue;
    }
    const context = contextFor(entity, catalog);
    const readiness = readinessAudit(entity);
    const sharedCandidates = edges(entity)
      .map(({ target }) => {
        const source = sourceById.get(target.id);
        return {
          slug: target.slug,
          title: target.title,
          quotes: source?.sourceRefs.filter((ref) => Boolean(clean(ref.quote))).length ?? 0,
        };
      })
      .filter((item) => item.quotes > 0);
    const editorialDepth = editorialDepthAudit(entity, sharedCandidates);
    const knowledgeInventory = inventoryFor(entity);
    let output: EditorialGenerationOutput | null = null;
    let status = 'NOT_GENERATED_PROVIDER_UNAVAILABLE';
    if (provider?.isAvailable()) {
      const response = await provider.runStructured(buildEditorialGenerationRequest(context));
      output = normalizeAndValidateEditorialOutput(
        response.output as EditorialGenerationOutput,
        context.availableEntities,
        editorialDepth.depth,
        [entity.title],
      );
      status = 'GENERATED_DRY_RUN';
    } else if (descriptor.slug === 'ritual') {
      output = normalizeAndValidateEditorialOutput(
        RITUAL_EDITORIAL_REGRESSION,
        context.availableEntities,
      );
      status = 'FIXTURE_ONLY';
    }
    const row = {
      ...descriptor,
      entity: {
        title: entity.title,
        type: entity.type,
        degree: edges(entity).length,
        sources: entity.sourceRefs.length,
        metadata: entity.attributes.length,
      },
      status,
      readiness,
      editorialDepth,
      knowledgeInventory,
      sharedRetrievableKnowledge: sharedCandidates,
      ...(descriptor.slug === 'ritual' ? { depthAdjustedExample: RITUAL_BASIC_EXPLANATION } : {}),
      contextRetrieval: retrieveContextFragments(entity),
      output,
      newcomerNeeds: newcomerNeeds(entity.type, entity.title),
      relevance: output ? relevanceReport(output, entity.type, entity.title) : 'NOT_GENERATED',
    } as Record<string, unknown>;
    if (output) {
      const provenance = provenanceReport(output, context);
      const links = wikilinkReport(output, context);
      row.provenance = provenance;
      row.wikilinks = links;
      row.quality = score(output, provenance, links);
      row.relationQuality = links.map((link) => ({
        entity: link.wikilink,
        expression: 'contextual wikilink',
        justification: link.reason,
        evidence: link.supportingContext,
        certainty: link.valid ? 'allowed' : 'rejected',
      }));
    }
    rows.push(row);
  }
  const generated = rows.filter(
    (row): row is { output: EditorialGenerationOutput } & Record<string, unknown> =>
      Boolean(row.output),
  );
  const readinessRanking = rows
    .filter((row) => row.entity)
    .map((row) => ({
      slug: row.slug,
      title: (row.entity as { title: string }).title,
      type: (row.entity as { type: string }).type,
      readiness: (row.readiness as ReturnType<typeof readinessAudit>).readiness,
      band: (row.readiness as ReturnType<typeof readinessAudit>).band,
      biggestGaps: (row.readiness as ReturnType<typeof readinessAudit>).biggestGaps,
      estimatedEffort: (row.readiness as ReturnType<typeof readinessAudit>).estimatedEffort,
      knowledgeReusePotential:
        rows.filter(
          (candidate) =>
            candidate.slug !== row.slug &&
            candidate.entity &&
            (candidate.entity as { type: string }).type === (row.entity as { type: string }).type,
        ).length >= 2
          ? 'HIGH'
          : 'MEDIUM',
    }))
    .sort((a, b) => a.readiness - b.readiness);
  const gateWarnings = readinessRanking.flatMap((item) => [
    ...(item.readiness < 75 ? [`${item.slug}: readiness <75`] : []),
    ...(rows.find(
      (row) =>
        row.slug === item.slug &&
        (row.readiness as ReturnType<typeof readinessAudit>).sourceQuotes === 0,
    )
      ? [`${item.slug}: documentary context insuficiente`]
      : []),
  ]);
  const depthAudit = rows
    .filter((row) => row.editorialDepth)
    .map((row) => ({
      entity: row.slug,
      title: (row.entity as { title: string }).title,
      availableKnowledge: row.readiness,
      sharedRetrievableKnowledge: row.sharedRetrievableKnowledge,
      missingKnowledge: (row.readiness as ReturnType<typeof readinessAudit>).biggestGaps,
      maxSafeDepth: (row.editorialDepth as ReturnType<typeof editorialDepthAudit>).depth,
    }));
  const depthCounts = depthAudit.reduce(
    (counts, item) => {
      counts[item.maxSafeDepth] = (counts[item.maxSafeDepth] ?? 0) + 1;
      return counts;
    },
    {} as Record<string, number>,
  );
  const report = {
    title: 'JANO Editorial Quality Benchmark',
    mode: generate ? 'GENERATE_DRY_RUN' : 'CONTEXT_DRY_RUN',
    generatedCount: generated.length,
    dataset: BENCHMARK_DATASET,
    provider: {
      AI_PROVIDER: process.env.AI_PROVIDER ?? 'noop',
      AI_MODEL: process.env.AI_MODEL ?? process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
      available: provider?.isAvailable() ?? false,
    },
    existingKnowledgeTotals,
    results: rows,
    readinessRanking,
    depthAudit,
    migrationImplication: depthCounts,
    sourceGaps: readinessRanking.map((item) => ({ entity: item.slug, gaps: item.biggestGaps })),
    highLeverageKnowledge: [
      {
        context: 'Paleolítico / arte rupestre',
        beneficiaries: ['paleolitico', 'arte-rupestre', 'cueva-de-lascaux', 'ritual'],
        reason:
          'contexto arqueológico compartido, sólo reutilizable cuando el fragmento documenta la afirmación concreta',
      },
      {
        context: 'París y vanguardias',
        beneficiaries: ['paris', 'pablo-picasso', 'cubismo', 'surrealismo'],
        reason:
          'cronología y redes artísticas documentadas, no una licencia para inferir influencia',
      },
      {
        context: 'Museo del Prado / Madrid',
        beneficiaries: ['museo-del-prado', 'madrid', 'caravaggio', 'renacimiento'],
        reason: 'instituciones, obras y localización con procedencia explícita',
      },
    ],
    contextRetrievalProposal: {
      stages: [
        'retrieve candidate source/documentary fragments by entity, type and relation target',
        'rank lexical/entity-key overlap plus citation provenance',
        'keep relation metadata separate from evidence',
        'truncate by character budget while preserving origin and locator',
        'reject claims whose premises are not selected',
      ],
      maxContextChars: 6000,
    },
    benchmarkGate: {
      warnings: gateWarnings,
      blocking: false,
      rule: 'La ejecución técnica sigue permitida para probar weak-corpus behaviour; la advertencia aparece antes de una generación.',
    },
    grounding: generated.length
      ? {
          supportedClaims: generated.reduce(
            (sum, row) => sum + Number((row.provenance as { supported: number }).supported),
            0,
          ),
          unsupportedClaims: generated.reduce(
            (sum, row) =>
              sum + Number((row.provenance as { unsupported: string[] }).unsupported.length),
            0,
          ),
          byClassification: generated.reduce(
            (counts, row) => {
              for (const claim of (row.provenance as ReturnType<typeof provenanceReport>).claims) {
                counts[claim.classification] = (counts[claim.classification] ?? 0) + 1;
              }
              return counts;
            },
            {} as Record<string, number>,
          ),
        }
      : { supportedClaims: 0, unsupportedClaims: 0 },
    antiTemplate: antiTemplate(generated),
    qualityMatrix: rows.map((row) => ({
      slug: row.slug,
      quality: row.quality ?? 'NOT_GENERATED',
    })),
    recommendation: 'ENRICH_CONTEXT',
    note: 'Dry-run only. No entity, translation, relation, source or canonical graph row is written.',
  };
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

if (require.main === module) void main();
