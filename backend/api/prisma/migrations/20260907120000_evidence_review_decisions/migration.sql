CREATE TYPE "ResearchEvidenceDecisionAction" AS ENUM ('APPROVE_CLAIM', 'ADDITIONAL_PROVENANCE', 'DEFER', 'REJECT_SOURCE_CONTEXT', 'REJECT_TARGET_MISMATCH', 'REJECT_INSUFFICIENT_SUPPORT', 'SEMANTIC_DUPLICATE');
CREATE TABLE "ResearchEvidenceDecision" (
 "id" TEXT NOT NULL,
 "projectId" TEXT NOT NULL,
 "evidenceId" TEXT NOT NULL,
 "logicalReviewId" TEXT NOT NULL,
 "reviewerId" TEXT NOT NULL,
 "decision" "ResearchEvidenceDecisionAction" NOT NULL,
 "reason" TEXT,
 "payload" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ResearchEvidenceDecision_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ResearchEvidenceDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ResearchEvidenceDecision_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "ResearchEvidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ResearchEvidenceDecision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ResearchEvidenceDecision_projectId_logicalReviewId_key" ON "ResearchEvidenceDecision"("projectId", "logicalReviewId");
CREATE INDEX "ResearchEvidenceDecision_projectId_idx" ON "ResearchEvidenceDecision"("projectId");
CREATE INDEX "ResearchEvidenceDecision_evidenceId_idx" ON "ResearchEvidenceDecision"("evidenceId");
CREATE INDEX "ResearchEvidenceDecision_reviewerId_idx" ON "ResearchEvidenceDecision"("reviewerId");
