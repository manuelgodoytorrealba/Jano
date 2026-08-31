# Claim-level editorial V1 — 2026-08-31

## Claim Contract

The writer no longer receives a free-form request for `definition`, `summary` and `essay`. The local
pipeline has two explicit phases:

```text
allowed knowledge units → planner → accepted claims → realizer → mapped public sentences → entailment audit
```

The planner must copy a unit statement exactly. This is intentionally stricter than natural-language
paraphrase: it gives this first showcase a deterministic entailment boundary without building an NLI system.
The realizer may write natural Spanish, but every sentence returns `claimIds`. Provenance is never rendered
inline; links are normalized to the existing `[[slug|Canonical name]]` renderer format.

## Allowed Knowledge Units

Only runtime-public material was used:

- `CANONICAL_FACT`: canonical Entity identity, years, type-specific details and published attributes.
- `REVIEWED_EVIDENCE`: only materialized `SourceRef.quote` values. No private `ResearchEvidence` was read.
- `SUPPORTED_RELATION`: published canonical relations with a citation and non-placeholder justification.

Every unit has a stable generation-local ID (`FACT:`, `EVIDENCE:` or `RELATION:`), statement, certainty,
entity IDs and provenance table/record identifiers.

## Provenance Validation

The validator rejects:

- invented or table-name provenance (`Entity:...`, `Relation:...`);
- missing or multiple unresolved unit references;
- planner statements that do not exactly match their referenced unit;
- certainty changes;
- plan references to rejected claims.

Rejected plan references are recorded and never passed to the realizer. Duplicate sentence transport IDs are
renamed deterministically by position; this does not alter claim references.

## Entailment Validation

The planner's exact unit statement gives deterministic claim entailment. Public sentences are then checked by:

- claim IDs existing and mapping to accepted claims;
- numeric additions vetoed;
- links limited to canonical related entities and supported claims;
- target entity named in definition;
- internal JANO language rejected;
- an independent `qwen2.5:14b` sentence audit returning `ENTAILED`, `UNSUPPORTED` or `UNCERTAIN`.

Any `UNSUPPORTED` or `UNCERTAIN` sentence fails the output. This is a bounded showcase validator, not a full
NLI implementation.

## Public Prose Validation

Definition, summary and essay remain natural text. Rich links are permitted only when their canonical entity is
in the linkable context and its name is present in the supporting claim statement. Definition is limited to
320 characters. Editorial depths above `BASIC_EXPLANATION` require at least one section. No public output is
applied automatically.

## Context Fingerprint

Each artifact includes a SHA-256 fingerprint over entity ID, locale, depth, contract version and sorted
knowledge units. This binds an output to the exact context that produced it without introducing persistence or
staleness migrations.

## Rich Entity — Guernica

Available context:

- 7 allowed units: identity, 1937 date, oil technique, oil-on-canvas material, Reina Sofía location,
  `CREATED_BY` Pablo Picasso and `BELONGS_TO_MOVEMENT` Cubismo.
- 0 private ResearchEvidence consumed.
- 2 linkable canonical entities: Pablo Picasso and Cubismo.
- Maximum safe depth: `EDITORIAL_ENTRY`.

Results:

- proposed claims: 7;
- accepted claims: 7;
- rejected claims: 0;
- invalid provenance refs: 0;
- public sentences: 8;
- entailment accepted: 8/8;
- unsupported final claims: 0;
- parametric knowledge test: PASS; omitted bombing circumstances and location did not leak into output;
- definition, summary and essay produced;
- links resolve to canonical Picasso/Cubismo entities.

The output explains only identity, date, technique, material, location, authorship and the stored Cubismo
relation. It does not claim why the work matters historically because the supplied public context does not
contain that knowledge.

Artifact: `artifacts/claim-level-editorial-v1-guernica.json`.

## Poor Entity — Ritual

Available context:

- 2 canonical facts: identity and a ConceptDetails definition;
- 0 public quoted Evidence;
- 0 supported non-placeholder relations;
- maximum safe depth: `IDENTITY_ONLY`.

Results:

- accepted claims: 1 (identity);
- public sentences: 2;
- entailment accepted: 2/2;
- unsupported final claims: 0;
- parametric knowledge test: PASS;
- essay: empty, intentionally;
- no invented examples, ceremonies or historical claims.

The planner conservatively omitted the second definition unit. This is safe but shows that sparse entities need
an editorial review or a subsequent planner correction before they can be useful beyond identity level.

Artifact: `artifacts/claim-level-editorial-v1-ritual.json`.

## Parametric Knowledge Test

`Guernica` was deliberately evaluated with bombing circumstances and location details omitted from supplied
knowledge. None appeared in accepted claims or final prose. `Ritual` was evaluated with specific ritual examples
omitted; none appeared.

Result: `PASS` for both entities.

## Claim-Level Verdict

`PASS` for the narrow claim-level grounding gate:

- 100% accepted claims have valid provenance;
- 0 invented provenance refs;
- 0 unsupported final claims according to independent audit;
- uncertainty and target focus preserved;
- canonical links resolve;
- sparse context reduced depth instead of filling gaps.

This does not mean the copy is ready to publish. Guernica's current context is factually safe but editorially
thin; Ritual is correctly minimal. Human editorial review remains required.

## Next Gate

`EXPAND_TO_10_ENTITY_SHOWCASE` is technically allowed, but the next execution must first review the two local
artifacts and approve their actual prose. No DB apply, public publication, Source processing or Knowledge Core
promotion was performed in this phase.
