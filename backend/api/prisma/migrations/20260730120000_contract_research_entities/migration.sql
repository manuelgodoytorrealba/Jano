-- Rename legacy private-knowledge tables without rewriting rows.
ALTER TABLE "ResearchEntityCandidate" RENAME TO "ResearchEntity";
ALTER TABLE "ResearchEntityCandidateEvidence" RENAME TO "ResearchEntityEvidence";
ALTER TABLE "ResearchRelationCandidate" RENAME TO "ResearchRelation";
ALTER TABLE "ResearchRelationCandidateEvidence" RENAME TO "ResearchRelationEvidence";

-- Rename semantic columns while preserving stable identifiers, evidence links and timestamps.
ALTER TABLE "ResearchEntity" RENAME COLUMN "suggestedEntityId" TO "canonicalEntityId";
ALTER TABLE "ResearchRelation" RENAME COLUMN "fromCandidateId" TO "fromEntityId";
ALTER TABLE "ResearchRelation" RENAME COLUMN "toCandidateId" TO "toEntityId";
ALTER TABLE "ResearchEntityEvidence" RENAME COLUMN "candidateId" TO "entityId";
ALTER TABLE "ResearchRelationEvidence" RENAME COLUMN "candidateId" TO "relationId";

-- Keep database metadata aligned with the contract; no data is created, modified or deleted.
ALTER TABLE "ResearchEntity" RENAME CONSTRAINT "ResearchEntityCandidate_pkey" TO "ResearchEntity_pkey";
ALTER TABLE "ResearchEntity" RENAME CONSTRAINT "ResearchEntityCandidate_projectId_fkey" TO "ResearchEntity_projectId_fkey";
ALTER TABLE "ResearchEntity" RENAME CONSTRAINT "ResearchEntityCandidate_suggestedEntityId_fkey" TO "ResearchEntity_canonicalEntityId_fkey";
ALTER TABLE "ResearchEntityEvidence" RENAME CONSTRAINT "ResearchEntityCandidateEvidence_pkey" TO "ResearchEntityEvidence_pkey";
ALTER TABLE "ResearchEntityEvidence" RENAME CONSTRAINT "ResearchEntityCandidateEvidence_candidateId_fkey" TO "ResearchEntityEvidence_entityId_fkey";
ALTER TABLE "ResearchEntityEvidence" RENAME CONSTRAINT "ResearchEntityCandidateEvidence_evidenceId_fkey" TO "ResearchEntityEvidence_evidenceId_fkey";
ALTER TABLE "ResearchRelation" RENAME CONSTRAINT "ResearchRelationCandidate_pkey" TO "ResearchRelation_pkey";
ALTER TABLE "ResearchRelation" RENAME CONSTRAINT "ResearchRelationCandidate_projectId_fkey" TO "ResearchRelation_projectId_fkey";
ALTER TABLE "ResearchRelation" RENAME CONSTRAINT "ResearchRelationCandidate_fromCandidateId_fkey" TO "ResearchRelation_fromEntityId_fkey";
ALTER TABLE "ResearchRelation" RENAME CONSTRAINT "ResearchRelationCandidate_toCandidateId_fkey" TO "ResearchRelation_toEntityId_fkey";
ALTER TABLE "ResearchRelation" RENAME CONSTRAINT "ResearchRelationCandidate_relationTypeId_fkey" TO "ResearchRelation_relationTypeId_fkey";
ALTER TABLE "ResearchRelationEvidence" RENAME CONSTRAINT "ResearchRelationCandidateEvidence_pkey" TO "ResearchRelationEvidence_pkey";
ALTER TABLE "ResearchRelationEvidence" RENAME CONSTRAINT "ResearchRelationCandidateEvidence_candidateId_fkey" TO "ResearchRelationEvidence_relationId_fkey";
ALTER TABLE "ResearchRelationEvidence" RENAME CONSTRAINT "ResearchRelationCandidateEvidence_evidenceId_fkey" TO "ResearchRelationEvidence_evidenceId_fkey";

ALTER INDEX "ResearchEntityCandidate_projectId_reviewState_idx" RENAME TO "ResearchEntity_projectId_reviewState_idx";
ALTER INDEX "ResearchEntityCandidate_suggestedEntityId_idx" RENAME TO "ResearchEntity_canonicalEntityId_idx";
ALTER INDEX "ResearchEntityCandidateEvidence_evidenceId_idx" RENAME TO "ResearchEntityEvidence_evidenceId_idx";
ALTER INDEX "ResearchRelationCandidate_projectId_reviewState_idx" RENAME TO "ResearchRelation_projectId_reviewState_idx";
ALTER INDEX "ResearchRelationCandidate_fromCandidateId_idx" RENAME TO "ResearchRelation_fromEntityId_idx";
ALTER INDEX "ResearchRelationCandidate_toCandidateId_idx" RENAME TO "ResearchRelation_toEntityId_idx";
ALTER INDEX "ResearchRelationCandidate_relationTypeId_idx" RENAME TO "ResearchRelation_relationTypeId_idx";
ALTER INDEX "ResearchRelationCandidateEvidence_evidenceId_idx" RENAME TO "ResearchRelationEvidence_evidenceId_idx";
