ALTER TABLE "ResearchDraft" ADD COLUMN "workingContent" TEXT NOT NULL DEFAULT '';

UPDATE "ResearchDraft" AS draft
SET "workingContent" = revision."content"
FROM "ResearchDraftRevision" AS revision
WHERE revision."id" = draft."currentRevisionId";
