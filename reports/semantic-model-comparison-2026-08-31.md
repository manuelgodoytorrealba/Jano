# Semantic evidence model comparison — 2026-08-31

## Frozen configuration

- Commit: `dea455df1a5534abc07842ea844cc64e35f62644`.
- Corpus hash: `24a89a04915c35f649ce5b176384eb8c4bd6cbfd70cbf5df68f07f146c7cdd70`.
- Corpus: 51 unique excerpts; decision metrics use 48 rows (`KEEP` 16, `REVIEW` 14, `REJECT` 18); role metrics use 51 rows.
- Modes: `DETERMINISTIC_ONLY`, `SEMANTIC_ONLY`, `HYBRID`.
- Provider: local Ollama; temperature `0.2`; maximum output `500` tokens; one retry; 60-second request timeout.
- Prompt, JSON schema, deterministic gates, thresholds, validators, gold labels and corpus were unchanged between models.
- Ollama was updated locally from `0.17.7` to `0.33.2` because `gemma4:12b` requires at least `0.30.5`. The old binary remains at `/usr/local/bin/ollama-0.17.7`.

## Hardware fit

| Model             | Parameters | Quantization |   Disk | Runtime size | Execution | Observed VRAM peak |
| ----------------- | ---------: | ------------ | -----: | -----------: | --------- | -----------------: |
| `qwen2.5:14b`     |      14.8B | Q4_K_M       | 9.0 GB |       9.7 GB | 100% GPU  |         ~9,923 MiB |
| `ministral-3:14b` |      13.9B | Q4_K_M       | 9.1 GB |      10.0 GB | 100% GPU  |         10,639 MiB |
| `gemma4:12b`      |      11.9B | Q4_K_M       | 7.6 GB |       8.1 GB | 100% GPU  |          8,905 MiB |

All three fit completely in the RTX 5070 12 GB. CPU load was low and approximately 23–24 GiB of system RAM remained available during spot checks.

## Deterministic baseline

| Metric                   | Result |
| ------------------------ | -----: |
| KEEP precision           |  90.0% |
| KEEP recall              | 56.25% |
| REVIEW rate              | 20.83% |
| REJECT rate              | 58.33% |
| False KEEP               |      1 |
| False REJECT             |      4 |
| Overall agreement        | 60.42% |
| Exact proposition match  |  50.0% |
| Exact support-span match |  50.0% |
| Entity-role accuracy     | 52.94% |
| Dimension accuracy       |   0.0% |

Confusion matrix (`prediction → gold KEEP/REVIEW/REJECT`): `KEEP 9/0/1`, `REVIEW 3/5/2`, `REJECT 4/9/15`.

The false KEEP is the Cy Twombly authority dump classified as `GENERAL_REFERENCE`. Severity: **HIGH** — the text names the correct entity and is literal, but it is structured authority metadata and not usable editorial Evidence.

## Model comparison

| Metric                                    | Qwen 2.5 14B | Ministral 3 14B |     Gemma 4 12B |
| ----------------------------------------- | -----------: | --------------: | --------------: |
| Structurally parsed JSON                  |         100% |            100% | at least 97.30% |
| Accepted by parser-level contract         |       40.54% |          10.81% |          51.35% |
| Truncated                                 |           0% |              0% |           2.70% |
| Invalid enum                              |           0% |              0% |              0% |
| Missing required field                    |           0% |              0% |              0% |
| Invalid exact support span                |       59.46% |          89.19% |          24.32% |
| Invalid KEEP proposition/span combination |           0% |              0% |          21.62% |
| KEEP precision                            | n/a (0 KEEP) |    n/a (0 KEEP) |    n/a (0 KEEP) |
| KEEP recall                               |           0% |              0% |              0% |
| REVIEW rate                               |       29.17% |          37.50% |          22.92% |
| REJECT rate                               |       70.83% |          62.50% |          77.08% |
| False KEEP                                |            0 |               0 |               0 |
| False REJECT                              |            5 |               4 |               8 |
| Overall agreement                         |       39.58% |          37.50% |          43.75% |
| Exact proposition match                   |           0% |              0% |              0% |
| Exact support-span match                  |           0% |              0% |              0% |
| Entity-role accuracy                      |       54.90% |          49.02% |          35.29% |
| Dimension accuracy                        |        3.33% |              0% |              0% |
| Average latency                           |     6,611 ms |        6,306 ms |        3,538 ms |
| p50 latency                               |     6,980 ms |        5,768 ms |        3,392 ms |
| p95 latency                               |    10,396 ms |        9,137 ms |        6,538 ms |
| Total model time (37 calls)               |     244.59 s |        233.32 s |        130.90 s |
| Diagnostic tokens                         |       29,071 |          53,560 |          25,276 |

Hybrid confusion matrices (`prediction → gold KEEP/REVIEW/REJECT`):

- Qwen: `KEEP 0/0/0`, `REVIEW 11/2/1`, `REJECT 5/12/17`.
- Ministral: `KEEP 0/0/0`, `REVIEW 12/3/3`, `REJECT 4/11/15`.
- Gemma: `KEEP 0/0/0`, `REVIEW 8/3/0`, `REJECT 8/11/18`.

## Evaluation limitations and root cause

The JSON transport is no longer the main failure. Every Qwen and Ministral call, and at least 36/37 Gemma calls, produced parseable structured JSON. The lower “valid schema” figure emitted by the current script is actually the parser-level contract acceptance rate; proposition validation runs afterwards.

The current contract asks the model to emit exact character offsets but the prompt never defines how to calculate them. The application then requires `excerpt.slice(start, end) === text`. This caused 22 Qwen, 33 Ministral and 9 Gemma calls to fail before a semantic KEEP could survive.

The proposition evaluator is also not an entailment evaluator. It requires the proposition to be a literal substring and the benchmark scores exact string equality with gold. Its reported `0%` must therefore be read as **exact textual match**, not proposition entailment accuracy. The field currently named `hallucinations` counted 10 Qwen, 1 Ministral and 5 Gemma propositions rejected by that literal validator; those are not proven hallucinations and can include grounded paraphrases.

No model recovered any of the 16 gold KEEP rows as semantic or hybrid KEEP, and no semantic prediction retained a valid support span. Zero false KEEP is therefore trivially safe, not evidence that Hybrid has passed.

## JANO verdict

No candidate meets `SEMANTIC_EVIDENCE_MODEL_V1` quality gates. Diagnostic ordering only:

1. `gemma4:12b`: best application acceptance and speed, but zero useful KEEP and weakest role accuracy.
2. `qwen2.5:14b`: best role accuracy and established baseline, but 22 invalid spans and zero useful KEEP.
3. `ministral-3:14b`: 33 invalid spans and the largest token burden.

`qwen3.8:27b` was not downloaded. Its official Ollama manifest is 17.74 GB, requiring partial CPU/RAM offload on this machine. Measuring a larger model against the same underspecified offset contract would not isolate model capability.

## Sequential scale estimate

These are **EXTRAPOLATED** from mean latency and assume the same 37/51 deterministic hard-gate pass rate, one local worker and no batching.

| Model           | 10k candidates | 50k candidates | Approx. tokens at 10k | Approx. tokens at 50k |
| --------------- | -------------: | -------------: | --------------------: | --------------------: |
| Qwen 2.5 14B    |         13.3 h |         66.6 h |                 5.70M |                 28.5M |
| Ministral 3 14B |         12.7 h |         63.6 h |                10.50M |                 52.5M |
| Gemma 4 12B     |          7.1 h |         35.6 h |                 4.96M |                 24.8M |

## Decision

**SEMANTIC_MODEL_SELECTION_NEEDS_WORK.** Do not freeze a model and do not start the editorial showcase. The next controlled change should remove model-generated offsets from the trust boundary: request an exact quote, locate it deterministically, and evaluate proposition paraphrases for strict entailment rather than literal equality. Then rerun the same frozen corpus as a new contract version across Qwen and Gemma only.
