CREATE TYPE "EditorialRelationJustificationStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED');

CREATE TABLE "EditorialRelationJustification" (
  "id" TEXT NOT NULL,
  "relationId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "status" "EditorialRelationJustificationStatus" NOT NULL DEFAULT 'DRAFT',
  "claimsUsed" JSONB,
  "sourcesUsed" JSONB,
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EditorialRelationJustification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EditorialRelationJustification_relationId_fkey" FOREIGN KEY ("relationId") REFERENCES "Relation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EditorialRelationJustification_relationId_locale_key" ON "EditorialRelationJustification"("relationId", "locale");
CREATE INDEX "EditorialRelationJustification_relationId_idx" ON "EditorialRelationJustification"("relationId");
CREATE INDEX "EditorialRelationJustification_locale_status_idx" ON "EditorialRelationJustification"("locale", "status");
