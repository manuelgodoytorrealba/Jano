// Two manually reviewed repairs. No inference from edges or Entity.startYear.
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const base = 'artifacts/editorial-recovery/';
const snapshot = JSON.parse(fs.readFileSync(base + 'public-snapshot.json'));
const drafts = JSON.parse(fs.readFileSync(base + 'repairs.json'));
const q = s => "'" + String(s).replaceAll("'", "''") + "'";
const db = sql => execFileSync('docker', ['exec', '-i', 'infra-db-1', 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'jano', '-d', 'jano'], { input: sql, encoding: 'utf8' });
const records = ['romanticismo', 'neoclasicismo'].map(slug => {
  const old = snapshot.entities.find(e => e.slug === slug);
  const next = { ...drafts.find(e => e.slug === slug) };
  if (slug === 'romanticismo') {
    next.essay_es = next.essay_es.replace('el mundo natural.', 'el [[naturaleza|mundo natural]].');
    next.essay_en = next.essay_en.replace('the natural world.', 'the [[naturaleza|natural world]].');
  }
  const claims = slug === 'romanticismo' ? old.assertions : old.refs.filter(r => r.id === next.sources[0]);
  assert(claims.length);
  for (const field of ['summary_es','essay_es','summary_en','essay_en']) {
    assert(next[field]?.trim());
    assert(!/\bJANO\b|\\[nrt]|this entity|la ficha/.test(next[field]));
    for (const m of next[field].matchAll(/\[\[([^|]+)\|([^\]]+)\]\]/g)) {
      const target = snapshot.catalog.find(e => e.slug === m[1]);
      assert(target && target.status === 'PUBLISHED' && target.id !== old.id);
    }
  }
  return { id: old.id, slug, before: { summary_es: old.summary, essay_es: old.content, summary_en: old.summary_en, essay_en: old.essay_en }, after: next,
    PUBLIC_CLAIMS_USED: claims, SOURCES_USED: next.sources || [], RELATIONS_USED: [],
    grounding_review: Object.fromEntries(['summary_es','essay_es','summary_en','essay_en'].map(field => [field, next[field].split(/\n\s*\n/).filter(p => !p.startsWith('#')).map(text => ({text, grounding_ids: claims.map(c => c.id), decision: 'ENTAILED', review: slug === 'romanticismo' ? 'All clauses paraphrase the published definition; early-century qualifier retained. Nature link is conceptual, not a historical assertion.' : 'Public quote supports approximate emergence, ancient-art interest, disciplines, Winckelmann publication year and Pompeii context. No execution-date inference; Winckelmann remains unlinked because draft.'}))])),
    rejected_old_text: { summary_es: old.summary, essay_es: old.content, summary_en: old.summary_en, essay_en: old.essay_en },
    status: 'MANUALLY_REVIEWED_PENDING_BROWSER', note: 'Old fields retained in full for review, not a claim that every old sentence is false. ES/EN clauses reviewed against the same passage.' };
});
const ids = records.map(r => q(r.id)).join(',');
const current = JSON.parse(db(`BEGIN READ ONLY; SELECT json_build_object('database',current_database(),'total',(SELECT count(*) FROM "Entity"),'rows',(SELECT json_agg(json_build_object('id',e.id,'summary_es',e.summary,'essay_es',e.content,'summary_en',t."shortDescription",'essay_en',t.essay)) FROM "Entity" e JOIN "EntityTranslation" t ON t."entityId"=e.id AND t.locale='en' WHERE e.id IN (${ids}))); ROLLBACK;`));
assert.equal(current.database, 'jano'); assert.equal(current.total, 824);
for (const r of records) {
  const {id, ...fields} = current.rows.find(e => e.id === r.id);
  assert.deepEqual(fields, r.before, 'Public prose changed since snapshot; abort');
}
fs.writeFileSync(base + 'two-reviewed.json', JSON.stringify(records, null, 2) + '\n');
if (!process.argv.includes('--apply')) { console.log('Two reviewed proposals; no writes.'); process.exit(0); }
let sql = 'BEGIN; SET LOCAL standard_conforming_strings=on;\n';
for (const r of records) {
  const n = r.after, b = r.before;
  sql += `DO $guard$ BEGIN IF NOT EXISTS (SELECT 1 FROM "Entity" e JOIN "EntityTranslation" t ON t."entityId"=e.id AND t.locale='en' WHERE e.id=${q(r.id)} AND e.summary=${q(b.summary_es)} AND e.content=${q(b.essay_es)} AND t."shortDescription"=${q(b.summary_en)} AND t.essay=${q(b.essay_en)} FOR UPDATE OF e,t) THEN RAISE EXCEPTION 'Concurrent editorial change'; END IF; END $guard$;\n`;
  sql += `UPDATE "Entity" SET summary=${q(n.summary_es)}, content=${q(n.essay_es)} WHERE id=${q(r.id)};\n`;
  for (const locale of ['es','en']) sql += `UPDATE "EntityTranslation" SET "shortDescription"=${q(n['summary_'+locale])},essay=${q(n['essay_'+locale])},excerpt=${q(n['summary_'+locale])} WHERE "entityId"=${q(r.id)} AND locale=${q(locale)};\n`;
}
sql += 'COMMIT;';
fs.writeFileSync(base + 'two-applied.sql', sql, {flag:'wx'});
console.log(db(sql));
console.log('Applied two editorial-only repairs. Browser approval still required.');
