# Semantic Evidence Classifier — frozen Pilot 1 + Pilot 2

## Metric Correction

`ACCEPTANCE_RATE` is predicted KEEP / all evaluated cases; it is not precision. `CLASSIFIER_PRECISION` is true KEEP predictions / all automatic KEEP predictions against an independent gold set. `CLASSIFIER_RECALL` is true KEEP predictions / all gold KEEP cases. `REVIEW_RATE` and `REJECT_RATE` are predicted REVIEW and REJECT proportions. The previous `KEEP/(KEEP+REJECT)` label has been removed from this evaluation.

## Gold Dataset

The frozen artifacts contain 19 Pilot 1 excerpts and 8 Pilot 2 excerpts. Gold labels are a separate, hand-authored QA fixture in `src/research/semantic-evidence-gold.ts`, with decision, role, strict proposition (or null), dimension and rationale. They are not produced by the classifier. Gold totals are 11 KEEP, 9 REVIEW and 7 REJECT. No database row or canonical entity was changed.

## Semantic Classifier Implementation

`DeterministicSemanticEvidenceClassifier` implements the provider-neutral contract. It receives only excerpt, source purpose/metadata, candidate entity and optional relation context. A high-precision deterministic pass rejects visual provenance, canonical-metadata-only sources, navigation/chrome, and fragments without an extractable factual span. Remaining text is classified using subject clarity, proposition extractability and purpose fit. There is also a `SemanticEvidenceProvider` interface for a future provider; no Ollama, Qwen or other model was called.

## Proposition Validation

KEEP requires a non-empty bounded statement, a supported dimension/evidence role and complete source/locator provenance. `validateEvidenceProposition` rejects missing or non-reconstructible statements and unsupported causal/intent wording. The current proposition is an excerpt sentence/span, not generated background knowledge. A future semantic provider must satisfy the same validator.

## Confidence Policy

HIGH requires clear subject, extractable factual span, compatible purpose and a proposition that names the candidate or is from a dedicated documentary source; only this band is KEEP-eligible. MEDIUM means useful factual text but unresolved subject/sufficiency and is REVIEW. LOW, incompatible purpose, noise or no proposition is REJECT. Confidence is therefore a combination of signals, not a free-standing numeric threshold.

## Pilot 1 Metrics

19 cases: predicted KEEP 8, REVIEW 1, REJECT 10. Gold: KEEP 11, REVIEW 4, REJECT 4. Acceptance rate 42.1%; classifier precision 87.5% (7/8); recall 63.6% (7/11); review rate 5.3%; reject rate 52.6%; overall agreement 57.9%. The single false KEEP is a Madrid Destino promotional fragment. False rejects are conservative misses in Picasso, Guernica, Cubism and Madrid fragments.

## Pilot 2 Metrics

8 cases: predicted KEEP 1, REVIEW 1, REJECT 6. Gold: KEEP 1, REVIEW 5, REJECT 2. Acceptance rate 12.5%; classifier precision 100% (1/1); recall 100% (1/1); review rate 12.5%; reject rate 75%; overall agreement 62.5%. The six rejects include navigation/listing material; one Louise Bourgeois and one Bayeux fragment remain gold REVIEW rather than automatic KEEP.

## Combined Confusion Matrix

| prediction \\ gold | KEEP | REVIEW | REJECT |
| ------------------ | ---: | -----: | -----: |
| KEEP               |    8 |      1 |      0 |
| REVIEW             |    0 |      2 |      0 |
| REJECT             |    4 |      6 |      6 |

27 cases: precision 88.9% (8/9), recall 66.7% (8/12), review rate 7.4%, overall agreement 59.3%. The matrix is a prediction-vs-independent-reference result, not an acceptance rate.

## False Keep Analysis

There is one false KEEP: a Madrid Destino promotional sentence whose source title happened to contain Madrid. This is the most serious error because it could enter a future promotion path. It demonstrates that source-purpose gating must be stricter for GENERAL_REFERENCE/promotional pages. There are ten false rejects (mostly documentary paragraphs whose first factual span is not yet extracted cleanly) and six unnecessary reviews only where the gold itself is REVIEW. No gold REJECT was auto-kept.

## Review Load Estimate

EXTRAPOLATED from 27 frozen excerpts, 100 similarly shaped Sources would yield approximately 8 KEEP, 7 REVIEW and 85 REJECT at the current excerpt yield. This is not a Source-level forecast: excerpt counts and source mix are unknown. Human review is therefore manageable in volume, but recall is currently too low for unattended acceptance.

## Retrieval Contract

Future canonical context assembly may consume only structured metadata with provenance, explicitly reviewed/accepted Evidence, relation evidence with its supporting fragment, and shared fragments that have passed the same review. Pending private `ResearchEvidence` is excluded. Rank by entity role (PRIMARY_SUBJECT/ABOUT before CONTEXT_FOR), dimension fit, source quality, provenance completeness and source diversity; deduplicate by fingerprint and cap the context budget. No vector database is required for this contract.

## Stage 1 Gate

STAGE_1_SMALL_BATCH_READY requires: KEEP precision ≥90% on independent frozen gold (with no more than one false KEEP per 20 predictions), provenance 100%, review rate ≤60% with a documented reviewer path, deterministic idempotence/rollback, zero canonical mutations, and stable gold fixtures. The combined precision is 88.9% with one false KEEP in nine predictions, so the gate does not pass. The implementation is usable for further validation, not for a 100-Source batch.

## Tests

Added deterministic classifier tests for incompatible purpose, chrome rejection, explicit proposition KEEP, ambiguity and proposition validation. Existing HTML-preparation tests continue to pass. Command: `node -r tsconfig-paths/register -r ts-node/register /srv/apps/jano/node_modules/jest/bin/jest.js --runInBand src/research/semantic-evidence-classifier.spec.ts src/library/library-material-preparation.service.spec.ts` — 2 suites, 6 tests passed. The evaluation is reproducible with `npm run foundational:semantic-evidence-classifier-eval` and writes the QA artifact `artifacts/semantic-evidence-classifier-eval.json`.

## Rollout Readiness

Previous: **63 / 100**
Current: **63 / 100**

The score is unchanged: code was added, but combined gold precision is below the Stage 1 exit criterion and recall/error analysis exposed remaining work.

Current Stage: **STAGE_0_EXPERIMENTAL**
Next Stage: **STAGE_1_SMALL_BATCH_READY**
Distance To Stage 1: one critical metric blocker (KEEP precision 88.9% < 90%), plus an unresolved review workflow and recall/fragment extraction gap.

Critical blockers open:

- **B-01** — Semantic KEEP precision below gate; false KEEP from promotional GENERAL_REFERENCE. Status OPEN. Exit: ≥90% independent precision with false KEEP root causes addressed.
- **B-02** — No exercised human Evidence review/promotion workflow. Status OPEN. Exit: review a held-out batch without canonical mutation and with rollback evidence.

Important blockers open:

- **B-03** — Proposition/span extraction misses valid documentary sentences. Status OPEN. Exit: improve recall without reducing precision on a new validation set.

Closed blockers: none in this change. New blockers: none.

Major steps remaining: **3**. Validation batches remaining: **2** (one held-out semantic validation, then the previously planned 100-Source batch). Knowledge coverage is unchanged; pipeline readiness is separate from entity editorial depth.

Estimated work remaining: **MEDIUM** (semantic precision fix, independent validation, then batch safety/review exercise).

## Path To Full Seed

1. Fix the false-KEEP purpose gate and span/proposition extraction; re-run against a newly held-out QA set.
2. Exercise the existing Research review/promotion path on a small batch with zero canonical mutations and tested rollback.
3. Run the approved 100-Source batch only after Stage 1 passes; measure review load and duplicate/idempotency behaviour.
4. Validate a larger batch (approximately 250) and then perform a full-seed dry run with adaptive editorial depth.
5. Apply only through explicit promotion; never auto-promote private Research evidence.

## Recommendation

**NEEDS_MORE_SEMANTIC_WORK.** The classifier now has an explicit, provider-neutral contract, strict propositions, independent gold labels and reproducible metrics. However, 88.9% KEEP precision and a documented false KEEP are below the conservative Stage 1 gate. Do not process 100 Sources yet.

## Files Changed

- `backend/api/src/research/semantic-evidence-classifier.ts`
- `backend/api/src/research/semantic-evidence-gold.ts`
- `backend/api/src/research/semantic-evidence-classifier.spec.ts`
- `backend/api/scripts/semantic-evidence-classifier-eval.ts`
- `backend/api/package.json`
- `artifacts/semantic-evidence-classifier-eval.json` (QA artifact only)

## Root Cause

Pilot 2’s 8/8 REVIEW was caused by the absence of a proposition-level semantic contract and conservative association decisions, not by HTTP ingestion. The earlier metric also conflated review outcomes with classifier precision.

## Implementation / Verification / Risks

The implementation is deterministic-first and provider-neutral; no production records, canonical entities, relations, promotions, new Sources or essays were touched. Main risk is recall: the current first-pass span extraction rejects valid paragraphs when their subject is implicit or mixed with image metadata. That is intentionally preferable to publishing unsupported Evidence until a held-out validation confirms an improvement.
