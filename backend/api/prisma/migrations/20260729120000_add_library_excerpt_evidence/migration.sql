ALTER TABLE "ResearchEvidence" ADD COLUMN "libraryExcerptId" TEXT;
ALTER TABLE "ResearchEvidence" ALTER COLUMN "quote" DROP NOT NULL;

CREATE INDEX "ResearchEvidence_libraryExcerptId_idx" ON "ResearchEvidence"("libraryExcerptId");

ALTER TABLE "ResearchEvidence" ADD CONSTRAINT "ResearchEvidence_libraryExcerptId_fkey"
FOREIGN KEY ("libraryExcerptId") REFERENCES "LibraryExcerpt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
