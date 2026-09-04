CREATE TYPE "EntityTypeHomeCoverMode" AS ENUM ('ALGORITHM', 'MANUAL');

ALTER TABLE "EntityTypeDefinition"
ADD COLUMN "homeCoverMode" "EntityTypeHomeCoverMode" NOT NULL DEFAULT 'ALGORITHM',
ADD COLUMN "homeCoverMediaId" TEXT;

CREATE INDEX "EntityTypeDefinition_homeCoverMediaId_idx"
ON "EntityTypeDefinition"("homeCoverMediaId");

ALTER TABLE "EntityTypeDefinition"
ADD CONSTRAINT "EntityTypeDefinition_homeCoverMediaId_fkey"
FOREIGN KEY ("homeCoverMediaId") REFERENCES "Media"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
