#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'artifacts', 'editorial-recovery');
const files = fs
  .readdirSync(dir)
  .filter((file) => /^artists-batch-\d+-draft\.json$/.test(file))
  .sort();

if (files.length !== 20) {
  throw new Error(`Expected 20 artist batches, found ${files.length}`);
}

const batches = files.map((file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
const rows = batches.flatMap((batch) => batch.rows);
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const ids = rows.map((row) => q(row.entityId)).join(',');

console.log('BEGIN;');
for (const row of rows) {
  console.log(
    `UPDATE "Entity" SET summary=${q(row.after.summary_es)}, content=${q(row.after.essay_es)}, "updatedAt"=CURRENT_TIMESTAMP WHERE id=${q(row.entityId)} AND type='ARTIST' AND status='PUBLISHED';`,
  );
  for (const [locale, summary, essay] of [
    ['es', row.after.summary_es, row.after.essay_es],
    ['en', row.after.summary_en, row.after.essay_en],
  ]) {
    console.log(
      `UPDATE "EntityTranslation" SET "shortDescription"=${q(summary)}, essay=${q(essay)}, excerpt=${q(summary)}, "updatedAt"=CURRENT_TIMESTAMP WHERE "entityId"=${q(row.entityId)} AND locale=${q(locale)};`,
    );
  }
}
console.log('DO $$ BEGIN');
console.log(
  `IF (SELECT count(*) FROM "Entity" WHERE id IN (${ids}) AND length(trim(coalesce(summary,''))) > 0 AND length(trim(coalesce(content,''))) > 0) <> ${rows.length} THEN RAISE EXCEPTION 'artist entity assertion failed'; END IF;`,
);
console.log(
  `IF (SELECT count(*) FROM "EntityTranslation" WHERE "entityId" IN (${ids}) AND locale IN ('es','en') AND length(trim(coalesce(essay,''))) > 0 AND length(trim(coalesce("shortDescription",''))) > 0) <> ${rows.length * 2} THEN RAISE EXCEPTION 'artist translation assertion failed'; END IF;`,
);
console.log('END $$;');
console.log('COMMIT;');
