-- Convert promotion-oriented Claim metadata into private editorial state.
ALTER TYPE "ResearchClaimKind" RENAME VALUE 'SUBJECT_CANDIDATE' TO 'ASSERTION';
CREATE TYPE "ResearchClaimStatus" AS ENUM ('DRAFT', 'SUPPORTED', 'QUESTIONED', 'CONTRADICTED');
ALTER TABLE "ResearchClaim" ADD COLUMN "status" "ResearchClaimStatus" NOT NULL DEFAULT 'DRAFT';
UPDATE "ResearchClaim" SET "status" = CASE WHEN "readyForPromotion" THEN 'SUPPORTED'::"ResearchClaimStatus" ELSE 'DRAFT'::"ResearchClaimStatus" END;
DROP INDEX "ResearchClaim_projectId_readyForPromotion_idx";
ALTER TABLE "ResearchClaim" DROP COLUMN "readyForPromotion";
