-- RelationType is canonical; Relation.type remains temporarily for legacy compatibility.
INSERT INTO "RelationType" (
  "id",
  "key",
  "label",
  "inverseLabel",
  "directed",
  "category",
  "isActive",
  "sortOrder",
  "updatedAt"
)
SELECT
  'relation-type-legacy-' || md5(btrim(r."type")),
  btrim(r."type"),
  initcap(replace(lower(btrim(r."type")), '_', ' ')),
  NULL,
  btrim(r."type") NOT IN ('RELATED_TO', 'ASSOCIATED_WITH', 'SIMILAR_TO', 'CURATED_WITH'),
  'legacy',
  true,
  1000,
  CURRENT_TIMESTAMP
FROM "Relation" r
WHERE r."type" IS NOT NULL AND btrim(r."type") <> ''
ON CONFLICT ("key") DO NOTHING;

UPDATE "Relation" r
SET "relationTypeId" = rt."id"
FROM "RelationType" rt
WHERE r."relationTypeId" IS NULL
  AND btrim(r."type") = rt."key";

UPDATE "Relation" r
SET "type" = rt."key"
FROM "RelationType" rt
WHERE r."relationTypeId" = rt."id"
  AND r."type" IS DISTINCT FROM rt."key";
