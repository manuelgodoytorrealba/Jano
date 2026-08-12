CREATE TABLE "ResearchProjectCitation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "materialId" TEXT,
    "libraryExcerptId" TEXT,
    "evidenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchProjectCitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResearchProjectCitation_projectId_materialId_key" ON "ResearchProjectCitation"("projectId", "materialId");
CREATE UNIQUE INDEX "ResearchProjectCitation_projectId_libraryExcerptId_key" ON "ResearchProjectCitation"("projectId", "libraryExcerptId");
CREATE UNIQUE INDEX "ResearchProjectCitation_projectId_evidenceId_key" ON "ResearchProjectCitation"("projectId", "evidenceId");
CREATE INDEX "ResearchProjectCitation_projectId_createdAt_idx" ON "ResearchProjectCitation"("projectId", "createdAt");

ALTER TABLE "ResearchProjectCitation" ADD CONSTRAINT "ResearchProjectCitation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchProjectCitation" ADD CONSTRAINT "ResearchProjectCitation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResearchProjectCitation" ADD CONSTRAINT "ResearchProjectCitation_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "LibraryMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchProjectCitation" ADD CONSTRAINT "ResearchProjectCitation_libraryExcerptId_fkey" FOREIGN KEY ("libraryExcerptId") REFERENCES "LibraryExcerpt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchProjectCitation" ADD CONSTRAINT "ResearchProjectCitation_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "ResearchEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
