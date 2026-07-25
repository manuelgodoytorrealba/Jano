CREATE TYPE "ResearchMaterialKind" AS ENUM ('TEXT', 'URL', 'PDF');

CREATE TYPE "ResearchMaterialStatus" AS ENUM ('READY', 'PENDING_PREPARATION', 'FAILED');

CREATE TABLE "ResearchMaterial" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "ResearchMaterialKind" NOT NULL,
    "status" "ResearchMaterialStatus" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "storageKey" TEXT,
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchMaterial_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ResearchClaim"
ADD COLUMN "subjectClaimId" TEXT,
ADD COLUMN "objectClaimId" TEXT;

CREATE INDEX "ResearchMaterial_projectId_createdAt_idx" ON "ResearchMaterial"("projectId", "createdAt");
CREATE INDEX "ResearchMaterial_projectId_status_idx" ON "ResearchMaterial"("projectId", "status");
CREATE INDEX "ResearchClaim_subjectClaimId_idx" ON "ResearchClaim"("subjectClaimId");
CREATE INDEX "ResearchClaim_objectClaimId_idx" ON "ResearchClaim"("objectClaimId");

ALTER TABLE "ResearchMaterial"
ADD CONSTRAINT "ResearchMaterial_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchClaim"
ADD CONSTRAINT "ResearchClaim_subjectClaimId_fkey"
FOREIGN KEY ("subjectClaimId") REFERENCES "ResearchClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResearchClaim"
ADD CONSTRAINT "ResearchClaim_objectClaimId_fkey"
FOREIGN KEY ("objectClaimId") REFERENCES "ResearchClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
