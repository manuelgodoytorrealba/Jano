ALTER TABLE "ResearchOutlineSection"
ADD COLUMN "objective" TEXT,
ADD COLUMN "notes" TEXT;

CREATE TABLE "ResearchQuestion" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResearchQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResearchQuestion_sectionId_sortOrder_idx" ON "ResearchQuestion"("sectionId", "sortOrder");

ALTER TABLE "ResearchQuestion" ADD CONSTRAINT "ResearchQuestion_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "ResearchOutlineSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
