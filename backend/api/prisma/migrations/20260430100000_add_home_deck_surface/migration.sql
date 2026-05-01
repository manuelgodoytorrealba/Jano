-- CreateEnum
CREATE TYPE "HomeDeckSurface" AS ENUM ('HOME', 'RECOMMENDED');

-- AlterTable
ALTER TABLE "HomeDeck" ADD COLUMN "surface" "HomeDeckSurface" NOT NULL DEFAULT 'HOME';

-- DropIndex
DROP INDEX IF EXISTS "HomeDeck_isActive_sortOrder_idx";

-- CreateIndex
CREATE INDEX "HomeDeck_surface_isActive_sortOrder_idx" ON "HomeDeck"("surface", "isActive", "sortOrder");
