ALTER TABLE "ResearchProject"
  ADD COLUMN "ownerId" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedById" TEXT;

UPDATE "ResearchProject"
SET "ownerId" = 'cmql51zbl00yidhfpn3896nr7'
WHERE "id" IN (
  'cmrchhhds0000tnfpqncamwew',
  'cmret9pk80000i9fpur5sent0',
  'cms2yiaim00005ifp0anjx9jx',
  'cms31jbyr0003t7fplpd1fcx4'
) AND "ownerId" IS NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "ResearchProject" WHERE "ownerId" IS NULL) THEN
    RAISE EXCEPTION 'Research ownership backfill incomplete';
  END IF;
END $$;

ALTER TABLE "ResearchProject"
  ALTER COLUMN "ownerId" SET NOT NULL,
  ADD CONSTRAINT "ResearchProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "ResearchProject_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL;
