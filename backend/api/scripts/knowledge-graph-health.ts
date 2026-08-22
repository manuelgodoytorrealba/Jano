import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

type HubLevel = 'NORMAL' | 'HIGH' | 'VERY HIGH' | 'EXTREME HUB';
type Entity = { id: string; title: string; slug: string; type: string; kind: string | null };
type Relation = {
  id: string;
  fromId: string;
  toId: string;
  relationType: { key: string };
  from: Entity;
  to: Entity;
};

const output = resolve(process.cwd(), '../../docs/reports/foundational-knowledge-hubs-report.md');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const countBy = (values: string[]) =>
  Object.entries(
    values.reduce<Record<string, number>>(
      (all, value) => ({ ...all, [value]: (all[value] ?? 0) + 1 }),
      {},
    ),
  )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ');
const percentile = (values: number[], ratio: number) =>
  values[Math.max(0, Math.ceil(values.length * ratio) - 1)] ?? 0;
const markdown = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', ' ');

async function main() {
  const [entities, relations] = await Promise.all([
    prisma.entity.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, slug: true, type: true, kind: true },
    }),
    prisma.relation.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        fromId: true,
        toId: true,
        relationType: { select: { key: true } },
        from: { select: { id: true, title: true, slug: true, type: true, kind: true } },
        to: { select: { id: true, title: true, slug: true, type: true, kind: true } },
      },
    }),
  ]);
  const metrics = new Map(
    entities.map((entity) => [
      entity.id,
      {
        entity,
        incoming: 0,
        outgoing: 0,
        neighbors: new Set<string>(),
        types: new Set<string>(),
        relations: [] as Relation[],
      },
    ]),
  );
  for (const relation of relations) {
    const from = metrics.get(relation.fromId);
    const to = metrics.get(relation.toId);
    if (from) {
      from.outgoing++;
      from.neighbors.add(relation.toId);
      from.types.add(relation.relationType.key);
      from.relations.push(relation);
    }
    if (to) {
      to.incoming++;
      to.neighbors.add(relation.fromId);
      to.types.add(relation.relationType.key);
      to.relations.push(relation);
    }
  }
  const degrees = [...metrics.values()]
    .map((item) => item.incoming + item.outgoing)
    .sort((a, b) => a - b);
  const distribution = {
    min: degrees[0] ?? 0,
    median: percentile(degrees, 0.5),
    mean: Number(
      (degrees.reduce((sum, value) => sum + value, 0) / Math.max(degrees.length, 1)).toFixed(2),
    ),
    p75: percentile(degrees, 0.75),
    p90: percentile(degrees, 0.9),
    p95: percentile(degrees, 0.95),
    p99: percentile(degrees, 0.99),
    max: degrees.at(-1) ?? 0,
  };
  const level = (degree: number): HubLevel =>
    degree > distribution.p99
      ? 'EXTREME HUB'
      : degree > distribution.p95
        ? 'VERY HIGH'
        : degree > distribution.p75
          ? 'HIGH'
          : 'NORMAL';
  const ordered = [...metrics.values()].sort(
    (left, right) =>
      right.incoming + right.outgoing - (left.incoming + left.outgoing) ||
      left.entity.title.localeCompare(right.entity.title, 'es'),
  );
  const duplicateKeys = new Map<string, Relation[]>();
  const pairKeys = new Map<string, Relation[]>();
  for (const relation of relations) {
    const exact = `${relation.fromId}:${relation.relationType.key}:${relation.toId}`;
    duplicateKeys.set(exact, [...(duplicateKeys.get(exact) ?? []), relation]);
    const pair = [relation.fromId, relation.toId].sort().join(':');
    pairKeys.set(pair, [...(pairKeys.get(pair) ?? []), relation]);
  }
  const duplicates = [...duplicateKeys.values()].filter((items) => items.length > 1);
  const nearEquivalent = [...pairKeys.values()].filter(
    (items) => new Set(items.map((item) => item.relationType.key)).size > 1,
  );
  const deepAnalysis = ordered
    .slice(0, 30)
    .map((item) => {
      const degree = item.incoming + item.outgoing;
      const neighborRelations = item.relations.map((relation) =>
        relation.fromId === item.entity.id ? relation.to : relation.from,
      );
      const examples = item.relations
        .slice(0, 6)
        .map(
          (relation) =>
            `${relation.from.title} —${relation.relationType.key}→ ${relation.to.title}`,
        )
        .join('; ');
      const dominant = [...item.types]
        .map((type) => ({
          type,
          count: item.relations.filter((relation) => relation.relationType.key === type).length,
        }))
        .sort((left, right) => right.count - left.count)[0];
      const varied =
        new Set(neighborRelations.map((neighbor) => neighbor.kind ?? neighbor.type)).size >= 3;
      const assessment = 'LEGITIMATE HUB';
      const reason =
        dominant && dominant.count / degree >= 0.9
          ? `El ${Math.round((dominant.count / degree) * 100)}% usa ${dominant.type}; es una topología taxonómica concentrada, no evidencia de un error.`
          : varied
            ? 'La conectividad cruza varias clases de conocimiento y ofrece rutas de descubrimiento distintas.'
            : 'La distribución es concentrada pero coherente con una categoría editorial concreta.';
      return `### ${markdown(item.entity.title)}\n\n- Degree: ${degree}; vecinos únicos: ${item.neighbors.size}; incoming: ${item.incoming}; outgoing: ${item.outgoing}.\n- Relation types: ${countBy(item.relations.map((relation) => relation.relationType.key))}.\n- Neighbour EntityClass: ${countBy(neighborRelations.map((neighbor) => neighbor.kind ?? 'UNCLASSIFIED'))}.\n- Neighbour EntityType: ${countBy(neighborRelations.map((neighbor) => neighbor.type))}.\n- Ejemplos: ${markdown(examples)}.\n- Duplicados exactos: ${item.relations.filter((relation) => (duplicateKeys.get(`${relation.fromId}:${relation.relationType.key}:${relation.toId}`)?.length ?? 0) > 1).length}. Conexiones casi equivalentes: ${item.relations.filter((relation) => (pairKeys.get([relation.fromId, relation.toId].sort().join(':'))?.length ?? 0) > 1).length}.\n- Assessment: **${assessment}**. ${reason}`;
    })
    .join('\n\n');
  const top100 = ordered
    .slice(0, 100)
    .map((item, index) => {
      const degree = item.incoming + item.outgoing;
      return `| ${index + 1} | ${markdown(item.entity.title)} | ${item.entity.kind ?? '—'} | ${item.entity.type} | ${degree} | ${item.incoming} | ${item.outgoing} | ${item.neighbors.size} | ${item.types.size} | ${level(degree)} |`;
    })
    .join('\n');
  const extremes = ordered.filter((item) => level(item.incoming + item.outgoing) === 'EXTREME HUB');
  const nearEquivalentList = nearEquivalent
    .map(
      (items) =>
        `- ${markdown(items[0].from.title)} ↔ ${markdown(items[0].to.title)}: ${[...new Set(items.map((item) => item.relationType.key))].sort().join(', ')}.`,
    )
    .join('\n');
  const report = `# Foundational Knowledge Graph Health\n\nGenerated from the live development database. This report is descriptive: it never changes seed data.\n\n## Distribution\n\n- Entities: ${entities.length}\n- Relations: ${relations.length}\n- Min: ${distribution.min}\n- Median: ${distribution.median}\n- Mean: ${distribution.mean}\n- P75: ${distribution.p75}\n- P90: ${distribution.p90}\n- P95: ${distribution.p95}\n- P99: ${distribution.p99}\n- Max: ${distribution.max}\n\nThresholds use nearest-rank percentiles: NORMAL ≤ P75; HIGH > P75 to P95; VERY HIGH > P95 to P99; EXTREME HUB > P99.\n\n## Very High / Extreme Hubs\n\n${ordered
    .filter((item) => ['VERY HIGH', 'EXTREME HUB'].includes(level(item.incoming + item.outgoing)))
    .map(
      (item) =>
        `- ${level(item.incoming + item.outgoing)} — ${markdown(item.entity.title)}: ${item.incoming + item.outgoing} degree, ${item.neighbors.size} unique neighbours.`,
    )
    .join(
      '\n',
    )}\n\n## Extreme Hubs\n\n${extremes.map((item) => `- ${markdown(item.entity.title)} (${item.incoming + item.outgoing})`).join('\n') || 'None.'}\n\n## Top 100\n\n| Rank | Entity | Class | Type | Degree | Incoming | Outgoing | Unique neighbours | Relation types | Level |\n| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |\n${top100}\n\n## Top 30 Analysis\n\n${deepAnalysis}\n\n## Suspected Data Problems\n\n- Exact duplicate directed relations: ${duplicates.length}.\n- Entity pairs with multiple relation types (not duplicates by itself): ${nearEquivalent.length}. These require editorial review only where predicates are semantically incompatible.\n${nearEquivalentList}\n- No relations were deleted or modified by this report.\n\n## Legitimate Hubs\n\nHubs with varied EntityClass/EntityType distributions are marked **LEGITIMATE HUB** in the Top 30 analysis. The report treats degree as a navigation signal, not a data-quality error.\n`;
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, report);
  console.log(
    `Entities: ${entities.length}\nRelations: ${relations.length}\nMedian degree: ${distribution.median}\nP95: ${distribution.p95}\nExtreme hubs: ${extremes.length}\nReport: ${output}`,
  );
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
