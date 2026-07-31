-- Contract ResearchFinding into legacy compatibility. Active private knowledge is ResearchClaim.
ALTER TABLE "ResearchDecision" ADD COLUMN "claimId" TEXT;
ALTER TABLE "ResearchFindingProposal" ADD COLUMN "convertedClaimId" TEXT;

-- Preserve each historical Finding as its corresponding private Claim, reusing the identifier.
INSERT INTO "ResearchClaim" ("id", "projectId", "kind", "title", "summary", "status", "createdAt", "updatedAt")
SELECT "id", "projectId", 'ASSERTION'::"ResearchClaimKind", "title", "summary",
  CASE "status"
    WHEN 'ACCEPTED'::"ResearchFindingStatus" THEN 'SUPPORTED'::"ResearchClaimStatus"
    WHEN 'REJECTED'::"ResearchFindingStatus" THEN 'QUESTIONED'::"ResearchClaimStatus"
    ELSE 'DRAFT'::"ResearchClaimStatus"
  END,
  "createdAt", "updatedAt"
FROM "ResearchFinding"
ON CONFLICT ("id") DO NOTHING;

-- Preserve provenance and editorial decisions without duplicating writers.
INSERT INTO "ResearchClaimEvidence" ("claimId", "evidenceId")
SELECT "findingId", "evidenceId" FROM "ResearchFindingEvidence"
ON CONFLICT ("claimId", "evidenceId") DO NOTHING;
UPDATE "ResearchDecision" SET "claimId" = "findingId" WHERE "claimId" IS NULL AND "findingId" IS NOT NULL;
UPDATE "ResearchFindingProposal" SET "convertedClaimId" = "convertedFindingId" WHERE "convertedClaimId" IS NULL AND "convertedFindingId" IS NOT NULL;

ALTER TABLE "ResearchDecision" ADD CONSTRAINT "ResearchDecision_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ResearchClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResearchFindingProposal" ADD CONSTRAINT "ResearchFindingProposal_convertedClaimId_fkey" FOREIGN KEY ("convertedClaimId") REFERENCES "ResearchClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ResearchDecision_claimId_idx" ON "ResearchDecision"("claimId");
CREATE INDEX "ResearchFindingProposal_convertedClaimId_idx" ON "ResearchFindingProposal"("convertedClaimId");
