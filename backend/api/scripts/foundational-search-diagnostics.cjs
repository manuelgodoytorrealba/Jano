'use strict';
const fs = require('fs');
const snapshot = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const api = (process.env.JANO_API_URL || 'https://jano.manuelgodoy.eu/api').replace(/\/$/, '');
const source = fs.readFileSync('backend/api/scripts/foundational-search-benchmark.ts', 'utf8');
const blocks = [...source.matchAll(/["']([^"']*\|[^"']*)["']/g)]
  .map((m) => m[1])
  .filter((v) => v.length > 10 && /[A-Za-z]/.test(v));
const categories = ['people', 'works', 'movements', 'concepts', 'places', 'techniques'];
const queries = [];
blocks
  .slice(0, 6)
  .forEach((b, i) =>
    b.split('|').forEach((query) => queries.push({ query, category: categories[i], locale: 'en' })),
  );
const norm = (v) =>
  (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const cat = snapshot.catalog.entities;
const missSet = new Set(
  JSON.parse(
    fs.readFileSync('artifacts/foundational-batch-0-2026-08-26/after/search-benchmark.log', 'utf8'),
  ).miss || [],
);
const selectedQueries = queries.filter(
  (q) => process.env.MISS_ONLY !== '1' || missSet.has(q.query),
);
function expectedFor(q) {
  const n = norm(q);
  const scored = cat
    .map((e) => {
      const vals = [e.title, e.en, e.slug, ...(e.aliases || [])].map(norm);
      let score = 0;
      if (vals.includes(n)) score = 4;
      else if (vals.some((v) => v.includes(n) || n.includes(v))) score = 3;
      return { e, score };
    })
    .filter((x) => x.score)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.e || null;
}
async function one(item) {
  const expected = expectedFor(item.query);
  let payload = { items: [] };
  try {
    const r = await fetch(
      `${api}/search?q=${encodeURIComponent(item.query)}&locale=${item.locale}&limit=10`,
      { signal: AbortSignal.timeout(8000) },
    );
    payload = await r.json();
  } catch (e) {
    payload = { items: [], error: String(e) };
  }
  const items = payload.items || [];
  const rank = expected ? items.findIndex((x) => x.slug === expected.slug) + 1 : 0;
  const vals = expected
    ? [expected.title, expected.en, expected.slug, ...(expected.aliases || [])].map(norm)
    : [];
  const top = items[0];
  const exactTitle = !!items.find((x) => norm(x.title) === norm(item.query));
  const expectedExists = !!expected;
  let rootCause = 'PASS';
  if (!rank) rootCause = expectedExists ? 'ENTITY_EXISTS_NO_RESULT' : 'EXPECTATION_ISSUE';
  else if (rank > 1) rootCause = 'WRONG_RANKING';
  else if (!vals.includes(norm(item.query))) rootCause = 'NORMALIZATION';
  return {
    query: item.query,
    locale: item.locale,
    category: item.category,
    expectedSlug: expected?.slug || '',
    expectedExists,
    expectedType: expected?.type || '',
    topSlug: top?.slug || '',
    topTitle: top?.title || '',
    expectedRank: rank,
    exactTitleMatch: exactTitle,
    translationMatch: expected ? norm(expected.en) === norm(item.query) : false,
    aliasMatch: expected
      ? (expected.aliases || []).some((a) => norm(a) === norm(item.query))
      : false,
    status: rank ? 'PASS' : 'MISS',
    rootCause,
    error: payload.error || null,
    items: items.map((x) => ({
      slug: x.slug,
      title: x.title,
      type: x.type,
      kind: x.kind,
      matchedFields: x.matchedFields,
      score: x.score,
    })),
  };
}
async function main() {
  const rows = [];
  for (let i = 0; i < selectedQueries.length; i += 10)
    rows.push(...(await Promise.all(selectedQueries.slice(i, i + 10).map(one))));
  const out = {
    generatedAt: new Date().toISOString(),
    api,
    rows,
    summary: {
      total: rows.length,
      pass: rows.filter((r) => r.status === 'PASS').length,
      miss: rows.filter((r) => r.status === 'MISS').length,
      byRootCause: Object.fromEntries(
        [...new Set(rows.map((r) => r.rootCause))].map((k) => [
          k,
          rows.filter((r) => r.rootCause === k).length,
        ]),
      ),
    },
  };
  fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.summary, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
