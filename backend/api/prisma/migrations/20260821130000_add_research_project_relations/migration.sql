CREATE TABLE "ResearchProjectRelation" (
    "projectId" TEXT NOT NULL,
    "relatedProjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchProjectRelation_pkey" PRIMARY KEY ("projectId","relatedProjectId")
);

CREATE INDEX "ResearchProjectRelation_relatedProjectId_idx" ON "ResearchProjectRelation"("relatedProjectId");

ALTER TABLE "ResearchProjectRelation"
ADD CONSTRAINT "ResearchProjectRelation_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchProjectRelation"
ADD CONSTRAINT "ResearchProjectRelation_relatedProjectId_fkey"
FOREIGN KEY ("relatedProjectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
