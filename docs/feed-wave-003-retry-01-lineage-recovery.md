# Wave 003 RETRY_01 — Target/Source lineage recovery

The loss point was the retry driver’s target filter. Selection and discovery did not persist target IDs, and the driver only considered `SourceRef` targets that happened to be in the 120-target set. Forty-two prepared Sources were therefore marked unresolved despite 41 having explicit existing SourceRef lineage.

Recovery reused all 48 prepared materials. It recovered 38 single-target SourceRef lineage sources and 9 multi-target lineage sources (67 unique target×Source pairs after retaining the original 7). One prepared Source had no SourceRef and remains unresolved. No discovery or selection target metadata existed, so exact A/B lineage could not be reconstructed.

The retry processed 67/67 eligible unique pairs, with 60 new semantic calls and 20 cache hits. Retry Evidence totals 32 (the three Attempt-1 diagnostic records remain excluded). Ten Sources produced KEEP evidence; claims/entity/relation proposal generation remains 0 because this recovery only runs the frozen semantic stage and preserves human review gating.

Canonical data was not mutated. The driver now deduplicates SourceRefs by entity and records pairing reason/confidence in the checkpoint. The regression fixture `backend/api/scripts/wave003-target-source-lineage.fixture.test.cjs` passes for single target, multi-target, unrelated-target exclusion, missing lineage, and resume deduplication.
