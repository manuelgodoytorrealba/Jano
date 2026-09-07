# JANO Wave 002 — Final Canonical Apply

Wave 002 human review completed with 95 logical decisions over 97 raw proposals. The canonical apply ran against the local JANO database only.

## Result

- 11 new entities created
- 9 existing entities resolved in review lineage
- 16 canonical assertions created
- 3 provenance-only assertion augmentations
- 0 relations created
- 16 SourceRefs and 16 citations created by the promotion service
- Canonical counts: entities 813→824, relations 1388→1388, assertions 24→40
- SourceRefs 850→866, citations 1411→1427

The exact apply and idempotency artifacts are `artifacts/feed-wave-002-final-apply-result.json` and `artifacts/feed-wave-002-idempotency-result.json`. Coverage is recorded in `artifacts/feed-wave-002-post-coverage.json`.

The second identical apply created zero entities, relations, assertions, SourceRefs or citations. Rejected, deferred, mismatched and unextracted items were excluded. Public API smoke tests found the new entities and did not expose private ResearchEvidence; the public entity DTO currently does not include canonical assertion arrays, so assertion retrieval was verified through the canonical database/read model.
