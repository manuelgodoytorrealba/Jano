# Semantic Evidence Classifier — generalised validation

## False KEEP Root Cause

The only previous false KEEP was a `Madrid Destino` excerpt from a `GENERAL_REFERENCE` tourism page. It contained a factual-looking sentence (“The city is one of the busiest European capitals…”) but the surrounding fragment was a dense marketing/navigation block (`Explore`, food, shopping, events and calls to action). The classifier overweighted source-title/entity-name match and accepted a proposition without checking fragment-level institutional/promotional density.

The general fix is not a source/domain exception: detect CTA, event, visitor-information, shop, membership, navigation and institutional-chrome signals at fragment level, and reject when they dominate or when the fragment contains logistics rather than a bounded editorial claim. A page that also contains good evidence is not rejected wholesale; only the noisy fragment is.

Previous false-KEEP record:

| Field                           | Value                                                                                                                                                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source                          | Madrid Destino                                                                                                                                                                                                                                 |
| Source purpose                  | GENERAL_REFERENCE                                                                                                                                                                                                                              |
| Excerpt                         | `Explore the places and characters that raised the city to the top of the art and culture scene … Food and Drink … Shopping … What's On in Madrid The city is one of the busiest European capitals in terms of shows and cultural activities.` |
| Gold decision                   | REVIEW                                                                                                                                                                                                                                         |
| Predicted decision (before fix) | KEEP                                                                                                                                                                                                                                           |
| Predicted role                  | PRIMARY_SUBJECT                                                                                                                                                                                                                                |
| Predicted proposition           | `The city is one of the busiest European capitals in terms of shows and cultural activities.`                                                                                                                                                  |
| Supported dimension             | context / characteristics                                                                                                                                                                                                                      |
| Confidence                      | HIGH                                                                                                                                                                                                                                           |
| Why accepted                    | Entity name matched the Source title and a factual-looking sentence was extractable.                                                                                                                                                           |
| Why gold was REVIEW             | The sentence was embedded in tourism marketing and event/navigation chrome; the fragment did not provide a clean cultural claim.                                                                                                               |
| General cause                   | PROMOTIONAL_CONTENT + ENTITY_NAME_OVERWEIGHTED                                                                                                                                                                                                 |

## Missed KEEP Analysis

Four gold KEEP cases were previously missed:

- `Pablo Picasso`: a valid interpretive paragraph had no verb in the narrow first-pass lexicon. Root cause: `PROPOSITION_EXTRACTION_FAILED` / `LEXICAL_LIMITATION`.
- `Repensar Guernica` (two excerpts): documentary paragraphs were contaminated by captions and multiple dates, so the broad-span guard rejected them. Root cause: `SPAN_TOO_BROAD`.
- `Cubism`: a substantive characteristics paragraph was followed by image-credit chrome. Root cause: `SPAN_TOO_BROAD`.

The fix extracts the editorial span before image credits/captions, expands the factual/descriptive verb set, and removes only recognisable caption structure. It does not lower the KEEP threshold globally. Valid propositions still require a concrete bounded span.

## Changes Made

Updated `DeterministicSemanticEvidenceClassifier` with:

- fragment-level promotional/institutional chrome detection;
- caption/image-credit span trimming;
- broader multilingual descriptive-verb detection;
- proposition-driven KEEP eligibility;
- strict provenance and proposition validation retained.

No new provider, model, Source, Evidence promotion or canonical mutation was used.

## DEV Set Before / After

The 27 frozen excerpts are a development/diagnostic set, not a final generalisation proof.

| Metric            |       Before |          After |
| ----------------- | -----------: | -------------: |
| KEEP precision    |  88.9% (8/9) | **100% (9/9)** |
| KEEP recall       | 66.7% (8/12) |   75.0% (9/12) |
| REVIEW rate       |         7.4% |           3.7% |
| REJECT rate       |        63.0% |          63.0% |
| Overall agreement |        59.3% |          59.3% |
| False KEEP        |            1 |          **0** |
| False REJECT      |            3 |              3 |

Acceptance rate is 33.3% after the change (9/27); it is not precision.

## DEV Confusion Matrix

| prediction \\ gold | KEEP | REVIEW | REJECT |
| ------------------ | ---: | -----: | -----: |
| KEEP               |    9 |      0 |      0 |
| REVIEW             |    0 |      1 |      0 |
| REJECT             |    3 |      8 |      6 |

Disagreement decomposition: `KEEP→REVIEW` 0, `KEEP→REJECT` 0, `REVIEW→KEEP` 0, `REVIEW→REJECT` 0, `REJECT→REVIEW` 8, `REJECT→KEEP` 3. The critical direction `REJECT→KEEP` is now zero. Most remaining disagreement is conservative rejection of gold REVIEW; that affects recall/review load, not unsafe acceptance.

## Holdout Dataset

A 10-excerpt exploratory holdout was selected after the rules were frozen from legitimate development material in the pilot artifacts, with varied documentary, institutional, conceptual and navigation content: Picasso (2), Fountain (2), Cubism, AAT, Body in Art, Bayeux, Louise Bourgeois and Madrid Destino. Gold labels are independent hand-authored labels in `semantic-evidence-holdout-eval.ts` and include role/proposition/dimension rationale.

Because all material originates in the existing pilots, this is a post-freeze holdout, not a statistically independent new-source sample. It is useful validation, but not sufficient alone for a global rollout claim.

## Holdout Metrics

| Metric         |        Holdout |
| -------------- | -------------: |
| KEEP precision | **100% (3/3)** |
| KEEP recall    |    75.0% (3/4) |
| REVIEW rate    |             0% |
| REJECT rate    |            70% |
| False KEEP     |          **0** |
| False REJECT   |              1 |

The holdout confusion matrix is emitted in `artifacts/semantic-evidence-holdout-eval.json`. No gold REJECT was accepted.

## Holdout False KEEP Analysis

There are no false KEEP cases. The one missed gold KEEP is a conservative extraction miss, not an unsupported acceptance. This supports the general promotional-content fix, but the small, post-hoc sample means it should be treated as evidence, not proof.

## Review Load Estimate For 100 Sources

EXTRAPOLATED from 37 evaluated excerpts (27 DEV + 10 holdout), not from 100 actual Sources: approximately 12 auto-KEEP, 4 REVIEW and 84 auto-REJECT per 100 similarly yielding Sources. At the current excerpt yield this corresponds to roughly 4 human reviews per 100 Sources; actual review count is UNKNOWN until Source-to-excerpt yield is measured on a new batch. This estimate deliberately favours precision and may undercount cases that a reviewer would rescue.

## Stage 1 Gate

**FAIL — not yet a full Stage 1 declaration.** The semantic safety signals pass on both sets (KEEP precision 100%, false KEEP 0, valid propositions/provenance in tests), and the dangerous `REJECT→KEEP` direction is zero. However, the holdout is post-hoc from existing pilot material and the human review/promotion path has not yet been exercised as an end-to-end controlled batch. The next validation must be genuinely held-out and include review/rollback evidence. Recall at 75% is not itself a blocker.

## Rollout Readiness

Previous: **63 / 100**
Current: **70 / 100**

The increase is limited to the demonstrated reduction of false KEEP on DEV plus the exploratory holdout. It is not a score for code volume.

Current Stage: **STAGE_0_EXPERIMENTAL**
Next Stage: **STAGE_1_SMALL_BATCH_READY**

Critical blockers remaining: **1**

- **B-02** Human review/promotion workflow has not been exercised with rollback and zero canonical mutation. OPEN.

Closed blockers:

- **B-01** Semantic KEEP precision: CLOSED for the current DEV + exploratory holdout (100% precision; still requires a truly held-out validation before global confidence).
- **B-03** Promotional/chrome false KEEP: CLOSED for the current datasets; retained as a regression test.

Major steps remaining: **2**. Validation batches remaining: **1** (a genuinely held-out micro-batch with review/rollback). Knowledge coverage is unchanged and remains separate from pipeline readiness. Estimated work remaining: **MEDIUM**.

## Path To 805 Entities

1. Run one genuinely held-out semantic micro-validation without changing rules after inspection; include reviewer decisions and proposition/provenance checks.
2. If it passes, run the controlled 100-Source batch with isolation, idempotence, host limits, review load metrics and rollback.
3. Validate a larger batch only after the 100-Source evidence is stable, then perform a full-seed dry run with adaptive editorial depth.
4. Apply only through explicit promotion; pending private ResearchEvidence never enters canonical context.

## Plain Language Progress

El pipeline está aproximadamente a **70/100** de poder ejecutarse sobre toda la seed. Antes del full-seed dry run faltan **dos pasos mayores**: validar en un holdout realmente independiente y demostrar el workflow humano de revisión/rollback en un batch controlado.

## Recommendation

**NEEDS_MORE_SEMANTIC_WORK.** La causa general del false KEEP está corregida y la precisión observada es 100% en DEV y holdout exploratorio, pero todavía no corresponde declarar Stage 1 hasta realizar una validación verdaderamente held-out y ejercitar la frontera de revisión sin mutaciones canónicas.
