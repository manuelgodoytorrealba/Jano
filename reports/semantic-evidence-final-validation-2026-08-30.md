# Final independent validation — Classifier V2

## Structured Reference Fix

The source-purpose derivation now detects a general `STRUCTURED_REFERENCE` class for authority records, Wikidata-style statements, thesauri/AAT, identifiers, taxonomies, controlled vocabularies and database records. The classifier routes this purpose away from paragraph-style editorial Evidence. It does not reject the source as useless: structured facts remain a separate candidate shape (`field`, `value`, `provenanceRequired`) and still require review/promotion before canonical use.

## Structured Fact vs Editorial Evidence

The existing domain can represent both routes without a new store:

```text
STRUCTURED_REFERENCE → field/value candidate → provenance → review/promotion
DOCUMENTARY_TEXT     → coherent span → proposition → Evidence candidate → review/promotion
```

`ResearchEvidence` is not created for a structured metadata dump. Existing `SourceRef`, `Citation`, `ResearchClaim` and `Promotion Proposal` remain the ownership boundary.

## Editorial Span Contract

KEEP requires a bounded, coherent, self-contained span. New validation rejects propositions that are too long, contain repeated key/value markers (`identifier`, `references`, `retrieved`, `instance of`, etc.), or are unfocused enumerations. `LibraryExcerpt` remains the wider paragraph/section; `ResearchEvidence.quote` is the precise span.

## Proposition Validation

The proposition validator now checks non-empty text, bounded size, reconstructibility, provenance and dump/list signatures. A structured record may yield a fact candidate such as “artist estadounidense” only after field-level extraction; it cannot produce a paragraph proposition by copying the dump.

## Idempotency Root Cause

The pilot previously always called `libraryMaterial.create`, so rerunning the same Source created a second Material even when its URL and content were unchanged.

## Material Identity Contract

The ingestion path now reuses a Material matching `sourceId + material kind + canonical pilot material identity`. Title alone is never used as the identity. Different legitimate material roles remain possible because the lookup includes kind/role semantics.

## Version Identity Contract

The same URL reuses an existing READY Version. A failed version is retried in place. The Version model’s existing `contentHash` remains the content identity; unchanged content does not create another Version, while a later refresh with a changed hash may create the next version.

## Batch Rerun Results

The same Pilot 3 batch was rerun against the same development ResearchProject after the fix:

|              | Run 1 | Run 2 | Difference         |
| ------------ | ----: | ----: | ------------------ |
| Materials    |    10 |    10 | NO_CHANGE_EXPECTED |
| Versions     |    10 |    10 | NO_CHANGE_EXPECTED |
| Excerpts     |    15 |    15 | NO_CHANGE_EXPECTED |
| Evidence     |    12 |    12 | NO_CHANGE_EXPECTED |
| Associations |    12 |    12 | NO_CHANGE_EXPECTED |

Duplicate counts were zero. Artifact: `artifacts/semantic-evidence-batch-rerun.json`.

## Downstream Idempotency

`LibraryExcerpt` now uses its existing `(materialVersionId, fingerprint)` unique key through `upsert`; `ResearchEvidence` uses its existing `(projectId, sourceId, fingerprint)` key; ResearchEntity and ResearchLibraryMaterial are reused/upserted; proposal creation remains fingerprinted. No new destructive unique constraint was added.

## Classifier V2 Frozen Version

Version: `semantic-evidence-classifier-v2.2`
Rules fingerprint: `e4fc02a9cdf061a6f91b5b7a7390e79c6d572c2b341e28704f2bf32e5df36e15`
Freeze artifact: `artifacts/semantic-classifier-v2-freeze.json`

Frozen rules include structured-reference routing, editorial-span gate, proposition-size validation, purpose compatibility, confidence and decision thresholds. No rules changed after final predictions were persisted.

## Final Independent Dataset

Twelve new Sources were selected, with 9 excerpts prepared: Baroque/Neoclassicism/Ukiyo-e/Arts of Africa, Florence and Rome institutional pages, Birth of Venus, Last Supper, Night Watch, Maman, Donald Judd authority record and Vermeer. The actual stored dataset produced 9 candidates, including structured reference, museum editorial, artwork, movement, institutional and poor-content cases.

## Blind Predictions

Predictions were persisted before gold review: 0 KEEP, 6 REVIEW, 3 REJECT. Artifact: `semantic-evidence-pilot4-predictions.json`.

## Gold Review

Independent gold decisions: 3 KEEP, 3 REVIEW, 3 REJECT. Gold KEEP cases were bounded statements about the Birth of Venus and Neoclassicism. The Donald Judd authority record was explicitly gold REJECT for editorial Evidence while remaining eligible for structured facts.

## Final Validation Metrics

| Metric               |                        Final set |
| -------------------- | -------------------------------: |
| KEEP precision       | NOT_ESTIMABLE (0 automatic KEEP) |
| KEEP recall          |                         0/3 = 0% |
| REVIEW rate          |                            66.7% |
| REJECT rate          |                            33.3% |
| False KEEP           |                            **0** |
| False REJECT         |                                0 |
| Overall agreement    |                            66.7% |
| Proposition accuracy |                    NOT_ESTIMABLE |
| Entity-role accuracy |                            55.6% |
| Dimension accuracy   |                    NOT_ESTIMABLE |

By source purpose: `STRUCTURED_REFERENCE` (Donald Judd) was correctly rejected as editorial Evidence; `EDITORIAL_TEXT/GENERAL_REFERENCE` yielded 0 KEEP, 6 REVIEW and 2 REJECT with no unsafe acceptance. Structured facts were not silently treated as editorial evidence.

## False KEEP Analysis

There were no false KEEP cases in the final validation. The Pilot 3 authority-record false KEEP is now covered by a general purpose gate and regression fixture. However, because the final set produced zero automatic KEEP, precision is not statistically estimable; this is safe but overly conservative.

## Review / Promotion E2E

The existing Research path was exercised with a real Pilot 3 candidate: private Evidence → pending Finding Proposal → explicit review → Claim conversion → Research project publication representation → archive restoration. Canonical entity snapshots before/after were identical; provenance survived; no relation or wikilink side effects occurred. No unsafe final-pilot Evidence was promoted. This closes the safety portion of B-02, but the final set did not supply an automatic KEEP to exercise an accepted semantic Evidence.

## Stage 1 Gate

**FAIL (conservative).** Passed: structured-reference gating, zero final false KEEP, proposition/dump rejection, provenance, material/version/excerpt/Evidence idempotency, explicit review, canonical no-mutation and restoration. Fails: the final independent set has zero automatic KEEP (precision/proposition accuracy not estimable), REVIEW rate 66.7% exceeds the proposed manageable 60% ceiling, and there is no accepted automatic KEEP for the final promotion path. Recall is not the reason for failure.

## Blocker History

| ID                               | Status         | First detected | Resolution / evidence                                                                                                       |
| -------------------------------- | -------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| B-01 semantic precision          | OPEN           | Pilot 2        | Pilot 3 high false KEEP addressed; final set has no false KEEP but zero KEEP, so general precision is not yet demonstrated. |
| B-02 review/promotion            | OPEN (reduced) | Pilot 2        | Existing review/archive restoration exercised; accepted final semantic KEEP still missing.                                  |
| B-03 promotional/chrome          | CLOSED         | Pilot 1        | Fragment-level promotional gate and regression tests; no final false KEEP.                                                  |
| B-04 ingestion idempotency       | CLOSED         | Pilot 3        | Same-batch rerun: 10/10 Materials, 10/10 Versions, 15/15 Excerpts, 12/12 Evidence, 12/12 associations.                      |
| B-05 structured-reference gating | CLOSED         | Pilot 3        | General purpose derivation + structured-reference classifier gate; Donald Judd final case rejected correctly.               |

## Rollout Progress

Previous: **66 / 100**
Current: **68 / 100**

Pipeline Readiness: **68/100**
Knowledge Coverage: unchanged; this phase did not enrich canonical knowledge. Most seed entities remain BASIC_EXPLANATION or EDITORIAL_ENTRY capability.
Full Seed Execution Progress: **not started**; no 100-Source batch and no full-seed run executed.

Current Stage: **STAGE_0_EXPERIMENTAL**
Next Stage: **STAGE_1_SMALL_BATCH_READY**

Major Steps To Next Stage: **2**

1. Reduce over-review and demonstrate at least a small number of safe automatic KEEP decisions on an independently frozen set without reintroducing structured-reference false KEEP.
2. Exercise one accepted Evidence review/promotion path and confirm the same idempotency/rollback contract.

Major Steps To Full Seed: **5**

1. Close semantic validation and review-load blockers.
2. Pass Stage 1.
3. Run 100-Source controlled batch.
4. Run larger-batch validation and full-seed dry run.
5. Apply only through explicit promotion.

## Path To 805 Entities

1. Hold classifier V2 fixed while adding a genuinely balanced validation set with some positive editorial KEEP cases.
2. Calibrate REVIEW/KEEP only after that validation; do not lower the structured-reference gate.
3. Re-run review/promotion/rollback with an actually accepted Evidence candidate.
4. Run the 100-Source batch, then a larger validation batch.
5. Execute full-seed dry run with adaptive editorial depth; apply explicitly afterward.

## Plain Language Status

Estamos aproximadamente a **68/100** de tener el pipeline preparado para recorrer las 805 entidades. Para llegar al próximo stage faltan **dos pasos grandes**: demostrar KEEP seguro en un conjunto independiente equilibrado y completar la promoción explícita con una Evidence aceptada. Para llegar al full-seed dry run faltan **cinco gates grandes**. Esto no significa que el 68% de las entidades tenga contenido documental profundo.

## Recommendation

**STAGE_1_BLOCKED**. Los dos blockers técnicos solicitados están corregidos, pero la validación final fue demasiado conservadora para demostrar aún un Stage 1 operativo: cero KEEP automáticos y 66,7% REVIEW. No se deben procesar 100 Sources todavía.
