-- AlterTable
ALTER TABLE "ResearchFinding" ADD COLUMN     "promotedEntityId" TEXT;

-- CreateIndex
CREATE INDEX "ResearchFinding_promotedEntityId_idx" ON "ResearchFinding"("promotedEntityId");

-- AddForeignKey
ALTER TABLE "ResearchFinding" ADD CONSTRAINT "ResearchFinding_promotedEntityId_fkey" FOREIGN KEY ("promotedEntityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
