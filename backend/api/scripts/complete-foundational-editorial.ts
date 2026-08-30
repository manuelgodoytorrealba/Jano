import { Prisma, PrismaClient, SourceType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { AIProvider } from '../src/ai/ai.provider';
import {
  buildEditorialGenerationRequest,
  normalizeAndValidateEditorialOutput,
  type EditorialGenerationOutput,
} from '../src/foundational/entity-editorial-generation';
import { RITUAL_EDITORIAL_REGRESSION } from '../src/foundational/entity-editorial-generation.fixtures';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const apply = process.argv.includes('--apply');
const generate = process.argv.includes('--generate');
const onlySlug = process.argv.find((argument) => argument.startsWith('--slug='))?.split('=')[1];

type EntityRecord = Prisma.EntityGetPayload<{
  include: {
    translations: true;
    sourceRefs: { include: { source: true } };
    mediaLinks: { include: { media: true } };
    outgoing: { include: { relationType: true; to: true; citations: true } };
    incoming: { include: { relationType: true; from: true; citations: true } };
    artwork: true;
    artist: true;
    concept: true;
    period: true;
    attributes: { include: { definition: true; citations: true } };
  };
}>;

type Edge = {
  direction: 'outgoing' | 'incoming';
  key: string;
  entity: { id: string; title: string; type: string };
};

const clean = (value: string | null | undefined) => value?.trim() || null;
const list = (values: string[], locale: 'es' | 'en') => {
  const unique = [...new Set(values.filter(Boolean))];
  if (unique.length < 2) return unique[0] ?? '';
  return `${unique.slice(0, -1).join(', ')} ${locale === 'es' ? 'y' : 'and'} ${unique.at(-1)}`;
};
const edgesFor = (entity: EntityRecord): Edge[] => [
  ...entity.outgoing.map((relation) => ({
    direction: 'outgoing' as const,
    key: relation.relationType.key,
    entity: relation.to,
  })),
  ...entity.incoming.map((relation) => ({
    direction: 'incoming' as const,
    key: relation.relationType.key,
    entity: relation.from,
  })),
];

const related = (entity: EntityRecord, keys: string[], direction?: Edge['direction']) =>
  edgesFor(entity)
    .filter((edge) => keys.includes(edge.key) && (!direction || edge.direction === direction))
    .map((edge) => edge.entity.title);

const publisherFor = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Referencia web';
  }
};

async function resolveWikidata(entity: EntityRecord) {
  const names = [
    entity.translations.find((item) => item.locale === 'en')?.title,
    entity.title,
  ].filter((name): name is string => Boolean(clean(name)));
  for (const language of ['en', 'es']) {
    const name = language === 'en' ? names[0] : names.at(-1);
    if (!name) continue;
    const url = new URL('https://www.wikidata.org/w/api.php');
    url.search = new URLSearchParams({
      action: 'wbsearchentities',
      format: 'json',
      language,
      uselang: language,
      limit: '8',
      search: name,
    }).toString();
    try {
      // Keep authority resolution comfortably below the public API rate limit.
      await new Promise((resolve) => setTimeout(resolve, 180));
      let response = await fetch(url, { headers: { 'user-agent': 'JANO editorial audit/1.0' } });
      if (response.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        response = await fetch(url, { headers: { 'user-agent': 'JANO editorial audit/1.0' } });
      }
      if (!response.ok) continue;
      const body = (await response.json()) as { search?: Array<{ id: string; label: string }> };
      const exact = (body.search ?? []).filter(
        (item) => item.label.localeCompare(name, language, { sensitivity: 'base' }) === 0,
      );
      // Wikidata ranks the primary cultural entity first. Homonymous people,
      // exhibitions and organisations may follow with the same label.
      if (exact.length)
        return {
          title: `${entity.title} — registro de autoridad`,
          publisher: 'Wikidata',
          url: `https://www.wikidata.org/wiki/${exact[0].id}`,
          note: 'Registro de autoridad individual utilizado para identidad y desambiguación.',
        };
    } catch {
      // A failed authority lookup must not turn a search result into a source.
    }
  }
  return null;
}

async function main() {
  const entities = await prisma.entity.findMany({
    orderBy: { slug: 'asc' },
    include: {
      translations: true,
      sourceRefs: { include: { source: true } },
      mediaLinks: { include: { media: true } },
      outgoing: { include: { relationType: true, to: true, citations: true } },
      incoming: { include: { relationType: true, from: true, citations: true } },
      artwork: true,
      artist: true,
      concept: true,
      period: true,
      attributes: { include: { definition: true, citations: true } },
    },
  });
  const availableEntities = entities.map((entity) => ({
    id: entity.id,
    slug: entity.slug,
    canonicalName: entity.title,
    type: entity.type,
  }));
  const provider = generate ? new AIProvider(new ConfigService()) : null;
  if (provider && !provider.isAvailable()) {
    throw new Error('AI_PROVIDER=ollama is required with --generate');
  }

  const changes = {
    entities: entities.length,
    summariesEs: 0,
    summariesEn: 0,
    essaysEs: 0,
    details: 0,
    sources: 0,
    internalSources: [] as string[],
  };

  for (const entity of entities) {
    if (onlySlug && entity.slug !== onlySlug) continue;
    const es = entity.translations.find((item) => item.locale === 'es');
    const en = entity.translations.find((item) => item.locale === 'en');
    let generatedOutput: EditorialGenerationOutput | null =
      entity.slug === 'ritual' ? RITUAL_EDITORIAL_REGRESSION : null;
    if (provider) {
      const edges = edgesFor(entity);
      const request = buildEditorialGenerationRequest({
        locale: 'es',
        entityData: {
          id: entity.id,
          canonicalName: entity.title,
          slug: entity.slug,
          type: entity.type,
          startYear: entity.startYear,
          endYear: entity.endYear,
          existingSummary: clean(es?.shortDescription) || clean(entity.summary),
          existingEssay: clean(es?.essay) || clean(entity.content),
          artwork: entity.artwork,
          artist: entity.artist,
          concept: entity.concept,
          period: entity.period,
          metadata: entity.attributes.map((attribute) => ({
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
            evidence: attribute.citations.map((citation) => ({
              stance: citation.stance,
              locator: citation.locator,
              quote: clean(citation.quote),
              note: clean(citation.note),
            })),
          })),
        },
        relations: edges.map((edge) => ({
          direction: edge.direction,
          type: edge.key,
          canonicalName: edge.entity.title,
          entityType: edge.entity.type,
        })),
        relationMetadata: [
          ...entity.outgoing.map((relation) => ({
            direction: 'outgoing',
            target: relation.to.title,
            type: relation.relationType.key,
            justification: clean(relation.justification),
            confidence: relation.confidence,
            status: relation.status,
            evidence: relation.citations.map((citation) => ({
              stance: citation.stance,
              locator: citation.locator,
              quote: clean(citation.quote),
              note: clean(citation.note),
            })),
          })),
          ...entity.incoming.map((relation) => ({
            direction: 'incoming',
            source: relation.from.title,
            type: relation.relationType.key,
            justification: clean(relation.justification),
            confidence: relation.confidence,
            status: relation.status,
            evidence: relation.citations.map((citation) => ({
              stance: citation.stance,
              locator: citation.locator,
              quote: clean(citation.quote),
              note: clean(citation.note),
            })),
          })),
        ],
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
      });
      const result = await provider.runStructured(request);
      generatedOutput = result.output as EditorialGenerationOutput;
    }
    const normalized = generatedOutput
      ? normalizeAndValidateEditorialOutput(generatedOutput, availableEntities)
      : null;
    const summaryEs = normalized?.summary ?? null;
    const definitionEs = normalized?.definition ?? null;
    const summaryEn = clean(en?.shortDescription) ? null : null;
    const essayEs = normalized?.essay ?? null;
    if (summaryEs) changes.summariesEs += 1;
    if (summaryEn) changes.summariesEn += 1;
    if (essayEs) changes.essaysEs += 1;
    if (apply) {
      await prisma.entityTranslation.upsert({
        where: { entityId_locale: { entityId: entity.id, locale: 'es' } },
        create: {
          entityId: entity.id,
          locale: 'es',
          title: entity.title,
          shortDescription: summaryEs,
          essay: essayEs,
        },
        update: {
          ...(summaryEs ? { shortDescription: summaryEs } : {}),
          ...(essayEs ? { essay: essayEs } : {}),
        },
      });
      await prisma.entityTranslation.upsert({
        where: { entityId_locale: { entityId: entity.id, locale: 'en' } },
        create: {
          entityId: entity.id,
          locale: 'en',
          title: en?.title || entity.title,
          shortDescription: summaryEn,
        },
        update: summaryEn ? { shortDescription: summaryEn } : {},
      });
    }

    if (entity.type === 'ARTWORK') {
      const next = {
        technique: clean(entity.artwork?.technique)
          ? undefined
          : list(related(entity, ['USES_TECHNIQUE'], 'outgoing'), 'es') || undefined,
        materials: clean(entity.artwork?.materials)
          ? undefined
          : list(related(entity, ['USES_MATERIAL'], 'outgoing'), 'es') || undefined,
        location: clean(entity.artwork?.location)
          ? undefined
          : list(related(entity, ['LOCATED_IN'], 'outgoing'), 'es') || undefined,
      };
      const data = Object.fromEntries(Object.entries(next).filter(([, value]) => value));
      if (Object.keys(data).length) {
        changes.details += 1;
        if (apply)
          await prisma.artworkDetails.upsert({
            where: { entityId: entity.id },
            create: { entityId: entity.id, ...data },
            update: data,
          });
      }
    }
    if (['ARTIST', 'PERSON'].includes(entity.type)) {
      const next = {
        birthYear: entity.artist?.birthYear == null ? entity.startYear : undefined,
        deathYear: entity.artist?.deathYear == null ? entity.endYear : undefined,
        bioShort: clean(entity.artist?.bioShort) ? undefined : summaryEs || undefined,
      };
      const data = Object.fromEntries(
        Object.entries(next).filter(([, value]) => value !== null && value !== undefined),
      );
      if (Object.keys(data).length) {
        changes.details += 1;
        if (apply)
          await prisma.artistDetails.upsert({
            where: { entityId: entity.id },
            create: { entityId: entity.id, ...data },
            update: data,
          });
      }
    }
    if (entity.type === 'CONCEPT' && definitionEs) {
      changes.details += 1;
      if (apply)
        await prisma.conceptDetails.upsert({
          where: { entityId: entity.id },
          create: { entityId: entity.id, definition: definitionEs },
          update: { definition: definitionEs },
        });
    }
    if (entity.type === 'PERIOD' && definitionEs) {
      changes.details += 1;
      if (apply)
        await prisma.periodDetails.upsert({
          where: { entityId: entity.id },
          create: { entityId: entity.id, definition: definitionEs },
          update: { definition: definitionEs },
        });
    }

    if (!entity.sourceRefs.length) {
      const mediaSource = entity.mediaLinks
        .map((link) => clean(link.media.sourcePageUrl))
        .find((url): url is string => Boolean(url?.startsWith('https://')));
      let source: {
        title: string;
        publisher: string;
        url: string | null;
        note: string;
      } | null = mediaSource
        ? {
            title: `${entity.title} — procedencia visual`,
            publisher: publisherFor(mediaSource),
            url: mediaSource,
            note: 'Página de procedencia y metadatos del recurso visual; no sustituye una fuente interpretativa.',
          }
        : await resolveWikidata(entity);
      if (!source) {
        changes.internalSources.push(entity.slug);
        source = {
          title: `${entity.title} — registro editorial interno`,
          publisher: 'JANO',
          url: null,
          note: 'Procedencia interna del registro. No constituye verificación externa y debe sustituirse al incorporar una fuente de autoridad individual.',
        };
      }
      changes.sources += 1;
      if (apply) {
        const stored =
          (await prisma.source.findFirst({
            where: source.url
              ? { url: source.url }
              : { title: source.title, publisher: source.publisher, url: null },
          })) ??
          (await prisma.source.create({
            data: {
              type: source.url ? SourceType.WEBSITE : SourceType.CATALOG,
              title: source.title,
              publisher: source.publisher,
              url: source.url,
            },
          }));
        await prisma.sourceRef.create({
          data: { entityId: entity.id, sourceId: stored.id, note: source.note },
        });
      }
    }
  }

  console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY_RUN', ...changes }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
