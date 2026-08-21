-- CreateTable
CREATE TABLE "EntityTypeFieldDefinition" (
    "id" TEXT NOT NULL,
    "entityTypeKey" TEXT NOT NULL,
    "attributeDefinitionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityTypeFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntityTypeFieldDefinition_entityTypeKey_sortOrder_idx" ON "EntityTypeFieldDefinition"("entityTypeKey", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "EntityTypeFieldDefinition_entityTypeKey_attributeDefinition_key" ON "EntityTypeFieldDefinition"("entityTypeKey", "attributeDefinitionId");

-- AddForeignKey
ALTER TABLE "EntityTypeFieldDefinition" ADD CONSTRAINT "EntityTypeFieldDefinition_entityTypeKey_fkey" FOREIGN KEY ("entityTypeKey") REFERENCES "EntityTypeDefinition"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityTypeFieldDefinition" ADD CONSTRAINT "EntityTypeFieldDefinition_attributeDefinitionId_fkey" FOREIGN KEY ("attributeDefinitionId") REFERENCES "AttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
