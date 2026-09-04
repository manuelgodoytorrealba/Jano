CREATE TABLE "CanonicalAssertion" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "dimension" TEXT NOT NULL,
  "proposition" TEXT NOT NULL,
  "normalizedFingerprint" TEXT NOT NULL,
  "qualifiers" JSONB,
  "status" "KnowledgeAssertionStatus" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CanonicalAssertion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanonicalAssertionSourceRef" (
  "assertionId" TEXT NOT NULL,
  "sourceRefId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CanonicalAssertionSourceRef_pkey" PRIMARY KEY ("assertionId", "sourceRefId")
);

CREATE TABLE "SemanticResultCache" (
  "id" TEXT NOT NULL,
  "cacheKey" TEXT NOT NULL,
  "classifierVersion" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "inputContractVersion" TEXT NOT NULL,
  "excerptFingerprint" TEXT NOT NULL,
  "candidateEntityFingerprint" TEXT NOT NULL,
  "inputFingerprint" TEXT NOT NULL,
  "result" JSONB NOT NULL,
  "hitCount" INTEGER NOT NULL DEFAULT 0,
  "lastHitAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SemanticResultCache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResearchProposalDecision" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResearchProposalDecision_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Citation" ADD COLUMN "canonicalAssertionId" TEXT;
ALTER TABLE "ResearchFindingProposal"
  ADD COLUMN "subjectRole" TEXT,
  ADD COLUMN "targetStatus" TEXT,
  ADD COLUMN "targetConfidence" DOUBLE PRECISION,
  ADD COLUMN "supportSpan" TEXT,
  ADD COLUMN "targetReason" TEXT,
  ADD COLUMN "alternateTargets" JSONB,
  ADD COLUMN "identityDisposition" TEXT,
  ADD COLUMN "duplicateCandidates" JSONB;

CREATE UNIQUE INDEX "CanonicalAssertion_entityId_dimension_normalizedFingerprint_key" ON "CanonicalAssertion"("entityId", "dimension", "normalizedFingerprint");
CREATE INDEX "CanonicalAssertion_entityId_status_idx" ON "CanonicalAssertion"("entityId", "status");
CREATE INDEX "CanonicalAssertion_normalizedFingerprint_idx" ON "CanonicalAssertion"("normalizedFingerprint");
CREATE INDEX "CanonicalAssertionSourceRef_sourceRefId_idx" ON "CanonicalAssertionSourceRef"("sourceRefId");
CREATE UNIQUE INDEX "SemanticResultCache_cacheKey_key" ON "SemanticResultCache"("cacheKey");
CREATE INDEX "SemanticResultCache_classifierVersion_model_idx" ON "SemanticResultCache"("classifierVersion", "model");
CREATE INDEX "SemanticResultCache_excerptFingerprint_idx" ON "SemanticResultCache"("excerptFingerprint");
CREATE INDEX "SemanticResultCache_candidateEntityFingerprint_idx" ON "SemanticResultCache"("candidateEntityFingerprint");
CREATE INDEX "ResearchProposalDecision_proposalId_createdAt_idx" ON "ResearchProposalDecision"("proposalId", "createdAt");
CREATE INDEX "ResearchProposalDecision_action_createdAt_idx" ON "ResearchProposalDecision"("action", "createdAt");
CREATE INDEX "Citation_canonicalAssertionId_idx" ON "Citation"("canonicalAssertionId");
CREATE INDEX "ResearchFindingProposal_projectId_type_reviewState_idx" ON "ResearchFindingProposal"("projectId", "type", "reviewState");
CREATE INDEX "ResearchFindingProposal_targetStatus_idx" ON "ResearchFindingProposal"("targetStatus");
CREATE INDEX "ResearchFindingProposal_identityDisposition_idx" ON "ResearchFindingProposal"("identityDisposition");

ALTER TABLE "CanonicalAssertion" ADD CONSTRAINT "CanonicalAssertion_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanonicalAssertionSourceRef" ADD CONSTRAINT "CanonicalAssertionSourceRef_assertionId_fkey" FOREIGN KEY ("assertionId") REFERENCES "CanonicalAssertion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanonicalAssertionSourceRef" ADD CONSTRAINT "CanonicalAssertionSourceRef_sourceRefId_fkey" FOREIGN KEY ("sourceRefId") REFERENCES "SourceRef"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_canonicalAssertionId_fkey" FOREIGN KEY ("canonicalAssertionId") REFERENCES "CanonicalAssertion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchProposalDecision" ADD CONSTRAINT "ResearchProposalDecision_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ResearchFindingProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchProposalDecision" ADD CONSTRAINT "ResearchProposalDecision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Compatibility backfill: preserve the seven controlled assertions encoded in SourceRef.note.
INSERT INTO "CanonicalAssertion" ("id", "entityId", "dimension", "proposition", "normalizedFingerprint", "status")
SELECT
  md5('canonical-assertion:' || sr."entityId" || ':' || sr.note),
  sr."entityId",
  substring(sr.note FROM 2 FOR position(']' IN sr.note) - 2),
  trim(substring(sr.note FROM position('] ' IN sr.note) + 2)),
  md5(lower(regexp_replace(trim(substring(sr.note FROM position('] ' IN sr.note) + 2)), '\s+', ' ', 'g'))),
  'PUBLISHED'
FROM "SourceRef" sr
WHERE sr.note ~ '^\[[^]]+\] .+'
ON CONFLICT ("entityId", "dimension", "normalizedFingerprint") DO NOTHING;

INSERT INTO "CanonicalAssertionSourceRef" ("assertionId", "sourceRefId")
SELECT ca.id, sr.id
FROM "SourceRef" sr
JOIN "CanonicalAssertion" ca
  ON ca."entityId" = sr."entityId"
 AND ca.dimension = substring(sr.note FROM 2 FOR position(']' IN sr.note) - 2)
 AND ca."normalizedFingerprint" = md5(lower(regexp_replace(trim(substring(sr.note FROM position('] ' IN sr.note) + 2)), '\s+', ' ', 'g')))
WHERE sr.note ~ '^\[[^]]+\] .+'
ON CONFLICT DO NOTHING;

UPDATE "Citation" c
SET "canonicalAssertionId" = ca.id
FROM "CanonicalAssertion" ca
WHERE c."canonicalAssertionId" IS NULL
  AND c."entityId" = ca."entityId"
  AND c.note = '[' || ca.dimension || '] ' || ca.proposition;
