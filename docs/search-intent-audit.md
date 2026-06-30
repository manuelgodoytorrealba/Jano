# Search Intent Audit

> Estado: **SUPERSEDED** (2026-06-30)
>
> Auditoría histórica. Su descripción del estado actual y su propuesta dejaron de ser la referencia
> tras la implementación de `SearchIntentService`, `SearchQueryRepository`, la búsqueda sobre
> aliases/tags/details/relaciones y `GlobalSearchComponent`. La arquitectura vigente está en
> [`architecture-overview.md`](./architecture-overview.md); cualquier evolución adicional de Search
> debe partir de una especificación nueva basada en el código actual.

## Goal

Evolve JANO search from literal term matching into intent-aware discovery that can recover entities from incomplete, fuzzy, symbolic, or misremembered descriptions.

Implementation constraint:

- optimize for maintainability, scalability, and minimum viable surface area
- avoid AI unless it clearly outperforms a deterministic or hybrid non-LLM solution
- prefer the smallest architecture that remains correct as the catalog grows

Example target behavior:

- Query: `caja japonesa de madera secreta`
- Query: `caja japonesa de reyes japoneses`
- Desired result: surface `himitsubako` / related concept even when the exact term is missing.

This document audits the current implementation and proposes a phased solution that respects JANO's architecture rule: backend owns search logic, frontend renders and explains it.

## Current State

### What exists today

- Public search endpoint: `GET /api/search`
- Mixed result page: `/search`
- Header instant suggestions use the same endpoint.
- Ranking is PostgreSQL full-text plus `ILIKE` boosts.
- Search indexes only `Entity` records and their editorial translations.
- Search enriches results with graph relations and recommended decks after the initial lexical hit.

Relevant files:

- [backend/api/src/search/search.service.ts](/Users/brain/Desarrollos/Jano/backend/api/src/search/search.service.ts)
- [backend/api/src/search/search.controller.ts](/Users/brain/Desarrollos/Jano/backend/api/src/search/search.controller.ts)
- [backend/api/src/search/dto/search.query.ts](/Users/brain/Desarrollos/Jano/backend/api/src/search/dto/search.query.ts)
- [frontend/src/app/shared/ui/app-chrome/app-chrome.component.ts](/Users/brain/Desarrollos/Jano/frontend/src/app/shared/ui/app-chrome/app-chrome.component.ts)
- [frontend/src/app/features/search/search.component.ts](/Users/brain/Desarrollos/Jano/frontend/src/app/features/search/search.component.ts)
- [docs/search-taxonomy.md](/Users/brain/Desarrollos/Jano/docs/search-taxonomy.md)

### What the backend really does

The search pipeline is currently:

1. Receive text query and optional type/tag filters.
2. Run SQL over `Entity` plus `EntityTranslation`.
3. Score exact/starts-with/contains/full-text matches.
4. If nothing matches, retry with a stopword-reduced version of the query.
5. Fetch matched entities.
6. Build discovery sections from graph relations and recommended decks.

Important implementation detail:

- The code itself admits the current fallback is temporary:
  - `search.service.ts` contains: `replace with proper query-intent parsing if this grows.`

## Audit Findings

### 1. The system is lexical, not conceptual

Root cause:

- Matching depends on exact words being present in:
  - `Entity.title`
  - `Entity.summary`
  - `Entity.content`
  - `EntityTranslation.title`
  - `EntityTranslation.shortDescription`
  - `EntityTranslation.excerpt`
  - `EntityTranslation.essay`
  - `Entity.slug`

Impact:

- If the user does not remember the canonical term, the system usually misses.
- It does not understand paraphrase, analogy, category memory, or "I vaguely remember this object" queries.

Example failure class:

- `himitsubako` will not be found if the record only says `Himitsubako` and the user searches with story fragments, use case, material, or cultural hints.

### 2. There is no first-class synonym or alias model

Root cause:

- `Entity` and `EntityTranslation` have title/description/content, but no explicit alias, synonym, nickname, common misspelling, alternate transliteration, or "remembered as" vocabulary.

Impact:

- Editorial teams cannot teach the system that:
  - `himitsubako`
  - `jimikubako`
  - `secret japanese puzzle box`
  - `japanese wooden trick box`
  - `caja japonesa secreta`
    may all converge on the same concept.

### 3. Tags exist, but search uses them only as filters

Root cause:

- `Tag` and `EntityTag` are present, but the search SQL does not rank by tag labels or tag translations.
- Tags help navigation after you already know what to look for, not retrieval from vague intent.

Impact:

- Valuable taxonomy is underused in ranking.

### 4. Graph enrichment happens too late

Root cause:

- Relations and decks are only used after direct lexical hits are found.

Impact:

- The graph can enrich an answer, but it cannot rescue a failed query.
- Search does not yet reason like:
  - "I do not know the exact object, but it is Japanese, wooden, craft-based, puzzle-like, maybe decorative."

### 5. Header suggestions are optimized for fast exact hits

Root cause:

- Header autocomplete calls the main search endpoint with `limit: 6`.
- It does not expose interpretation states, fallback explanations, or "did you mean this concept?" behavior.

Impact:

- The UI presents confidence it does not actually have.
- For fuzzy queries, users get either weak literal suggestions or nothing.

### 6. The current data model is too thin for memory-based search

Root cause:

- Searchable structured metadata is still narrow.
- Many useful memory hooks are not modeled in a normalized, searchable way:
  - alternate names
  - materials
  - object function
  - region/culture
  - period
  - associated practices
  - motifs
  - common confusions
  - transliterations
  - editorial "search cues"

Impact:

- Even with more entities, retrieval quality will plateau if the vocabulary layer remains weak.

### 7. Collections are only partially connected to search

Root cause:

- Search can suggest editorial decks after a hit.
- Personal collections are not part of the public semantic retrieval model.
- Editorial decks are matched by shallow text overlap and overlapping entity ids.

Impact:

- Collections are not yet acting as semantic discovery objects.
- A curated collection about Japanese craft boxes could be useful as an entry point, but only after another entity has already matched.

## Root Cause Summary

The current search is strong at:

- exact names
- partial names
- title and summary matches
- multilingual literal retrieval
- graph-based enrichment after retrieval

The current search is weak at:

- vague descriptions
- wrong names
- conceptual memory
- alternate phrasings
- common misspellings
- transliterations
- indirect discovery when no lexical hit exists

The core issue is not just "more data". It is "better retrieval language plus better data structure".

## Recommended Solution

## Principle

Do not put LLM reasoning in the frontend.

Instead, add a backend-owned query interpretation layer that transforms a fuzzy user query into structured retrieval signals, then ranks against a richer editorial search index.

Second principle:

- prefer deterministic search architecture first
- add AI only behind a replaceable backend boundary
- require measurable improvement before making AI part of the critical path

## Target Architecture

Proposed backend pipeline:

1. Raw query intake
2. Query normalization
3. Intent interpretation
4. Multi-source candidate retrieval
5. Ranking and explanation
6. Discovery packaging

### 1. Query normalization

Add deterministic preprocessing first:

- lowercase
- accent folding
- punctuation cleanup
- transliteration cleanup
- stopword handling by locale
- typo-tolerant token splitting
- phrase extraction

This is cheap, stable, and should run for every query.

### 2. Intent interpretation layer

Create a backend service, for example:

- `SearchIntentService`

Responsibility:

- turn a fuzzy query into structured signals, such as:
  - candidate aliases
  - candidate object types
  - candidate cultures/regions
  - candidate materials
  - candidate periods
  - candidate concepts
  - candidate tags
  - confidence

The first version does not need an LLM.

Phase 1 interpretation can be rule-driven and taxonomy-driven:

- dictionary of aliases
- transliteration map
- typo map
- token expansions
- tag/concept lookup
- material/culture vocab

Later, an LLM or embedding service can be added behind this layer without changing the frontend contract.

Recommended default:

- no LLM in request path for v1
- no AI dependency for correctness
- AI can be evaluated later as an optional reranker or query expander only if offline benchmarks prove better recovery

### 3. Richer retrieval sources

Search should retrieve candidates from more than `Entity.title/summary/content`.

Recommended searchable sources:

- entity base fields
- entity translations
- tag labels and tag translations
- alias table
- concept entities
- typed detail fields
- relation justifications
- editorial collection/deck titles and descriptions
- optional curated search prompts

### 4. Search explanation contract

Return not only results, but why they appeared.

Examples:

- `matched via alternate name`
- `matched via related concept: Japanese craft`
- `matched via material: wood`
- `matched via editorial cue: puzzle box`
- `interpreted as object + Japan + wood`

This matters because fuzzy search without explainability feels random.

### 5. Two-stage ranking

Recommended ranking strategy:

1. Candidate recall:
   - full-text
   - trigram similarity
   - alias hits
   - tag hits
   - concept hits
   - relation-based expansion

2. Final ranking:
   - exact name boost
   - alias boost
   - concept density
   - structured field matches
   - popularity/editorial priority if desired
   - graph closeness
   - confidence penalty for weak inferred matches

## Data Model Changes

## Minimum viable additions

### A. Entity aliases

Add a first-class alias model.

Suggested model:

- `EntityAlias`
  - `id`
  - `entityId`
  - `locale`
  - `value`
  - `kind`
  - `weight`
  - `source`

Recommended `kind` examples:

- `ALTERNATE_TITLE`
- `COMMON_NAME`
- `MISSPELLING`
- `TRANSLITERATION`
- `NICKNAME`
- `SEARCH_HINT`

Why this matters:

- This is the cleanest way to encode "users might remember it like this".

### B. Searchable tag translations

Use tags as retrieval features, not only filters.

Needed:

- include `TagTranslation` and tag labels in search candidate generation
- optionally add tag weights into ranking

### C. Search cues on translations or details

If you want faster rollout before a full alias system, add editorial `searchHints`.

Options:

- new `searchHints` field on `EntityTranslation`
- or a separate `EntitySearchCue` table

A separate table is cleaner if you expect scale and editorial governance.

### D. Better typed metadata coverage

Promote key "memory hooks" into structured searchable fields, especially for object-like entities and concepts:

- material
- technique
- object function
- culture
- region
- location
- period
- style
- alternate spellings

Some detail fields already exist, but they are not being used by search ranking and are not normalized enough yet.

## Search Surface Changes

## Public search UX

The search page should stay calm and premium, but get smarter about uncertainty.

Recommended additions:

- interpretation line:
  - `Searching for: Japanese wooden puzzle box`
  - `Interpreted as: object, Japan, wood, puzzle`
- "Possible matches" section for low-confidence inferred results
- "Related concepts" section that can appear even when direct entity matches are weak
- "Try these terms" chips generated from aliases/tags/concepts

## Header autocomplete

Do not overload it with full reasoning.

Recommended behavior:

- keep quick suggestions
- add one line when fuzzy interpretation is active:
  - `Search conceptually for "caja japonesa secreta"`
- optionally include top concept suggestion before raw result list

## Collections and editorial decks

Collections should become a retrieval layer, not only a post-hit decoration.

Recommended:

- searchable editorial deck vocabulary
- deck-level tags/concepts
- deck-level aliases or search cues
- optional deck types such as:
  - object family
  - movement primer
  - cultural path
  - visual motif

This is especially useful when a user remembers a theme better than an entity.

## Implementation Phases

## Phase 0: Audit and instrumentation

Do first:

- log search queries
- log zero-result queries
- log reformulations
- log clicked result position
- identify recurring fuzzy-search failures

Without this, ranking work becomes guesswork.

## Phase 1: Deterministic semantic recall

Build now without external AI dependency:

1. Add alias/search cue model
2. Add tag labels and tag translations into retrieval
3. Add trigram similarity for typo tolerance
4. Expand search SQL into multi-source recall
5. Return explanation metadata
6. Add tests for vague and wrong-name queries

Expected outcome:

- major quality jump for fuzzy and imperfect queries
- stable, explainable behavior

## Phase 2: Taxonomy expansion

Editorial/data work:

1. Add more concept entities
2. Add object-family concepts
3. Add cultural concepts
4. Add structured aliases
5. Add richer tags
6. Add editorial decks with search cues

Important:

- More entities alone are not enough.
- The expansion must include vocabulary, aliases, concepts, and relations.

## Phase 3: Query interpretation service

Add a dedicated backend module:

- `backend/api/src/search-intent/`

Capabilities:

- identify likely concepts
- classify query as person/object/movement/theme/place
- expand query terms
- assign confidence

This can begin with rules and later add embeddings or LLM-assisted parsing.

## Phase 4: Semantic retrieval

Only after phases 1 to 3 are stable:

- embeddings for entities, aliases, tags, decks, and concepts
- vector recall for abstract queries
- hybrid ranking: lexical + graph + semantic

Why not start here:

- semantic search without editorial vocabulary and explainability can feel magical but unreliable
- JANO needs premium trust, not opaque guesses

## Concrete Recommendations for JANO

## What I would build first

1. `EntityAlias` model
2. search ranking over alias and tag vocabulary
3. trigram similarity fallback
4. explanation fields in API response
5. query analytics for zero-result and reformulation tracking
6. editorial workflow for aliases and search cues

This gives the best return with the least architectural risk.

Why this is the optimal low-garbage path:

- small number of new concepts
- stays inside PostgreSQL and current backend ownership model
- does not create an AI dependency for every request
- gives editors explicit control over why search works
- scales with more entities without inventing hidden heuristics everywhere

## What I would not do first

- Put OpenAI directly in the request path for every search
- Hide interpretation in the frontend
- Add lots of entities without alias/taxonomy strategy
- Ship semantic vectors before measuring zero-result behavior

Also avoid:

- scattered per-feature search heuristics
- magic synonym logic embedded in components
- over-modeling ten new tables before proving recall gains
- brittle prompt-based rewriting without benchmark coverage

## Proposed Initial Backlog

### Backend

- Add `EntityAlias` Prisma model and migration
- Extend search service to query aliases and tag vocabulary
- Add explanation metadata to `SearchResult`
- Add query analytics storage or structured logging
- Add tests for misspellings, paraphrases, and concept-driven matches

### Admin

- Add alias editor to admin entity form
- Add "search cues" guidance for editors
- Add lightweight governance for alias kinds and weights

### Data

- Seed concept vocabulary for:
  - object types
  - materials
  - cultures
  - periods
  - common alternate names
- Create initial alias packs for top discovery entities
- Build editorial decks that can act as search landing routes

### Frontend

- Show explanation badges/reasons in search results
- Add "possible match" and "related concept" states
- Keep header autocomplete fast and minimal

## Risks

### Risk: Too much AI too early

If you jump directly to LLM rewriting, results may feel clever but unstable, expensive, and hard to debug.

Mitigation:

- deterministic layer first
- measured semantic layer second

### Risk: Taxonomy drift

If aliases, tags, and concepts are added ad hoc, search quality will degrade over time.

Mitigation:

- clear naming conventions
- editor guidelines
- weights and source metadata

### Risk: Frontend and backend diverge

If query interpretation leaks into frontend heuristics, the product becomes dual-truth.

Mitigation:

- keep interpretation backend-owned
- frontend only displays interpretation output

## Success Metrics

Track:

- zero-result rate
- reformulation rate
- click-through rate on first search
- mean reciprocal rank for curated test queries
- top 50 fuzzy query benchmark set
- successful recovery of wrong-name queries

Example benchmark categories:

- misspelling
- alternate language
- transliteration error
- material-based memory
- culture-based memory
- function-based memory
- visual motif memory
- "I forgot the exact name" description

## Suggested Next Build Step

The most sensible next implementation step is:

1. create `EntityAlias`
2. wire alias retrieval into `SearchService`
3. add result explanations
4. seed a first batch of aliases and concepts for validation

That gives JANO a true foundation for abstract search without overcommitting to a black-box AI path.

## Revised Recommendation With Maintainability Priority

If maintainability is the main decision driver, the recommended order is:

1. strengthen the current Postgres-based engine
2. add one explicit editorial vocabulary layer
3. benchmark recall on fuzzy queries
4. only then test AI as an optional enhancement

So the preferred architecture is:

- lexical search
- alias search
- tag/concept search
- trigram typo tolerance
- relation/deck expansion
- explainable ranking

Only if this still fails materially on benchmark queries should we test:

- embedding recall
- LLM-assisted query expansion
- AI reranking

Even then, AI should remain:

- backend-owned
- optional
- measurable
- removable without redesigning the product
