CREATE TABLE "RelationTranslation" (
  "id" TEXT NOT NULL,
  "relationId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "justification" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RelationTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourceRefTranslation" (
  "id" TEXT NOT NULL,
  "sourceRefId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "quote" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SourceRefTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RelationTranslation_relationId_locale_key" ON "RelationTranslation"("relationId", "locale");
CREATE INDEX "RelationTranslation_locale_idx" ON "RelationTranslation"("locale");
CREATE UNIQUE INDEX "SourceRefTranslation_sourceRefId_locale_key" ON "SourceRefTranslation"("sourceRefId", "locale");
CREATE INDEX "SourceRefTranslation_locale_idx" ON "SourceRefTranslation"("locale");

ALTER TABLE "RelationTranslation"
  ADD CONSTRAINT "RelationTranslation_relationId_fkey"
  FOREIGN KEY ("relationId") REFERENCES "Relation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SourceRefTranslation"
  ADD CONSTRAINT "SourceRefTranslation_sourceRefId_fkey"
  FOREIGN KEY ("sourceRefId") REFERENCES "SourceRef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "RelationTranslation" ("id", "relationId", "locale", "justification", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), r."id", 'es', r."justification", NOW(), NOW()
FROM "Relation" r
ON CONFLICT ("relationId", "locale") DO NOTHING;

INSERT INTO "RelationTranslation" ("id", "relationId", "locale", "justification", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), r."id", 'en', r."justification", NOW(), NOW()
FROM "Relation" r
ON CONFLICT ("relationId", "locale") DO NOTHING;

UPDATE "RelationTranslation"
SET "justification" = replace(replace(replace(replace(replace(replace(replace(replace(replace(coalesce("justification", ''),
  'Autoría directa.', 'Direct authorship.'),
  'Mención explícita en el contenido.', 'Explicit mention in the content.'),
  'La guerra', 'War'),
  'la guerra', 'war'),
  'violencia', 'violence'),
  'memoria', 'memory'),
  'identidad', 'identity'),
  'cuerpo', 'body'),
  'obra', 'work'),
  "updatedAt" = NOW()
WHERE "locale" = 'en';

INSERT INTO "SourceRefTranslation" ("id", "sourceRefId", "locale", "quote", "note", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), s."id", 'es', s."quote", s."note", NOW(), NOW()
FROM "SourceRef" s
ON CONFLICT ("sourceRefId", "locale") DO NOTHING;

INSERT INTO "SourceRefTranslation" ("id", "sourceRefId", "locale", "quote", "note", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), s."id", 'en', s."quote", s."note", NOW(), NOW()
FROM "SourceRef" s
ON CONFLICT ("sourceRefId", "locale") DO NOTHING;

UPDATE "SourceRefTranslation"
SET
  "quote" = replace(replace(replace(coalesce("quote", ''), 'memoria', 'memory'), 'guerra', 'war'), 'violencia', 'violence'),
  "note" = replace(replace(replace(replace(coalesce("note", ''),
    'Ficha institucional de obra.', 'Institutional work record.'),
    'Referencia institucional principal.', 'Primary institutional reference.'),
    'institucional', 'institutional'),
    'obra', 'work'),
  "updatedAt" = NOW()
WHERE "locale" = 'en';
