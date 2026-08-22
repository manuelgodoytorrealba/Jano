# FOUNDATIONAL MVP CLOSURE — evidence snapshot

## 1. Executive Result

**FOUNDATIONAL MVP: READY WITH WARNINGS.** The seed meets the search, integrity and discovery thresholds. The only benchmark miss is deliberately non-blocking. The remaining warning is domain taxonomy: `PERSON` is now user-visible and correct, but it is intentionally broad rather than a full philosopher/writer/architect ontology.

## 2. Final Search Closure

Before: 289/300 PASS (96.3%).  
After: 299/300 PASS (99.7%).  
MISS: Louise Nevelson only.

| Initial miss            | Decision   | Outcome                                                                                                  |
| ----------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| Edvard Munch            | ADD        | Person plus _The Scream_.                                                                                |
| The Scream              | ADD        | _El grito_ (1893), with Munch and Expressionism.                                                         |
| Gian Lorenzo Bernini    | ADD        | Person plus _Ecstasy of Saint Teresa_.                                                                   |
| Alberto Giacometti      | ADD        | Person with Paris, body and Surrealism context.                                                          |
| Nighthawks              | ADD        | Work plus Edward Hopper and Art Institute of Chicago context.                                            |
| Campbell's Soup Cans    | ADD        | Work connected to Warhol, Pop Art, consumption, advertising, mass media and MoMA.                        |
| The Treachery of Images | ADD        | Work connected to Magritte, Surrealism, representation and language.                                     |
| Prehistory              | SEARCH FIX | Alias of Paleolithic.                                                                                    |
| Paleolithic             | SEARCH FIX | English alias of Paleolítico.                                                                            |
| Ancient art             | SEARCH FIX | Alias of Antigüedad.                                                                                     |
| Louise Nevelson         | DO NOT ADD | Useful expansion, but not required to make the MVP core navigable; it remains the explicit, visible gap. |

## 3. New Entities

10 entities: Chicago; Edvard Munch; _El grito_; Gian Lorenzo Bernini; _Éxtasis de santa Teresa_; Alberto Giacometti; Edward Hopper; _Nighthawks_; _Latas de sopa Campbell_; _La traición de las imágenes_.

Their identity, dates, aliases and core links are in `prisma/foundational/closure.ts`. Facts were checked against institutional collection material: [Munchmuseet](https://www.munch.no/en/the-scream), [The Art Institute of Chicago](https://archive.artic.edu/hopper/artwork/111628), [MoMA](https://www.moma.org/collection/works/79809), [LACMA](https://collections.lacma.org/object/31931), and [The Met](https://www.metmuseum.org/exhibitions/listings/2012/bernini).

## 4. Search Fixes / Aliases

Added `Prehistory` and `Paleolithic` to Paleolítico, and `Ancient art` / `Arte antiguo` to Antigüedad. Added high-value aliases Munch, Bernini, Giacometti, Hopper, _The Scream_, _Skrik_, _Ecstasy of Saint Teresa_, _Campbell's Soup Cans_, _The Treachery of Images_ and _Ceci n'est pas une pipe_.

## 5. Degree-0 Review

Total reviewed: 101 initial degree-0 concepts.

**DENSIFY NOW (7):** Luz; Feminismo; Museo; Patrimonio; Consumo; Publicidad; Medios de masas. All now have explicit, non-generic relations.

**KEEP SEARCH VOCABULARY (94):** Icono; Alegoría; Canon; Perspectiva aérea; Claroscuro; Sfumato; Tenebrism; Simetría; Proporción; Ritmo; Escala; Espacio; Línea; Textura; Sombra; Huella; Fragmento; Ruina; Monstruo; Animal; Planta; Agua; Fuego; Tierra; Aire; Sagrado; Profano; Secularización; Nación; Frontera; Territorio; Pueblo; Trabajador; Industria; Exposición; Academia; Taller; Escuela; Vanguardia; Posmodernidad; Globalización; Digital; Red; Interactividad; Participación; Archivo vivo; Testimonio; Trauma; Duelo; Esperanza; Utopía; Distopía; Sostenibilidad; Clima; Agua y política; Frontera colonial; Traducción; Poesía; Música; Danza; Teatro; Arquitectura doméstica; Paisaje urbano; Paisaje rural; Cultura popular; Folclore; Cerámica; Textil; Joyería; Moda; Diseño gráfico; Tipografía; Vídeo; Sonido; Realidad virtual; Inteligencia artificial; Sostenibilidad urbana; Restitución; Repatriación; Censura; Activismo; Queer; Discapacidad; Accesibilidad; Cuerpo político; Técnicas de reproducción; Propiedad; Mercado del arte; Conservación; Restauración; Patrimonio inmaterial; Museología; Turismo cultural; Derechos culturales.

**REMOVE FOUNDATIONAL (0):** none. Retaining search vocabulary is more conservative than deleting legitimate future entry points merely because their current cluster is absent. There are now 94 degree-0 vocabulary nodes; this is explicit, not concealed by synthetic graph edges.

## 6. Densification Performed

| Entity                                 | Relations added                                                                    | Reason                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------- |
| Luz                                    | _The Calling of Saint Matthew_, _Impression, Sunrise_, _Girl with a Pearl Earring_ | A basic visual entry point with concrete works.    |
| Feminismo                              | _The Dinner Party_, _Semiotics of the Kitchen_                                     | Defensible feminist-art starting cluster.          |
| Museo                                  | Prado, Louvre, MoMA                                                                | Institutional exploration, not a universal bridge. |
| Patrimonio                             | Benin Bronzes, Great Mosque of Djenné                                              | Existing heritage cases with real cultural stakes. |
| Consumo / Publicidad / Medios de masas | _Campbell's Soup Cans_                                                             | One clear Pop Art case, not generic taxonomy.      |

## 7. MVP Discovery Benchmark

Total entries: 65.  
Direct expected relations: 209.  
Direct resolved: 204.  
Meaningful one-hop: 5.  
Missing: 0.  
Direct Discovery Coverage: **97.6%**.  
Useful Discovery Coverage: **100%**.

One-hop only counts an editorially meaningful intermediary. Periods, Representation, generic places and generic materials are excluded as bridges.

## 8. Discovery by Category

| Category  | Cases | Useful coverage |
| --------- | ----: | --------------: |
| People    |    20 |            100% |
| Works     |    20 |            100% |
| Movements |    10 |            100% |
| Concepts  |    10 |            100% |
| Places    |     5 |            100% |

The selected global/non-Western cases —Kahlo, Hokusai, Ai Weiwei, Benin Bronzes and Djenné— also resolve all expected neighbors. This is a controlled sample, not a claim of equal global coverage.

## 9. Search PASS / Discovery WEAK

None in the 65-case discovery corpus. The one remaining Search MISS, Louise Nevelson, is not a discovery case because it is deliberately not seeded.

## 10. Must-Discover Regression Set

The reproducible set is the 65-case benchmark plus threshold test. It protects, among others: Picasso → Cubism/Guernica/Cézanne; Velázquez → _Las Meninas_/Baroque/Prado; Van Gogh → _Starry Night_/Post-Impressionism; Guernica → Picasso/Cubism/Spanish Civil War/War; Munch → _The Scream_/Expressionism; Warhol → _Campbell's Soup Cans_/Pop Art; Feminism → _The Dinner Party_; and Benin Bronzes → African art/heritage.

## 11. Graph Metrics V2

Relation categorisation: hard fact = `CREATED_BY`, `LOCATED_IN`, `USES_MATERIAL`, `USES_TECHNIQUE`; structural = `BELONGS_TO_PERIOD`, `PART_OF`; historical = `BELONGS_TO_MOVEMENT`, `INFLUENCED_BY`; semantic = `ABOUT_CONCEPT`, `HAS_SUBJECT`, `ASSOCIATED_WITH`.

| Metric             | Relations | Avg incident degree/entity |
| ------------------ | --------: | -------------------------: |
| Raw                |     2,213 |                       5.67 |
| Hard fact          |       556 |                       1.43 |
| Structural         |       485 |                       1.24 |
| Historical         |       450 |                       1.15 |
| Semantic/editorial |       722 |                       1.85 |

`ASSOCIATED_WITH` remains mixed: the metric treats it as semantic, but individual uses must still be read in context.

## 12. Fake Richness / Structural Hubs

Top raw-degree nodes are Siglo XX (218), París (99), Siglo XIX (95), Nueva York (73), Arte conceptual (58), Representación (54), Antigüedad (53) and Edad Moderna (45). These are not used as discovery bridges in the benchmark.

The top direct-discovery score is a 60-case tie at 100%; it includes new focused nodes such as Munch, Bernini, Hopper, _El grito_, _Nighthawks_, _Campbell's Soup Cans_ and _La traición de las imágenes_, not only hubs. This is the desired divergence: raw degree does not decide usefulness.

## 13. Taxonomy MVP Decision

**ARTIST problem:** it was user-visible in entity headers, graph cards and Artist filtering.  
**Decision:** create dynamic `PERSON` (base kind `PERSON`) and reclassify Aristotle, Augustine, Homer, Sophocles, Pliny the Elder and Vitruvius. Playwright confirms Aristóteles now displays “Person”, not “Artist”.  
**Filters/recommendations:** they no longer belong to the ARTIST type; no broad role ontology was added. Philosopher/writer/architect remains a post-MVP subtype decision.

## 14. Playwright Verification

Opened entity pages: 10 people, 10 works, 5 movements and 5 concepts. Visual inspections: Picasso, Aristotle and Feminism.

- Picasso foregrounds Cubism, Paris and Cézanne, while created works remain visible in the reciprocal section.
- Aristotle displays Person.
- Feminism directly exposes _The Dinner Party_ and _Semiotics of the Kitchen_ with no Representation shortcut.
- No Research result is seeded or surfaced in these foundational checks.

No discovery failure was observed in the representative sample.

## 15. Final Foundational Dataset

Entities: **780**.  
Relations: **2,213**.

| EntityClass  | Count |
| ------------ | ----: |
| PERSON       |   208 |
| WORK         |   229 |
| ABSTRACTION  |   265 |
| PLACE        |    54 |
| ORGANIZATION |    18 |
| EVENT        |     6 |

Types: 202 ARTIST, 6 PERSON, 229 ARTWORK, 204 CONCEPT, 52 MOVEMENT, 9 PERIOD, 54 PLACE, 18 ORGANIZATION and 6 EVENT.

## 16. Known Limitations

- Louise Nevelson is the intentional 1/300 search miss.
- 94 legitimate terms are searchable but disconnected until a specific future editorial cluster justifies them.
- `PERSON` is a safe MVP correction, not a disciplinary-role ontology.
- Global discovery sampling passes, but broad global coverage remains a future coverage audit, not evidence from five cases.

## 17. Foundational MVP Freeze

**YES.** [Foundational MVP v1](/home/manuel/Desarrollos/Jano/docs/foundational-mvp-v1.md) freezes generalist expansion. New foundational nodes require a demonstrated search/discovery gap or an approved editorial/research decision.

## 18. Files Changed

`prisma/foundational/closure.ts`; catalog/type/seed-system/seed-foundational files; search and discovery benchmarks; regression specs; entity type label; [freeze policy](/home/manuel/Desarrollos/Jano/docs/foundational-mvp-v1.md).

## 19. Commands

```sh
npm run seed:system
npm run foundational:validate
npm run seed:foundational
JANO_API_URL=http://localhost:3000/api npm run foundational:search-benchmark
npm run foundational:discovery-benchmark
npm run test -- --runInBand src/foundational/foundational-catalog.spec.ts src/foundational/foundational-search-benchmark.spec.ts src/foundational/foundational-discovery-benchmark.spec.ts
npm run typecheck
```
