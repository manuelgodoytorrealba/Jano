# Hybrid semantic runtime benchmark — 2026-08-30

## Frozen configuration

- Commit: `ccc51dad746948631d304c1160529f2fd1a1da9e`.
- Corpus: 51 excerpts; gold fixture reports KEEP 16, REVIEW 14 and REJECT 18.
- Provider: `ollama`; model: `qwen2.5:7b`; base URL: `http://127.0.0.1:11434`.
- Modes: `DETERMINISTIC_ONLY`, `SEMANTIC_ONLY`, `HYBRID`.
- No Source, entity, Knowledge Core, prompt, threshold or gold fixture was changed.

## Results

| Metric                | Deterministic | Semantic only |       Hybrid |
| --------------------- | ------------: | ------------: | -----------: |
| KEEP precision        |         90.0% |  n/a (0 KEEP) | n/a (0 KEEP) |
| KEEP recall           |         56.3% |          0.0% |         0.0% |
| False KEEP            |             1 |             0 |            0 |
| Overall agreement     |         56.9% |         12.0% |        26.0% |
| Proposition accuracy  |         50.0% |          0.0% |         0.0% |
| Support-span accuracy |         50.0% |          0.0% |         0.0% |
| Entity-role accuracy  |         52.9% |         12.0% |        12.0% |
| Dimension accuracy    |          0.0% |          0.0% |         0.0% |

Semantic runtime: 37 provider calls, 35,180 input/output tokens, 212,928 ms total and 5,755 ms mean per call. One long structured-reference excerpt failed twice at the 500-token limit. There were no textual proposition hallucinations, but 36 calls returned an invalid closed contract (missing `decision` and `relevanceRole`); this is a runtime contract failure, not a valid semantic prediction. Hybrid converted those outputs to REVIEW and therefore generated no KEEP.

## Decision

**FAIL.** Hybrid does not improve deterministic-only and is not ready for the editorial showcase. Do not run the 5–10 entity showcase. The smallest next experiment is to make the provider output schema actually closed and typed, then rerun this exact corpus with one model; prompts, thresholds and gold labels remain frozen until that rerun.

## Readiness

| Area                |  Score | Status                                      |
| ------------------- | -----: | ------------------------------------------- |
| Safety              | 88/100 | unchanged                                   |
| Semantic automation | 20/100 | blocked by 36/37 invalid provider contracts |
| Batch operations    | 82/100 | unchanged                                   |
| Canonical promotion | 86/100 | unchanged                                   |
| Overall pipeline    | 63/100 | blocked from semantic progression           |
| Editorial showcase  |  0/100 | not prepared or executed                    |
