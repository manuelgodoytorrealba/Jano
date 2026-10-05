# Entity enrichment — movements batch 001

## Scope

This batch enriches the first 20 published `MOVEMENT` entities that were missing their base editorial fields. Selection is alphabetical and limited to records with an empty `Entity.summary` or `Entity.content`.

## Changes

- Added tailored Spanish summaries and essays to `Entity.summary` and `Entity.content`.
- Added bilingual `shortDescription`, `essay` and `excerpt` values to `EntityTranslation` for `es` and `en`.
- Preserved the movement English essays already present when writing the base editorial fields.
- Added catalogue relationship context to each new essay.
- Wrote the transactional recovery artifact to `artifacts/editorial-recovery/entity-enrichment-movements-batch-001.json`.

## Selection

`arquitectura-moderna`, `arte-africano`, `arte-andino`, `arte-bizantino`, `arte-chino`, `arte-conceptual`, `arte-performance`, `arte-egipcio`, `arte-griego`, `arte-indio`, `arte-islamico`, `arte-maya`, `arte-mesopotamico`, `arte-mexica`, `arte-romano`, `arte-rupestre`, `art-nouveau`, `arts-and-crafts`, `barroco`, `bauhaus-movement`.

## Verification

The script is idempotent and runs in a single database transaction. After execution, the remaining published movements with missing base editorial fields are the next alphabetical batch.
