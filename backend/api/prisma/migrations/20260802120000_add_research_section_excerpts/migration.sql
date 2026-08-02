CREATE TABLE "ResearchOutlineSectionExcerpt" (
    "sectionId" TEXT NOT NULL,
    "libraryExcerptId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchOutlineSectionExcerpt_pkey" PRIMARY KEY ("sectionId","libraryExcerptId")
);

CREATE INDEX "ResearchOutlineSectionExcerpt_libraryExcerptId_idx"
ON "ResearchOutlineSectionExcerpt"("libraryExcerptId");

CREATE INDEX "ResearchOutlineSectionExcerpt_sectionId_sortOrder_idx"
ON "ResearchOutlineSectionExcerpt"("sectionId", "sortOrder");

ALTER TABLE "ResearchOutlineSectionExcerpt"
ADD CONSTRAINT "ResearchOutlineSectionExcerpt_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "ResearchOutlineSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchOutlineSectionExcerpt"
ADD CONSTRAINT "ResearchOutlineSectionExcerpt_libraryExcerptId_fkey"
FOREIGN KEY ("libraryExcerptId") REFERENCES "LibraryExcerpt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
