CREATE TABLE "ResearchOutlineSectionMaterial" (
    "sectionId" TEXT NOT NULL,
    "materialVersionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchOutlineSectionMaterial_pkey" PRIMARY KEY ("sectionId", "materialVersionId")
);

CREATE INDEX "ResearchOutlineSectionMaterial_materialVersionId_idx"
ON "ResearchOutlineSectionMaterial"("materialVersionId");

CREATE INDEX "ResearchOutlineSectionMaterial_sectionId_sortOrder_idx"
ON "ResearchOutlineSectionMaterial"("sectionId", "sortOrder");

ALTER TABLE "ResearchOutlineSectionMaterial"
ADD CONSTRAINT "ResearchOutlineSectionMaterial_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "ResearchOutlineSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchOutlineSectionMaterial"
ADD CONSTRAINT "ResearchOutlineSectionMaterial_materialVersionId_fkey"
FOREIGN KEY ("materialVersionId") REFERENCES "LibraryMaterialVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
