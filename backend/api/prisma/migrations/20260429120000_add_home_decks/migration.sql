-- CreateTable
CREATE TABLE "HomeDeck" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "ctaRoute" TEXT,
    "imageUrl" TEXT,
    "imageMediaId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeDeckItem" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeDeckItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeDeck_slug_key" ON "HomeDeck"("slug");

-- CreateIndex
CREATE INDEX "HomeDeck_isActive_sortOrder_idx" ON "HomeDeck"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "HomeDeck_imageMediaId_idx" ON "HomeDeck"("imageMediaId");

-- CreateIndex
CREATE INDEX "HomeDeckItem_deckId_idx" ON "HomeDeckItem"("deckId");

-- CreateIndex
CREATE INDEX "HomeDeckItem_deckId_sortOrder_idx" ON "HomeDeckItem"("deckId", "sortOrder");

-- CreateIndex
CREATE INDEX "HomeDeckItem_entityId_idx" ON "HomeDeckItem"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeDeckItem_deckId_entityId_key" ON "HomeDeckItem"("deckId", "entityId");

-- AddForeignKey
ALTER TABLE "HomeDeck" ADD CONSTRAINT "HomeDeck_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeDeckItem" ADD CONSTRAINT "HomeDeckItem_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "HomeDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeDeckItem" ADD CONSTRAINT "HomeDeckItem_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
