CREATE TYPE "ResearchProposalReviewState" AS ENUM ('PENDING', 'REVIEWED', 'REJECTED');

CREATE TABLE "AIExecution" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "projectId" TEXT,
    "task" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "providerVersion" TEXT,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "durationMs" INTEGER,
    "costCents" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResearchFindingProposal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "aiExecutionId" TEXT NOT NULL,
    "convertedFindingId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "kind" TEXT,
    "reviewState" "ResearchProposalReviewState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchFindingProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResearchFindingProposalEvidence" (
    "proposalId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,

    CONSTRAINT "ResearchFindingProposalEvidence_pkey" PRIMARY KEY ("proposalId", "evidenceId")
);

CREATE INDEX "AIExecution_jobId_idx" ON "AIExecution"("jobId");
CREATE INDEX "AIExecution_projectId_createdAt_idx" ON "AIExecution"("projectId", "createdAt");
CREATE INDEX "AIExecution_task_createdAt_idx" ON "AIExecution"("task", "createdAt");

CREATE INDEX "ResearchFindingProposal_projectId_reviewState_idx" ON "ResearchFindingProposal"("projectId", "reviewState");
CREATE INDEX "ResearchFindingProposal_aiExecutionId_idx" ON "ResearchFindingProposal"("aiExecutionId");
CREATE INDEX "ResearchFindingProposal_convertedFindingId_idx" ON "ResearchFindingProposal"("convertedFindingId");

CREATE INDEX "ResearchFindingProposalEvidence_evidenceId_idx" ON "ResearchFindingProposalEvidence"("evidenceId");

ALTER TABLE "AIExecution"
ADD CONSTRAINT "AIExecution_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "ResearchJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AIExecution"
ADD CONSTRAINT "AIExecution_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchFindingProposal"
ADD CONSTRAINT "ResearchFindingProposal_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchFindingProposal"
ADD CONSTRAINT "ResearchFindingProposal_aiExecutionId_fkey"
FOREIGN KEY ("aiExecutionId") REFERENCES "AIExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchFindingProposal"
ADD CONSTRAINT "ResearchFindingProposal_convertedFindingId_fkey"
FOREIGN KEY ("convertedFindingId") REFERENCES "ResearchFinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResearchFindingProposalEvidence"
ADD CONSTRAINT "ResearchFindingProposalEvidence_proposalId_fkey"
FOREIGN KEY ("proposalId") REFERENCES "ResearchFindingProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchFindingProposalEvidence"
ADD CONSTRAINT "ResearchFindingProposalEvidence_evidenceId_fkey"
FOREIGN KEY ("evidenceId") REFERENCES "ResearchEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
