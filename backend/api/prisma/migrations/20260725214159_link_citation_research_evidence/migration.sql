-- AlterTable
ALTER TABLE "Citation" ADD COLUMN     "researchEvidenceId" TEXT;

-- CreateIndex
CREATE INDEX "Citation_researchEvidenceId_idx" ON "Citation"("researchEvidenceId");

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_researchEvidenceId_fkey" FOREIGN KEY ("researchEvidenceId") REFERENCES "ResearchEvidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
