# JANO Editorial Bilingual Batch Policy

Every public editorial batch is bilingual by default.

## Grounding recovery gate — supersedes previous completion reports

Do not start Batch 007 until the recovery of the existing 138 field-covered
entities has passed. See [recovery status](editorial-grounding-recovery-20260909.md).
Historical batch PASS reports and nonempty-field counts are not claim-level
certifications.

- `BILINGUAL_FIELD_COVERAGE`: all four fields are nonempty; no quality implication.
- `EDITORIAL_VERIFIED_BILINGUAL`: every material claim in both languages has an
  explicit allowed public grounding mapping and all checks below pass.
- `FIELD_COVERAGE_BACKLOG = TOTAL_ENTITIES - BILINGUAL_FIELD_COVERAGE`.
- `TRUE_EDITORIAL_BACKLOG = TOTAL_ENTITIES - EDITORIAL_VERIFIED_BILINGUAL`.

Report published-only equivalents separately. Zero certified entities means
none have passed the gate, not that every entity has been proven defective.
Never reuse `EDITORIAL_COMPLETE_BILINGUAL` for a field-presence query.

Retain an immutable input snapshot and a deterministic claim ID/fingerprint,
proposition, source/locator, qualifiers, attribution, certainty, target entity
and permitted use for every usable public claim. Map each material editorial
claim to those inputs. A bibliography entry or unread URL is not entailment.
Private ResearchEvidence is not a public generation input.

Preserve structured field semantics: `Entity.startYear`/`endYear` alone do not
establish birth, execution or completion dates. Typed birth/death fields may
support those events. Conflicting canonical inputs must be recorded as
`CANONICAL_INPUT_CONFLICT`; exclude the disputed proposition without changing
the knowledge core or arbitrarily selecting a preferred value.

Classify relationship uses as `RELATION_GROUNDED`,
`RELATION_NAVIGATIONAL_ONLY` or `RELATION_OVERREACH`. An edge, mechanical
justification or generic MENTIONS citation alone cannot establish influence,
intention, significance, causation or visual interpretation.

Verification requires zero unsupported claims, contradictions, false precision,
qualifier/attribution loss, relation overreach, private leakage, system prose,
ES/EN factual mismatch and invalid/self Rich Text links. Regex scans are
diagnostics, not semantic approval. Preserve passing prose unchanged.

Audit classifications are `VERIFIED_EDITORIAL`, `NEEDS_REPAIR`,
`INSUFFICIENT_GROUNDED_KNOWLEDGE` and `BLOCKED`; record the reason and unresolved
checks. Clearly label provisional classifications until semantic review ends.
For each repair retain all four before/after fields, claims/sources/relations
used and rejected unsupported sentences. Update ES/EN together using an
optimistic comparison with the snapshot and an atomic editorial-only write.

Visit every repaired route in both locales and check language toggles; visually
inspect at least ten representative repairs when ten or more are changed.
An unavailable development application is BLOCKED, never Playwright PASS.
Run pre-application previews where available and post-application verification
against the authoritative infra frontend → infra backend → infra-db-1/jano.

After recovery passes, Batch 007 stays at 20. Consider Batch 008 at 50 only
after Batch 007 independently passes the same grounding and browser gates.

For each selected entity, a batch must produce and validate:

- `SUMMARY_ES`
- `ESSAY_ES`
- `SUMMARY_EN`
- `ESSAY_EN`

The four fields must derive from the same grounded claim set: published CanonicalAssertions, eligible structured facts, eligible published Relations, public provenance and qualified canonical propositions. Translation is not a substitute for grounding.

When local public grounding is too sparse, editors may consult a public
institutional web source or document (museum, archive, heritage body, artist
estate or official collection). Record the exact URL or document and the claims
it supports in the batch artifact. External research may strengthen editorial
grounding, but must not mutate Entities, Relations, CanonicalAssertions,
Sources, SourceRefs, Citations or private research data.

## Required sequence

```text
select entities
→ build grounded claim set
→ write ES summary/essay
→ write EN summary/essay
→ validate factual and qualifier parity
→ validate attribution parity
→ validate meta-language in both languages
→ validate groundedness
→ visit every entity with Playwright in both languages
→ apply editorial translations
→ mark batch bilingual-complete
```

A batch cannot be reported as `REFRESHED` if only one language changed. Use:

- `ES_REFRESHED`
- `EN_REFRESHED`
- `BILINGUAL_REFRESHED`

`BILINGUAL_REFRESHED` requires all four public fields, zero detected meta-language, no unsupported claims, no factual or qualifier mismatch, and successful ES/EN Playwright checks.

## Essay rich text

Essays are rendered as Rich Text. Summaries remain plain text.

- Use `[[slug|Canonical label]]` for the first meaningful mention of a related published entity when that link is supported by the grounded claim set.
- Never link an essay to the entity currently being viewed. Self-links are removed; only references to other entities are meaningful exploration paths.
- Link only canonical, published entities; do not invent links from an isolated graph edge or use links as decoration.
- Keep the prose natural and avoid saturating an essay with links. A short essay may need only one well-chosen reference.
- Use real line breaks between paragraphs and headings such as `## Contexto` / `## Context`. Never store or publish literal `\\n` or `\\n\\n` sequences.
- Validate both the stored Rich Text syntax and the rendered result: links must be clickable, paragraphs must be separated, and no escape sequences may be visible.

The batch order is therefore:

```text
grounded claim set
→ ES summary/essay
→ EN summary/essay
→ Rich Text entity links in both essays
→ parity, groundedness and meta-language validators
→ Playwright in ES and EN
→ apply and mark bilingual-complete
```

The summary is an introduction, not the opening paragraph of the essay. Essay generation must advance
the reading with new context, form, meaning or reception; it must not repeat the complete summary in
either language. The editorial validator checks exact summary-in-essay overlap for `es` and `en`.

Relation justifications now have a separate editorial layer:

`EditorialRelationJustification`

This layer does not mutate canonical `Relation` / `RelationTranslation`. It stores bilingual editorial
prose, review status, claims used and public sources used. Only `APPROVED` entries can override the
canonical justification in the public entity and graph responses; otherwise the canonical value remains
the fallback. Canonical relation data, citations and evidence remain read-only for this workflow.
