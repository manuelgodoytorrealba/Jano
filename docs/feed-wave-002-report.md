# JANO Knowledge Feed — Wave 002

**READY_FOR_HUMAN_REVIEW. Ingesta terminada; ninguna aprobación ni apply canónico.**

## Strategy
Reanudar desde el estado persistido, verificar su cierre y preparar la revisión privada. Se reutilizó la exportación de lectura y las funciones congeladas de identidad, comparación de afirmaciones, Relation Mapping V2 y Coverage. No se repitieron descargas, Evidence, propuestas ni llamadas al modelo.

## Wave 002 Baseline
| Métrica | Baseline | Actual |
|---|---:|---:|
| ENTITIES | 813 | 813 |
| RELATIONS | 1388 | 1388 |
| CANONICAL_ASSERTIONS | 24 | 24 |
| SOURCES | 590 | 722 |
| SOURCE_REFS | 850 | 850 |
| CITATIONS | 1411 | 1411 |

Cobertura baseline: MISSING 4, WEAK 771, ADEQUATE 36, STRONG 2; LOW/WEAK 775. ORPHANS 125; RESEARCH_QUEUE_SIZE 812. Sources aumentó por 132 registros bibliográficos autorizados; no se añadieron SourceRefs canónicos.
Wave 001: apply SUCCESS, segunda ejecución de idempotencia PASS, leakage registrado 0; no se repitió.

## Selection
100 objetivos existentes: {'NICHE_OR_ORPHAN': 10, 'WEAK_LOW_COVERAGE': 70, 'STRATEGIC_CONNECTED': 20}.
Distribución por tipo: {'TEXT': 1, 'ARTICLE': 5, 'EVENT': 7, 'PERSON': 9, 'PERIOD': 11, 'ORGANIZATION': 11, 'PLACE': 9, 'ARTIST': 11, 'ARTWORK': 12, 'CONCEPT': 12, 'MOVEMENT': 12}. Lista completa: `artifacts/feed-wave-002-selection.json`.
La selección diversa no garantiza enriquecimiento diverso: el acceso efectivo concentró el resultado en arte conceptual y Black Mountain College. No se presenta la selección de 100 como 100 entidades mejoradas.

## Sources
| Métrica | Total |
|---|---:|
| Seleccionadas | 134 |
| Recorridas | 134 |
| Contenido adquirido/reutilizado y preparado | 36 |
| Efectivas | 24 |
| Sin Evidence útil, incluidas inaccesibles | 110 |
| Fallo de acceso/preparación | 98 |
| HTTP 403 | 80 |
| HTTP 429 | 16 |
| Otros errores de descarga | 2 |
| Fallo posterior de extracción de propuestas | 6 |
| Excerpts | 54 |
| Evidence privada | 47 |

Efectividad: **24/134 = 17,91 %** (24/36 = 66,67 % sobre preparadas). 26 fuentes generaron Evidence, pero 2 solo aportaron contexto retórico/operativo. Por ello no se cuentan como efectivas. Se conservaron 47 Evidence únicas; cinco fragmentos no útiles están señalados.
Las 6 fuentes con fallo de propuestas conservan sus Evidence y se difieren. Hay 13 Evidence no enlazadas a propuestas, agrupadas en 7 expedientes de revisión. No se relanzó su extracción. Siete spans curatoriales previamente seleccionados tampoco se procesaron, conforme a la instrucción de no repetir la ingesta terminada.

## Existing Entity Enrichment
**6 entidades con enriquecimiento conservador proyectable**: Arte conceptual, Eugène Delacroix, Las señoritas de Aviñón, Sol LeWitt, Black Mountain College, Josef Albers.
17 propuestas de identidad se resuelven editorialmente hacia 9 entidades existentes. Esto no equivale a 17 entidades nuevas ni a 9 enriquecimientos ya aprobados. Cubismo conserva además una interpretación ambigua frente al conocimiento canónico; David requiere limitar el alcance a la obra concreta.

## New Entity Discovery
42 propuestas ENTITY originales → 33 decisiones de identidad únicas. Nueve identidades nuevas recomendadas: Mario García Torres, Judith Baca, John Cage, Jennifer Allora, Guillermo Calzadilla, Jim Hodges, Lucy Lippard, Six Years, Revolución de julio de 1830.
9 grupos EXISTING_ENTITY; 9 NEW_ENTITY_HIGH_CONFIDENCE; 11 POSSIBLE_ENTITY; 3 MENTION_ONLY; 1 ALIAS_OR_DUPLICATE pendiente (Bauhaus). Aprobadas: 0.
9 repeticiones de identidad se agrupan sin perder su procedencia. 18 propuestas requieren resolución de existente/alias, incluyendo Bauhaus. Tres grupos de frases de bajo valor se recomiendan rechazar como nodos. Las exposiciones con tipo WORK erróneo quedan pendientes, no descartadas por falta de ensayo largo.

## Knowledge
30 propuestas CLAIM originales. Tras recomendaciones atómicas y comparación congelada: **17 NEW_KNOWLEDGE, 12 AMBIGUOUS, 1 SEMANTIC_DUPLICATE**. ADDITIONAL_PROVENANCE, EXACT_DUPLICATE, PARTIAL_OVERLAP y CONFLICTING_KNOWLEDGE detectadas por esta comparación: 0. No es una certificación de ausencia de conflictos; las afirmaciones ambiguas y atributos estructurados requieren revisión.
La repetición sobre Mario García Torres conserva una segunda fuente y se propone unir a W002-K001; no es un duplicado de una afirmación canónica existente. Se mantienen atribuciones a Tate, Walker, Whitney, Louvre y los testimonios personales. Las preguntas retóricas y los enunciados que generalizan desde Chalk a todo el arte conceptual no se recomiendan promover.

## Relations
25 propuestas privadas; **25 BLOCKED_BY_ENTITY**, 0 VALID_RELATION, 0 ADDITIONAL_PROVENANCE_CANDIDATE, 0 ASSERTION_INSTEAD, 0 NO_SUPPORTED_RELATION en la salida efectiva de V2. La barrera de identidad no permite aún una clasificación final del conocimiento relacional.
Diagnóstico hipotético con identidades originales desbloqueadas: 22 REVIEW_MAPPING y 3 BLOCKED_BY_ENTITY. Este diagnóstico no valida las identidades ni autoriza relaciones. Se detectan inversiones de dirección, LOCATED_IN para una investigación artística, CREATED_BY para colaboración y BELONGS_TO_PERIOD aplicado a movimientos/instituciones. No se cambió la taxonomía ni se forzaron aristas. Las proposiciones válidas deberán revisarse como afirmaciones cuando ningún predicado sea fiel.

## Coverage Preview
**PROJECTED**, condicionado a aprobar únicamente las recomendaciones NEW_KNOWLEDGE de identidades existentes resueltas: 6 entidades mejoradas; 5 WEAK → ADEQUATE; 0 ADEQUATE → STRONG; 9 afirmaciones y 8 SourceRefs documentales adicionales.
Potencial independiente: 9 nodos nuevos IDENTITY_ONLY; BASIC_EXPLANATION solo tras aprobar conocimiento. Ninguna mejora editorial larga se presupone. Cero huérfanos existentes resueltos; podrían añadirse 9 huérfanos nuevos mientras no haya aristas aprobadas. Las 6 entidades existentes proyectadas tienen media; los 9 nodos nuevos no tienen media propuesta.

## Human Review
**95 decisiones únicas**, en lotes **20 / 20 / 20 / 20 / 15**: 33 identidades + 25 relaciones + 30 afirmaciones + 7 expedientes de Evidence pendiente. Los 97 registros originales se conservan intactos.
Cada decisión incluye IDs originales, Source URL, soporte literal completo, destino/match, recomendación y riesgo en `artifacts/feed-wave-002-review-summary.json`. El proyecto privado de Research Studio es `cmtoojmz10000k9ss84uo6gl9`.

### Primer lote — W002-B01
Resolver estos ítems no aprueba automáticamente sus relaciones o afirmaciones dependientes. Recomendaciones pendientes; no se ha registrado ninguna decisión humana.

| ID | Entidad / destino | Soporte literal breve y fuente | Recomendación / riesgo |
|---|---|---|---|
| W002-E025 | Bauhaus (tipo pendiente) | “Emerging in the aftermath of WWI and…” [Fuente](https://www.blackmountaincollege.org/materials-sounds-black-mountain-college/) | REVIEW_EXISTING_MATCH. Resolver institución frente a movimiento y dos registros institucionales; no fusionar automáticamente. |
| W002-E008 | Revolución francesa (EVENT) | “Son tableau va constituer une puissante image…” [Fuente](https://musee.louvre.fr/expositions-et-evenements/expositions/jacques-louis-david/oeuvres-en-lumiere/une-icone-de-la-revolution) | RESOLVE_EXISTING. Ya existe como EVENT; corregir ABSTRACTION. El fragmento no justifica conocimiento general de la Revolución. |
| W002-E018 | Las señoritas de Aviñón (ARTWORK) | “Cubism was one of the most influential…” [Fuente](https://www.tate.org.uk/art/art-terms/c/cubism) | RESOLVE_EXISTING. Resolver la variante del título al ARTWORK existente; Cubismo es MOVEMENT, no PERIOD. |
| W002-E006 | Cuadro de Jacques-Louis David (tipo pendiente) | “Son tableau va constituer une puissante image…” [Fuente](https://musee.louvre.fr/expositions-et-evenements/expositions/jacques-louis-david/oeuvres-en-lumiere/une-icone-de-la-revolution) | REJECT_NODE. Frase genérica; la fuente trata Marat assassiné. Identificar la obra antes de cualquier afirmación. |
| W002-E012 | Danilowitz (tipo pendiente) | “Danilowitz addressed the critically important years the…” [Fuente](https://www.blackmountaincollege.org/thinking-ahead/) | DEFER_IDENTITY_OR_SOURCE_CONTEXT. Apellido sin identidad completa en Evidence; diferir. |
| W002-E016 | Merce (tipo pendiente) | ““At 8.30 tonight John Cage mounted a…” [Fuente](https://www.blackmountaincollege.org/a-practice-ground-and-a-laboratory/) | DEFER_IDENTITY_OR_SOURCE_CONTEXT. Nombre incompleto; no inferir apellido. |
| W002-E033 | Rice (tipo pendiente) | “Rice, a brilliant and mercurial scholar who…” [Fuente](https://www.blackmountaincollege.org/history/) | DEFER_IDENTITY_OR_SOURCE_CONTEXT. Apellido incompleto y comienzo de frase truncado; diferir identidad. |
| W002-E013 | The Quick and the Dead (EVENT) | “The Quick and the Dead juxtaposes a…” [Fuente](https://www.walkerart.org/press-releases/the-quick-and-the-dead-examines-the-magic-and/) | DEFER_IDENTITY_OR_SOURCE_CONTEXT. La fuente identifica una exposición; revisar EVENT frente al WORK propuesto. |
| W002-E017 | The Last Picture Show: Artists Using Photography, 1960-1982 (EVENT) | “A comet sculpted from a series of…” [Fuente](https://www.walkerart.org/whats-on/the-last-picture-show-artists-using-photography/) | DEFER_IDENTITY_OR_SOURCE_CONTEXT. La fuente identifica una exposición; revisar EVENT frente al WORK propuesto. |
| W002-E032 | Fascismo en Europa (tipo pendiente) | “The history of Black Mountain College is…” [Fuente](https://www.blackmountaincollege.org/politicsdigitalportal/) | DEFER_IDENTITY_OR_SOURCE_CONTEXT. Revisar concepto independiente frente a contexto histórico; no crear un período por asociación. |
| W002-E002 | Arte conceptual (MOVEMENT) | “In fall 2016, I invited artist Mario…” [Fuente](https://www.walkerart.org/reader/mario-garcia-torres-curatorial-perspective-vincenzo-de-bellis/) | RESOLVE_EXISTING. Unificar variantes; no atribuirle automáticamente hechos de los artistas que lo investigan. |
| W002-E005 | Sol LeWitt (ARTIST) | “LeWitt was also a pioneering voice in…” [Fuente](https://www.walkerart.org/reader/new-sol-lewitt-work-unveiled-on-the-walker-rooftop/) | RESOLVE_EXISTING. Confirmar identidad y soporte; aprobación humana pendiente. |
| W002-E007 | Jacques-Louis David (ARTIST) | “Son tableau va constituer une puissante image…” [Fuente](https://musee.louvre.fr/expositions-et-evenements/expositions/jacques-louis-david/oeuvres-en-lumiere/une-icone-de-la-revolution) | RESOLVE_EXISTING. Confirmar identidad y soporte; aprobación humana pendiente. |
| W002-E014 | Black Mountain College (ORGANIZATION) | “There were also many parties and balls…” [Fuente](https://www.blackmountaincollege.org/a-practice-ground-and-a-laboratory/) | RESOLVE_EXISTING. Confirmar identidad y soporte; aprobación humana pendiente. |
| W002-E019 | Cubismo (MOVEMENT) | “Cubism was one of the most influential…” [Fuente](https://www.tate.org.uk/art/art-terms/c/cubism) | RESOLVE_EXISTING. Confirmar identidad y soporte; aprobación humana pendiente. |
| W002-E030 | Eugène Delacroix (ARTIST) | “Apr&egrave;s la Mort de Sardanapale , c'est…” [Fuente](https://musee.louvre.fr/decouvrir/vie-du-musee/la-restauration-de-la-liberte-rend-justice-au-travail-d-un-coloriste-de-genie) | RESOLVE_EXISTING. Confirmar identidad y soporte; aprobación humana pendiente. |
| W002-E031 | Josef Albers (ARTIST) | “Josef Albers was at the center of…” [Fuente](https://www.blackmountaincollege.org/1-9-frederick-a-horowitz/) | RESOLVE_EXISTING. Confirmar identidad y soporte; aprobación humana pendiente. |
| W002-E001 | Mario García Torres (ARTIST) | “In fall 2016, I invited artist Mario…” [Fuente](https://www.walkerart.org/reader/mario-garcia-torres-curatorial-perspective-vincenzo-de-bellis/) | PROPOSE_NEW_IDENTITY. Confirmar identidad y soporte; aprobación humana pendiente. |
| W002-E009 | Judith Baca (ARTIST) | “Judith Baca is a painter, muralist, and…” [Fuente](https://americanart.si.edu/blog/judy-baca-interview) | PROPOSE_NEW_IDENTITY. La entrevista alterna Judith/Judy; resolver como una persona. |
| W002-E027 | Lucy Lippard (PERSON) | “In early 1973, Lippard’s writing and interest…” [Fuente](https://www.walkerart.org/reader/lucy-lippard-six-years-7500-walker-art-center/) | PROPOSE_NEW_IDENTITY. Nombre completo en título de fuente; pasaje usa Lippard. |

## Observability
| Métrica | Resultado |
|---|---:|
| Model calls lógicas | 69 |
| Cache hits / misses registrados | 0 / 74 |
| AI executions | 26 |
| Runtime del feed | 2231.621 s |
| Errores finales por fuente / etapa | 104 |
| Assessments de targeting | 62 |
| Mismatch / ambiguous | 25 / 28 |
| Confirmed / likely / multi-entity | 3 / 1 / 5 |
| Wrong-target promotion-ready | 0 |

69 invocaciones lógicas del proveedor; no incluye regresión. Los 74 misses son resultados no-hit de cálculos de caché, también deterministas; no equivalen a peticiones HTTP. El contador persistido no incluye cálculos de caché que lanzaron error. No se inventa un conteo de reintentos HTTP ausente.
Métricas de crecimiento: nuevas identidades/fuente efectiva 0,375; conocimiento NEW/fuente efectiva 0,7083; relaciones crudas/fuente efectiva 1,0417; riesgo observado de solo contexto 2/26 = 7,69 %; repeticiones de identidad 9/42 = 21,43 %; targeting para revisión 53/62 = 85,48 %.
Comparación disponible Wave 001: 13/50 fuentes efectivas (26 %); Wave 002 24/134 (17,91 %, −8,09 puntos). La contabilización histórica y los fallos de acceso difieren. No se afirma mejora de calidad ni se comparan aprobaciones reales Wave 001 con potencial no aprobado Wave 002.

## Safety
Mutaciones canónicas de Wave 002: **0** en entidades, relaciones, assertions, SourceRefs y citas. Propuestas convertidas: 0; decisiones humanas: 0. AUTO_CANONICAL_ENTITIES / RELATIONS / ASSERTIONS / EDITORIAL_APPLY: 0 / 0 / 0 / 0. P0: 0; P1: 0 detectados en esta operación.
Sin publicación de Evidence privada; aislamiento verificado mediante ausencia de conversiones y conteos canónicos invariantes. No se presenta esto como una prueba funcional post-apply de toda la API pública.

## Files Changed
Se actualizaron exclusivamente checkpoints y artefactos privados `artifacts/feed-wave-002-*`, junto con este informe. No se modificaron servicios, modelo, configuración ni infraestructura congelada. Los informes requeridos selection/source/targeting/identity/knowledge/entity/relation/review/metrics/coverage están generados.

## Root Cause
Las restricciones HTTP impidieron preparar 98 fuentes; otras 6 fallaron por transporte del proveedor en extracción. El selector por párrafos no produjo excerpts en algunos documentos con saltos de línea. Los errores de identidad/taxonomía permanecen candidatos privados sometidos a revisión. El incidente histórico de escucha de Ollama fue resuelto por el usuario; no se reconfiguró.

## Implementation
Inspección de state.json, orchestrator.json y private-export.json; confirmación de proceso cerrado y ausencia de runner activo. Exportación de solo lectura, agrupación editorial trazable, correcciones propuestas de alcance/identidad, comparación canónica congelada y proyección Coverage sin escrituras canónicas.

## Verification
Wave 001 SUCCESS + idempotencia PASS previamente persistidos. Regresión Semantic Evidence V3 ya completada: 29 tests; corpus 51; precisión 0,9286 y recall 0,8125; cero falsos KEEP altos/críticos. No se repitieron tests ni inferencias completadas.
Comprobación actual: baseline 813/1388/24/850/1411 idéntico al cierre y a la BD; 47 fingerprints Evidence únicos; 95 IDs de revisión únicos; todas las dependencias referencian grupos existentes; todos los JSON parsean. El comprobador reproducible es `python3 artifacts/feed-wave-002-verify-package.py`.
El plan de producto contiene 30 consultas, con búsquedas de aliases, entidades nuevas, rutas multi-hop, desktop/mobile, API y leakage; permanece NOT_RUN_BEFORE_CANONICAL_APPLY.

## Risks / Limitations
La diversidad efectiva y profundidad obtenidas quedan por debajo de la ambición de 100 objetivos. No se fuerza volumen. SourceRefs bibliográficos no equivalen a evidencia documental aprobada. Las clasificaciones automáticas conservan limitaciones de resolución multilingüe, tipos y comparación semántica; las recomendaciones no las convierten en hechos.
El archivo temporal `/tmp/jano-wave002-feed.log` no está disponible en el host actual. El cierre se verificó con finishedAt, los 134 checkpoints y la BD. Los fragmentos curados pendientes y las 6 extracciones fallidas se difieren, sin llamadas repetidas.

## Suggested Next Step
W002-B01 quedó persistido con 20 decisiones humanas en `artifacts/feed-wave-002-b01-persistence.json`. Las decisiones agrupadas conservan todos sus `proposalIds` originales. Los diferidos bloquean únicamente sus dependencias. No efectuar apply canónico sin autorización explícita posterior. W002-B02 está preparado en `artifacts/feed-wave-002-b02.json`; no iniciar Wave 003.

## W002-B01 Persistence

`RESOLVE_TO_EXISTING`: 9; `APPROVE_NEW_ENTITY` pendiente de apply: 5; `DEFER`: 5; `REJECT`: 1. Se utilizó el administrador local activo `hermana@example.com` (Maria) como actor de revisión. El recálculo congelado está en `artifacts/feed-wave-002-dependency-recalc.json`: 8 relaciones y 18 claims pierden el bloqueo de identidad, pero continúan sin aprobación.
