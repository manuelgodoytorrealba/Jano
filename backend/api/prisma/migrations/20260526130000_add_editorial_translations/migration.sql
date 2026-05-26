-- Add editorial translation tables while preserving the legacy single-entity fields.
CREATE TABLE "EntityTranslation" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "essay" TEXT,
    "notes" TEXT,
    "excerpt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EntityTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RelationTypeTranslation" (
    "id" TEXT NOT NULL,
    "relationTypeId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "inverseLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RelationTypeTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TagTranslation" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TagTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EntityTranslation_entityId_locale_key" ON "EntityTranslation"("entityId", "locale");
CREATE INDEX "EntityTranslation_entityId_idx" ON "EntityTranslation"("entityId");
CREATE INDEX "EntityTranslation_locale_idx" ON "EntityTranslation"("locale");
CREATE UNIQUE INDEX "RelationTypeTranslation_relationTypeId_locale_key" ON "RelationTypeTranslation"("relationTypeId", "locale");
CREATE INDEX "RelationTypeTranslation_locale_idx" ON "RelationTypeTranslation"("locale");
CREATE UNIQUE INDEX "TagTranslation_tagId_locale_key" ON "TagTranslation"("tagId", "locale");
CREATE INDEX "TagTranslation_locale_idx" ON "TagTranslation"("locale");

ALTER TABLE "EntityTranslation" ADD CONSTRAINT "EntityTranslation_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RelationTypeTranslation" ADD CONSTRAINT "RelationTypeTranslation_relationTypeId_fkey" FOREIGN KEY ("relationTypeId") REFERENCES "RelationType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TagTranslation" ADD CONSTRAINT "TagTranslation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "EntityTranslation" ("id", "entityId", "locale", "title", "shortDescription", "essay", "excerpt", "createdAt", "updatedAt")
SELECT concat('et_', "id", '_es'), "id", 'es', "title", "summary", "content", "summary", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Entity"
ON CONFLICT ("entityId", "locale") DO NOTHING;

INSERT INTO "RelationTypeTranslation" ("id", "relationTypeId", "locale", "label", "inverseLabel", "createdAt", "updatedAt")
SELECT concat('rtt_', "id", '_es'), "id", 'es', "label", "inverseLabel", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "RelationType"
ON CONFLICT ("relationTypeId", "locale") DO NOTHING;

INSERT INTO "TagTranslation" ("id", "tagId", "locale", "label", "description", "createdAt", "updatedAt")
SELECT concat('tt_', "id", '_es'), "id", 'es', "label", "description", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tag"
ON CONFLICT ("tagId", "locale") DO NOTHING;
