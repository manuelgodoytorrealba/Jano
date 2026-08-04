ALTER TYPE "ResearchJobType" ADD VALUE 'PREPARE_MATERIAL';

ALTER TABLE "ResearchJob" ADD COLUMN "materialVersionId" TEXT;
ALTER TABLE "ResearchJob"
  ADD CONSTRAINT "ResearchJob_materialVersionId_fkey"
  FOREIGN KEY ("materialVersionId") REFERENCES "LibraryMaterialVersion"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ResearchJob_materialVersionId_idx" ON "ResearchJob"("materialVersionId");
