-- ponytail: legacy detail tables remain read-only until localized attributes have been migrated.
INSERT INTO "AttributeDefinition" ("id", "key", "label", "valueType", "isMultiple", "isActive", "updatedAt") VALUES
  ('legacy-field-artwork-technique', 'artwork_technique', 'Técnica', 'TEXT', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-artwork-materials', 'artwork_materials', 'Materiales', 'TEXT', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-artwork-dimensions', 'artwork_dimensions', 'Dimensiones', 'TEXT', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-artwork-location', 'artwork_location', 'Ubicación', 'TEXT', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-artwork-collection', 'artwork_collection', 'Colección', 'TEXT', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-artwork-state', 'artwork_state', 'Estado', 'TEXT', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-artwork-author-nation', 'artwork_author_nation', 'Nacionalidad del autor', 'TEXT', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-artist-country', 'artist_country', 'País', 'TEXT', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-artist-city', 'artist_city', 'Ciudad', 'TEXT', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-artist-birth-year', 'artist_birth_year', 'Año de nacimiento', 'YEAR', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-artist-death-year', 'artist_death_year', 'Año de muerte', 'YEAR', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-artist-disciplines', 'artist_disciplines', 'Disciplinas', 'TEXT', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-artist-bio-short', 'artist_bio_short', 'Biografía breve', 'TEXT', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-artist-links', 'artist_links', 'Enlaces', 'TEXT', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-concept-definition', 'concept_definition', 'Definición', 'TEXT', false, true, CURRENT_TIMESTAMP),
  ('legacy-field-period-definition', 'period_definition', 'Definición', 'TEXT', false, true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "EntityTypeFieldDefinition" ("id", "entityTypeKey", "attributeDefinitionId", "sortOrder", "isRequired", "updatedAt")
SELECT 'legacy-type-field-' || lower(map."typeKey") || '-' || map."definitionKey", map."typeKey", definition."id", map."sortOrder", false, CURRENT_TIMESTAMP
FROM (VALUES
  ('ARTWORK', 'artwork_technique', 0), ('ARTWORK', 'artwork_materials', 1), ('ARTWORK', 'artwork_dimensions', 2), ('ARTWORK', 'artwork_location', 3), ('ARTWORK', 'artwork_collection', 4), ('ARTWORK', 'artwork_state', 5), ('ARTWORK', 'artwork_author_nation', 6),
  ('ARTIST', 'artist_country', 0), ('ARTIST', 'artist_city', 1), ('ARTIST', 'artist_birth_year', 2), ('ARTIST', 'artist_death_year', 3), ('ARTIST', 'artist_disciplines', 4), ('ARTIST', 'artist_bio_short', 5), ('ARTIST', 'artist_links', 6),
  ('CONCEPT', 'concept_definition', 0), ('PERIOD', 'period_definition', 0)
) AS map("typeKey", "definitionKey", "sortOrder")
JOIN "AttributeDefinition" definition ON definition."key" = map."definitionKey"
ON CONFLICT ("entityTypeKey", "attributeDefinitionId") DO NOTHING;

INSERT INTO "EntityAttribute" ("id", "entityId", "definitionId", "locale", "valueText", "valueYear", "status", "updatedAt")
SELECT 'legacy-attribute-' || md5(entity."id" || field."definitionKey"), entity."id", definition."id", 'und', field."valueText", field."valueYear", CASE WHEN entity."status" = 'PUBLISHED' THEN 'PUBLISHED'::"KnowledgeAssertionStatus" ELSE 'DRAFT'::"KnowledgeAssertionStatus" END, CURRENT_TIMESTAMP
FROM "Entity" entity
JOIN "ArtworkDetails" details ON details."entityId" = entity."id"
CROSS JOIN LATERAL (VALUES
  ('artwork_technique', details."technique", NULL::int), ('artwork_materials', details."materials", NULL::int), ('artwork_dimensions', details."dimensions", NULL::int), ('artwork_location', details."location", NULL::int), ('artwork_collection', details."collection", NULL::int), ('artwork_state', details."state", NULL::int), ('artwork_author_nation', details."authorNation", NULL::int)
) AS field("definitionKey", "valueText", "valueYear")
JOIN "AttributeDefinition" definition ON definition."key" = field."definitionKey"
WHERE field."valueText" IS NOT NULL AND btrim(field."valueText") <> ''
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "EntityAttribute" ("id", "entityId", "definitionId", "locale", "valueText", "valueYear", "status", "updatedAt")
SELECT 'legacy-attribute-' || md5(entity."id" || field."definitionKey"), entity."id", definition."id", 'und', field."valueText", field."valueYear", CASE WHEN entity."status" = 'PUBLISHED' THEN 'PUBLISHED'::"KnowledgeAssertionStatus" ELSE 'DRAFT'::"KnowledgeAssertionStatus" END, CURRENT_TIMESTAMP
FROM "Entity" entity
JOIN "ArtistDetails" details ON details."entityId" = entity."id"
CROSS JOIN LATERAL (VALUES
  ('artist_country', details."country", NULL::int), ('artist_city', details."city", NULL::int), ('artist_birth_year', NULL::text, details."birthYear"), ('artist_death_year', NULL::text, details."deathYear"), ('artist_disciplines', details."disciplines", NULL::int), ('artist_bio_short', details."bioShort", NULL::int), ('artist_links', details."links", NULL::int)
) AS field("definitionKey", "valueText", "valueYear")
JOIN "AttributeDefinition" definition ON definition."key" = field."definitionKey"
WHERE (field."valueText" IS NOT NULL AND btrim(field."valueText") <> '') OR field."valueYear" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "EntityAttribute" ("id", "entityId", "definitionId", "locale", "valueText", "status", "updatedAt")
SELECT 'legacy-attribute-' || md5(entity."id" || 'concept_definition'), entity."id", definition."id", 'und', details."definition", CASE WHEN entity."status" = 'PUBLISHED' THEN 'PUBLISHED'::"KnowledgeAssertionStatus" ELSE 'DRAFT'::"KnowledgeAssertionStatus" END, CURRENT_TIMESTAMP
FROM "Entity" entity JOIN "ConceptDetails" details ON details."entityId" = entity."id" JOIN "AttributeDefinition" definition ON definition."key" = 'concept_definition'
WHERE details."definition" IS NOT NULL AND btrim(details."definition") <> '' ON CONFLICT ("id") DO NOTHING;

INSERT INTO "EntityAttribute" ("id", "entityId", "definitionId", "locale", "valueText", "status", "updatedAt")
SELECT 'legacy-attribute-' || md5(entity."id" || 'period_definition'), entity."id", definition."id", 'und', details."definition", CASE WHEN entity."status" = 'PUBLISHED' THEN 'PUBLISHED'::"KnowledgeAssertionStatus" ELSE 'DRAFT'::"KnowledgeAssertionStatus" END, CURRENT_TIMESTAMP
FROM "Entity" entity JOIN "PeriodDetails" details ON details."entityId" = entity."id" JOIN "AttributeDefinition" definition ON definition."key" = 'period_definition'
WHERE details."definition" IS NOT NULL AND btrim(details."definition") <> '' ON CONFLICT ("id") DO NOTHING;
