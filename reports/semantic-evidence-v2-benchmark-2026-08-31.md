# Semantic Evidence V2 — frozen local benchmark

Date: 2026-08-31  
Environment: local only  
Corpus hash: `4b3b3c0216792851c38dedc5077e74a65e53a1f7149caee9d39385efb70c0dd5`  
Contract: `semantic-evidence-v2`  
Classifier hash: `be5f0ed4e1d6ef211fb89fa68930f76c5962a6ec2a1b6ab6a31434d63960caf1`  
Deterministic gates hash: `9615aa759f4f8771fdd400ad3fbdce558a9aff5609de8ea6829ee8c3795b6c7c`

## V2 contract changes

- The model returns `supportQuote`, never offsets.
- JANO resolves the quote to offsets using unique exact matching, then safe NFC/whitespace normalization.
- Repeated matches are `AMBIGUOUS`; absent matches are `INVALID`; neither can become `KEEP`.
- `evidenceProposition` may be a strict paraphrase. Literal presence is reported separately and is not an acceptance requirement.
- Output fields and enums are closed and `additionalProperties` is false.
- Structured references, authority dumps and promotional/navigation chrome remain hard rejects.
- Invalid output fails safe to `REVIEW` or `REJECT`, never `KEEP`.

## Frozen corpus

| Denominator                                  | Count |
| -------------------------------------------- | ----: |
| Unique excerpts                              |    51 |
| Decision labels                              |    48 |
| KEEP                                         |    16 |
| REVIEW                                       |    14 |
| REJECT                                       |    18 |
| Role labels                                  |    51 |
| Historical CONTEXT_FOR rows without decision |     3 |

The three historical `CONTEXT_FOR` values are retained as role labels and excluded from decision metrics. No excerpt or gold meaning was changed.

## Contract reliability

| Metric                                   |   qwen2.5:14b |    gemma4:12b |
| ---------------------------------------- | ------------: | ------------: |
| Model calls after hard gates             |            30 |            30 |
| Valid JSON                               |          100% |         96.7% |
| Valid schema                             |          100% |         96.7% |
| Valid supplied supportQuote              | 93.8% (15/16) | 75.0% (12/16) |
| Ambiguous quote                          |            0% |            0% |
| Truncation                               |            0% |   3.3% (1/30) |
| Invalid proposition, deterministic guard |   6.3% (1/16) |     0% (0/17) |
| Runtime failures                         |             0 |             1 |

V2 removes the dominant V1 failure: model-generated offsets no longer exist. Qwen is contractually reliable; Gemma still produced one truncated response and four unverifiable quotes.

## Decision metrics

| Mode / model   | KEEP precision |  KEEP recall | Review rate | Reject rate | False KEEP | False reject | Agreement |
| -------------- | -------------: | -----------: | ----------: | ----------: | ---------: | -----------: | --------: |
| Deterministic  |           100% | 56.3% (9/16) |       20.8% |       60.4% |          0 |            4 |     62.5% |
| Qwen semantic  |    88.9% (8/9) | 50.0% (8/16) |       12.5% |       68.8% |          1 |            3 |     52.1% |
| Qwen hybrid    |    88.9% (8/9) | 50.0% (8/16) |       12.5% |       68.8% |          1 |            3 |     52.1% |
| Gemma semantic |   81.8% (9/11) | 56.3% (9/16) |       12.5% |       64.6% |          2 |            1 |     56.3% |
| Gemma hybrid   |   81.8% (9/11) | 56.3% (9/16) |       12.5% |       64.6% |          2 |            1 |     56.3% |

Confusion matrices use predicted rows and gold columns in the order KEEP / REVIEW / REJECT:

- Deterministic: `KEEP 9/0/0`, `REVIEW 3/5/2`, `REJECT 4/9/16`.
- Qwen hybrid: `KEEP 8/1/0`, `REVIEW 5/0/1`, `REJECT 3/13/17`.
- Gemma hybrid: `KEEP 9/2/0`, `REVIEW 6/0/0`, `REJECT 1/12/18`.

Both models have `REVIEW precision = 0/6`: they use `REVIEW` on GOLD KEEP/REJECT while sending every GOLD REVIEW to KEEP or REJECT. This is a decision-calibration defect, not a request to change gold.

`SEMANTIC_ONLY` and `HYBRID` are numerically identical in V2 because both currently pass through the same invariant hard-gate prefilter and the same post-validation path. This preserves the structured-reference and chrome safety regressions, but it means this run cannot demonstrate a separate incremental Hybrid effect. That composition must be made explicit before a future benchmark; it is not repaired or rerun in this evaluation.

## Semantic quality

| Metric                                             |   qwen2.5:14b |    gemma4:12b |
| -------------------------------------------------- | ------------: | ------------: |
| Gold KEEP recovered                                |  8/16 (50.0%) |  9/16 (56.3%) |
| Valid quote on Gold KEEP output                    | 13/16 (81.3%) | 10/16 (62.5%) |
| Proposition entailment on final KEEP, manual audit |   8/9 (88.9%) | 10/11 (90.9%) |
| Entity-role accuracy                               | 12/51 (23.5%) | 23/51 (45.1%) |
| Dimension accuracy                                 |   1/30 (3.3%) |  3/30 (10.0%) |

Entailment was audited manually against `supportQuote` plus the minimal excerpt context. It is not exact-string scoring and neither evaluated model judged itself. Qwen's one failure is a slightly stronger causal paraphrase (`following ... there was` became `llevaron a`). Gemma's failure converts a source hypothesis into a factual assertion. Entity centering is reported separately: Gemma also accepted a Cubism candidate with a proposition centered on Picasso.

## Gold KEEP recovery

`Entailed` is semantic audit, not literal comparison. `—` means that no proposition survived as final KEEP/REVIEW evidence.

| Entity / excerpt topic            | Source                         | Model | Final  | Quote   | Entailed                            | Role              | Dimension               |
| --------------------------------- | ------------------------------ | ----- | ------ | ------- | ----------------------------------- | ----------------- | ----------------------- |
| Pablo Picasso — Barcelona         | Pablo Picasso                  | Qwen  | KEEP   | valid   | yes                                 | CONTEXT_FOR       | context                 |
| Pablo Picasso — Paris recognition | Pablo Picasso                  | Qwen  | KEEP   | valid   | yes                                 | CONTEXT_FOR       | influence / form        |
| Pablo Picasso — simulacrum        | Pablo Picasso                  | Qwen  | REVIEW | invalid | yes                                 | CONTEXT_FOR       | cultural context        |
| Pablo Picasso — themes            | Pablo Picasso                  | Qwen  | KEEP   | valid   | yes                                 | CONTEXT_FOR       | cultural context        |
| Guernica — 1937 commission        | Repensar Guernica              | Qwen  | REJECT | missing | —                                   | MENTION           | —                       |
| Guernica — unresolved commission  | Repensar Guernica              | Qwen  | REJECT | valid   | yes, but unsupported details caught | MENTION           | historical context      |
| Guernica — travels                | Repensar Guernica              | Qwen  | REVIEW | valid   | yes                                 | MENTION           | historical context      |
| Guernica — anti-war meaning       | Repensar Guernica              | Qwen  | KEEP   | valid   | yes                                 | SUPPORTS_RELATION | cultural context        |
| Cubism — fragmentation            | Cubism                         | Qwen  | REJECT | missing | —                                   | UNRELATED         | —                       |
| Cubism — name origin              | Cubism                         | Qwen  | KEEP   | valid   | yes                                 | CONTEXT_FOR       | origin                  |
| Cubism — African masks            | Cubism                         | Qwen  | REVIEW | valid   | yes; candidate focus weak           | MENTION           | influence / form        |
| Body                              | The body in art                | Qwen  | REVIEW | valid   | yes                                 | CONTEXT_FOR       | definition              |
| Sunflower Seeds — Mao             | 1000 Years of Joys and Sorrows | Qwen  | KEEP   | valid   | yes                                 | CONTEXT_FOR       | historical context      |
| Birth of Venus — commission       | The Birth of Venus             | Qwen  | REVIEW | valid   | yes                                 | MENTION           | origin                  |
| Birth of Venus — classical models | The Birth of Venus             | Qwen  | KEEP   | valid   | yes                                 | CONTEXT_FOR       | cultural context        |
| Neoclassicism                     | Neoclassicism                  | Qwen  | KEEP   | valid   | minor causal strengthening          | CONTEXT_FOR       | historical context      |
| Pablo Picasso — Barcelona         | Pablo Picasso                  | Gemma | REVIEW | missing | — (truncated output)                | UNRELATED         | —                       |
| Pablo Picasso — Paris recognition | Pablo Picasso                  | Gemma | KEEP   | valid   | yes                                 | SUPPORTS_RELATION | cultural context        |
| Pablo Picasso — simulacrum        | Pablo Picasso                  | Gemma | KEEP   | valid   | yes                                 | SUPPORTS_RELATION | provenance / commission |
| Pablo Picasso — themes            | Pablo Picasso                  | Gemma | REVIEW | invalid | yes                                 | SUPPORTS_RELATION | provenance / commission |
| Guernica — 1937 commission        | Repensar Guernica              | Gemma | REVIEW | invalid | uncertain wording                   | PRIMARY_SUBJECT   | historical context      |
| Guernica — unresolved commission  | Repensar Guernica              | Gemma | KEEP   | valid   | yes with excerpt context            | SUPPORTS_RELATION | context                 |
| Guernica — travels                | Repensar Guernica              | Gemma | REVIEW | valid   | yes                                 | MENTION           | historical context      |
| Guernica — anti-war meaning       | Repensar Guernica              | Gemma | REVIEW | invalid | yes                                 | SUPPORTS_RELATION | cultural context        |
| Cubism — fragmentation            | Cubism                         | Gemma | REJECT | missing | —                                   | UNRELATED         | —                       |
| Cubism — name origin              | Cubism                         | Gemma | KEEP   | valid   | yes                                 | PRIMARY_SUBJECT   | historical context      |
| Cubism — African masks            | Cubism                         | Gemma | KEEP   | valid   | yes; proposition centers Picasso    | SUPPORTS_RELATION | influence / form        |
| Body                              | The body in art                | Gemma | KEEP   | valid   | yes                                 | SUPPORTS_RELATION | definition              |
| Sunflower Seeds — Mao             | 1000 Years of Joys and Sorrows | Gemma | KEEP   | valid   | yes                                 | CONTEXT_FOR       | cultural context        |
| Birth of Venus — commission       | The Birth of Venus             | Gemma | REVIEW | invalid | yes                                 | CONTEXT_FOR       | provenance / commission |
| Birth of Venus — classical models | The Birth of Venus             | Gemma | KEEP   | valid   | yes                                 | SUPPORTS_RELATION | provenance / commission |
| Neoclassicism                     | Neoclassicism                  | Gemma | KEEP   | valid   | yes                                 | PRIMARY_SUBJECT   | historical context      |

## Gold REJECT safety

| Model | Gold REJECT | Raw semantic KEEP attempts | Blocked/downgraded | Final false KEEP |
| ----- | ----------: | -------------------------: | -----------------: | ---------------: |
| Qwen  |          18 |                          1 |                  1 |                0 |
| Gemma |          18 |                          0 |                  0 |                0 |

All authority metadata, promotional/navigation and unrelated GOLD REJECT rows finish as non-KEEP. The Cy Twombly authority regression remains protected: Qwen attempted a semantic KEEP on one non-obvious authority fragment, but proposition validation downgraded it; explicit structured dumps were hard-gated before the model.

## False KEEP analysis

| Model | Gold   | Case                                                                  | Severity | Finding                                                                                                                 |
| ----- | ------ | --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Qwen  | REVIEW | Birth of Venus iconographic description mixed with catalogue metadata | MEDIUM   | The selected quote and proposition are grounded, but V2 bypassed the gold requirement for review of the mixed fragment. |
| Gemma | REVIEW | Same Birth of Venus mixed fragment                                    | MEDIUM   | Grounded proposition, but the same review boundary was bypassed.                                                        |
| Gemma | REVIEW | Medici orange-tree hypothesis                                         | HIGH     | `would seem` / `considered an emblem` became the factual `simbolizan`; uncertainty was lost.                            |

There are no false KEEP rows among the 18 GOLD REJECT examples. Gemma nevertheless fails the safety gate because its HIGH false KEEP is a material unsupported strengthening.

## Performance

| Metric                  |         qwen2.5:14b |           gemma4:12b |
| ----------------------- | ------------------: | -------------------: |
| Calls                   |                  30 |                   30 |
| Successful calls        |                  30 |                   29 |
| Total runtime           |              87.0 s |               92.0 s |
| Mean latency            |             2.901 s |              3.067 s |
| p50                     |             2.295 s |              2.404 s |
| p95                     |             4.290 s |              4.881 s |
| Input + output tokens   |              15,438 |               14,511 |
| GPU VRAM peak           |           9,685 MiB |            9,683 MiB |
| Approx. GPU utilization | 82% mean / 99% peak | 72% mean / 100% peak |

Both models fit entirely within the RTX 5070 12 GB envelope during this benchmark.

## Verdict

`SEMANTIC_EVIDENCE_V2 = FAIL`

V2 solves schema reliability and offset fragility, but neither model improves the deterministic baseline overall:

- Qwen is the safer candidate, yet drops KEEP recall from 9/16 to 8/16, lowers precision from 100% to 88.9%, and has poor role/dimension calibration.
- Gemma matches deterministic recall at 9/16 but lowers precision to 81.8% and produces one HIGH false KEEP.
- Both models fail to use `REVIEW` as intended.

Exact blockers:

1. `PROMPT_CONTRACT`: role and dimension meanings are enumerated but insufficiently defined; models systematically misuse `CONTEXT_FOR` / `SUPPORTS_RELATION` and dimensions.
2. `DECISION_CALIBRATION`: ambiguous GOLD REVIEW rows are polarized into KEEP/REJECT.
3. `PROPOSITION_VALIDATOR`: obvious dates/causality are caught, but uncertainty preservation and entity-centeredness are not enforced reliably.
4. `CLASSIFIER_COMPOSITION / EVALUATION`: `SEMANTIC_ONLY` and `HYBRID` do not currently produce distinct experimental treatments, so Hybrid improvement cannot be established.

No semantic model is frozen, no model is removed, and the editorial showcase is not started.
