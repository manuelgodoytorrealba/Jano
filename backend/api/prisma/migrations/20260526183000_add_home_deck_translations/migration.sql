CREATE TABLE "HomeDeckTranslation" (
    "id" TEXT NOT NULL,
    "homeDeckId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "ctaLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HomeDeckTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomeDeckTranslation_homeDeckId_locale_key" ON "HomeDeckTranslation"("homeDeckId", "locale");
CREATE INDEX "HomeDeckTranslation_homeDeckId_idx" ON "HomeDeckTranslation"("homeDeckId");
CREATE INDEX "HomeDeckTranslation_locale_idx" ON "HomeDeckTranslation"("locale");

ALTER TABLE "HomeDeckTranslation" ADD CONSTRAINT "HomeDeckTranslation_homeDeckId_fkey" FOREIGN KEY ("homeDeckId") REFERENCES "HomeDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "HomeDeckTranslation" ("id", "homeDeckId", "locale", "title", "subtitle", "description", "ctaLabel", "createdAt", "updatedAt")
SELECT concat('hdt_', "id", '_es'), "id", 'es', "title", "subtitle", "description", "ctaLabel", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "HomeDeck"
ON CONFLICT ("homeDeckId", "locale") DO NOTHING;

INSERT INTO "HomeDeckTranslation" ("id", "homeDeckId", "locale", "title", "subtitle", "description", "ctaLabel", "createdAt", "updatedAt")
SELECT
  concat('hdt_', "id", '_en'),
  "id",
  'en',
  CASE
    WHEN lower("title") LIKE '%obra%' THEN 'Artworks'
    WHEN lower("title") LIKE '%artista%' THEN 'Artists'
    WHEN lower("title") LIKE '%concept%' THEN 'Concepts'
    WHEN lower("title") LIKE '%movim%' THEN 'Movements'
    WHEN lower("title") LIKE '%period%' THEN 'Periods'
    ELSE concat('Curated selection: ', "title")
  END,
  CASE WHEN "subtitle" IS NULL OR trim("subtitle") = '' THEN 'Discover' ELSE concat('Curated path: ', "subtitle") END,
  CASE WHEN "description" IS NULL OR trim("description") = '' THEN concat('Explore this editorial selection in JANO: ', "title", '.') ELSE concat('English test translation. ', "description") END,
  CASE WHEN "ctaLabel" IS NULL OR trim("ctaLabel") = '' THEN 'View selection' ELSE 'View selection' END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "HomeDeck"
ON CONFLICT ("homeDeckId", "locale") DO NOTHING;


INSERT INTO "EntityTranslation" ("id", "entityId", "locale", "title", "shortDescription", "essay", "excerpt", "createdAt", "updatedAt")
SELECT
  concat('et_', "id", '_en'),
  "id",
  'en',
  "title",
  concat('English test summary for ', "title", '. This translation is available to validate JANO multilingual browsing.'),
  concat('English test essay for ', "title", '. This content confirms that the same entity can expose editorial text in another language while keeping its graph identity, media, tags and relations intact.'),
  concat('English excerpt for ', "title", '.'),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Entity"
ON CONFLICT ("entityId", "locale") DO NOTHING;


INSERT INTO "RelationTypeTranslation" ("id", "relationTypeId", "locale", "label", "inverseLabel", "createdAt", "updatedAt")
SELECT
  concat('rtt_', "id", '_en'),
  "id",
  'en',
  CASE
    WHEN lower("key") = 'influenced_by' THEN 'Influenced by'
    WHEN lower("key") = 'created_by' THEN 'Created by'
    WHEN lower("key") = 'belongs_to' THEN 'Belongs to'
    WHEN lower("key") = 'related_to' THEN 'Related to'
    ELSE initcap(replace(lower("key"), '_', ' '))
  END,
  CASE
    WHEN "inverseLabel" IS NULL OR trim("inverseLabel") = '' THEN NULL
    ELSE "inverseLabel"
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "RelationType"
ON CONFLICT ("relationTypeId", "locale") DO NOTHING;

INSERT INTO "TagTranslation" ("id", "tagId", "locale", "label", "description", "createdAt", "updatedAt")
SELECT
  concat('tt_', "id", '_en'),
  "id",
  'en',
  "label",
  CASE WHEN "description" IS NULL OR trim("description") = '' THEN concat('English label available for tag ', "label", '.') ELSE concat('English test translation. ', "description") END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Tag"
ON CONFLICT ("tagId", "locale") DO NOTHING;
