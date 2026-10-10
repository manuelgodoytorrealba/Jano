# Entity enrichment — movements batch 080

## Scope

This batch enriches the 9 published `MOVEMENT` entities missing their base editorial fields.

## Changes

- Added tailored Spanish summaries and essays to `Entity.summary` and `Entity.content`.
- Added bilingual `shortDescription`, `essay` and `excerpt` values for Spanish and English translations.
- Added catalogue relationship context to each essay.
- Wrote the transactional recovery artifact to `artifacts/editorial-recovery/entity-enrichment-movements-batch-080.json`.

## Verification

The script is idempotent and runs in one database transaction. This batch closes the published movement base-enrichment queue.
