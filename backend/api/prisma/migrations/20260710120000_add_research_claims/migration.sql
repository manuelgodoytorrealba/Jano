CREATE TYPE "ResearchClaimKind" AS ENUM (
    'SUBJECT_CANDIDATE',
    'CONNECTION_HYPOTHESIS',
    'CONCEPT',
    'CONTRADICTION',
    'OPEN_QUESTION',
    'SYNTHESIS_STATEMENT'
);

CREATE TABLE "ResearchClaim" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "ResearchClaimKind" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "readyForPromotion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResearchClaimEvidence" (
    "claimId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,

    CONSTRAINT "ResearchClaimEvidence_pkey" PRIMARY KEY ("claimId", "evidenceId")
);

CREATE INDEX "ResearchClaim_projectId_kind_idx" ON "ResearchClaim"("projectId", "kind");
CREATE INDEX "ResearchClaim_projectId_readyForPromotion_idx" ON "ResearchClaim"("projectId", "readyForPromotion");
CREATE INDEX "ResearchClaim_updatedAt_idx" ON "ResearchClaim"("updatedAt");
CREATE INDEX "ResearchClaimEvidence_evidenceId_idx" ON "ResearchClaimEvidence"("evidenceId");

ALTER TABLE "ResearchClaim"
ADD CONSTRAINT "ResearchClaim_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchClaimEvidence"
ADD CONSTRAINT "ResearchClaimEvidence_claimId_fkey"
FOREIGN KEY ("claimId") REFERENCES "ResearchClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchClaimEvidence"
ADD CONSTRAINT "ResearchClaimEvidence_evidenceId_fkey"
FOREIGN KEY ("evidenceId") REFERENCES "ResearchEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
