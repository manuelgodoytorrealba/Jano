# JANO Editorial Bilingual Batch Policy

Every public editorial batch is bilingual by default.

For each selected entity, a batch must produce and validate:

- `SUMMARY_ES`
- `ESSAY_ES`
- `SUMMARY_EN`
- `ESSAY_EN`

The four fields must derive from the same grounded claim set: published CanonicalAssertions, eligible structured facts, eligible published Relations, public provenance and qualified canonical propositions. Translation is not a substitute for grounding.

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

Relation justifications remain a separate state:

`EDITORIAL_RELATION_JUSTIFICATION_BLOCKED`

They must not be edited while their storage remains in canonical `Relation` / `RelationTranslation`.
