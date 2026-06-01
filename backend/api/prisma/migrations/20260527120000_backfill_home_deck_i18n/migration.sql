-- Backfill known imported deck translations and preserve base Spanish rows for coverage diagnostics.
INSERT INTO "HomeDeckTranslation" ("id", "homeDeckId", "locale", "title", "subtitle", "description", "ctaLabel", "createdAt", "updatedAt")
SELECT concat('hdt_', d."id", '_es'), d."id", 'es', d."title", d."subtitle", d."description", d."ctaLabel", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "HomeDeck" d
ON CONFLICT ("homeDeckId", "locale") DO UPDATE SET
  "title" = EXCLUDED."title",
  "subtitle" = EXCLUDED."subtitle",
  "description" = EXCLUDED."description",
  "ctaLabel" = EXCLUDED."ctaLabel",
  "updatedAt" = CURRENT_TIMESTAMP;

WITH translations(slug, title, subtitle, description, cta_label) AS (
  VALUES
  ('artwork','Artworks','Key pieces','Key pieces for studying form, technique, symbolism and context.','Explore artworks'),
  ('article','Articles','Editorial readings','Editorial readings, criticism and connections between works, authors and ideas.','Explore articles'),
  ('artist','Artists','Visual trajectories','Authors, careers, visual obsessions and crossed influences.','Explore artists'),
  ('movement','Movements','Ideas in motion','Aesthetic currents and ideas that redefined art history.','Explore movements'),
  ('period','Periods','Historical context','Historical stages for understanding cultural and visual change.','Explore periods'),
  ('concept','Concepts','Reading keys','Foundational ideas for reading works and relationships with more clarity.','Explore concepts'),
  ('magia-en-el-arte','Magic in art','Staff Pick','A curated selection to enter JANO through key works and strong connections.','View selection'),
  ('memoria-y-trauma','Memory and trauma','Curated List','Works, concepts and relationships for reading the persistence of historical memory.','View route'),
  ('recommended-artwork','Essential artworks','Staff Pick','A curated selection to enter JANO through key works and strong connections.','View selection'),
  ('recommended-artist','Artists to start with','Staff Pick','Foundational authors for understanding styles, ruptures and influences.','Explore artists'),
  ('recommended-movement','Essential movements','Staff Pick','Movements that reorganized vision and changed art history.','Explore movements'),
  ('recommended-period','Key periods','Staff Pick','Historical stages to orient yourself quickly inside the archive.','Explore periods'),
  ('recommended-concept','Core concepts','Staff Pick','Terms and ideas for reading works, artists and relationships better.','Explore concepts')
)
INSERT INTO "HomeDeckTranslation" ("id", "homeDeckId", "locale", "title", "subtitle", "description", "ctaLabel", "createdAt", "updatedAt")
SELECT concat('hdt_', d."id", '_en'), d."id", 'en', t.title, t.subtitle, t.description, t.cta_label, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "HomeDeck" d
JOIN translations t ON t.slug = d."slug"
ON CONFLICT ("homeDeckId", "locale") DO UPDATE SET
  "title" = EXCLUDED."title",
  "subtitle" = EXCLUDED."subtitle",
  "description" = EXCLUDED."description",
  "ctaLabel" = EXCLUDED."ctaLabel",
  "updatedAt" = CURRENT_TIMESTAMP;
