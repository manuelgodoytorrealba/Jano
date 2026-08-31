# Editorial showcase gate — 2026-08-31

## Gate

`SHOWCASE_NEEDS_WORK`

Semantic Evidence V3 passed its frozen benchmark and supports a controlled showcase with human review. The
editorial writer did not pass the grounding gate, so no generated copy was applied to the database and the
remaining showcase entities were not generated.

## Semantic prerequisite

- Frozen classifier: `SEMANTIC_EVIDENCE_V3`
- Model: `qwen2.5:14b`
- Deterministic Gold KEEP: `9/16`
- Preserved deterministic KEEP: `9/9`
- Semantic recoveries: `3`
- Final hybrid Gold KEEP: `12/16`
- KEEP precision: `92.3%`
- KEEP recall: `75.0%`
- False KEEP: `1 MEDIUM`; `0 HIGH/CRITICAL`
- Gold REJECT false KEEP: `0/18`

The complete frozen metrics and fingerprints are in
`reports/semantic-evidence-v3-benchmark-2026-08-31.md` and
`artifacts/semantic-evidence-v3-freeze.json`.

## Writer comparison

| Model         | Result   | Evidence                                                                                                                                  |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `qwen2.5:14b` | Rejected | Target-focused after context reduction, but introduced unsupported biographical, chronological and interpretive claims.                   |
| `gemma4:12b`  | Rejected | Severe factual-form errors and malformed Spanish, including corrupted dates and names.                                                    |
| `qwen3.8:27b` | Rejected | Fluent prose, but introduced claims absent from the supplied canonical context; its definition also failed the target-centered validator. |

The 27B run used `think: false`, required by Ollama structured generation to return the JSON object instead of
spending the response budget on hidden reasoning. It took approximately 2 minutes 21 seconds for the rejected
Picasso attempt under partial GPU offload.

## Decisive Picasso audit

The supplied runtime context contained canonical identity dates, a generic existing summary, one institutional
SourceRef without a documentary quote, and explicit graph relations to Cubism, Paul Cézanne, Las señoritas de
Aviñón, Guernica and Georges Braque.

The generated essay additionally asserted, without supplied documentary support:

- simultaneous multiple perspectives as the operative Cubist definition;
- elimination of illusionistic depth;
- a specific progression from early realism to abstraction and expressionism;
- non-Western influences in _Las señoritas de Aviñón_;
- a particular political and formal reading of _Guernica_;
- that the collaboration established the rules of analytical and abstract art.

These statements may be generally plausible, but they are not traceable to the context sent to the writer.
Using parametric knowledge here would violate JANO's public editorial contract. The generated definition also
described “Artista español…” without naming the target and was rejected by the shared validator.

## Product/UI verification before generation

The existing local Guernica page was checked at desktop and mobile widths:

- HTTP rendering and Angular hydration work;
- representative image loads;
- graph and relations render;
- relations remain crawlable as HTML links;
- internal placeholder relation explanations are now omitted from the public presenter while structural links
  remain available;
- the only observed console error was the expected unauthenticated `/api/auth/me` response.

Screenshots are local QA evidence under `output/playwright/`; they are not part of the product commit.

## Root cause

The classifier contract is no longer the blocker. The editorial generation input provides identifiers,
relations and Source metadata, but often lacks promoted documentary quotes. The writer contract asks for
synthesis without making each public assertion traceable to an allowed context item. Larger models therefore
produce better prose while still filling knowledge gaps from parametric memory.

## Required next gate

Add claim-level provenance to the editorial generation result: every factual paragraph or atomic claim must
reference an allowed canonical fact, reviewed Evidence item or supported relation supplied in the request.
Reject any unreferenced claim before applying copy. Re-run the showcase on one rich and one sparse entity before
expanding to all ten.
