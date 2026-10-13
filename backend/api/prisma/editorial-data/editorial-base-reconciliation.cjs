#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');

const dryRun = process.argv.includes('--dry-run');
const inputFile = path.resolve(__dirname, 'entity-editorial-approved.json');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const titles = {
  'ana-mendieta': 'Ana Mendieta',
  'nancy-spero': 'Nancy Spero',
};

async function main() {
  const document = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const rows = document.rows.filter((row) => Object.hasOwn(titles, row.slug));
  if (rows.length !== Object.keys(titles).length) {
    throw new Error('Reconciliation artifact is missing one of the expected artist rows');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const entityIds = {};
    const missingEntities = [];
    for (const row of rows) {
      const result = await client.query(
        `SELECT id, type, status FROM "Entity" WHERE slug = $1`,
        [row.slug],
      );
      if (result.rowCount > 1) throw new Error(`Ambiguous entity slug: ${row.slug}`);
      if (result.rowCount === 1) {
        const entity = result.rows[0];
        if (entity.type !== row.type || entity.status !== 'PUBLISHED') {
          throw new Error(`Existing entity is incompatible: ${row.slug}`);
        }
        entityIds[row.slug] = entity.id;
      } else {
        missingEntities.push(row);
        entityIds[row.slug] = randomUUID();
      }
    }

    const source = await client.query(
      `SELECT id FROM "Entity" WHERE slug = 'cubismo' AND type = 'MOVEMENT' AND status = 'PUBLISHED'`,
    );
    const target = await client.query(
      `SELECT id FROM "Entity" WHERE slug = 'paul-cezanne' AND type = 'ARTIST' AND status = 'PUBLISHED'`,
    );
    const relationType = await client.query(
      `SELECT id FROM "RelationType" WHERE key = 'INFLUENCED_BY'`,
    );
    if (source.rowCount !== 1 || target.rowCount !== 1 || relationType.rowCount !== 1) {
      throw new Error('Cannot resolve the cubismo / Paul Cézanne relation prerequisites');
    }

    const relation = await client.query(
      `SELECT id FROM "Relation" WHERE "fromId" = $1 AND "toId" = $2 AND "relationTypeId" = $3`,
      [source.rows[0].id, target.rows[0].id, relationType.rows[0].id],
    );
    if (relation.rowCount > 1) throw new Error('Ambiguous cubismo / Paul Cézanne relation');
    const relationMissing = relation.rowCount === 0;

    if (dryRun) {
      await client.query('ROLLBACK');
      console.log(
        `Dry run: ${missingEntities.length} entities and ${relationMissing ? 1 : 0} relation require reconciliation`,
      );
      return;
    }

    for (const row of missingEntities) {
      const entityId = entityIds[row.slug];
      await client.query(
        `INSERT INTO "Entity"
          ("id", "type", "kind", "title", "slug", "summary", "content", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, 'PERSON', $3, $4, $5, $6, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [entityId, row.type, titles[row.slug], row.slug, row.summaryEs, row.essayEs],
      );
      for (const [locale, values] of Object.entries({
        es: { summary: row.summaryEsTranslation, essay: row.essayEsTranslation },
        en: { summary: row.summaryEn, essay: row.essayEn },
      })) {
        await client.query(
          `INSERT INTO "EntityTranslation"
            ("id", "entityId", "locale", "title", "shortDescription", "essay", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [randomUUID(), entityId, locale, titles[row.slug], values.summary, values.essay],
        );
      }
    }

    if (relationMissing) {
      await client.query(
        `INSERT INTO "Relation"
          ("id", "fromId", "toId", "relationTypeId", "justification", "status", "confidence", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'PUBLISHED', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          randomUUID(),
          source.rows[0].id,
          target.rows[0].id,
          relationType.rows[0].id,
          'La Source documenta que el cubismo estuvo parcialmente influido por la obra tardía de Paul Cézanne y por sus distintos puntos de vista.',
        ],
      );
    }

    await client.query('COMMIT');
    console.log(
      `Reconciled ${missingEntities.length} entities and ${relationMissing ? 1 : 0} relation idempotently`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
