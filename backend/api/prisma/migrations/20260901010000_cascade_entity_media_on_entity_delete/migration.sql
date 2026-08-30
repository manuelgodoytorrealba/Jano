ALTER TABLE "EntityMedia"
DROP CONSTRAINT "EntityMedia_entityId_fkey";

ALTER TABLE "EntityMedia"
ADD CONSTRAINT "EntityMedia_entityId_fkey"
FOREIGN KEY ("entityId") REFERENCES "Entity"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
