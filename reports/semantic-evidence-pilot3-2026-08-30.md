# Pilot 3 — independent micro-validation

## Frozen Classifier Version

Classifier version: `semantic-evidence-classifier-v2.1-frozen-micropilot`
Fingerprint: `5b3ff0f17820823fbea4a60a2df2492e46951cbe0e8ed1fd089b3cb1ec32fa88`

Frozen before ingestion/classification: purpose filters, HTML/noise filters, promotional-density rule, caption trimming, confidence policy, proposition validator, candidate-entity strategy and KEEP/REVIEW/REJECT thresholds. Predictions were persisted before gold review and no rule was changed after inspecting Pilot 3 content.

## Independent Micro-Pilot Dataset

Ten new Sources, none in Pilot 1/Pilot 2/DEV/previous holdout: Mannerism (Met), Mannerism (Smarthistory), El entierro del señor de Orgaz (Santo Tomé), its Prado collection record, Ai Weiwei/Sunflower Seeds (Tate), Ai Weiwei’s _1000 Years of Joys and Sorrows_, Cy Twombly authority record, Dan Flavin authority record, Shahzia Sikander artist site and Dana Schutz gallery record. This deliberately includes authoritative, scholarly, general-reference, institutional and probably poor cases; no pure visual-provenance candidate was selected.

Ingestion result: 10 found, 6 prepared, 15 excerpts, 12 legacy Evidence candidates. Failures were observed, not optimized: fetch failure, 403/manual acquisition, 404, and two pages with almost no editorial text.

## Blind Predictions

The frozen classifier predicted 1 KEEP, 5 REVIEW and 9 REJECT across 15 excerpts. The sole KEEP was a large Cy Twombly authority/metadata block; it was persisted as a prediction before gold review and is a serious failure, not silently corrected.

## Gold Review

Independent review labelled 1 KEEP, 4 REVIEW and 10 REJECT. The KEEP is a bounded contextual statement from the Ai Weiwei source about the symbolic status of sunflowers in Mao’s China. Church excerpts were CONTEXT_FOR rather than direct artwork evidence; authority records were rejected or sent to REVIEW because they are structured metadata rather than documentary prose.

## Validation Metrics

Pilot 3 has one predicted KEEP and it is false: `KEEP_PRECISION = 0/1 = 0%`. `KEEP_RECALL = 0/1 = 0%`. REVIEW rate 33.3%; REJECT rate 60%; false KEEP 1; false REJECT 1; overall agreement 46.7%.

| prediction \\ gold | KEEP | REVIEW | REJECT |
| ------------------ | ---: | -----: | -----: |
| KEEP               |    0 |      0 |      1 |
| REVIEW             |    0 |      1 |      2 |
| REJECT             |    1 |      1 |      6 |

Proposition accuracy is 0% for the one gold proposition because the only automatic KEEP proposition was not valid. Entity-role agreement is 40%. Supported-dimension accuracy is not estimable for this sample and is recorded as UNKNOWN rather than invented.

## False KEEP Analysis

The false KEEP is HIGH severity (not CRITICAL wording hallucination): a Wikidata-style Cy Twombly authority dump was accepted because the Source title matched the entity and the block contained lexical factual signals. Its proposition was effectively the entire metadata dump, not a coherent claim. Root cause: `SOURCE_PURPOSE_MISCLASSIFIED` / `STRUCTURED_REFERENCE_NOT_GATED`. This is general and must be fixed by classifying authority/structured-reference Sources as `CANONICAL_METADATA` (or equivalent) before semantic acceptance and by requiring a bounded span; no title/domain/entity exception is appropriate.

This HIGH false KEEP blocks Stage 1.

## Review / Promotion Workflow

The existing Research workflow was exercised in development using one Pilot 3 candidate: private `ResearchEvidence` → `ResearchFindingProposal` (`CLAIM`, initially `PENDING`) → explicit `REVIEWED` decision → `ResearchClaim` conversion → existing Research project publication representation. No private Evidence was exposed directly to the editorial generator. Because the micro-pilot had no gold KEEP accepted automatically, no unsafe Evidence was promoted as canonical knowledge.

## Canonical Mutation Audit

Before/after snapshots were captured for all canonical entities linked to Pilot 3. `canonicalMutated = false`: titles, summaries and timestamps were unchanged; no canonical relation was added or removed; no wikilink was generated. Publication changed only the Research project status and was then returned to `ARCHIVED`.

## Provenance Audit

All candidate records retain `sourceId`, LibraryMaterial/Version, excerpt locator and quote/fingerprint. The rejected Cy Twombly candidate demonstrates why provenance completeness alone is insufficient: provenance was present, but editorial relevance was not.

## Rollback / Restoration Test

The disposable development Research project was restored to `ARCHIVED`; the canonical snapshot before the exercise equals the snapshot after it. Pilot records can be removed by deleting project `cmtg5shkf0000absjdacomore` and its `[PILOT]` materials. This is restoration of the test state, not a claim that arbitrary canonical promotion is generally reversible.

## Idempotency Test

Proposal creation is idempotent (`resultFingerprint`, one proposal). Deterministic analysis is idempotent on replay. Ingestion is **not yet idempotent**: the current pilot `--apply` path creates a new `[PILOT]` LibraryMaterial on every rerun. No duplicate excerpt fingerprints appeared within this project, but this material-level behaviour is a real batch-safety blocker and was not changed after the classifier freeze.

## Estimated Human Review Load For 100 Sources

EXTRAPOLATED from 37 excerpts across Pilots 1, 2 and 3: approximately 12 auto-KEEP, 8 REVIEW and 80 auto-REJECT per 100 similarly yielding Sources. Expected human reviews: about 8 per 100 Sources (roughly 1 review per useful prepared Source). `KEEP Evidence per useful Source` is approximately 0.12. These are extrapolations; actual Source-to-excerpt yield remains UNKNOWN.

## Stage 1 Gate

**FAIL.** The independent micro-pilot contains one HIGH false KEEP, with precision 0/1, and ingestion idempotency is not demonstrated. Provenance, explicit review, canonical no-mutation and restoration passed in development. Recall is not the blocker; unsafe acceptance and batch idempotency are.

## Rollout Progress

Previous: **70 / 100**
Current: **66 / 100**

Pipeline Readiness: **66/100**
Knowledge Coverage: unchanged; most of the seed remains bibliography-only or supports only BASIC/EDITORIAL depth. This score measures pipeline safety, not the percentage of entities with deep content.

Current Stage: **STAGE_0_EXPERIMENTAL**
Next Stage: **STAGE_1_SMALL_BATCH_READY**

Major Steps To Next Stage: **3**

1. Fix structured-reference/source-purpose gating and bounded propositions.
2. Revalidate on a new independent micro-batch without post-hoc rule changes.
3. Demonstrate ingestion idempotency plus human review/rollback on a disposable batch.

Major Steps To Full Seed: **6**

1. Close semantic false KEEP blocker.
2. Complete independent micro-validation.
3. Pass Stage 1 review/rollback gate.
4. Run 100-Source controlled batch.
5. Run larger-batch validation and full-seed dry run.
6. Perform explicit, reversible apply/promotion policy.

Critical blockers remaining: **2**

- **B-01** Semantic precision: REOPENED by the independent HIGH false KEEP. Exit: no HIGH/CRITICAL false KEEP and high precision on a genuinely held-out set.
- **B-04** Ingestion idempotency: NEW, current rerun creates duplicate Materials. Exit: source/material/version deduplication or an equivalent tested isolation contract.

Important blockers open: **B-02** review/promotion workflow is partially exercised but not yet in a batch with accepted semantic Evidence and rollback assertions.
Closed: **B-03** promotional/chrome regression remains closed for the tested cases.

Validation batches to next stage: **1** after fixes. Estimated work remaining: **HIGH**.

## Path To 805

1. Correct structured-reference purpose classification and require bounded spans.
2. Run a new independent micro-pilot with frozen rules.
3. Exercise accepted Evidence review/promotion and restoration without canonical mutation.
4. Fix and test material/version/excerpt idempotency.
5. Run 100 Sources; then a larger validation batch.
6. Full-seed dry run with adaptive editorial depth; explicit promotion only afterward.

## Plain Language Status

Estamos a **66/100** de tener el pipeline preparado para recorrer las 805 entidades. Esto **no** significa que el 66% de las entidades tenga contenido documental profundo. Antes del full-seed dry run quedan aproximadamente **seis gates mayores**; el siguiente es corregir el falso KEEP de referencias estructuradas y volver a validarlo de forma independiente.

## Recommendation

**STAGE_1_BLOCKED**. El micro-pilot independiente encontró exactamente el tipo de falso KEEP que el gate debía detectar. No se debe ejecutar el batch de 100 Sources hasta cerrar B-01 y B-04.

## Files Changed

- `backend/api/scripts/controlled-source-ingestion-pilot.ts`
- `backend/api/scripts/semantic-evidence-pilot3-predictions.ts`
- `backend/api/scripts/semantic-evidence-pilot3-gold-eval.ts`
- `backend/api/scripts/semantic-evidence-pilot3-workflow.ts`
- `backend/api/scripts/semantic-evidence-pilot3-idempotency.ts`
- `backend/api/package.json`
- `artifacts/controlled-source-ingestion-pilot3.json`
- `artifacts/semantic-classifier-freeze.json`
- `artifacts/semantic-evidence-pilot3-predictions.json`
- `artifacts/semantic-evidence-pilot3-gold-eval.json`
- `artifacts/semantic-evidence-pilot3-workflow.json`
- `artifacts/semantic-evidence-pilot3-idempotency.json`

## Risks / Limitations

The sample is only 10 Sources/15 excerpts and includes no automatic gold KEEP, so precision is observed as 0/1 rather than a stable estimate. The result is nevertheless a valid safety signal because the one automatic acceptance is demonstrably high-risk. No production data was changed and no Knowledge Core promotion occurred.
