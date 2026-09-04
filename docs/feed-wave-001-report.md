# JANO Knowledge Feed Mode V1 — Wave 001

## Strategy

Wave 001 selected 50 existing entities from deterministic Coverage V1 and the Research Queue, with caps by entity type to avoid a single famous cluster dominating the cohort. It reused the frozen acquisition, Evidence, extraction, Target Router V1, Identity Resolution V1, semantic cache, checkpointing and human-review boundaries.

The wave stops at human review. Nothing was promoted to canonical knowledge and no editorial content was regenerated.

## Selection and sources

- Existing entities selected: 50
- Sources selected/acquired/prepared: 50 / 50 / 50
- Documentary-effective Sources: 13
- Prepared but non-effective Sources: 37 (mostly visual or low-substance pages)
- Private excerpts/Evidence units: 32
- Entity type mix: 8 concepts, 8 artworks, 8 places, 8 artists, 4 movements, 3 articles, 3 periods, 2 organizations, 4 people, 1 text and 1 event

## Semantic processing

- AI executions across initial pass, retries and final idempotency rerun: 52
- Actual model requests: 23
- Cached executions: 30
- Stable semantic cache results: 13
- Final failed jobs: 0
- Actual model compute/failed-request time: 1,159,999 ms (19m 20s)
- All 13 effective Source jobs completed within the configured maximum of three attempts

The first pass exposed transient 60-second transport timeouts. The existing retry/checkpoint contract recovered every Source. The exact rerun reused cached results in milliseconds and did not duplicate proposals.

## Human review packet

- Total pending proposals: 80
- Knowledge assertions: 23
- Entity proposals: 34
- Relation proposals: 23
- Human decisions recorded: 0
- Target confirmed: 2
- Multi-entity valid: 19
- Target review required: 13 (4 ambiguous, 3 mismatch, 6 not entity-centered)
- Identity resolution: 4 existing entities, 30 high-confidence new-entity proposals
- Wrong-target proposals made promotion-ready: 0

The real queue includes potentially valuable nodes such as Nancy Spero, Ana Mendieta, Ai Qing, Louis Vauxcelles, Body Art and Iglesia de Santo Tomé. It also includes low-value tourism or generic candidates from one broad Madrid Source. Those remain private and human-gated; this is P2 operating debt in Source selection/review load, not a canonical-integrity blocker.

## Coverage preview

Current deterministic coverage remains 771 WEAK, 33 ADEQUATE and 1 STRONG across 805 entities, with 117 graph orphans and a Research Queue of 804. Approval could add documentary depth to up to 13 selected entities. This is a projection only; private proposals do not affect canonical coverage.

## Verification

- Knowledge Operations authenticated dashboard displayed 805 entities, 1,388 relations, 590 Sources, queue size 804, 34 entity proposals and 23 relation proposals.
- Research Studio opened the Wave 001 project and displayed its 13 corpus materials, 34 pending entity candidates, Evidence quote/context, Source provenance, possible-existing-entity selector, suggested relations and human decision controls.
- Public entity APIs for Pablo Picasso, Cubismo, El nacimiento de Venus and Arte conceptual returned HTTP 200 with zero private-field leakage.
- Canonical counts remained unchanged: 805 entities, 1,388 relations, 838 SourceRefs, 1,399 Citations and 7 CanonicalAssertions.

## Risks / limitations

- Only 13 of 50 Sources were documentary-effective. Future waves should favor substantive institutional essays over visual-provenance and broad visitor pages.
- Identity proposals can remain `NEW_ENTITY_HIGH_CONFIDENCE` when a canonical entity has a different domain type; the existing mandatory review/resolve-to-existing control prevents automatic duplication. Treat as P2 unless observed to bypass review.
- Claim and relation candidates still require human semantic-deduplication and endpoint review; projected growth is an upper bound.

## Suggested next step

Review the 80 private items in Knowledge Operations/Research Studio. Prioritize the 21 target-confirmed or multi-entity-valid entity candidates, reroute or defer the 13 targeting-review items, then explicitly approve only grounded assertions/entities/relations. Do not start Wave 002 until those decisions are applied and Coverage is recomputed.
