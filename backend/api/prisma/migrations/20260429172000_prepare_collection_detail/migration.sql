-- Prepare collections for a premium detail view while preserving existing rows.
ALTER TABLE "Collection"
ADD COLUMN "notes" TEXT,
ADD COLUMN "coverMediaId" TEXT;

ALTER TABLE "CollectionEntity"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Collection_coverMediaId_idx" ON "Collection"("coverMediaId");
CREATE INDEX "CollectionEntity_collectionId_sortOrder_idx" ON "CollectionEntity"("collectionId", "sortOrder");

ALTER TABLE "Collection"
ADD CONSTRAINT "Collection_coverMediaId_fkey"
FOREIGN KEY ("coverMediaId") REFERENCES "Media"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
