-- CreateTable
CREATE TABLE "ResearchEntityCandidate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "KnowledgeEntityKind" NOT NULL,
    "title" TEXT NOT NULL,
    "aliases" JSONB,
    "summary" TEXT,
    "confidence" DOUBLE PRECISION,
    "mentionCount" INTEGER NOT NULL DEFAULT 0,
    "suggestedEntityId" TEXT,
    "reviewState" "ResearchProposalReviewState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchEntityCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchEntityCandidateEvidence" (
    "candidateId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,

    CONSTRAINT "ResearchEntityCandidateEvidence_pkey" PRIMARY KEY ("candidateId","evidenceId")
);

-- CreateTable
CREATE TABLE "ResearchRelationCandidate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromCandidateId" TEXT NOT NULL,
    "toCandidateId" TEXT NOT NULL,
    "relationTypeId" TEXT,
    "explanation" TEXT,
    "confidence" DOUBLE PRECISION,
    "reviewState" "ResearchProposalReviewState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchRelationCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchRelationCandidateEvidence" (
    "candidateId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,

    CONSTRAINT "ResearchRelationCandidateEvidence_pkey" PRIMARY KEY ("candidateId","evidenceId")
);

-- CreateIndex
CREATE INDEX "ResearchEntityCandidate_projectId_reviewState_idx" ON "ResearchEntityCandidate"("projectId", "reviewState");

-- CreateIndex
CREATE INDEX "ResearchEntityCandidate_suggestedEntityId_idx" ON "ResearchEntityCandidate"("suggestedEntityId");

-- CreateIndex
CREATE INDEX "ResearchEntityCandidateEvidence_evidenceId_idx" ON "ResearchEntityCandidateEvidence"("evidenceId");

-- CreateIndex
CREATE INDEX "ResearchRelationCandidate_projectId_reviewState_idx" ON "ResearchRelationCandidate"("projectId", "reviewState");

-- CreateIndex
CREATE INDEX "ResearchRelationCandidate_fromCandidateId_idx" ON "ResearchRelationCandidate"("fromCandidateId");

-- CreateIndex
CREATE INDEX "ResearchRelationCandidate_toCandidateId_idx" ON "ResearchRelationCandidate"("toCandidateId");

-- CreateIndex
CREATE INDEX "ResearchRelationCandidate_relationTypeId_idx" ON "ResearchRelationCandidate"("relationTypeId");

-- CreateIndex
CREATE INDEX "ResearchRelationCandidateEvidence_evidenceId_idx" ON "ResearchRelationCandidateEvidence"("evidenceId");

-- AddForeignKey
ALTER TABLE "ResearchEntityCandidate" ADD CONSTRAINT "ResearchEntityCandidate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEntityCandidate" ADD CONSTRAINT "ResearchEntityCandidate_suggestedEntityId_fkey" FOREIGN KEY ("suggestedEntityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEntityCandidateEvidence" ADD CONSTRAINT "ResearchEntityCandidateEvidence_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ResearchEntityCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEntityCandidateEvidence" ADD CONSTRAINT "ResearchEntityCandidateEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "ResearchEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRelationCandidate" ADD CONSTRAINT "ResearchRelationCandidate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRelationCandidate" ADD CONSTRAINT "ResearchRelationCandidate_fromCandidateId_fkey" FOREIGN KEY ("fromCandidateId") REFERENCES "ResearchEntityCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRelationCandidate" ADD CONSTRAINT "ResearchRelationCandidate_toCandidateId_fkey" FOREIGN KEY ("toCandidateId") REFERENCES "ResearchEntityCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRelationCandidate" ADD CONSTRAINT "ResearchRelationCandidate_relationTypeId_fkey" FOREIGN KEY ("relationTypeId") REFERENCES "RelationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRelationCandidateEvidence" ADD CONSTRAINT "ResearchRelationCandidateEvidence_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ResearchRelationCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRelationCandidateEvidence" ADD CONSTRAINT "ResearchRelationCandidateEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "ResearchEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
