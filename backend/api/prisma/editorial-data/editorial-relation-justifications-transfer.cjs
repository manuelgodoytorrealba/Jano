#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');

const mode = process.argv[2];
const defaultFile = path.resolve(__dirname, 'editorial-relation-justifications-approved.json');
const outputFile = process.env.EDITORIAL_TRANSFER_FILE || defaultFile;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const fail = (message) => {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
};

async function exportRows() {
  const { rows } = await pool.query(`
    SELECT
      r.id AS "relationId",
      source.slug AS "fromSlug",
      target.slug AS "toSlug",
      rt.key AS "relationType",
      ej.locale,
      ej.text,
      ej.status,
      ej."claimsUsed",
      ej."sourcesUsed",
      ej."reviewNote"
    FROM "EditorialRelationJustification" ej
    JOIN "Relation" r ON r.id = ej."relationId"
    JOIN "Entity" source ON source.id = r."fromId"
    JOIN "Entity" target ON target.id = r."toId"
    JOIN "RelationType" rt ON rt.id = r."relationTypeId"
    WHERE ej.status = 'APPROVED'
    ORDER BY source.slug, target.slug, rt.key, ej.locale
  `);

  if (rows.length !== 1928) {
    throw new Error(`Expected 1928 approved rows, found ${rows.length}`);
  }

  const keys = new Set();
  for (const row of rows) {
    if (!['es', 'en'].includes(row.locale)) throw new Error(`Invalid locale: ${row.locale}`);
    const key = `${row.fromSlug}|${row.relationType}|${row.toSlug}|${row.locale}`;
    if (keys.has(key)) throw new Error(`Duplicate transfer key: ${key}`);
    keys.add(key);
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(
    outputFile,
    `${JSON.stringify(
      {
        source: 'development',
        exportedAt: new Date().toISOString(),
        rowCount: rows.length,
        rows,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Exported ${rows.length} approved rows to ${outputFile}`);
}

async function importRows() {
  const document = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  if (document.rowCount !== 1928 || document.rows?.length !== 1928) {
    throw new Error('Transfer artifact must contain exactly 1928 rows');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const missing = [];
    const relationIds = new Map();

    for (const row of document.rows) {
      const result = await client.query(
        `
        SELECT r.id
        FROM "Relation" r
        JOIN "Entity" source ON source.id = r."fromId"
        JOIN "Entity" target ON target.id = r."toId"
        JOIN "RelationType" rt ON rt.id = r."relationTypeId"
        WHERE source.slug = $1 AND target.slug = $2 AND rt.key = $3 AND r.status = 'PUBLISHED'
      `,
        [row.fromSlug, row.toSlug, row.relationType],
      );
      if (result.rowCount !== 1) {
        missing.push(
          `${row.fromSlug}|${row.relationType}|${row.toSlug} (${result.rowCount} matches)`,
        );
        continue;
      }
      relationIds.set(`${row.fromSlug}|${row.relationType}|${row.toSlug}`, result.rows[0].id);
    }

    if (missing.length)
      throw new Error(
        `Missing or ambiguous published relations: ${missing.slice(0, 10).join(', ')}`,
      );

    if (process.argv.includes('--dry-run')) {
      await client.query('ROLLBACK');
      console.log(
        `Dry run passed: ${document.rows.length} rows resolve to published production relations`,
      );
      return;
    }

    for (const row of document.rows) {
      const relationId = relationIds.get(`${row.fromSlug}|${row.relationType}|${row.toSlug}`);
      await client.query(
        `
        INSERT INTO "EditorialRelationJustification"
          ("id", "relationId", "locale", "text", "status", "claimsUsed", "sourcesUsed", "reviewNote", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, 'APPROVED', $5::jsonb, $6::jsonb, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("relationId", "locale") DO UPDATE SET
          "text" = EXCLUDED."text",
          "status" = 'APPROVED',
          "claimsUsed" = EXCLUDED."claimsUsed",
          "sourcesUsed" = EXCLUDED."sourcesUsed",
          "reviewNote" = EXCLUDED."reviewNote",
          "updatedAt" = CURRENT_TIMESTAMP
      `,
        [
          randomUUID(),
          relationId,
          row.locale,
          row.text,
          JSON.stringify(row.claimsUsed),
          JSON.stringify(row.sourcesUsed),
          row.reviewNote,
        ],
      );
    }

    await client.query('COMMIT');
    console.log(`Imported ${document.rows.length} approved rows idempotently`);
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
    else
      throw new Error(
        'Usage: node editorial-relation-justifications-transfer.cjs export|import [--dry-run]',
      );
  } catch (error) {
    fail(error.message);
  } finally {
    await pool.end();
  }
})();
