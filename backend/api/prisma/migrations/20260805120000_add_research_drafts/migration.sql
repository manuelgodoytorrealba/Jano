CREATE TABLE "ResearchDraft" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT,
    "currentRevisionId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResearchDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResearchDraftRevision" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchDraftRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResearchDraft_currentRevisionId_key" ON "ResearchDraft"("currentRevisionId");
CREATE INDEX "ResearchDraft_projectId_sectionId_updatedAt_idx" ON "ResearchDraft"("projectId", "sectionId", "updatedAt");
CREATE INDEX "ResearchDraft_sectionId_archivedAt_idx" ON "ResearchDraft"("sectionId", "archivedAt");
CREATE UNIQUE INDEX "ResearchDraftRevision_draftId_number_key" ON "ResearchDraftRevision"("draftId", "number");
CREATE INDEX "ResearchDraftRevision_draftId_createdAt_idx" ON "ResearchDraftRevision"("draftId", "createdAt");
CREATE INDEX "ResearchDraftRevision_authorId_idx" ON "ResearchDraftRevision"("authorId");

ALTER TABLE "ResearchDraft" ADD CONSTRAINT "ResearchDraft_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchDraft" ADD CONSTRAINT "ResearchDraft_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "ResearchOutlineSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchDraftRevision" ADD CONSTRAINT "ResearchDraftRevision_draftId_fkey"
FOREIGN KEY ("draftId") REFERENCES "ResearchDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchDraftRevision" ADD CONSTRAINT "ResearchDraftRevision_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResearchDraft" ADD CONSTRAINT "ResearchDraft_currentRevisionId_fkey"
FOREIGN KEY ("currentRevisionId") REFERENCES "ResearchDraftRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
