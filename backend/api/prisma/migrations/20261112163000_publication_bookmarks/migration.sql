CREATE TABLE "SavedResearchPublication" (
  "userId" TEXT NOT NULL,
  "researchId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedResearchPublication_pkey" PRIMARY KEY ("userId", "researchId"),
  CONSTRAINT "SavedResearchPublication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SavedResearchPublication_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SavedResearchPublication_researchId_idx" ON "SavedResearchPublication"("researchId");
CREATE TABLE "CollectionResearchPublication" (
  "collectionId" TEXT NOT NULL,
  "researchId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectionResearchPublication_pkey" PRIMARY KEY ("collectionId", "researchId"),
  CONSTRAINT "CollectionResearchPublication_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CollectionResearchPublication_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CollectionResearchPublication_researchId_idx" ON "CollectionResearchPublication"("researchId");
