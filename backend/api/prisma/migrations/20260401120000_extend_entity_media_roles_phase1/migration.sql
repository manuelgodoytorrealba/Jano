-- Expand MediaRole safely by recreating the enum and migrating existing data.
ALTER TYPE "MediaRole" RENAME TO "MediaRole_old";

CREATE TYPE "MediaRole" AS ENUM (
    'PRIMARY_LEGACY',
    'HERO',
    'CARD',
    'DETAIL',
    'THUMBNAIL',
    'EXPLORER_3D',
    'GALLERY'
);

ALTER TABLE "EntityMedia"
ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "EntityMedia"
ALTER COLUMN "role" TYPE "MediaRole"
USING (
    CASE
        WHEN "role"::text = 'PRIMARY' THEN 'PRIMARY_LEGACY'::"MediaRole"
        ELSE "role"::text::"MediaRole"
    END
);

DROP TYPE "MediaRole_old";

CREATE TYPE "MediaDisplayMode" AS ENUM ('COVER', 'CONTAIN');

ALTER TABLE "EntityMedia"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "displayMode" "MediaDisplayMode",
ADD COLUMN "focalX" DOUBLE PRECISION,
ADD COLUMN "focalY" DOUBLE PRECISION;

UPDATE "EntityMedia"
SET
  "isPrimary" = true,
  "sortOrder" = 0,
  "displayMode" = NULL,
  "focalX" = NULL,
  "focalY" = NULL
WHERE "role" = 'PRIMARY_LEGACY';

ALTER TABLE "EntityMedia"
ALTER COLUMN "role" SET DEFAULT 'PRIMARY_LEGACY';

CREATE INDEX "EntityMedia_entityId_role_sortOrder_idx" ON "EntityMedia"("entityId", "role", "sortOrder");
CREATE INDEX "EntityMedia_entityId_isPrimary_idx" ON "EntityMedia"("entityId", "isPrimary");
