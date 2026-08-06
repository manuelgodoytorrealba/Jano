CREATE TYPE "ResearchAssistantMessageRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "ResearchAssistantThread" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResearchAssistantThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResearchAssistantMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "role" "ResearchAssistantMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResearchAssistantMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResearchAssistantThread_projectId_sectionId_key" ON "ResearchAssistantThread"("projectId", "sectionId");
CREATE INDEX "ResearchAssistantThread_sectionId_updatedAt_idx" ON "ResearchAssistantThread"("sectionId", "updatedAt");
CREATE INDEX "ResearchAssistantMessage_threadId_createdAt_idx" ON "ResearchAssistantMessage"("threadId", "createdAt");
ALTER TABLE "ResearchAssistantThread" ADD CONSTRAINT "ResearchAssistantThread_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchAssistantThread" ADD CONSTRAINT "ResearchAssistantThread_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ResearchOutlineSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchAssistantMessage" ADD CONSTRAINT "ResearchAssistantMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ResearchAssistantThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
