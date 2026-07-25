-- Canonical knowledge-core foundation. This migration is intentionally additive:
-- EntityType, Tag, EntityTag, SourceRef and detail tables remain active until their
-- consumers are migrated in later phases.

CREATE TYPE "KnowledgeEntityKind" AS ENUM ('PERSON', 'WORK', 'ABSTRACTION', 'EVENT', 'PLACE', 'ORGANIZATION');
CREATE TYPE "KnowledgeAssertionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'REJECTED');
CREATE TYPE "CitationStance" AS ENUM ('SUPPORTS', 'CONTRADICTS', 'MENTIONS');
CREATE TYPE "AttributeValueType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'YEAR', 'JSON');

ALTER TABLE "Entity" ADD COLUMN "kind" "KnowledgeEntityKind";

ALTER TABLE "Relation"
  ADD COLUMN "status" "KnowledgeAssertionStatus",
  ADD COLUMN "confidence" DOUBLE PRECISION,
  ADD COLUMN "validFromYear" INTEGER,
  ADD COLUMN "validToYear" INTEGER,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Relation" SET "status" = 'PUBLISHED' WHERE "status" IS NULL;

ALTER TABLE "Relation"
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'DRAFT',
  ALTER COLUMN "updatedAt" DROP DEFAULT,
  ADD CONSTRAINT "Relation_confidence_range" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 1),
  ADD CONSTRAINT "Relation_valid_year_range" CHECK (
    "validFromYear" IS NULL OR "validToYear" IS NULL OR "validFromYear" <= "validToYear"
  );

CREATE TABLE "Taxonomy" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Taxonomy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxonomyTerm" (
  "id" TEXT NOT NULL,
  "taxonomyId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "parentId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxonomyTerm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxonomyTermTranslation" (
  "id" TEXT NOT NULL,
  "termId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxonomyTermTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EntityClassification" (
  "entityId" TEXT NOT NULL,
  "termId" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EntityClassification_pkey" PRIMARY KEY ("entityId", "termId"),
  CONSTRAINT "EntityClassification_confidence_range" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 1)
);

CREATE TABLE "AttributeDefinition" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "valueType" "AttributeValueType" NOT NULL,
  "isMultiple" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttributeDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttributeDefinitionTranslation" (
  "id" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttributeDefinitionTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EntityAttribute" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'und',
  "valueText" TEXT,
  "valueNumber" DOUBLE PRECISION,
  "valueBoolean" BOOLEAN,
  "valueDate" TIMESTAMP(3),
  "valueYear" INTEGER,
  "valueJson" JSONB,
  "status" "KnowledgeAssertionStatus" NOT NULL DEFAULT 'DRAFT',
  "confidence" DOUBLE PRECISION,
  "validFromYear" INTEGER,
  "validToYear" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EntityAttribute_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EntityAttribute_exactly_one_value" CHECK (
    num_nonnulls("valueText", "valueNumber", "valueBoolean", "valueDate", "valueYear", "valueJson") = 1
  ),
  CONSTRAINT "EntityAttribute_confidence_range" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 1),
  CONSTRAINT "EntityAttribute_valid_year_range" CHECK (
    "validFromYear" IS NULL OR "validToYear" IS NULL OR "validFromYear" <= "validToYear"
  )
);

CREATE TABLE "Citation" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "entityId" TEXT,
  "relationId" TEXT,
  "entityAttributeId" TEXT,
  "stance" "CitationStance" NOT NULL DEFAULT 'MENTIONS',
  "locator" TEXT,
  "quote" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Citation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Citation_exactly_one_target" CHECK (
    num_nonnulls("entityId", "relationId", "entityAttributeId") = 1
  )
);

CREATE TABLE "CitationTranslation" (
  "id" TEXT NOT NULL,
  "citationId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "quote" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CitationTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Taxonomy_key_key" ON "Taxonomy"("key");
CREATE INDEX "Taxonomy_isActive_idx" ON "Taxonomy"("isActive");
CREATE UNIQUE INDEX "TaxonomyTerm_taxonomyId_key_key" ON "TaxonomyTerm"("taxonomyId", "key");
CREATE UNIQUE INDEX "TaxonomyTerm_id_taxonomyId_key" ON "TaxonomyTerm"("id", "taxonomyId");
CREATE INDEX "TaxonomyTerm_taxonomyId_sortOrder_idx" ON "TaxonomyTerm"("taxonomyId", "sortOrder");
CREATE INDEX "TaxonomyTerm_parentId_idx" ON "TaxonomyTerm"("parentId");
CREATE INDEX "TaxonomyTerm_isActive_idx" ON "TaxonomyTerm"("isActive");
CREATE UNIQUE INDEX "TaxonomyTermTranslation_termId_locale_key" ON "TaxonomyTermTranslation"("termId", "locale");
CREATE INDEX "TaxonomyTermTranslation_locale_idx" ON "TaxonomyTermTranslation"("locale");
CREATE INDEX "EntityClassification_termId_idx" ON "EntityClassification"("termId");
CREATE INDEX "EntityClassification_source_idx" ON "EntityClassification"("source");
CREATE UNIQUE INDEX "AttributeDefinition_key_key" ON "AttributeDefinition"("key");
CREATE INDEX "AttributeDefinition_isActive_idx" ON "AttributeDefinition"("isActive");
CREATE UNIQUE INDEX "AttributeDefinitionTranslation_definitionId_locale_key" ON "AttributeDefinitionTranslation"("definitionId", "locale");
CREATE INDEX "AttributeDefinitionTranslation_locale_idx" ON "AttributeDefinitionTranslation"("locale");
CREATE INDEX "EntityAttribute_entityId_definitionId_idx" ON "EntityAttribute"("entityId", "definitionId");
CREATE INDEX "EntityAttribute_definitionId_idx" ON "EntityAttribute"("definitionId");
CREATE INDEX "EntityAttribute_status_idx" ON "EntityAttribute"("status");
CREATE INDEX "Citation_sourceId_idx" ON "Citation"("sourceId");
CREATE INDEX "Citation_entityId_idx" ON "Citation"("entityId");
CREATE INDEX "Citation_relationId_idx" ON "Citation"("relationId");
CREATE INDEX "Citation_entityAttributeId_idx" ON "Citation"("entityAttributeId");
CREATE UNIQUE INDEX "CitationTranslation_citationId_locale_key" ON "CitationTranslation"("citationId", "locale");
CREATE INDEX "CitationTranslation_locale_idx" ON "CitationTranslation"("locale");

ALTER TABLE "TaxonomyTerm"
  ADD CONSTRAINT "TaxonomyTerm_taxonomyId_fkey"
  FOREIGN KEY ("taxonomyId") REFERENCES "Taxonomy"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "TaxonomyTerm_parentId_fkey"
  FOREIGN KEY ("parentId", "taxonomyId") REFERENCES "TaxonomyTerm"("id", "taxonomyId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TaxonomyTermTranslation"
  ADD CONSTRAINT "TaxonomyTermTranslation_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "TaxonomyTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EntityClassification"
  ADD CONSTRAINT "EntityClassification_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "EntityClassification_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "TaxonomyTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttributeDefinitionTranslation"
  ADD CONSTRAINT "AttributeDefinitionTranslation_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EntityAttribute"
  ADD CONSTRAINT "EntityAttribute_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "EntityAttribute_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "AttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Citation"
  ADD CONSTRAINT "Citation_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Citation_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Citation_relationId_fkey"
  FOREIGN KEY ("relationId") REFERENCES "Relation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Citation_entityAttributeId_fkey"
  FOREIGN KEY ("entityAttributeId") REFERENCES "EntityAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CitationTranslation"
  ADD CONSTRAINT "CitationTranslation_citationId_fkey"
  FOREIGN KEY ("citationId") REFERENCES "Citation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
