-- Search support: weighted PostgreSQL full-text index without adding a persisted column.
CREATE INDEX "Entity_search_weighted_idx" ON "Entity" USING GIN (
  (
    setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("summary", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("content", '')), 'C')
  )
);

-- Relation type normalization. Relation.type remains as legacy compatibility.
CREATE TABLE "RelationType" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "inverseLabel" TEXT,
  "directed" BOOLEAN NOT NULL DEFAULT true,
  "category" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RelationType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RelationType_key_key" ON "RelationType"("key");

ALTER TABLE "Relation" ADD COLUMN "relationTypeId" TEXT;
CREATE INDEX "Relation_relationTypeId_idx" ON "Relation"("relationTypeId");

INSERT INTO "RelationType" ("id", "key", "label", "inverseLabel", "directed", "category", "isActive", "sortOrder", "updatedAt")
VALUES
  ('relation-type-created-by', 'CREATED_BY', 'Creado por', 'Creador de', true, 'authorship', true, 10, CURRENT_TIMESTAMP),
  ('relation-type-belongs-to-movement', 'BELONGS_TO_MOVEMENT', 'Pertenece al movimiento', 'Incluye entidad', true, 'taxonomy', true, 20, CURRENT_TIMESTAMP),
  ('relation-type-belongs-to-period', 'BELONGS_TO_PERIOD', 'Pertenece al periodo', 'Incluye entidad', true, 'taxonomy', true, 30, CURRENT_TIMESTAMP),
  ('relation-type-about-concept', 'ABOUT_CONCEPT', 'Explora el concepto', 'Concepto explorado por', true, 'semantic', true, 40, CURRENT_TIMESTAMP),
  ('relation-type-located-in', 'LOCATED_IN', 'Ubicado en', 'Ubicación de', true, 'context', true, 50, CURRENT_TIMESTAMP),
  ('relation-type-related-to', 'RELATED_TO', 'Relacionado con', 'Relacionado con', false, 'semantic', true, 60, CURRENT_TIMESTAMP),
  ('relation-type-associated-with', 'ASSOCIATED_WITH', 'Asociado con', 'Asociado con', false, 'semantic', true, 70, CURRENT_TIMESTAMP),
  ('relation-type-mentions', 'MENTIONS', 'Menciona', 'Mencionado por', true, 'content', true, 80, CURRENT_TIMESTAMP),
  ('relation-type-inspired-by', 'INSPIRED_BY', 'Inspirado por', 'Inspira a', true, 'influence', true, 90, CURRENT_TIMESTAMP),
  ('relation-type-influenced-by', 'INFLUENCED_BY', 'Influenciado por', 'Influye en', true, 'influence', true, 100, CURRENT_TIMESTAMP),
  ('relation-type-part-of', 'PART_OF', 'Forma parte de', 'Incluye', true, 'structure', true, 110, CURRENT_TIMESTAMP),
  ('relation-type-depicts', 'DEPICTS', 'Representa', 'Representado en', true, 'semantic', true, 120, CURRENT_TIMESTAMP),
  ('relation-type-similar-to', 'SIMILAR_TO', 'Similar a', 'Similar a', false, 'semantic', true, 130, CURRENT_TIMESTAMP),
  ('relation-type-uses-technique', 'USES_TECHNIQUE', 'Usa técnica', 'Técnica usada por', true, 'material', true, 140, CURRENT_TIMESTAMP),
  ('relation-type-uses-material', 'USES_MATERIAL', 'Usa material', 'Material usado por', true, 'material', true, 150, CURRENT_TIMESTAMP),
  ('relation-type-has-subject', 'HAS_SUBJECT', 'Tiene tema', 'Tema de', true, 'semantic', true, 160, CURRENT_TIMESTAMP),
  ('relation-type-curated-with', 'CURATED_WITH', 'Curado junto a', 'Curado junto a', false, 'editorial', true, 170, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RelationType" ("id", "key", "label", "inverseLabel", "directed", "category", "isActive", "sortOrder", "updatedAt")
SELECT
  'relation-type-legacy-' || md5(r."type"),
  r."type",
  initcap(replace(lower(r."type"), '_', ' ')),
  NULL,
  CASE WHEN r."type" IN ('RELATED_TO', 'ASSOCIATED_WITH', 'SIMILAR_TO', 'CURATED_WITH') THEN false ELSE true END,
  'legacy',
  true,
  1000,
  CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "type" FROM "Relation" WHERE "type" IS NOT NULL AND btrim("type") <> '') r
ON CONFLICT ("key") DO NOTHING;

UPDATE "Relation" r
SET "relationTypeId" = rt."id"
FROM "RelationType" rt
WHERE r."type" = rt."key";

ALTER TABLE "Relation" ADD CONSTRAINT "Relation_relationTypeId_fkey"
  FOREIGN KEY ("relationTypeId") REFERENCES "RelationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Tags are separate taxonomy, not graph entities.
CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");
CREATE INDEX "Tag_category_idx" ON "Tag"("category");
CREATE INDEX "Tag_isActive_idx" ON "Tag"("isActive");

CREATE TABLE "EntityTag" (
  "entityId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "weight" DOUBLE PRECISION,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EntityTag_pkey" PRIMARY KEY ("entityId", "tagId")
);

CREATE INDEX "EntityTag_entityId_idx" ON "EntityTag"("entityId");
CREATE INDEX "EntityTag_tagId_idx" ON "EntityTag"("tagId");
CREATE INDEX "EntityTag_source_idx" ON "EntityTag"("source");

ALTER TABLE "EntityTag" ADD CONSTRAINT "EntityTag_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EntityTag" ADD CONSTRAINT "EntityTag_tagId_fkey"
  FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
