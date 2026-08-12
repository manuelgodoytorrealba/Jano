CREATE TYPE "UserDiscoverySignalKind" AS ENUM ('SEARCH_SUBMITTED');

CREATE TABLE "UserDiscoverySignal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "UserDiscoverySignalKind" NOT NULL,
  "query" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserDiscoverySignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserDiscoverySignal_userId_kind_createdAt_idx"
  ON "UserDiscoverySignal"("userId", "kind", "createdAt");

ALTER TABLE "UserDiscoverySignal"
  ADD CONSTRAINT "UserDiscoverySignal_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
