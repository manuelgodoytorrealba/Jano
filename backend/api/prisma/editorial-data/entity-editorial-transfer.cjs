#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const mode = process.argv[2];
const inputFile =
  process.env.EDITORIAL_ENTITY_TRANSFER_FILE ||
  path.resolve(__dirname, 'entity-editorial-approved.json');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function exportRows() {
  const { rows } = await pool.query(`
    SELECT
      e.slug,
      e.type,
      e.summary AS "summaryEs",
      e.content AS "essayEs",
      es."shortDescription" AS "summaryEsTranslation",
      es.essay AS "essayEsTranslation",
      es.excerpt AS "excerptEs",
      en."shortDescription" AS "summaryEn",
      en.essay AS "essayEn",
      en.excerpt AS "excerptEn"
    FROM "Entity" e
    LEFT JOIN "EntityTranslation" es ON es."entityId" = e.id AND es.locale = 'es'
    LEFT JOIN "EntityTranslation" en ON en."entityId" = e.id AND en.locale = 'en'
    WHERE e.status = 'PUBLISHED'
      AND (
        nullif(e.summary, '') IS NOT NULL OR nullif(e.content, '') IS NOT NULL OR
        nullif(es."shortDescription", '') IS NOT NULL OR nullif(es.essay, '') IS NOT NULL OR
        nullif(en."shortDescription", '') IS NOT NULL OR nullif(en.essay, '') IS NOT NULL
      )
    ORDER BY e.slug
  `);

  if (!rows.length) throw new Error('No published editorial entities found');
  for (const row of rows) {
    if (!row.slug || !row.type) throw new Error('Published entity without slug/type');
    if (![row.summaryEs, row.essayEs, row.summaryEn, row.essayEn].some(Boolean)) {
      throw new Error(`No editorial content for ${row.slug}`);
    }
  }

  fs.writeFileSync(
    inputFile,
    `${JSON.stringify({ source: 'development', rowCount: rows.length, rows }, null, 2)}\n`,
  );
  console.log(`Exported ${rows.length} published editorial entities to ${inputFile}`);
}

async function importRows() {
  const document = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  if (!document.rowCount || document.rows?.length !== document.rowCount) {
    throw new Error('Editorial transfer artifact has an invalid row count');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const missing = [];
    const matches = [];

    for (const row of document.rows) {
      const result = await client.query(
        `SELECT id FROM "Entity" WHERE slug = $1 AND type = $2 AND status = 'PUBLISHED'`,
        [row.slug, row.type],
      );
      if (result.rowCount !== 1) missing.push(`${row.slug} (${result.rowCount} matches)`);
      else matches.push({ row, entityId: result.rows[0].id });
    }

    if (process.argv.includes('--dry-run')) {
      await client.query('ROLLBACK');
      console.log(
        `Dry run: ${matches.length}/${document.rowCount} published entities match; missing ${missing.length}`,
      );
      if (missing.length) console.log(`Missing: ${missing.join(', ')}`);
      return;
    }
    if (missing.length)
      throw new Error(
        `Refusing partial editorial sync; missing ${missing.length}: ${missing.join(', ')}`,
      );

    for (const { row, entityId } of matches) {
      await client.query(
        `UPDATE "Entity" SET summary = $1, content = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3`,
        [row.summaryEs, row.essayEs, entityId],
      );
      for (const [locale, values] of Object.entries({
        es: {
          summary: row.summaryEsTranslation,
          essay: row.essayEsTranslation,
          excerpt: row.excerptEs,
        },
        en: { summary: row.summaryEn, essay: row.essayEn, excerpt: row.excerptEn },
      })) {
        await client.query(
          `UPDATE "EntityTranslation"
           SET "shortDescription" = $1, essay = $2, excerpt = $3, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "entityId" = $4 AND locale = $5`,
          [values.summary, values.essay, values.excerpt, entityId, locale],
        );
      }
    }

    await client.query('COMMIT');
    console.log(`Imported editorial content for ${matches.length} published entities`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

(async () => {
  try {
    if (mode === 'export') await exportRows();
    else if (mode === 'import') await importRows();
    else throw new Error('Usage: node entity-editorial-transfer.cjs export|import [--dry-run]');
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
