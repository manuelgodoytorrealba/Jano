ALTER TABLE "LibraryMaterial" ADD COLUMN "legacyResearchMaterialId" TEXT;

CREATE UNIQUE INDEX "LibraryMaterial_legacyResearchMaterialId_key"
ON "LibraryMaterial"("legacyResearchMaterialId");
