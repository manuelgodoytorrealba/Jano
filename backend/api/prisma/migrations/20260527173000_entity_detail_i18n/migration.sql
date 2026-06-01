CREATE TABLE "ArtworkDetailsTranslation" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "authorNation" TEXT,
  "technique" TEXT,
  "materials" TEXT,
  "dimensions" TEXT,
  "location" TEXT,
  "collection" TEXT,
  "state" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtworkDetailsTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArtistDetailsTranslation" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "country" TEXT,
  "city" TEXT,
  "disciplines" TEXT,
  "bioShort" TEXT,
  "links" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtistDetailsTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConceptDetailsTranslation" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "definition" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConceptDetailsTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PeriodDetailsTranslation" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "definition" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PeriodDetailsTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArtworkDetailsTranslation_entityId_locale_key" ON "ArtworkDetailsTranslation"("entityId", "locale");
CREATE INDEX "ArtworkDetailsTranslation_locale_idx" ON "ArtworkDetailsTranslation"("locale");

CREATE UNIQUE INDEX "ArtistDetailsTranslation_entityId_locale_key" ON "ArtistDetailsTranslation"("entityId", "locale");
CREATE INDEX "ArtistDetailsTranslation_locale_idx" ON "ArtistDetailsTranslation"("locale");

CREATE UNIQUE INDEX "ConceptDetailsTranslation_entityId_locale_key" ON "ConceptDetailsTranslation"("entityId", "locale");
CREATE INDEX "ConceptDetailsTranslation_locale_idx" ON "ConceptDetailsTranslation"("locale");

CREATE UNIQUE INDEX "PeriodDetailsTranslation_entityId_locale_key" ON "PeriodDetailsTranslation"("entityId", "locale");
CREATE INDEX "PeriodDetailsTranslation_locale_idx" ON "PeriodDetailsTranslation"("locale");

ALTER TABLE "ArtworkDetailsTranslation"
  ADD CONSTRAINT "ArtworkDetailsTranslation_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "ArtworkDetails"("entityId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArtistDetailsTranslation"
  ADD CONSTRAINT "ArtistDetailsTranslation_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "ArtistDetails"("entityId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConceptDetailsTranslation"
  ADD CONSTRAINT "ConceptDetailsTranslation_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "ConceptDetails"("entityId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PeriodDetailsTranslation"
  ADD CONSTRAINT "PeriodDetailsTranslation_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "PeriodDetails"("entityId") ON DELETE CASCADE ON UPDATE CASCADE;
