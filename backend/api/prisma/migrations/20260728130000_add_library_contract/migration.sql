CREATE TYPE "LibraryMaterialKind" AS ENUM ('TEXT', 'URL', 'PDF', 'IMAGE', 'MAP', 'BOOK', 'FILE');
CREATE TYPE "LibraryMaterialVersionStatus" AS ENUM ('READY', 'PENDING_PREPARATION', 'FAILED');

CREATE TABLE "LibraryMaterial" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "kind" "LibraryMaterialKind" NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibraryMaterial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LibraryMaterialVersion" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "LibraryMaterialVersionStatus" NOT NULL DEFAULT 'READY',
    "content" TEXT,
    "url" TEXT,
    "storageKey" TEXT,
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibraryMaterialVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LibraryExcerpt" (
    "id" TEXT NOT NULL,
    "materialVersionId" TEXT NOT NULL,
    "locator" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibraryExcerpt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResearchLibraryMaterial" (
    "projectId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchLibraryMaterial_pkey" PRIMARY KEY ("projectId", "materialId")
);

CREATE UNIQUE INDEX "LibraryMaterialVersion_materialId_version_key" ON "LibraryMaterialVersion"("materialId", "version");
CREATE INDEX "LibraryMaterial_sourceId_idx" ON "LibraryMaterial"("sourceId");
CREATE INDEX "LibraryMaterialVersion_materialId_createdAt_idx" ON "LibraryMaterialVersion"("materialId", "createdAt");
CREATE UNIQUE INDEX "LibraryExcerpt_materialVersionId_fingerprint_key" ON "LibraryExcerpt"("materialVersionId", "fingerprint");
CREATE INDEX "LibraryExcerpt_materialVersionId_idx" ON "LibraryExcerpt"("materialVersionId");
CREATE INDEX "ResearchLibraryMaterial_materialId_idx" ON "ResearchLibraryMaterial"("materialId");

ALTER TABLE "LibraryMaterial" ADD CONSTRAINT "LibraryMaterial_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryMaterialVersion" ADD CONSTRAINT "LibraryMaterialVersion_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "LibraryMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryExcerpt" ADD CONSTRAINT "LibraryExcerpt_materialVersionId_fkey" FOREIGN KEY ("materialVersionId") REFERENCES "LibraryMaterialVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchLibraryMaterial" ADD CONSTRAINT "ResearchLibraryMaterial_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchLibraryMaterial" ADD CONSTRAINT "ResearchLibraryMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "LibraryMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
