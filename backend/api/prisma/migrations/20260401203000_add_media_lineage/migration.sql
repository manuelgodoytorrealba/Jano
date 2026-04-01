ALTER TABLE "Media"
ADD COLUMN "derivedFromMediaId" TEXT;

CREATE INDEX "Media_derivedFromMediaId_idx" ON "Media"("derivedFromMediaId");

ALTER TABLE "Media"
ADD CONSTRAINT "Media_derivedFromMediaId_fkey"
FOREIGN KEY ("derivedFromMediaId") REFERENCES "Media"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
