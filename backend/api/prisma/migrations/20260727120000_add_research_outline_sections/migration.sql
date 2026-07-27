CREATE TYPE "ResearchOutlineSectionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'COMPLETED');

CREATE TABLE "ResearchOutlineSection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentSectionId" TEXT,
    "title" TEXT NOT NULL,
    "status" "ResearchOutlineSectionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchOutlineSection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResearchOutlineSection_projectId_parentSectionId_sortOrder_idx"
ON "ResearchOutlineSection"("projectId", "parentSectionId", "sortOrder");

CREATE INDEX "ResearchOutlineSection_parentSectionId_idx"
ON "ResearchOutlineSection"("parentSectionId");

ALTER TABLE "ResearchOutlineSection"
ADD CONSTRAINT "ResearchOutlineSection_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchOutlineSection"
ADD CONSTRAINT "ResearchOutlineSection_parentSectionId_fkey"
FOREIGN KEY ("parentSectionId") REFERENCES "ResearchOutlineSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
