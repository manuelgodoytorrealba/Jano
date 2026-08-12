ALTER TYPE "ResearchProjectStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TABLE "ResearchProject" ADD COLUMN "publishedAt" TIMESTAMP(3);
CREATE INDEX "ResearchProject_status_publishedAt_idx" ON "ResearchProject"("status", "publishedAt");
