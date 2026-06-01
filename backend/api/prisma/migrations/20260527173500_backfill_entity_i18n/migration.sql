INSERT INTO "EntityTranslation" ("id", "entityId", "locale", "title", "shortDescription", "essay", "notes", "excerpt", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), e."id", 'es', e."title", e."summary", e."content", NULL, e."summary", NOW(), NOW()
FROM "Entity" e
ON CONFLICT ("entityId", "locale") DO NOTHING;

INSERT INTO "EntityTranslation" ("id", "entityId", "locale", "title", "shortDescription", "essay", "notes", "excerpt", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), e."id", 'en',
  CASE e."title"
    WHEN 'Siglo XIX' THEN '19th Century'
    WHEN 'Siglo XX' THEN '20th Century'
    WHEN 'Siglo XXI' THEN '21st Century'
    WHEN 'Romanticismo' THEN 'Romanticism'
    WHEN 'Cubismo' THEN 'Cubism'
    WHEN 'Surrealismo' THEN 'Surrealism'
    WHEN 'Arte moderno' THEN 'Modern art'
    WHEN 'Arte contemporáneo' THEN 'Contemporary art'
    WHEN 'Tiempo' THEN 'Time'
    WHEN 'Memoria' THEN 'Memory'
    WHEN 'Guerra' THEN 'War'
    WHEN 'Identidad' THEN 'Identity'
    WHEN 'Cuerpo' THEN 'Body'
    WHEN 'Dolor' THEN 'Pain'
    WHEN 'Maternidad' THEN 'Motherhood'
    WHEN 'Violencia' THEN 'Violence'
    WHEN 'La persistencia de la memoria' THEN 'The Persistence of Memory'
    WHEN 'Las dos Fridas' THEN 'The Two Fridas'
    WHEN 'Saturno devorando a su hijo' THEN 'Saturn Devouring His Son'
    WHEN 'El tres de mayo de 1808' THEN 'The Third of May 1808'
    ELSE e."title"
  END,
  e."summary", e."content", NULL, e."summary", NOW(), NOW()
FROM "Entity" e
ON CONFLICT ("entityId", "locale") DO NOTHING;

INSERT INTO "ArtworkDetailsTranslation" ("id", "entityId", "locale", "authorNation", "technique", "materials", "dimensions", "location", "collection", "state", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), a."entityId", 'es', a."authorNation", a."technique", a."materials", a."dimensions", a."location", a."collection", a."state", NOW(), NOW()
FROM "ArtworkDetails" a
ON CONFLICT ("entityId", "locale") DO NOTHING;

INSERT INTO "ArtworkDetailsTranslation" ("id", "entityId", "locale", "authorNation", "technique", "materials", "dimensions", "location", "collection", "state", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), a."entityId", 'en', a."authorNation", a."technique", a."materials", a."dimensions", a."location", a."collection", a."state", NOW(), NOW()
FROM "ArtworkDetails" a
ON CONFLICT ("entityId", "locale") DO NOTHING;

INSERT INTO "ArtistDetailsTranslation" ("id", "entityId", "locale", "country", "city", "disciplines", "bioShort", "links", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), a."entityId", 'es', a."country", a."city", a."disciplines", a."bioShort", a."links", NOW(), NOW()
FROM "ArtistDetails" a
ON CONFLICT ("entityId", "locale") DO NOTHING;

INSERT INTO "ArtistDetailsTranslation" ("id", "entityId", "locale", "country", "city", "disciplines", "bioShort", "links", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), a."entityId", 'en', a."country", a."city", a."disciplines", a."bioShort", a."links", NOW(), NOW()
FROM "ArtistDetails" a
ON CONFLICT ("entityId", "locale") DO NOTHING;

INSERT INTO "ConceptDetailsTranslation" ("id", "entityId", "locale", "definition", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), c."entityId", 'es', c."definition", NOW(), NOW()
FROM "ConceptDetails" c
ON CONFLICT ("entityId", "locale") DO NOTHING;

INSERT INTO "ConceptDetailsTranslation" ("id", "entityId", "locale", "definition", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), c."entityId", 'en', c."definition", NOW(), NOW()
FROM "ConceptDetails" c
ON CONFLICT ("entityId", "locale") DO NOTHING;

INSERT INTO "PeriodDetailsTranslation" ("id", "entityId", "locale", "definition", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), p."entityId", 'es', p."definition", NOW(), NOW()
FROM "PeriodDetails" p
ON CONFLICT ("entityId", "locale") DO NOTHING;

INSERT INTO "PeriodDetailsTranslation" ("id", "entityId", "locale", "definition", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), p."entityId", 'en', p."definition", NOW(), NOW()
FROM "PeriodDetails" p
ON CONFLICT ("entityId", "locale") DO NOTHING;

INSERT INTO "RelationTypeTranslation" ("id", "relationTypeId", "locale", "label", "inverseLabel", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), r."id", 'es', r."label", r."inverseLabel", NOW(), NOW()
FROM "RelationType" r
ON CONFLICT ("relationTypeId", "locale") DO NOTHING;

INSERT INTO "RelationTypeTranslation" ("id", "relationTypeId", "locale", "label", "inverseLabel", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), r."id", 'en',
  CASE r."key"
    WHEN 'CREATED_BY' THEN 'Created by'
    WHEN 'BELONGS_TO_MOVEMENT' THEN 'Belongs to movement'
    WHEN 'BELONGS_TO_PERIOD' THEN 'Belongs to period'
    WHEN 'ABOUT_CONCEPT' THEN 'Explores concept'
    WHEN 'LOCATED_IN' THEN 'Located in'
    WHEN 'RELATED_TO' THEN 'Related to'
    WHEN 'ASSOCIATED_WITH' THEN 'Associated with'
    WHEN 'MENTIONS' THEN 'Mentions'
    WHEN 'INSPIRED_BY' THEN 'Inspired by'
    WHEN 'INFLUENCED_BY' THEN 'Influenced by'
    WHEN 'PART_OF' THEN 'Part of'
    WHEN 'DEPICTS' THEN 'Depicts'
    WHEN 'SIMILAR_TO' THEN 'Similar to'
    WHEN 'USES_TECHNIQUE' THEN 'Uses technique'
    WHEN 'USES_MATERIAL' THEN 'Uses material'
    WHEN 'HAS_SUBJECT' THEN 'Has subject'
    WHEN 'CURATED_WITH' THEN 'Curated with'
    ELSE r."label"
  END,
  CASE r."key"
    WHEN 'CREATED_BY' THEN 'Created'
    WHEN 'BELONGS_TO_MOVEMENT' THEN 'Includes entity'
    WHEN 'BELONGS_TO_PERIOD' THEN 'Includes entity'
    WHEN 'ABOUT_CONCEPT' THEN 'Explored by entity'
    WHEN 'LOCATED_IN' THEN 'Location of'
    WHEN 'RELATED_TO' THEN 'Related to'
    WHEN 'ASSOCIATED_WITH' THEN 'Associated with'
    WHEN 'MENTIONS' THEN 'Mentioned by'
    WHEN 'INSPIRED_BY' THEN 'Inspires'
    WHEN 'INFLUENCED_BY' THEN 'Influences'
    WHEN 'PART_OF' THEN 'Includes'
    WHEN 'DEPICTS' THEN 'Depicted in'
    WHEN 'SIMILAR_TO' THEN 'Similar to'
    WHEN 'USES_TECHNIQUE' THEN 'Technique used by'
    WHEN 'USES_MATERIAL' THEN 'Material used by'
    WHEN 'HAS_SUBJECT' THEN 'Subject of'
    WHEN 'CURATED_WITH' THEN 'Curated with'
    ELSE r."inverseLabel"
  END,
  NOW(), NOW()
FROM "RelationType" r
ON CONFLICT ("relationTypeId", "locale") DO NOTHING;
