# Hybrid Semantic Evidence Classification

## Why Deterministic V2 Plateaued

Deterministic V2 is intentionally safety-first. It can reject structured references, chrome and promotional blocks, but it relies on lexical subject/verb detection to find a proposition. The final validation therefore produced 0 automatic KEEP despite 3 gold KEEP cases. This is a recall/semantic-understanding limitation, not an ingestion or provenance failure.

## Frozen Evaluation Corpus

The unified corpus combines the frozen Pilot 1, Pilot 2, Pilot 3 and Pilot 4 artifacts, deduplicated by Source title + exact excerpt text. It contains 51 unique excerpts:

- Gold KEEP: 16
- Gold REVIEW: 14
- Gold REJECT: 18
- Source purposes: DOCUMENTARY_TEXT 13, EDITORIAL_REFERENCE 13, GENERAL_REFERENCE 24, STRUCTURED_REFERENCE 1

No new Sources were processed and no essays were generated.

## Hybrid Architecture

```text
deterministic safety gates
        ↓
provider-neutral semantic classifier
        ↓
deterministic proposition + support-span validation
        ↓
KEEP / REVIEW / REJECT
```

Hard deterministic rejection cannot be bypassed. Semantic KEEP with deterministic uncertainty is downgraded to REVIEW. A KEEP requires a valid proposition, exact support span and provenance.

## Semantic Provider Contract

Added `HybridSemanticEvidenceClassifier` and `AIProviderSemanticEvidenceModel`. The model receives only Source purpose/minimal metadata, the real excerpt, candidate entity and optional relation context. Its closed output includes role, proposition, confidence, decision, reason and `supportSpan {start,end,text}`. It uses the existing `AIProviderPort` and `AI_PROVIDER`/`AI_MODEL`; no provider is embedded in the domain.

Modes are available:

- `DETERMINISTIC_ONLY`
- `SEMANTIC_ONLY` (benchmark mode; safety validation still applies)
- `HYBRID`

## Proposition Entailment

The semantic layer never supplies background knowledge. The deterministic validator remains the veto for dates, causality, intention, interpretation, unsupported identity and metadata-dump propositions. A semantic KEEP with an invalid proposition becomes REVIEW.

## Support Span Validation

`supportSpan` must be an exact substring of the excerpt. Missing or mismatched spans cannot produce KEEP. Existing excerpt-level provenance remains attached to the span.

## Structured Fact Path

`STRUCTURED_REFERENCE` remains separate from editorial Evidence:

```text
structured record → field/value fact candidate → provenance → review/promotion
documentary span  → proposition → editorial Evidence → review/promotion
```

Structured references can support canonical facts, but never paragraph-style editorial Evidence automatically.

## Deterministic vs Semantic vs Hybrid

The real semantic runtime is **NOT_EXECUTED**. `AI_PROVIDER=noop` in the development environment and no model was installed or called. Deterministic evaluation over the unified corpus is available; semantic and hybrid metrics are intentionally absent rather than fabricated. Fixture-backed tests validate the provider-neutral contract and hard-gate behaviour.

Deterministic baseline over the 51 unique excerpts: KEEP precision 90.0% (9/10), recall 56.3% (9/16), REVIEW rate 23.5%, REJECT rate 56.9%, false KEEP 1, false REJECT 4, overall agreement 56.9%. The remaining false KEEP is historical Pilot 3 data whose stored purpose predates the V2 structured-reference derivation; it is retained in the corpus as a regression and must be reassembled with current purpose metadata before claiming a V2 score.

## B-02 Reassessment

B-02 is **CLOSED**. The existing Research workflow was demonstrated independently of classifier origin: private Evidence, explicit review, Finding Proposal, ResearchClaim conversion, provenance retention, canonical snapshot equality, publication representation and restoration. There is no architectural reason to keep it open merely because Pilot 4 produced no automatic KEEP.

## Readiness Breakdown

| Dimension                     | Score | Status       | Evidence                                                                  |
| ----------------------------- | ----: | ------------ | ------------------------------------------------------------------------- |
| SAFETY_READINESS              |    88 | STRONG       | Hard gates, provenance checks, no canonical mutation, rollback tests.     |
| SEMANTIC_AUTOMATION_READINESS |    45 | BLOCKED      | Deterministic recall plateau; real semantic runtime not tested.           |
| BATCH_OPERATION_READINESS     |    82 | STRONG       | Material/Version/Excerpt/Evidence idempotency and retry behaviour tested. |
| CANONICAL_PROMOTION_READINESS |    86 | STRONG       | Explicit Research review/promotion and restoration demonstrated.          |
| OVERALL_PIPELINE_READINESS    |    68 | CONSERVATIVE | Semantic automation remains unvalidated; no score inflation.              |

The system is not blocked because it is unsafe in its current deterministic mode; it is blocked because it is too conservative and lacks a measured semantic runtime.

## Blocker History

- **B-01 semantic precision — OPEN.** First detected Pilot 2. Deterministic safety is strong, but unified corpus contains a historical false KEEP and semantic runtime is untested. Exit: provider-neutral semantic/hybrid evaluation with high KEEP precision and no HIGH/CRITICAL false KEEP.
- **B-02 review/promotion — CLOSED.** First detected Pilot 2. Closed by independent review/proposal/promotion/restoration exercise; canonical snapshot unchanged.
- **B-03 promotional/chrome — CLOSED.** First detected Pilot 1. Hard fragment-level gate and regressions.
- **B-04 ingestion idempotency — CLOSED.** First detected Pilot 3. Same-batch rerun produced no duplicate Materials, Versions, Excerpts, Evidence or associations.
- **B-05 structured-reference gating — CLOSED.** First detected Pilot 3. General purpose derivation and structured-reference hard gate validated by Donald Judd-style record.
- **B-06 semantic runtime untested — NEW.** No configured provider/model was executed. Exit: explicitly run one fixed provider/model comparison on the frozen corpus, with latency/failure/token telemetry.

## Distance To Stage 1

Major steps: **2**

1. Execute a real semantic provider in one controlled comparison on the frozen corpus.
2. Validate Hybrid KEEP precision, propositions and review load; retain deterministic hard vetoes.

Stage 1 should not require every batch to produce KEEP, but its evaluation corpus must contain enough gold KEEP cases to estimate safety.

## Distance To 100 Sources

Major steps: **3**

1. Pass Stage 1 semantic gate.
2. Run the controlled 100-Source batch with review metrics.
3. Verify rollback/idempotency under batch load.

## Distance To Full Seed Dry Run

Major steps: **5**

1. Real semantic provider validation.
2. Stage 1.
3. 100-Source batch.
4. Larger-batch validation (approximately 250).
5. Full-seed dry run with adaptive editorial depth.

## Distance To Full Apply

Major steps: **6**

1. Complete semantic validation.
2. Pass Stage 1.
3. Pass 100-Source batch.
4. Pass larger-batch validation.
5. Pass full-seed dry run and review-load gate.
6. Explicit promotion/apply with rollback and no automatic canonical mutation.

## Recommendation

**TEST_REAL_SEMANTIC_PROVIDER**

Do not add more deterministic heuristics or run another pilot yet. The next action should be a single provider/model evaluation against this exact frozen corpus, with the provider recorded as configuration (`AI_PROVIDER`, `AI_MODEL`) and no model installation performed automatically.

## Files Changed

- `backend/api/src/research/hybrid-semantic-evidence-classifier.ts`
- `backend/api/src/research/hybrid-semantic-evidence-classifier.spec.ts`
- `backend/api/scripts/hybrid-semantic-evidence-eval.ts`
- `backend/api/package.json`
- `artifacts/hybrid-semantic-evidence-eval.json`

## Verification

3 test suites, 11 tests passed, including structured-reference hard rejection, support/proposition validation, hybrid downgrade behaviour and material identity/version idempotency. No semantic model was executed.
