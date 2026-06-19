CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "EntityAliasKind" AS ENUM (
  'ALTERNATE_TITLE',
  'COMMON_NAME',
  'MISSPELLING',
  'TRANSLITERATION',
  'NICKNAME',
  'SEARCH_HINT'
);

CREATE TABLE "EntityAlias" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'und',
  "value" TEXT NOT NULL,
  "kind" "EntityAliasKind" NOT NULL DEFAULT 'COMMON_NAME',
  "weight" DOUBLE PRECISION,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EntityAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EntityAlias_entityId_locale_kind_value_key"
ON "EntityAlias"("entityId", "locale", "kind", "value");

CREATE INDEX "EntityAlias_entityId_idx" ON "EntityAlias"("entityId");
CREATE INDEX "EntityAlias_locale_idx" ON "EntityAlias"("locale");
CREATE INDEX "EntityAlias_kind_idx" ON "EntityAlias"("kind");
CREATE INDEX "EntityAlias_value_trgm_idx" ON "EntityAlias" USING GIN (lower("value") gin_trgm_ops);
CREATE INDEX "Entity_title_trgm_idx" ON "Entity" USING GIN (lower("title") gin_trgm_ops);
CREATE INDEX "Tag_label_trgm_idx" ON "Tag" USING GIN (lower("label") gin_trgm_ops);

ALTER TABLE "EntityAlias"
ADD CONSTRAINT "EntityAlias_entityId_fkey"
FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
