CREATE TABLE "SourceTranslation" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "author" TEXT,
  "publisher" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SourceTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SourceTranslation_sourceId_locale_key" ON "SourceTranslation"("sourceId", "locale");
CREATE INDEX "SourceTranslation_locale_idx" ON "SourceTranslation"("locale");

ALTER TABLE "SourceTranslation"
  ADD CONSTRAINT "SourceTranslation_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "SourceTranslation" ("id", "sourceId", "locale", "title", "author", "publisher", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), s."id", 'es', s."title", s."author", s."publisher", NOW(), NOW()
FROM "Source" s
ON CONFLICT ("sourceId", "locale") DO NOTHING;

INSERT INTO "SourceTranslation" ("id", "sourceId", "locale", "title", "author", "publisher", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), s."id", 'en', s."title", s."author", s."publisher", NOW(), NOW()
FROM "Source" s
ON CONFLICT ("sourceId", "locale") DO NOTHING;

UPDATE "SourceTranslation"
SET
  "title" = replace(replace(replace(replace(replace(replace(replace(coalesce("title", ''),
    'Colección del Museo del Prado', 'Museo del Prado Collection'),
    'Colección del Museo Reina Sofía', 'Museo Reina Sofia Collection'),
    'colección', 'collection'),
    'Colección', 'Collection'),
    'Museo', 'Museum'),
    'Arte', 'Art'),
    'arte', 'art'),
  "author" = replace(replace(replace(coalesce("author", ''),
    'Museo Nacional del Prado', 'Museo Nacional del Prado'),
    'Museo Nacional Centro de Arte Reina Sofía', 'Museo Nacional Centro de Arte Reina Sofia'),
    'Museo', 'Museum'),
  "publisher" = replace(replace(replace(coalesce("publisher", ''),
    'Museo del Prado', 'Museo del Prado'),
    'Museo Reina Sofía', 'Museo Reina Sofia'),
    'Museo', 'Museum'),
  "updatedAt" = NOW()
WHERE "locale" = 'en';
