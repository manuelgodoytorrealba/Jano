-- Assisted output remains a reviewable proposal. Existing rows retain LEGACY so this additive
-- contract does not reinterpret historical proposals.
CREATE TYPE "ResearchFindingProposalType" AS ENUM ('LEGACY', 'CLAIM', 'ENTITY', 'RELATION');

ALTER TABLE "ResearchFindingProposal"
  ADD COLUMN "jobId" TEXT,
  ADD COLUMN "type" "ResearchFindingProposalType" NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN "proposalKey" TEXT,
  ADD COLUMN "resultFingerprint" TEXT,
  ADD COLUMN "claimKind" "ResearchClaimKind",
  ADD COLUMN "entityKind" "KnowledgeEntityKind",
  ADD COLUMN "relationFromKey" TEXT,
  ADD COLUMN "relationToKey" TEXT,
  ADD COLUMN "relationTypeId" TEXT,
  ADD COLUMN "explanation" TEXT;

ALTER TABLE "ResearchFindingProposal"
  ADD CONSTRAINT "ResearchFindingProposal_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "ResearchJob"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ResearchFindingProposal_relationTypeId_fkey"
    FOREIGN KEY ("relationTypeId") REFERENCES "RelationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ResearchFindingProposal_jobId_idx" ON "ResearchFindingProposal"("jobId");
CREATE INDEX "ResearchFindingProposal_relationTypeId_idx" ON "ResearchFindingProposal"("relationTypeId");

-- A result is identified by the stable Job identity and a fingerprint of its typed, validated
-- output plus supporting Evidence. Replays retain the original proposal and its human decision.
CREATE UNIQUE INDEX "ResearchFindingProposal_jobId_resultFingerprint_key"
  ON "ResearchFindingProposal"("jobId", "resultFingerprint")
  WHERE "jobId" IS NOT NULL AND "resultFingerprint" IS NOT NULL;
