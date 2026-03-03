/*
  Warnings:

  - You are about to drop the column `metadata` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Relation` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ContentLevel" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE');

-- CreateEnum
CREATE TYPE "MediaRole" AS ENUM ('PRIMARY');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('BOOK', 'ARTICLE', 'WEBSITE', 'CATALOG', 'PAPER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntityType" ADD VALUE 'PERIOD';
ALTER TYPE "EntityType" ADD VALUE 'PLACE';

-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "metadata",
ADD COLUMN     "contentLevel" "ContentLevel",
ADD COLUMN     "status" "EntityStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Relation" DROP COLUMN "note",
ADD COLUMN     "justification" TEXT;

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
    "alt" TEXT,
    "source" TEXT,
    "photoBy" TEXT,
    "license" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityMedia" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "role" "MediaRole" NOT NULL DEFAULT 'PRIMARY',

    CONSTRAINT "EntityMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "author" TEXT,
    "title" TEXT NOT NULL,
    "publisher" TEXT,
    "year" INTEGER,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRef" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "page" TEXT,
    "quote" TEXT,
    "note" TEXT,

    CONSTRAINT "SourceRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuratorNote" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuratorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contributor" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "Contributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtworkDetails" (
    "entityId" TEXT NOT NULL,
    "authorNation" TEXT,
    "technique" TEXT,
    "materials" TEXT,
    "dimensions" TEXT,
    "location" TEXT,
    "collection" TEXT,
    "state" TEXT,

    CONSTRAINT "ArtworkDetails_pkey" PRIMARY KEY ("entityId")
);

-- CreateTable
CREATE TABLE "ArtistDetails" (
    "entityId" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "birthYear" INTEGER,
    "deathYear" INTEGER,
    "disciplines" TEXT,
    "bioShort" TEXT,
    "links" TEXT,

    CONSTRAINT "ArtistDetails_pkey" PRIMARY KEY ("entityId")
);

-- CreateTable
CREATE TABLE "ConceptDetails" (
    "entityId" TEXT NOT NULL,
    "definition" TEXT,

    CONSTRAINT "ConceptDetails_pkey" PRIMARY KEY ("entityId")
);

-- CreateTable
CREATE TABLE "PeriodDetails" (
    "entityId" TEXT NOT NULL,
    "definition" TEXT,

    CONSTRAINT "PeriodDetails_pkey" PRIMARY KEY ("entityId")
);

-- CreateIndex
CREATE INDEX "EntityMedia_entityId_idx" ON "EntityMedia"("entityId");

-- CreateIndex
CREATE INDEX "EntityMedia_mediaId_idx" ON "EntityMedia"("mediaId");

-- CreateIndex
CREATE INDEX "SourceRef_entityId_idx" ON "SourceRef"("entityId");

-- CreateIndex
CREATE INDEX "SourceRef_sourceId_idx" ON "SourceRef"("sourceId");

-- CreateIndex
CREATE INDEX "CuratorNote_entityId_idx" ON "CuratorNote"("entityId");

-- CreateIndex
CREATE INDEX "Contributor_entityId_idx" ON "Contributor"("entityId");

-- AddForeignKey
ALTER TABLE "EntityMedia" ADD CONSTRAINT "EntityMedia_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityMedia" ADD CONSTRAINT "EntityMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRef" ADD CONSTRAINT "SourceRef_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRef" ADD CONSTRAINT "SourceRef_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuratorNote" ADD CONSTRAINT "CuratorNote_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contributor" ADD CONSTRAINT "Contributor_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkDetails" ADD CONSTRAINT "ArtworkDetails_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistDetails" ADD CONSTRAINT "ArtistDetails_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptDetails" ADD CONSTRAINT "ConceptDetails_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodDetails" ADD CONSTRAINT "PeriodDetails_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
