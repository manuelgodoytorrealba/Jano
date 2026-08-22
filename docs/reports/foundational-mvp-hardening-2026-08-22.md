# Foundational MVP hardening — evidence snapshot

## 1. Baseline

Before: 768 entities, 2,340 relations. The 300-query benchmark did not exist before this phase, so no honest pre-change product score can be asserted. Current API result: 289/300 PASS (96.3%).

## 2. Factual Integrity Audit

`CREATED_BY` is now validated as `ARTWORK → ARTIST`. Removed false authorships to Aristotle, Vitruvius, Sophocles, Dionysius, Islamic art and Rococo. Entity-resolution errors included Homer/Winslow Homer and Otobong Nkanga/Double Plot. The generic architectural-material rule was also false: it assigned marble to six heterogeneous buildings. It was removed; the Great Mosque of Djenné was additionally detached from concrete and glass. UNESCO documents its sun-dried earth, mud plaster and wood construction: [UNESCO](https://whc.unesco.org/en/urban-heritage-atlas/djenne/).

## 3. Fixed Errors

- The Gulf Stream → Winslow Homer.
- Object to Be Destroyed → Man Ray.
- Shibboleth → Doris Salcedo.
- Double Plot (2018) → Otobong Nkanga.
- Ten archaeological/anonymous works no longer invent a creator.
- Six generic marble attributions to architecture, plus Djenné → concrete/glass, retired.
- Toledo duplicate merged to `toledo`.

## 4. Taxonomy Audit

The active domain supports ARTIST but not architect, philosopher, writer, critic or cultural tradition. Aristotle, Augustine, Homer, Sophocles, Pliny and Vitruvius therefore remain PERSON/ARTIST only as a current domain limitation; no schema migration was made.

## 5. Semantic Graph Audit

Representation had 217 relations; 164 were automatic `PART_OF` edges. The automatic mechanism was removed. It now has 53 explicit edges. Period relations remain structural and must not be treated as semantic similarity.

## 6. Low Connectivity Review

20 degree-1 nodes are retained: historical makers, lightweight periods/formats, places and a few concepts. 101 concepts now have degree 0 because their only edge was artificial. They are candidates for `KEEP STRUCTURAL` (search vocabulary) or future editorial pruning; no automatic deletion was made. Zero degree is deliberately no longer hidden by generic relations.

## 7. MVP Search Benchmark

300 fixed, editorially curated ES/EN queries in `backend/api/scripts/foundational-search-benchmark.ts`; API result: 289 PASS, 11 MISS. Exact/useful are currently both 96.3% because this first version has no PARTIAL classifier.

## 8. Search Coverage by Category

People 95/100; works 70/74; movements 48/51; concepts 35/35; places 20/20; techniques/materials 20/20.

## 9. Search Coverage by Period

The misses concentrate in prehistoric/ancient naming variants, not in the seeded Renaissance–contemporary core. Period tagging is the next benchmark enhancement.

## 10. Search Coverage by Geography

The benchmark has functional entries for Western Europe, North America, Latin America, East Asia, Africa, South Asia, Mesoamerica and Andes. It does not yet calculate a numerical regional score.

## 11. Search Coverage by Discipline

Painting, sculpture, architecture, photography, printmaking, performance and installation have benchmark entries. Design, decorative arts and moving image remain lighter.

## 12. Initial Misses

P1: Munch/The Scream, Bernini, Giacometti, Nevelson, Nighthawks, Campbell's Soup Cans, The Treachery of Images, Prehistory/Paleolithic/Ancient art. These are intentionally not added merely to improve a score.

## 13. Targeted Additions

Winslow Homer (resolves creator identity); Doris Salcedo (Shibboleth); Otobong Nkanga and Double Plot (identity correction). No expansion was needed to meet MVP coverage.

## 14. Removed / Merged Entities

`toledo-espanol` merged into `toledo`. False authorship edges are retired idempotently on seed execution.

## 15. Aliases Added

Leonardo, Goya and Birth of Venus.

## 16. Search Verification

The benchmark calls the actual `/api/search` endpoint, not direct SQL.

## 17. Playwright Verification

Playwright navigated 85 search routes: 28 people, 20 distinct works, 10 movements, 10 concepts, 5 places/institutions and 5 techniques/materials (plus repeat ES/EN title variants). Visual snapshots confirmed entity-first results for Picasso, Fallingwater, Marble and The Body as Archive. No seeded Research result appeared (`Research 0`).

## 18. Final Search Coverage

770 catalog entities, 2,159 catalog relations; 96.3% API PASS. The database may contain non-foundational product records, which are excluded from these figures.

## 19. Must-Exist Regression Set

The regression spec guards 61 canonical MVP entries spanning people, works, movements, concepts, media and institutions; it is intentionally smaller than the non-blocking 300-query benchmark.

## 20. Remaining MVP Gaps

The P1 misses above; person/tradition subtype taxonomy; explicit author-status for anonymous/collective production; editorial decision on isolated vocabulary concepts.

## 21. Files Changed

Catalog/expansion fixtures, seed cleanup, authorship validation, benchmark command and regression test.

## 22. Commands

`npm run foundational:validate`  
`npm run seed:foundational`  
`npm run foundational:search-benchmark`  
`JANO_API_URL=http://localhost:3000/api node -r ts-node/register scripts/foundational-search-benchmark.ts`  
`npm test -- --runInBand src/foundational/foundational-catalog.spec.ts src/foundational/foundational-search-benchmark.spec.ts`
