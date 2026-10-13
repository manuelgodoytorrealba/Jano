-- Research decisions may preserve their audit record after a target is deleted
-- (`ON DELETE SET NULL`), but they must never address a legacy finding and a
-- claim simultaneously.
ALTER TABLE "ResearchDecision"
  ADD CONSTRAINT "ResearchDecision_at_most_one_target"
  CHECK (num_nonnulls("findingId", "claimId") <= 1)
  NOT VALID;

ALTER TABLE "ResearchDecision"
  VALIDATE CONSTRAINT "ResearchDecision_at_most_one_target";
