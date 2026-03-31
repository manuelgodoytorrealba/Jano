CREATE TYPE "MediaProvider" AS ENUM ('WIKIMEDIA_COMMONS', 'WIKIPEDIA', 'MUSEUM', 'IIIF', 'OPENVERSE', 'UNKNOWN');
CREATE TYPE "MediaQualityTier" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'MASTER');

ALTER TABLE "Media"
ADD COLUMN "canonicalUrl" TEXT,
ADD COLUMN "displayUrl" TEXT,
ADD COLUMN "sourcePageUrl" TEXT,
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "width" INTEGER,
ADD COLUMN "height" INTEGER,
ADD COLUMN "isVector" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "provider" "MediaProvider" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "qualityTier" "MediaQualityTier" NOT NULL DEFAULT 'MEDIUM';

UPDATE "Media"
SET
  "canonicalUrl" = "url",
  "displayUrl" = "url";
