CREATE TYPE "ResearchProjectStatus" AS ENUM ('ACTIVE', 'PAUSED', 'READY_TO_DECIDE', 'ARCHIVED');
CREATE TYPE "ResearchFindingStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'POSTPONED');
CREATE TYPE "ResearchDecisionAction" AS ENUM ('INCORPORATE', 'REJECT', 'POSTPONE');
CREATE TYPE "ResearchJobType" AS ENUM ('PREPARE_SOURCE', 'EXTRACT_FINDINGS');
CREATE TYPE "ResearchJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "ResearchProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "scope" TEXT,
    "status" "ResearchProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResearchProjectSource" (
    "projectId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchProjectSource_pkey" PRIMARY KEY ("projectId", "sourceId")
);

CREATE TABLE "ResearchEvidence" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "locator" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "context" TEXT,
    "note" TEXT,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResearchFinding" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT,
    "summary" TEXT,
    "status" "ResearchFindingStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchFinding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResearchFindingEvidence" (
    "findingId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,

    CONSTRAINT "ResearchFindingEvidence_pkey" PRIMARY KEY ("findingId", "evidenceId")
);

CREATE TABLE "ResearchDecision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "findingId" TEXT,
    "actorId" TEXT,
    "action" "ResearchDecisionAction" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResearchJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceId" TEXT,
    "type" "ResearchJobType" NOT NULL,
    "status" "ResearchJobStatus" NOT NULL DEFAULT 'QUEUED',
    "inputFingerprint" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResearchProject_status_lastActiveAt_idx" ON "ResearchProject"("status", "lastActiveAt");
CREATE INDEX "ResearchProject_updatedAt_idx" ON "ResearchProject"("updatedAt");

CREATE INDEX "ResearchProjectSource_sourceId_idx" ON "ResearchProjectSource"("sourceId");

CREATE UNIQUE INDEX "ResearchEvidence_projectId_sourceId_fingerprint_key" ON "ResearchEvidence"("projectId", "sourceId", "fingerprint");
CREATE INDEX "ResearchEvidence_projectId_idx" ON "ResearchEvidence"("projectId");
CREATE INDEX "ResearchEvidence_sourceId_idx" ON "ResearchEvidence"("sourceId");

CREATE INDEX "ResearchFinding_projectId_status_idx" ON "ResearchFinding"("projectId", "status");
CREATE INDEX "ResearchFinding_updatedAt_idx" ON "ResearchFinding"("updatedAt");

CREATE INDEX "ResearchFindingEvidence_evidenceId_idx" ON "ResearchFindingEvidence"("evidenceId");

CREATE INDEX "ResearchDecision_projectId_createdAt_idx" ON "ResearchDecision"("projectId", "createdAt");
CREATE INDEX "ResearchDecision_findingId_idx" ON "ResearchDecision"("findingId");
CREATE INDEX "ResearchDecision_actorId_idx" ON "ResearchDecision"("actorId");

CREATE UNIQUE INDEX "ResearchJob_projectId_type_inputFingerprint_key" ON "ResearchJob"("projectId", "type", "inputFingerprint");
CREATE INDEX "ResearchJob_projectId_status_idx" ON "ResearchJob"("projectId", "status");
CREATE INDEX "ResearchJob_sourceId_idx" ON "ResearchJob"("sourceId");

ALTER TABLE "ResearchProjectSource"
ADD CONSTRAINT "ResearchProjectSource_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchProjectSource"
ADD CONSTRAINT "ResearchProjectSource_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResearchEvidence"
ADD CONSTRAINT "ResearchEvidence_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchEvidence"
ADD CONSTRAINT "ResearchEvidence_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResearchFinding"
ADD CONSTRAINT "ResearchFinding_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchFindingEvidence"
ADD CONSTRAINT "ResearchFindingEvidence_findingId_fkey"
FOREIGN KEY ("findingId") REFERENCES "ResearchFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchFindingEvidence"
ADD CONSTRAINT "ResearchFindingEvidence_evidenceId_fkey"
FOREIGN KEY ("evidenceId") REFERENCES "ResearchEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchDecision"
ADD CONSTRAINT "ResearchDecision_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchDecision"
ADD CONSTRAINT "ResearchDecision_findingId_fkey"
FOREIGN KEY ("findingId") REFERENCES "ResearchFinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResearchDecision"
ADD CONSTRAINT "ResearchDecision_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResearchJob"
ADD CONSTRAINT "ResearchJob_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchJob"
ADD CONSTRAINT "ResearchJob_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
