ALTER TABLE "ResearchFindingProposal"
  ADD COLUMN "convertedEntityId" TEXT,
  ADD COLUMN "convertedRelationId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ResearchFindingProposal"
  ADD CONSTRAINT "ResearchFindingProposal_convertedEntityId_fkey"
    FOREIGN KEY ("convertedEntityId") REFERENCES "ResearchEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ResearchFindingProposal_convertedRelationId_fkey"
    FOREIGN KEY ("convertedRelationId") REFERENCES "ResearchRelation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ResearchFindingProposal_convertedEntityId_idx"
  ON "ResearchFindingProposal"("convertedEntityId");
CREATE INDEX "ResearchFindingProposal_convertedRelationId_idx"
  ON "ResearchFindingProposal"("convertedRelationId");
