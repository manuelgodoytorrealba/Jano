INSERT INTO "Entity" (
  "id", "type", "kind", "title", "slug", "summary", "content", "contentLevel", "status", "startYear", "endYear", "createdAt", "updatedAt"
)
VALUES
  ('entity-manifiesto-surrealismo', 'TEXT', 'WORK', 'Manifiesto del surrealismo', 'manifiesto-del-surrealismo', 'Texto fundacional de André Breton para la formulación del Surrealismo.', 'Publicado en 1924, el manifiesto formula la exploración del sueño, el automatismo y el inconsciente como una vía de transformación poética y cultural.', 'INTERMEDIATE', 'PUBLISHED', 1924, 1924, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('entity-exposicion-surrealismo-1938', 'EVENT', 'EVENT', 'Exposición Internacional del Surrealismo', 'exposicion-internacional-del-surrealismo-1938', 'Exposición de 1938 que hizo visible la dimensión colectiva y escenográfica del Surrealismo.', 'La exposición parisina reunió obras, objetos y dispositivos espaciales para convertir la muestra en una experiencia surrealista compartida.', 'INTERMEDIATE', 'PUBLISHED', 1938, 1938, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('entity-bauhaus', 'ORGANIZATION', 'ORGANIZATION', 'Bauhaus', 'bauhaus', 'Escuela alemana que articuló arte, diseño, arquitectura y producción moderna.', 'La Bauhaus reunió enseñanza, talleres y experimentación para reconsiderar la relación entre forma, técnica, industria y vida cotidiana.', 'INTERMEDIATE', 'PUBLISHED', 1919, 1933, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

WITH translations(entity_id, locale, title, summary, essay) AS (
  VALUES
    ('entity-manifiesto-surrealismo', 'es', 'Manifiesto del surrealismo', 'Texto fundacional de André Breton para la formulación del Surrealismo.', 'Publicado en 1924, el manifiesto formula la exploración del sueño, el automatismo y el inconsciente como una vía de transformación poética y cultural.'),
    ('entity-manifiesto-surrealismo', 'en', 'Manifesto of Surrealism', 'André Breton''s foundational text for the formulation of Surrealism.', 'Published in 1924, the manifesto formulates the exploration of dreams, automatism, and the unconscious as a path of poetic and cultural transformation.'),
    ('entity-exposicion-surrealismo-1938', 'es', 'Exposición Internacional del Surrealismo', 'Exposición de 1938 que hizo visible la dimensión colectiva y escenográfica del Surrealismo.', 'La exposición parisina reunió obras, objetos y dispositivos espaciales para convertir la muestra en una experiencia surrealista compartida.'),
    ('entity-exposicion-surrealismo-1938', 'en', 'International Surrealist Exhibition', 'A 1938 exhibition that made Surrealism visible as a collective and scenographic practice.', 'The Paris exhibition brought together works, objects, and spatial devices to turn the display into a shared surrealist experience.'),
    ('entity-bauhaus', 'es', 'Bauhaus', 'Escuela alemana que articuló arte, diseño, arquitectura y producción moderna.', 'La Bauhaus reunió enseñanza, talleres y experimentación para reconsiderar la relación entre forma, técnica, industria y vida cotidiana.'),
    ('entity-bauhaus', 'en', 'Bauhaus', 'A German school that brought together art, design, architecture, and modern production.', 'The Bauhaus combined teaching, workshops, and experimentation to reconsider the relationship between form, technique, industry, and everyday life.')
)
INSERT INTO "EntityTranslation" (
  "id", "entityId", "locale", "title", "shortDescription", "essay", "excerpt", "createdAt", "updatedAt"
)
SELECT concat('et_', t.entity_id, '_', t.locale), t.entity_id, t.locale, t.title, t.summary, t.essay, t.summary, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM translations t
JOIN "Entity" e ON e."id" = t.entity_id
ON CONFLICT ("entityId", "locale") DO NOTHING;

INSERT INTO "HomeDeckItem" ("id", "deckId", "entityId", "sortOrder", "createdAt")
SELECT concat('hdi_', d."slug", '_', e."slug"), d."id", e."id", 0, CURRENT_TIMESTAMP
FROM (VALUES
  ('text', 'manifiesto-del-surrealismo'),
  ('event', 'exposicion-internacional-del-surrealismo-1938'),
  ('organization', 'bauhaus')
) AS links(deck_slug, entity_slug)
JOIN "HomeDeck" d ON d."slug" = links.deck_slug
JOIN "Entity" e ON e."slug" = links.entity_slug
ON CONFLICT ("deckId", "entityId") DO NOTHING;

INSERT INTO "Relation" (
  "id", "fromId", "toId", "relationTypeId", "weight", "justification", "status", "createdAt", "updatedAt"
)
SELECT concat('relation_', links.from_slug, '_', links.to_slug), source."id", target."id", relation_type."id", links.weight, links.justification, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('manifiesto-del-surrealismo', 'surrealismo', 1.0, 'El manifiesto formula una de las bases textuales del movimiento.'),
  ('exposicion-internacional-del-surrealismo-1938', 'surrealismo', 0.95, 'La exposición llevó el lenguaje surrealista al espacio público.'),
  ('bauhaus', 'arte-moderno', 0.95, 'La escuela es una institución decisiva para el desarrollo del arte y diseño modernos.')
) AS links(from_slug, to_slug, weight, justification)
JOIN "Entity" source ON source."slug" = links.from_slug
JOIN "Entity" target ON target."slug" = links.to_slug
JOIN "RelationType" relation_type ON relation_type."key" = 'RELATED_TO'
WHERE NOT EXISTS (
  SELECT 1 FROM "Relation" existing
  WHERE existing."fromId" = source."id"
    AND existing."toId" = target."id"
    AND existing."relationTypeId" = relation_type."id"
);
