-- Move legacy relation Evidence into deterministic private Claims before removing direct provenance.
CREATE TABLE "ResearchRelationClaim" (
  "relationId" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  CONSTRAINT "ResearchRelationClaim_pkey" PRIMARY KEY ("relationId", "claimId")
);
CREATE INDEX "ResearchRelationClaim_claimId_idx" ON "ResearchRelationClaim"("claimId");
ALTER TABLE "ResearchRelationClaim" ADD CONSTRAINT "ResearchRelationClaim_relationId_fkey" FOREIGN KEY ("relationId") REFERENCES "ResearchRelation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchRelationClaim" ADD CONSTRAINT "ResearchRelationClaim_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ResearchClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ResearchClaim" ("id", "projectId", "kind", "title", "summary", "status", "createdAt", "updatedAt")
SELECT md5('relation-evidence:' || relation."id"), relation."projectId", 'ASSERTION'::"ResearchClaimKind", COALESCE(relation."explanation", 'Relación privada migrada'), relation."explanation", 'DRAFT'::"ResearchClaimStatus", relation."createdAt", relation."updatedAt"
FROM "ResearchRelation" relation
WHERE EXISTS (SELECT 1 FROM "ResearchRelationEvidence" evidence WHERE evidence."relationId" = relation."id")
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ResearchClaimEvidence" ("claimId", "evidenceId")
SELECT md5('relation-evidence:' || relation."id"), evidence."evidenceId"
FROM "ResearchRelation" relation
JOIN "ResearchRelationEvidence" evidence ON evidence."relationId" = relation."id"
ON CONFLICT ("claimId", "evidenceId") DO NOTHING;

INSERT INTO "ResearchRelationClaim" ("relationId", "claimId")
SELECT relation."id", md5('relation-evidence:' || relation."id")
FROM "ResearchRelation" relation
WHERE EXISTS (SELECT 1 FROM "ResearchRelationEvidence" evidence WHERE evidence."relationId" = relation."id")
ON CONFLICT ("relationId", "claimId") DO NOTHING;

DROP TABLE "ResearchRelationEvidence";
