#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const fields = ['titleEs', 'titleEn', 'summaryEs', 'summaryEn', 'essayEs', 'essayEn'];
const fingerprint = (value) => createHash('sha256').update(value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')).digest('hex');
const stable = (value) => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const keys = (row, allowed, label) => { requireThat(row && typeof row === 'object' && !Array.isArray(row), `Invalid ${label}`); for (const key of Object.keys(row)) requireThat(allowed.includes(key), `Unexpected ${label} field: ${key}`); };
function options(args) {
  const result = { apply: false, file: path.join(__dirname, 'informalismo-public.json') };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') result.apply = true;
    else if (args[i] === '--dry-run') result.dryRun = true;
    else if (args[i] === '--file') { requireThat(text(args[i + 1]) && !args[i + 1].startsWith('--'), 'Missing --file value'); result.file = path.resolve(args[++i]); }
    else throw new Error(`Unknown argument: ${args[i]}`);
  }
  requireThat(!(result.apply && result.dryRun), 'Choose --apply or --dry-run, not both');
  return result;
}
function validate(doc) {
  keys(doc, ['version', 'entities', 'references', 'sources', 'relations'], 'document');
  requireThat(doc.version === 1 && ['entities', 'references', 'sources', 'relations'].every((key) => Array.isArray(doc[key])), 'Expected version 1 and four arrays');
  requireThat(doc.entities.length > 0 && doc.sources.length > 0, 'Empty public content batch');
  const unique = (rows, label) => { const seen = new Set(); for (const row of rows) { requireThat(text(row.key) && !seen.has(row.key), `Missing/duplicate ${label} key: ${row.key}`); seen.add(row.key); } return seen; };
  const sourceKeys = unique(doc.sources, 'source');
  const entityKeys = unique([...doc.entities, ...doc.references], 'entity/reference');
  unique(doc.relations, 'relation');
  const requireSources = (list) => requireThat(Array.isArray(list) && list.length > 0 && new Set(list).size === list.length && list.every((key) => sourceKeys.has(key)), 'Missing/unknown/duplicate public source key');
  const slugs = new Set();
  for (const row of [...doc.entities, ...doc.references]) { requireThat(text(row.slug) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) && text(row.type) && !slugs.has(row.slug), `Invalid/duplicate slug/type: ${row.slug}`); slugs.add(row.slug); }
  const urls = new Set();
  for (const source of doc.sources) {
    keys(source, ['key', 'id', 'type', 'title', 'author', 'publisher', 'year', 'url', 'quote', 'locator', 'apa'], 'source');
    requireThat(text(source.id) && text(source.title) && ['BOOK', 'ARTICLE', 'WEBSITE', 'CATALOG', 'PAPER'].includes(source.type), `Invalid source: ${source.key}`);
    requireThat(source.year == null || Number.isInteger(source.year), `Invalid year: ${source.key}`);
    const url = new URL(source.url);
    requireThat(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|0\.)/i.test(url.hostname) && !url.hostname.endsWith('.local'), `Non-public source URL: ${source.key}`);
    requireThat(!urls.has(source.url) && text(source.locator) && text(source.apa), `Duplicate URL/missing public source locator or APA: ${source.key}`); urls.add(source.url);
    for (const key of ['author', 'publisher', 'quote']) requireThat(source[key] == null || typeof source[key] === 'string', `Invalid source ${key}: ${source.key}`);
  }
  for (const row of doc.references) keys(row, ['key', 'slug', 'type'], 'reference');
  for (const row of doc.entities) {
    keys(row, ['key', 'id', 'slug', 'type', 'kind', ...fields, 'sourceKeys', 'claims', 'expectedBefore'], 'entity');
    requireThat(text(row.id) && ['PERSON', 'WORK', 'ABSTRACTION', 'EVENT', 'PLACE', 'ORGANIZATION'].includes(row.kind) && fields.every((key) => text(row[key])), `Invalid/incomplete bilingual entity: ${row.key}`);
    requireSources(row.sourceKeys); requireThat(Array.isArray(row.claims) && row.claims.length > 0, `No public claims: ${row.key}`); unique(row.claims, 'claim');
    if (row.expectedBefore !== undefined) { keys(row.expectedBefore, fields, 'expectedBefore'); requireThat(fields.every((key) => Object.hasOwn(row.expectedBefore, key) && (row.expectedBefore[key] === null || typeof row.expectedBefore[key] === 'string')), 'expectedBefore must contain all six exact fields'); }
    for (const claim of row.claims) {
      keys(claim, ['key', 'propositionEs', 'propositionEn', 'sourceKeys', 'locator', 'qualifiers', 'attribution'], 'claim');
      requireThat(text(claim.propositionEs) && text(claim.propositionEn) && text(claim.locator), `Incomplete bilingual claim: ${claim.key}`); requireSources(claim.sourceKeys);
      requireThat(claim.sourceKeys.every((key) => row.sourceKeys.includes(key)), `Claim source outside entity source set: ${claim.key}`);
    }
  }
  for (const row of doc.relations) {
    keys(row, ['key', 'fromKey', 'toKey', 'typeKey', 'justificationEs', 'justificationEn', 'sourceKeys', 'locator'], 'relation');
    requireThat(entityKeys.has(row.fromKey) && entityKeys.has(row.toKey) && row.fromKey !== row.toKey && ['typeKey', 'justificationEs', 'justificationEn', 'locator'].every((key) => text(row[key])), `Invalid relation: ${row.key}`); requireSources(row.sourceKeys);
  }
  return doc;
}
function matches(entity, translations, expected) {
  if (entity.title !== expected.titleEs || entity.summary !== expected.summaryEs || entity.content !== expected.essayEs) return false;
  return ['es', 'en'].every((locale) => { const suffix = locale === 'es' ? 'Es' : 'En'; const row = translations.find((item) => item.locale === locale); return row && row.title === expected[`title${suffix}`] && row.shortDescription === expected[`summary${suffix}`] && row.essay === expected[`essay${suffix}`]; });
}
async function transfer(client, doc, apply) {
  const stats = { sourceCreated: 0, entityCreated: 0, entityUpdated: 0, entityReused: 0, assertionCreated: 0, relationCreated: 0, relationPreserved: 0, sourceRefCreated: 0, citationCreated: 0 };
  const one = async (sql, values, required = true) => { const result = await client.query(sql, values); requireThat(result.rowCount <= 1 && (!required || result.rowCount === 1), `Missing or ambiguous prerequisite: ${values?.join(', ')}`); return result.rows[0]; };
  const sourceMap = new Map(), entityMap = new Map();
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('informalismo-public-transfer-v1'))");
    for (const source of doc.sources) {
      let found = await one('SELECT id FROM "Source" WHERE url = $1', [source.url], false);
      if (!found) { await client.query('INSERT INTO "Source" (id, type, title, author, publisher, year, url, "createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)', [source.id, source.type, source.title, source.author ?? null, source.publisher ?? null, source.year ?? null, source.url]); found = { id: source.id }; stats.sourceCreated++; }
      sourceMap.set(source.key, { ...source, id: found.id });
    }
    for (const row of doc.references) {
      const found = await one('SELECT e.id FROM "Entity" e JOIN "EntityTypeDefinition" t ON t.key=e.type WHERE e.slug=$1 AND e.type=$2 AND e.status=\'PUBLISHED\' AND t.status=\'ACTIVE\' FOR SHARE OF e', [row.slug, row.type]); entityMap.set(row.key, found.id);
    }
    for (const row of doc.entities) {
      const type = await one('SELECT "baseKind", status FROM "EntityTypeDefinition" WHERE key = $1', [row.type]);
      requireThat(type.status === 'ACTIVE' && type.baseKind === row.kind, `Inactive/incompatible entity type: ${row.slug}`);
      let entity = await one('SELECT * FROM "Entity" WHERE slug = $1 FOR UPDATE', [row.slug], false);
      if (entity) requireThat(entity.type === row.type && entity.kind === row.kind, `Entity identity conflict: ${row.slug}`);
      const missing = await client.query('SELECT f."attributeDefinitionId" FROM "EntityTypeFieldDefinition" f JOIN "AttributeDefinition" d ON d.id = f."attributeDefinitionId" WHERE f."entityTypeKey" = $1 AND f."isRequired" AND (NOT d."isActive" OR NOT EXISTS (SELECT 1 FROM "EntityAttribute" a WHERE a."entityId" = $2 AND a."definitionId" = f."attributeDefinitionId" AND a.status = \'PUBLISHED\' AND (NULLIF(a."valueText", \'\') IS NOT NULL OR a."valueNumber" IS NOT NULL OR a."valueBoolean" IS NOT NULL OR a."valueDate" IS NOT NULL OR a."valueYear" IS NOT NULL OR a."valueJson" IS NOT NULL)))', [row.type, entity?.id ?? row.id]);
      requireThat(missing.rowCount === 0, `Missing required published attributes: ${row.slug}`);
      let write = !entity;
      if (entity) {
        const translations = (await client.query('SELECT * FROM "EntityTranslation" WHERE "entityId" = $1 AND locale IN (\'es\',\'en\') FOR UPDATE', [entity.id])).rows;
        if (entity.status === 'PUBLISHED' && matches(entity, translations, row)) stats.entityReused++;
        else if (entity.status === 'PUBLISHED' && row.expectedBefore && matches(entity, translations, row.expectedBefore)) write = true;
        else if (entity.status === 'DRAFT' && entity.id === row.id) write = true;
        else throw new Error(`Entity publication/content conflict: ${row.slug}`);
      }
      const entityId = entity?.id ?? row.id; entityMap.set(row.key, entityId);
      if (!entity) { await client.query('INSERT INTO "Entity" (id,type,kind,title,slug,summary,content,"contentLevel",status,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,\'PUBLISHED\',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)', [entityId, row.type, row.kind, row.titleEs, row.slug, row.summaryEs, row.essayEs, row.type === 'ARTICLE' ? 'BASIC' : null]); stats.entityCreated++; }
      else if (write) {
        const changed = await client.query('UPDATE "Entity" SET title=$1,summary=$2,content=$3,status=\'PUBLISHED\',"updatedAt"=CURRENT_TIMESTAMP WHERE id=$4 AND status=$5 AND title IS NOT DISTINCT FROM $6 AND summary IS NOT DISTINCT FROM $7 AND content IS NOT DISTINCT FROM $8', [row.titleEs, row.summaryEs, row.essayEs, entityId, entity.status, entity.title, entity.summary, entity.content]);
        requireThat(changed.rowCount === 1, `Optimistic entity conflict: ${row.slug}`); stats.entityUpdated++;
      }
      if (write) for (const locale of ['es', 'en']) {
        const suffix = locale === 'es' ? 'Es' : 'En';
        await client.query('INSERT INTO "EntityTranslation" (id,"entityId",locale,title,"shortDescription",excerpt,essay,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$5,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("entityId",locale) DO UPDATE SET title=EXCLUDED.title,"shortDescription"=EXCLUDED."shortDescription",excerpt=EXCLUDED.excerpt,essay=EXCLUDED.essay,"updatedAt"=CURRENT_TIMESTAMP', [randomUUID(), entityId, locale, row[`title${suffix}`], row[`summary${suffix}`], row[`essay${suffix}`]]);
      }
      const refs = new Map();
      for (const key of row.sourceKeys) {
        const source = sourceMap.get(key);
        let ref = await one('SELECT id FROM "SourceRef" WHERE "entityId"=$1 AND "sourceId"=$2 AND page IS NOT DISTINCT FROM $3 AND quote IS NOT DISTINCT FROM $4 AND note IS NOT DISTINCT FROM $5 ORDER BY id LIMIT 1', [entityId, source.id, source.locator, source.quote ?? null, source.apa], false);
        if (!ref) { ref = { id: randomUUID() }; await client.query('INSERT INTO "SourceRef" (id,"entityId","sourceId",page,quote,note) VALUES ($1,$2,$3,$4,$5,$6)', [ref.id, entityId, source.id, source.locator, source.quote ?? null, source.apa]); stats.sourceRefCreated++; } refs.set(key, ref.id);
      }
      for (const claim of row.claims) {
        const dimension = 'informalismo-public', normalized = fingerprint(claim.propositionEs);
        const qualifiers = { propositionEn: claim.propositionEn, qualifiers: claim.qualifiers ?? null, attribution: claim.attribution ?? null, permittedUse: 'PUBLIC' };
        let assertion = await one('SELECT id,proposition,qualifiers,status FROM "CanonicalAssertion" WHERE "entityId"=$1 AND dimension=$2 AND "normalizedFingerprint"=$3', [entityId, dimension, normalized], false);
        if (assertion) requireThat(assertion.status === 'PUBLISHED' && assertion.proposition === claim.propositionEs.trim() && stable(assertion.qualifiers) === stable(qualifiers), `Canonical assertion conflict: ${claim.key}`);
        else { assertion = { id: randomUUID() }; await client.query('INSERT INTO "CanonicalAssertion" (id,"entityId",dimension,proposition,"normalizedFingerprint",qualifiers,status,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6::jsonb,\'PUBLISHED\',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)', [assertion.id, entityId, dimension, claim.propositionEs.trim(), normalized, JSON.stringify(qualifiers)]); stats.assertionCreated++; }
        for (const key of claim.sourceKeys) {
          const source = sourceMap.get(key);
          await client.query('INSERT INTO "CanonicalAssertionSourceRef" ("assertionId","sourceRefId","createdAt") VALUES ($1,$2,CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING', [assertion.id, refs.get(key)]);
          const inserted = await client.query('INSERT INTO "Citation" (id,"sourceId","entityId","canonicalAssertionId",stance,locator,quote,note,"createdAt","updatedAt") SELECT $1,$2,$3,$4,\'SUPPORTS\',$5,$6,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM "Citation" WHERE "sourceId"=$2 AND "entityId"=$3 AND "canonicalAssertionId"=$4 AND "researchEvidenceId" IS NULL AND "relationId" IS NULL AND "entityAttributeId" IS NULL AND stance=\'SUPPORTS\' AND locator IS NOT DISTINCT FROM $5)', [randomUUID(), source.id, entityId, assertion.id, claim.locator, source.quote ?? null, source.apa]); stats.citationCreated += inserted.rowCount;
        }
      }
    }
    for (const row of doc.relations) {
      const fromId = entityMap.get(row.fromKey), toId = entityMap.get(row.toKey);
      const endpoints = await client.query('SELECT id FROM "Entity" WHERE id=ANY($1::text[]) AND status=\'PUBLISHED\' FOR SHARE', [[fromId, toId]]); requireThat(endpoints.rowCount === 2, `Non-public relation endpoint: ${row.key}`);
      const type = await one('SELECT id FROM "RelationType" WHERE key=$1 AND "isActive"', [row.typeKey]);
      let relation = await one('SELECT id,status,justification FROM "Relation" WHERE "fromId"=$1 AND "toId"=$2 AND "relationTypeId"=$3 FOR UPDATE', [fromId, toId, type.id], false);
      if (relation) {
        requireThat(relation.status === 'PUBLISHED', `Existing non-public relation: ${row.key}`);
        const translations = (await client.query('SELECT locale,justification FROM "RelationTranslation" WHERE "relationId"=$1 AND locale IN (\'es\',\'en\')', [relation.id])).rows;
        if (relation.justification !== row.justificationEs || !['es', 'en'].every((locale) => translations.some((item) => item.locale === locale && item.justification === row[locale === 'es' ? 'justificationEs' : 'justificationEn']))) { stats.relationPreserved++; continue; }
      } else {
        relation = { id: randomUUID() }; await client.query('INSERT INTO "Relation" (id,"fromId","toId","relationTypeId",justification,status,confidence,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,\'PUBLISHED\',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)', [relation.id, fromId, toId, type.id, row.justificationEs]); stats.relationCreated++;
        for (const locale of ['es', 'en']) await client.query('INSERT INTO "RelationTranslation" (id,"relationId",locale,justification,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)', [randomUUID(), relation.id, locale, row[locale === 'es' ? 'justificationEs' : 'justificationEn']]);
      }
      for (const key of row.sourceKeys) {
        const source = sourceMap.get(key);
        const inserted = await client.query('INSERT INTO "Citation" (id,"sourceId","relationId",stance,locator,quote,note,"createdAt","updatedAt") SELECT $1,$2,$3,\'SUPPORTS\',$4,$5,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM "Citation" WHERE "sourceId"=$2 AND "relationId"=$3 AND "researchEvidenceId" IS NULL AND "entityId" IS NULL AND "canonicalAssertionId" IS NULL AND "entityAttributeId" IS NULL AND stance=\'SUPPORTS\' AND locator IS NOT DISTINCT FROM $4)', [randomUUID(), source.id, relation.id, row.locator, source.quote ?? null, source.apa]); stats.citationCreated += inserted.rowCount;
      }
    }
    for (const row of doc.entities) for (const essay of [row.essayEs, row.essayEn]) {
      const links = [...essay.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)];
      requireThat(!essay.replace(/\[\[[^|\]]+\|[^\]]+\]\]/g, '').includes('[['), `Malformed rich text: ${row.slug}`);
      for (const [, slug] of links) { requireThat(slug !== row.slug, `Self rich-text link: ${slug}`); await one('SELECT id FROM "Entity" WHERE slug=$1 AND status=\'PUBLISHED\'', [slug]); }
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    return stats;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
function selfTest() {
  assert.equal(fingerprint(' TÀPIES: materia, y gesto. '), fingerprint('tapies materia y gesto'));
  assert.equal(stable({ b: { z: 1, a: 2 }, a: true }), stable({ a: true, b: { a: 2, z: 1 } }));
  assert.equal(options([]).apply, false); assert.equal(options(['--apply']).apply, true);
  assert.throws(() => options(['--apply', '--dry-run'])); assert.throws(() => options(['--file'])); assert.throws(() => options(['--force']));
  const values = { titleEs: 'A', titleEn: 'A', summaryEs: 'B', summaryEn: 'B', essayEs: 'C', essayEn: 'C' };
  const translations = ['es', 'en'].map((locale) => ({ locale, title: 'A', shortDescription: 'B', essay: 'C' }));
  assert(matches({ title: 'A', summary: 'B', content: 'C' }, translations, values));
  assert(!matches({ title: 'Changed', summary: 'B', content: 'C' }, translations, values));
  assert.throws(() => validate({ version: 1, entities: [], references: [], sources: [], relations: [], research: [] }));
  const sample = { version: 1, sources: [{ key: 'museum', id: 's', type: 'WEBSITE', title: 'Museum', url: 'https://www.guggenheim.org/artwork/4037', locator: 'Title and medium', apa: 'Museum. (n.d.). Work.' }], entities: [{ key: 'work', id: 'e', slug: 'test-work', type: 'ARTWORK', kind: 'WORK', ...values, sourceKeys: ['museum'], claims: [{ key: 'claim', propositionEs: 'Una obra.', propositionEn: 'A work.', sourceKeys: ['museum'], locator: 'Title' }] }], references: [], relations: [] };
  assert.equal(validate(sample), sample);
  for (const mutate of [
    (doc) => { doc.sources[0].url = 'file:///private/research.pdf'; },
    (doc) => { doc.sources[0].url = 'http://127.0.0.1/admin'; },
    (doc) => { doc.entities[0].claims[0].researchEvidenceId = 'private'; },
    (doc) => { doc.entities[0].claims[0].sourceKeys = ['unknown']; },
    (doc) => { doc.entities[0].expectedBefore = { titleEs: 'Only a title' }; },
    (doc) => { doc.references.push({ key: 'work', slug: 'other', type: 'ARTWORK' }); },
  ]) { const bad = structuredClone(sample); mutate(bad); assert.throws(() => validate(bad)); }
  console.log('Self-test passed: fingerprint, JSON equality, dry-run default, CLI guards, optimistic content comparison, valid payload, private-field/URL rejection, unknown sources, incomplete snapshots and duplicate keys.');
}
async function main() {
  if (process.argv.length === 3 && process.argv[2] === '--self-test') return selfTest();
  const settings = options(process.argv.slice(2)), doc = validate(JSON.parse(fs.readFileSync(settings.file, 'utf8')));
  requireThat(text(process.env.DATABASE_URL), 'DATABASE_URL is required');
  const { Pool } = require('pg'), pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let client;
  try { client = await pool.connect(); const stats = await transfer(client, doc, settings.apply); console.log(`${settings.apply ? 'APPLIED' : 'DRY RUN — rolled back'}: ${JSON.stringify(stats)}`); }
  finally { client?.release(); await pool.end(); }
}
module.exports = { fingerprint, options, validate, matches, transfer };
if (require.main === module) main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exitCode = 1; });
