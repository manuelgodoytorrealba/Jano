/*
 * Read-only Foundational production snapshot.
 *
 * Run against the deployed backend so it uses the deployed catalog and the
 * already-configured production DATABASE_URL:
 *
 *   docker exec -i infra-backend-1 node - \
 *     < backend/api/scripts/foundational-production-snapshot.cjs \
 *     > artifacts/foundational-audit/snapshot.json
 */
'use strict';

const path = require('node:path');
const { Pool } = require('pg');

const runtimeRoot = process.env.JANO_AUDIT_RUNTIME_ROOT || process.cwd();
const { entities: catalogEntities, relations: catalogRelations } = require(
  path.join(runtimeRoot, 'dist/prisma/foundational/catalog.js'),
);
const { editorialInventory } = require(
  path.join(runtimeRoot, 'dist/prisma/foundational/editorial-priority.js'),
);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Run this inside the deployed backend container.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

let queryChain = Promise.resolve();
function rows(client, sql) {
  queryChain = queryChain.then(async () => (await client.query(sql)).rows);
  return queryChain;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN TRANSACTION READ ONLY');

    const [
      server,
      migrations,
      entities,
      translations,
      aliases,
      relations,
      relationTypes,
      sourceRefs,
      citations,
      media,
      entityMedia,
      artworkDetails,
      artworkDetailsTranslations,
      artistDetails,
      artistDetailsTranslations,
      conceptDetails,
      conceptDetailsTranslations,
      periodDetails,
      periodDetailsTranslations,
      attributes,
      entityTypes,
      typeFields,
    ] = await Promise.all([
      rows(
        client,
        `
        SELECT current_database() AS database, current_user AS user,
               current_setting('server_version') AS version,
               current_setting('transaction_read_only') AS "transactionReadOnly"
      `,
      ),
      rows(
        client,
        `
        SELECT migration_name AS name, started_at AS "startedAt",
               finished_at AS "finishedAt", rolled_back_at AS "rolledBackAt",
               checksum
        FROM _prisma_migrations ORDER BY started_at
      `,
      ),
      rows(
        client,
        `
        SELECT id, type, kind, title, slug, summary, content,
               "contentLevel", status, "startYear", "endYear",
               "createdAt", "updatedAt"
        FROM "Entity" ORDER BY slug
      `,
      ),
      rows(
        client,
        `
        SELECT id, "entityId", locale, title, "shortDescription", essay,
               notes, excerpt, "createdAt", "updatedAt"
        FROM "EntityTranslation" ORDER BY "entityId", locale
      `,
      ),
      rows(
        client,
        `
        SELECT id, "entityId", locale, value, kind, weight, source
        FROM "EntityAlias" ORDER BY "entityId", locale, value
      `,
      ),
      rows(
        client,
        `
        SELECT r.id, r."fromId", f.slug AS "fromSlug", r."toId",
               t.slug AS "toSlug", rt.key AS type, rt.category,
               r.status, r.weight, r.confidence, r.justification,
               r."validFromYear", r."validToYear"
        FROM "Relation" r
        JOIN "Entity" f ON f.id = r."fromId"
        JOIN "Entity" t ON t.id = r."toId"
        JOIN "RelationType" rt ON rt.id = r."relationTypeId"
        ORDER BY f.slug, t.slug, rt.key
      `,
      ),
      rows(
        client,
        `
        SELECT id, key, label, "inverseLabel", directed, category,
               "isActive", "sortOrder"
        FROM "RelationType" ORDER BY key
      `,
      ),
      rows(
        client,
        `
        SELECT sr.id, sr."entityId", sr.page, sr.quote, sr.note,
               s.id AS "sourceId", s.type AS "sourceType", s.author,
               s.title, s.publisher, s.year, s.url
        FROM "SourceRef" sr JOIN "Source" s ON s.id = sr."sourceId"
        ORDER BY sr."entityId", s.title
      `,
      ),
      rows(
        client,
        `
        SELECT c.id, c."sourceId", c."entityId", c."relationId",
               c."entityAttributeId", c.stance, c.locator, c.quote, c.note,
               s.type AS "sourceType", s.title AS "sourceTitle", s.publisher,
               s.url AS "sourceUrl"
        FROM "Citation" c JOIN "Source" s ON s.id = c."sourceId"
        ORDER BY c.id
      `,
      ),
      rows(
        client,
        `
        SELECT id, url, kind, "originType", "derivedFromMediaId",
               "canonicalUrl", "displayUrl", "sourcePageUrl", "storageKey",
               "originalFilename", "fileSize", "mimeType", width, height,
               "focalX", "focalY", "isVector", provider, "qualityTier",
               alt, source, "photoBy", license, "createdAt"
        FROM "Media" ORDER BY "createdAt", id
      `,
      ),
      rows(
        client,
        `
        SELECT em.id, em."entityId", e.slug, e.title, e.type, em."mediaId",
               em.role, em."sortOrder", em."isPrimary", em."displayMode",
               em."focalX", em."focalY", em."cropExplorer3d", em."cropList",
               em."cropDetail", em."cropPreview"
        FROM "EntityMedia" em JOIN "Entity" e ON e.id = em."entityId"
        ORDER BY e.slug, em."sortOrder", em.id
      `,
      ),
      rows(client, 'SELECT * FROM "ArtworkDetails" ORDER BY "entityId"'),
      rows(client, 'SELECT * FROM "ArtworkDetailsTranslation" ORDER BY "entityId", locale'),
      rows(client, 'SELECT * FROM "ArtistDetails" ORDER BY "entityId"'),
      rows(client, 'SELECT * FROM "ArtistDetailsTranslation" ORDER BY "entityId", locale'),
      rows(client, 'SELECT * FROM "ConceptDetails" ORDER BY "entityId"'),
      rows(client, 'SELECT * FROM "ConceptDetailsTranslation" ORDER BY "entityId", locale'),
      rows(client, 'SELECT * FROM "PeriodDetails" ORDER BY "entityId"'),
      rows(client, 'SELECT * FROM "PeriodDetailsTranslation" ORDER BY "entityId", locale'),
      rows(
        client,
        `
        SELECT ea.id, ea."entityId", ad.key, ad."valueType", ea.locale,
               ea."valueText", ea."valueNumber", ea."valueBoolean",
               ea."valueDate", ea."valueYear", ea."valueJson", ea.status,
               ea.confidence, ea."validFromYear", ea."validToYear"
        FROM "EntityAttribute" ea
        JOIN "AttributeDefinition" ad ON ad.id = ea."definitionId"
        ORDER BY ea."entityId", ad.key, ea.locale
      `,
      ),
      rows(
        client,
        `
        SELECT key, "singularName", "pluralName", description, icon,
               "colorToken", "baseKind", status, "systemType"
        FROM "EntityTypeDefinition" ORDER BY key
      `,
      ),
      rows(
        client,
        `
        SELECT etd."entityTypeKey", ad.key, ad."valueType",
               etd."sortOrder", etd."isRequired"
        FROM "EntityTypeFieldDefinition" etd
        JOIN "AttributeDefinition" ad ON ad.id = etd."attributeDefinitionId"
        ORDER BY etd."entityTypeKey", etd."sortOrder"
      `,
      ),
    ]);

    await client.query('COMMIT');

    const deployedEditorialInventory = editorialInventory(catalogEntities, catalogRelations);
    process.stdout.write(
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          mode: 'READ_ONLY',
          server: server[0],
          catalog: {
            entities: deployedEditorialInventory,
            relations: catalogRelations,
          },
          db: {
            migrations,
            entities,
            translations,
            aliases,
            relations,
            relationTypes,
            sourceRefs,
            citations,
            media,
            entityMedia,
            details: {
              artwork: artworkDetails,
              artworkTranslations: artworkDetailsTranslations,
              artist: artistDetails,
              artistTranslations: artistDetailsTranslations,
              concept: conceptDetails,
              conceptTranslations: conceptDetailsTranslations,
              period: periodDetails,
              periodTranslations: periodDetailsTranslations,
            },
            attributes,
            entityTypes,
            typeFields,
          },
        },
        null,
        2,
      )}\n`,
    );
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original snapshot failure when rollback also fails.
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
