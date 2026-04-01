-- CreateEnum
CREATE TYPE "MediaOriginType" AS ENUM ('EXTERNAL_URL', 'UPLOAD', 'INGESTED');

-- AlterTable
ALTER TABLE "Media"
ADD COLUMN     "originType" "MediaOriginType" NOT NULL DEFAULT 'EXTERNAL_URL',
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "originalFilename" TEXT,
ADD COLUMN     "fileSize" INTEGER;
