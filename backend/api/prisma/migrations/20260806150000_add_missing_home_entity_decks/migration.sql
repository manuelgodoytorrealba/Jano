INSERT INTO "HomeDeck" (
  "id", "surface", "slug", "title", "subtitle", "description", "ctaLabel", "ctaRoute", "imageUrl", "sortOrder", "isActive", "createdAt", "updatedAt"
)
VALUES
  ('home-text', 'HOME', 'text', 'Textos', 'Fuentes escritas', 'Manifiestos, crítica y documentos que amplían la conversación cultural.', 'Explorar textos', '/entities/text', '/assets/home/concept.jpg', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('home-event', 'HOME', 'event', 'Eventos', 'Momentos culturales', 'Exposiciones, encuentros y momentos que sitúan la cultura en el tiempo.', 'Explorar eventos', '/entities/event', '/assets/home/movement.jpg', 8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('home-organization', 'HOME', 'organization', 'Organizaciones', 'Agentes culturales', 'Instituciones, colectivos y agentes culturales que hacen posibles las conexiones.', 'Explorar organizaciones', '/entities/organization', '/assets/home/museum-room.jpg', 9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

WITH translations(slug, locale, title, subtitle, description, cta_label) AS (
  VALUES
    ('text', 'es', 'Textos', 'Fuentes escritas', 'Manifiestos, crítica y documentos que amplían la conversación cultural.', 'Explorar textos'),
    ('text', 'en', 'Texts', 'Written sources', 'Manifestos, criticism and documents that extend the cultural conversation.', 'Explore texts'),
    ('event', 'es', 'Eventos', 'Momentos culturales', 'Exposiciones, encuentros y momentos que sitúan la cultura en el tiempo.', 'Explorar eventos'),
    ('event', 'en', 'Events', 'Cultural moments', 'Exhibitions, encounters and moments that place culture in time.', 'Explore events'),
    ('organization', 'es', 'Organizaciones', 'Agentes culturales', 'Instituciones, colectivos y agentes culturales que hacen posibles las conexiones.', 'Explorar organizaciones'),
    ('organization', 'en', 'Organizations', 'Cultural agents', 'Institutions, collectives and cultural agents that make connections possible.', 'Explore organizations')
)
INSERT INTO "HomeDeckTranslation" (
  "id", "homeDeckId", "locale", "title", "subtitle", "description", "ctaLabel", "createdAt", "updatedAt"
)
SELECT concat('hdt_', d."id", '_', t.locale), d."id", t.locale, t.title, t.subtitle, t.description, t.cta_label, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "HomeDeck" d
JOIN translations t ON t.slug = d."slug"
ON CONFLICT ("homeDeckId", "locale") DO NOTHING;
