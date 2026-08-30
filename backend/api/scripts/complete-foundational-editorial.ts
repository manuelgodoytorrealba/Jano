import { CitationStance, Prisma, PrismaClient, SourceType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const apply = process.argv.includes('--apply');

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
const yearRange = (entity: EntityRecord, locale: 'es' | 'en') => {
  if (entity.startYear == null && entity.endYear == null) return '';
  const era = (year: number) =>
    year < 0 ? `${Math.abs(year)} ${locale === 'es' ? 'a. C.' : 'BCE'}` : String(year);
  if (entity.startYear != null && entity.endYear != null)
    return `${era(entity.startYear)}–${era(entity.endYear)}`;
  return era(entity.startYear ?? entity.endYear!);
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

const contextNames = (entity: EntityRecord, locale: 'es' | 'en') =>
  list(
    edgesFor(entity)
      .filter((edge) => !['USES_MATERIAL', 'USES_TECHNIQUE'].includes(edge.key))
      .slice(0, 4)
      .map((edge) => edge.entity.title),
    locale,
  );

function summary(entity: EntityRecord, locale: 'es' | 'en') {
  const dates = yearRange(entity, locale);
  const suffix = dates ? ` (${dates})` : '';
  const creators = list(related(entity, ['CREATED_BY'], 'outgoing'), locale);
  const works = list(related(entity, ['CREATED_BY'], 'incoming').slice(0, 3), locale);
  const movements = list(related(entity, ['BELONGS_TO_MOVEMENT'], 'outgoing'), locale);
  const concepts = list(
    related(entity, ['ABOUT_CONCEPT', 'HAS_SUBJECT', 'DEPICTS'], 'outgoing').slice(0, 3),
    locale,
  );
  const contexts = contextNames(entity, locale);

  if (locale === 'en') {
    switch (entity.type) {
      case 'ARTWORK':
        return `${entity.title}${suffix} is a work${creators ? ` attributed to ${creators}` : ''}${movements ? ` and connected with ${movements}` : ''}. Its JANO record situates it through documented authorship, chronology, material, place, and subject relations${concepts ? `, including ${concepts}` : ''}.`;
      case 'ARTIST':
      case 'PERSON':
        return `${entity.title}${suffix} is a cultural figure whose JANO record is organised around documented works, contexts, and historical associations${works ? `, including ${works}` : ''}. These links provide entry points to the practices and debates in which the figure took part.`;
      case 'MOVEMENT':
        return `${entity.title}${suffix} is a historical and editorial frame for comparing works, artists, techniques, and ideas without treating them as interchangeable${contexts ? `. In JANO it opens paths to ${contexts}` : ''}.`;
      case 'CONCEPT':
        return `${entity.title} is a transversal reading concept in JANO. It connects works and cultural contexts through explicit relations, allowing comparison while preserving the differences between periods, media, and uses${contexts ? `; current paths include ${contexts}` : ''}.`;
      case 'PERIOD':
        return `${entity.title}${suffix} is a chronological frame used to situate cultural entities and compare changes across connected works, people, places, and movements${contexts ? `. In JANO it currently connects with ${contexts}` : ''}.`;
      case 'PLACE':
        return `${entity.title} is a geographic context in JANO rather than a neutral container. Its relations show how works, institutions, events, and cultural activity converge in a specific place${contexts ? `, with paths to ${contexts}` : ''}.`;
      case 'ORGANIZATION':
        return `${entity.title} is an institutional node in JANO. Its record connects collection, exhibition, production, and place through explicit cultural relations${contexts ? `, including ${contexts}` : ''}.`;
      case 'EVENT':
        return `${entity.title}${suffix} is a historical event whose record connects participants, places, works, and consequences through explicit relations${contexts ? `. It can be explored through ${contexts}` : ''}.`;
      default:
        return `${entity.title}${suffix} is an editorial entity in JANO whose significance is developed through documented cultural connections${contexts ? ` to ${contexts}` : ''}.`;
    }
  }

  switch (entity.type) {
    case 'ARTWORK':
      return `${entity.title}${suffix} es una obra${creators ? ` atribuida a ${creators}` : ''}${movements ? ` vinculada con ${movements}` : ''}. Su ficha en JANO la sitúa mediante relaciones explícitas de autoría, cronología, material, lugar y asunto${concepts ? `, entre ellas ${concepts}` : ''}.`;
    case 'ARTIST':
    case 'PERSON':
      return `${entity.title}${suffix} es una figura cultural cuya ficha en JANO se organiza a partir de obras, contextos y asociaciones documentadas${works ? `, entre ellas ${works}` : ''}. Estas conexiones permiten entrar en las prácticas y debates de los que formó parte.`;
    case 'MOVEMENT':
      return `${entity.title}${suffix} es un marco histórico y editorial para comparar obras, artistas, técnicas e ideas sin tratarlas como equivalentes${contexts ? `. En JANO abre recorridos hacia ${contexts}` : ''}.`;
    case 'CONCEPT':
      return `${entity.title} funciona en JANO como un concepto transversal de lectura. Conecta obras y contextos culturales mediante relaciones explícitas, permitiendo comparar sin borrar las diferencias entre periodos, medios y usos${contexts ? `; sus recorridos actuales incluyen ${contexts}` : ''}.`;
    case 'PERIOD':
      return `${entity.title}${suffix} es un marco cronológico para situar entidades culturales y comparar transformaciones entre obras, personas, lugares y movimientos conectados${contexts ? `. En JANO se relaciona actualmente con ${contexts}` : ''}.`;
    case 'PLACE':
      return `${entity.title} es un contexto geográfico en JANO, no un contenedor neutral. Sus relaciones muestran cómo confluyen obras, instituciones, acontecimientos y actividad cultural en un lugar concreto${contexts ? `, con recorridos hacia ${contexts}` : ''}.`;
    case 'ORGANIZATION':
      return `${entity.title} es un nodo institucional de JANO. Su ficha conecta colección, exhibición, producción y lugar mediante relaciones culturales explícitas${contexts ? `, entre ellas ${contexts}` : ''}.`;
    case 'EVENT':
      return `${entity.title}${suffix} es un acontecimiento histórico cuya ficha conecta participantes, lugares, obras y consecuencias mediante relaciones explícitas${contexts ? `. Puede explorarse a través de ${contexts}` : ''}.`;
    default:
      return `${entity.title}${suffix} es una entidad editorial de JANO cuya relevancia se desarrolla mediante conexiones culturales documentadas${contexts ? ` con ${contexts}` : ''}.`;
  }
}

const relationSentence = (edge: Edge) => {
  const name = edge.entity.title;
  if (edge.direction === 'incoming') {
    const incoming: Record<string, string> = {
      CREATED_BY: `${name} figura entre las obras atribuidas a esta entidad.`,
      BELONGS_TO_MOVEMENT: `${name} se estudia dentro de este marco.`,
      ABOUT_CONCEPT: `${name} activa este concepto como vía de lectura.`,
      LOCATED_IN: `${name} mantiene aquí una vinculación geográfica o institucional.`,
      PART_OF: `${name} forma parte de esta estructura.`,
    };
    return incoming[edge.key] ?? `${name} mantiene una relación explícita con esta entidad.`;
  }
  const outgoing: Record<string, string> = {
    CREATED_BY: `La autoría de la obra se atribuye a ${name}.`,
    BELONGS_TO_MOVEMENT: `La entidad se sitúa historiográficamente en relación con ${name}.`,
    BELONGS_TO_PERIOD: `Su cronología se encuadra en ${name}.`,
    ABOUT_CONCEPT: `${name} ofrece una vía concreta para interpretar esta entidad.`,
    LOCATED_IN: `La ficha conserva una vinculación geográfica o institucional con ${name}.`,
    RELATED_TO: `${name} comparte con esta entidad un contexto cultural significativo.`,
    ASSOCIATED_WITH: `Existe una asociación histórica o profesional con ${name}.`,
    MENTIONS: `La entidad menciona explícitamente a ${name}.`,
    INSPIRED_BY: `${name} funciona como precedente identificable.`,
    INFLUENCED_BY: `La entidad se comprende en diálogo con la influencia de ${name}.`,
    PART_OF: `La entidad forma parte de ${name}.`,
    DEPICTS: `La obra representa de forma reconocible a ${name}.`,
    SIMILAR_TO: `${name} permite una comparación formal o temática concreta.`,
    USES_TECHNIQUE: `${name} figura como técnica o procedimiento empleado.`,
    USES_MATERIAL: `${name} figura entre los materiales de la obra.`,
    HAS_SUBJECT: `${name} aparece como asunto representado.`,
    CURATED_WITH: `${name} se presenta junto a esta entidad por una decisión editorial explícita.`,
  };
  return outgoing[edge.key] ?? `La ficha conserva una relación explícita con ${name}.`;
};

function essay(entity: EntityRecord) {
  const facts = edgesFor(entity).slice(0, 7).map(relationSentence);
  const dates = yearRange(entity, 'es');
  const first = `${entity.title}${dates ? ` (${dates})` : ''} se presenta en JANO como ${
    entity.type === 'ARTWORK'
      ? 'una obra situada mediante datos de autoría, cronología, materialidad y contexto'
      : entity.type === 'ARTIST' || entity.type === 'PERSON'
        ? 'una figura cultural situada mediante su producción y sus asociaciones históricas'
        : entity.type === 'PLACE'
          ? 'un lugar cultural construido por la actividad, las instituciones y las obras que confluyen en él'
          : entity.type === 'CONCEPT'
            ? 'una pregunta transversal de lectura, no como una etiqueta que vuelve equivalentes todas sus apariciones'
            : entity.type === 'MOVEMENT' || entity.type === 'PERIOD'
              ? 'un marco histórico que permite comparar sin borrar diferencias internas'
              : 'una entidad cultural definida por conexiones explícitas'
  }. La ficha evita convertir una relación editorial en una afirmación biográfica o histórica más precisa de lo que permiten los datos conservados.`;
  const second = facts.length
    ? facts.join(' ')
    : 'Esta entidad todavía no cuenta con conexiones suficientes para sostener una interpretación comparada; su presencia conserva una referencia editorial mínima y debe ampliarse mediante investigación documentada.';
  return `## Contexto\n\n${first}\n\n## Relaciones de lectura\n\n${second}\n\n## Cómo continuar\n\nEl recorrido debe continuar desde las conexiones concretas de la ficha y sus fuentes. Cada relación responde a una razón visible; cuando una interpretación necesite ir más allá de esos datos, deberá incorporarse mediante revisión editorial y evidencia atribuible.`;
}

function relationJustification(from: string, to: string, key: string) {
  const templates: Record<string, string> = {
    CREATED_BY: `${from} se atribuye a ${to} como responsable de su creación.`,
    BELONGS_TO_MOVEMENT: `${from} se sitúa historiográficamente en relación con ${to}.`,
    BELONGS_TO_PERIOD: `${from} se encuadra cronológicamente en ${to}.`,
    ABOUT_CONCEPT: `${from} permite una lectura editorial relevante a través de ${to}.`,
    LOCATED_IN: `${from} mantiene una vinculación geográfica o institucional con ${to}.`,
    RELATED_TO: `${from} y ${to} comparten un contexto cultural significativo.`,
    ASSOCIATED_WITH: `${from} mantiene una asociación histórica o profesional con ${to}.`,
    MENTIONS: `${from} menciona de forma explícita a ${to}.`,
    INSPIRED_BY: `${from} retoma un precedente identificable en ${to}.`,
    INFLUENCED_BY: `${from} se comprende en diálogo con la influencia de ${to}.`,
    PART_OF: `${from} forma parte de la estructura histórica o institucional de ${to}.`,
    DEPICTS: `${from} representa de forma reconocible a ${to}.`,
    SIMILAR_TO: `${from} y ${to} permiten una comparación formal o temática concreta.`,
    USES_TECHNIQUE: `${from} emplea ${to} como técnica o procedimiento.`,
    USES_MATERIAL: `${from} incorpora ${to} entre sus materiales.`,
    HAS_SUBJECT: `${from} trata ${to} como asunto representado.`,
    CURATED_WITH: `${from} y ${to} se presentan juntos por una decisión editorial explícita.`,
  };
  return templates[key] ?? `${from} mantiene una relación documentada con ${to}.`;
}

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
    },
  });

  const changes = {
    entities: entities.length,
    summariesEs: 0,
    summariesEn: 0,
    essaysEs: 0,
    details: 0,
    sources: 0,
    internalSources: [] as string[],
    relationJustifications: 0,
    relationCitations: 0,
  };

  for (const entity of entities) {
    const es = entity.translations.find((item) => item.locale === 'es');
    const en = entity.translations.find((item) => item.locale === 'en');
    const summaryEs = clean(es?.shortDescription)
      ? null
      : clean(entity.summary) || summary(entity, 'es');
    const summaryEn = clean(en?.shortDescription) ? null : summary(entity, 'en');
    const essayEs = clean(es?.essay) ? null : clean(entity.content) || essay(entity);
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
    if (entity.type === 'CONCEPT' && !clean(entity.concept?.definition)) {
      changes.details += 1;
      if (apply)
        await prisma.conceptDetails.upsert({
          where: { entityId: entity.id },
          create: { entityId: entity.id, definition: summaryEs || summary(entity, 'es') },
          update: { definition: summaryEs || summary(entity, 'es') },
        });
    }
    if (entity.type === 'PERIOD' && !clean(entity.period?.definition)) {
      changes.details += 1;
      if (apply)
        await prisma.periodDetails.upsert({
          where: { entityId: entity.id },
          create: { entityId: entity.id, definition: summaryEs || summary(entity, 'es') },
          update: { definition: summaryEs || summary(entity, 'es') },
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

  const relations = await prisma.relation.findMany({
    include: { from: true, to: true, relationType: true, citations: true },
  });
  for (const relation of relations) {
    if (clean(relation.justification)) continue;
    changes.relationJustifications += 1;
    if (apply)
      await prisma.relation.update({
        where: { id: relation.id },
        data: {
          justification: relationJustification(
            relation.from.title,
            relation.to.title,
            relation.relationType.key,
          ),
        },
      });

    if (!relation.citations.length) {
      const endpointSource = await prisma.sourceRef.findFirst({
        where: { entityId: relation.fromId },
        orderBy: { id: 'asc' },
      });
      if (endpointSource) {
        changes.relationCitations += 1;
        if (apply)
          await prisma.citation.create({
            data: {
              sourceId: endpointSource.sourceId,
              relationId: relation.id,
              stance: CitationStance.MENTIONS,
              note: 'La fuente del registro de origen aporta contexto factual para esta relación; la formulación editorial se conserva por separado.',
            },
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
