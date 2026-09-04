# Semantic Evidence V3 — asymmetric hybrid benchmark

## Composition

```text
DETERMINISTIC_SAFE_KEEP -> KEEP without an LLM call
DETERMINISTIC_HARD_REJECT -> REJECT without rescue
DETERMINISTIC_UNCERTAIN -> semantic decision -> final validators
```

`MODEL_REVIEW` and `SYSTEM_FAILSAFE_REVIEW` are distinct outcomes. Decision and relevance role are independent.

## Deterministic classes

- `SAFE_KEEP`: a coherent documentary proposition, clear subject, compatible Source purpose and reconstructible provenance.
- `UNCERTAIN`: plausible editorial material that lexical rules cannot prove sufficiently relevant or extractable.
- `HARD_REJECT`: invalid provenance, structured reference, incompatible purpose, metadata dump, navigation/promotion, clearly unrelated content or technical garbage.

## Operational contracts

Roles:

- `PRIMARY_SUBJECT`: mainly about the candidate.
- `ABOUT`: substantive knowledge directly about the candidate.
- `CONTEXT_FOR`: necessary context whose main claim concerns something else.
- `SUPPORTS_RELATION`: explicit relation involving the candidate and another identifiable entity.
- `MENTION`: name without substantive knowledge.
- `UNRELATED`: no sufficient editorial relation.

Decisions:

- `KEEP`: reusable, grounded, atomic, entity-centered, uncertainty-preserving Evidence.
- `REVIEW`: plausible value with real ambiguity about focus, interpretation, modality, dimension, relation, scope or Source suitability.
- `REJECT`: irrelevant, insufficient, incompatible, noisy or hard-gated material.

Dimensions:

`DEFINITION_OR_IDENTITY`, `CHRONOLOGY`, `PLACE`, `FORM_OR_MATERIAL`, `PRACTICE_OR_METHOD`, `HISTORICAL_CONTEXT`, `RELATION`, `INTERPRETATION`, `RECEPTION_OR_LEGACY`, `PROVENANCE_OR_COMMISSION`.

## Frozen configuration

- Model: `qwen2.5:14b`
- Temperature: `0.2`
- Output limit: `500`
- Corpus: 51 unique excerpts; 48 decision labels; 51 role labels.
- Classifier: `3f65080ffa5e97dca1255eba19560de0e4a91b9ebcc5c1ff9a9a81d5019857f0`
- Deterministic gates: `a71ffaf8076ccadc1a7daa82f6ebcda956471ecb70e7835556e29139aa0dbe0c`
- Corpus: `4b3b3c0216792851c38dedc5077e74a65e53a1f7149caee9d39385efb70c0dd5`

## Results

| Metric                         | Deterministic | Semantic only | Asymmetric hybrid |
| ------------------------------ | ------------: | ------------: | ----------------: |
| KEEP precision                 |          100% |         88.9% |             92.3% |
| KEEP recall                    |         56.3% |         50.0% |             75.0% |
| Gold KEEP                      |          9/16 |          8/16 |             12/16 |
| REVIEW rate                    |         18.8% |         35.4% |             27.1% |
| REJECT rate                    |         62.5% |         45.8% |             45.8% |
| False KEEP                     |             0 |             1 |                 1 |
| False reject                   |             4 |             0 |                 0 |
| Agreement                      |         60.4% |         56.3% |             64.6% |
| Role accuracy                  |         51.0% |         51.0% |             58.8% |
| Operational dimension accuracy |         13.3% |         10.0% |             13.3% |

Composition value:

- Base deterministic Gold KEEP: `9`.
- Preserved: `9/9`.
- Safely recovered by semantics: `3` (Guernica chronology, Cubism form/reception, Neoclassicism context).
- Final hybrid Gold KEEP: `12/16`.
- Model reviews: `14`; system failsafe reviews: `2`.
- Final KEEP uncertainty preservation, centeredness and atomicity guards: `100%`.

The sole false KEEP is a Gold REVIEW fragment about the iconography of The Birth of Venus. Its selected quote is exact, the proposition is entailed and `perhaps` remains uncertain. Severity: `MEDIUM`, because the frozen gold requires review of the mixed catalogue fragment. There are no final false KEEP examples among the 18 Gold REJECT rows and no HIGH/CRITICAL false KEEP.

## Runtime

- Valid JSON/schema: `100%`.
- Calls: `30`; failures/truncations: `0`.
- Mean: `4.293 s`; p50: `4.411 s`; p95: `5.854 s`.
- Tokens: `46,047` input + output.
- GPU VRAM peak: `10,640 MiB`.

## Verdict

`PASS`

The LLM complements rather than replaces the deterministic classifier. V3 is suitable for a controlled showcase with human review; it is not evidence that all future Sources can be auto-promoted.

## Existing suite failures

The full backend suite reports 302 PASS and 7 PRE_EXISTING failures:

- 3 Research service tests have stale Prisma mocks missing `entityTypeDefinition` after an older service change.
- 2 Research proposal contract assertions depend on Prisma column spacing changed by formatting/schema reconciliation.
- 1 entity graph test expects an image despite explicitly mocking `mediaLinks: []`.
- 1 foundational discovery benchmark reports the existing 82.8% coverage gap.

No V3 test or touched runtime path fails.
