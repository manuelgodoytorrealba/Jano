-- Abort before destructive DDL if an environment has not completed the canonical backfill.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Relation" WHERE "relationTypeId" IS NULL) THEN
    RAISE EXCEPTION 'Relation cutover blocked: relationTypeId backfill is incomplete';
  END IF;
END $$;

ALTER TABLE "Relation" DROP CONSTRAINT "Relation_relationTypeId_fkey";
DROP INDEX "Relation_type_idx";

ALTER TABLE "Relation"
  ALTER COLUMN "relationTypeId" SET NOT NULL,
  DROP COLUMN "type";

ALTER TABLE "Relation"
  ADD CONSTRAINT "Relation_relationTypeId_fkey"
  FOREIGN KEY ("relationTypeId") REFERENCES "RelationType"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
