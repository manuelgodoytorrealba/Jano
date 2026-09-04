# Editorial Quality Benchmark — 2026-08-30

Modo: `CONTEXT_DRY_RUN`. No se escribieron entidades, traducciones, relaciones, fuentes ni atributos.

## Benchmark Dataset

| Tipo            | Entidades                                                     |
| --------------- | ------------------------------------------------------------- |
| Conceptos (4)   | Ritual, Poder, Religión, Muerte                               |
| Artistas (4)    | Pablo Picasso, Caravaggio, Frida Kahlo, Marina Abramović      |
| Obras (4)       | Pinturas de Lascaux, Venus de Willendorf, Guernica, Fuente    |
| Movimientos (3) | Cubismo, Arte rupestre, Surrealismo                           |
| Periodos (3)    | Renacimiento, Siglo XX, Paleolítico                           |
| Lugares (3)     | París, Madrid, Cuzco                                          |
| Otros (3)       | Armory Show, Museo del Prado, Cómo mirar la guerra en el arte |

La selección combina corpus A/B/C, grados relacionales de 0 a 30, conceptos abstractos, obras con incertidumbre arqueológica, artistas hub, instituciones, eventos, artículo y un lugar no europeo.

## Generated Results

El entorno no tiene un proveedor IA habilitado (`AI_PROVIDER= noop`). Por seguridad, el benchmark no inventa 23 resultados ni reutiliza silenciosamente contenido antiguo como si fuera generado por el contrato nuevo.

| Estado                                 | Casos |
| -------------------------------------- | ----: |
| Fixture de regresión (Ritual)          |     1 |
| Pendientes por proveedor no disponible |    23 |

El resultado completo, incluyendo contexto por entidad, está en `artifacts/editorial-quality-benchmark.json` durante la ejecución local.

## Grounding Auditor Review

El auditor anterior trataba cualquier solapamiento léxico con JSON de relaciones como soporte. Eso podía convertir una relación editorial o una coincidencia de palabras en una afirmación soportada. Ahora separa `STRUCTURED_FACT`, `DIRECT_SOURCE`, `RELATION_EVIDENCE`, `ATTRIBUTED_INTERPRETATION`, `SUPPORTED_SYNTHESIS`, `SUPPORTED_INFERENCE` y `UNSUPPORTED`; exige premisas concretas y marca encabezados como `NOT_APPLICABLE`. La mera presencia de una entidad en el catálogo no cuenta como evidencia.

## Grounding Audit

En el dry-run actual Ritual tiene 27 claims: 1 `STRUCTURED_FACT`, 1 `SUPPORTED_SYNTHESIS`, 23 `UNSUPPORTED` y 2 encabezados `NOT_APPLICABLE`. Resultado publicable estricto: 2/25 claims = 8%; no se relajó el criterio. El resumen parafraseado sólo se acepta como síntesis porque su premisa completa es la definición estructurada proporcionada.

Esto demuestra que el fixture no debe tratarse como publicable todavía sin ampliar el contexto documental. No se ha ocultado ningún hueco.

## Context Readiness Matrix

La salida JSON del runner contiene las 24 filas completas (`results[*].readiness.dimensions`) con estado `READY`, `PARTIAL`, `MISSING` o `NOT_APPLICABLE`, adaptado a cada tipo. La puntuación sólo pondera cobertura documental y citas; el grado relacional no suma por sí mismo.

## Readiness Ranking

| Banda                                  | Entidades                                                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| READY_FOR_GENERATION (90–100)          | Guernica, Fuente, París, Madrid, Pinturas de Lascaux, Venus de Willendorf, Armory Show                                                                                                      |
| GENERATABLE_WITH_LIMITED_DEPTH (75–89) | Pablo Picasso, Caravaggio, Frida Kahlo, Marina Abramović, Museo del Prado, Renacimiento, Siglo XX, Paleolítico, Cuzco, Ritual, Poder, Religión, Muerte, Cubismo, Arte rupestre, Surrealismo |
| NEEDS_CONTEXT_ENRICHMENT (50–74)       | Cómo mirar la guerra en el arte                                                                                                                                                             |

Todas las entidades muestran advertencia de contexto documental insuficiente porque no tienen citas textuales seleccionables; el gate sigue siendo no bloqueante para weak-corpus.

## Source Gaps

Los gaps principales son `MISSING_REFERENCE_SOURCE` o `NEEDS_SOURCE_QUOTE_OR_DOCUMENTARY_CONTEXT`; en conceptos faltan ejemplos de obras documentados y en Lascaux falta evidencia citada para localización, acceso e interpretación ritual. Las relaciones existentes se conservan como candidatas, no como prueba.

## High-Leverage Knowledge

El mayor efecto multiplicador previsto está en tres paquetes reutilizables por fragmento, no por copia total: contexto arqueológico Paleolítico/arte rupestre (Paleolítico, Arte rupestre, Lascaux, Ritual); París y vanguardias (París, Picasso, Cubismo, Surrealismo); y Prado/Madrid/Renacimiento (Museo del Prado, Madrid, Caravaggio, Renacimiento). Cada reutilización exige que el quote seleccionado sostenga la afirmación concreta.

## Context Retrieval Proposal

Recuperar candidatos por entidad, tipo, término relacionado y dimensión faltante; ordenar primero quotes con locator, después metadata estructurada y por último relation metadata citada; limitar a un presupuesto (6.000 caracteres en el benchmark); conservar `origin`, fuente, página y quote; excluir relaciones sin justificación y fragmentos que no cubran la premisa. El catálogo sólo resuelve nombres canónicos para `[[...]]`.

## Claim Evidence Architecture

Solución mínima: durante QA producir `claim → premises[] → origin → source/locator → confidence` como JSON transitorio. No hace falta una tabla por frase todavía. Si se persiste una generación, guardar versión de prompt, proveedor/modelo, huella del contexto y resultado revisable; Sources/Evidence/Relations siguen siendo la fuente canónica.

## Ritual Claim Audit

El JSON (`artifacts/editorial-quality-benchmark-context.json`) contiene para cada uno de los 27 claims la clasificación, premisas, origen, confianza y `publishable`. Los 19 `UNSUPPORTED` incluyen las afirmaciones sobre símbolos, supervivencia de objetos, función ceremonial, sociedades sin escritura y localización profunda de Lascaux: el contexto actual no las demuestra.

## Unsupported Claims

El informe JSON conserva la lista exacta. Incluye afirmaciones generales sobre símbolos, desaparición del ritual, función de objetos, dificultad de sociedades sin escritura y preguntas de observación que no tienen soporte explícito en el corpus actual.

## Wikilink Audit

El único enlace de Ritual es `Pinturas de Lascaux → [[cueva-de-lascaux|Pinturas de Lascaux]]`.

Está permitido porque existe una relación explícita `ABOUT_CONCEPT`; el catálogo sólo resuelve el nombre y nunca justifica por sí mismo el enlace. No se creó ninguna relación canónica.

## Anti-Template Analysis

Con un solo resultado generado no es válido inferir diversidad entre 24 entidades. El runner deja estas métricas como no concluyentes: encabezados repetidos 0, primeras frases repetidas 0, similitud estructural 0, coeficiente de variación de longitud 0.

La prueba comparativa sólo debe considerarse válida cuando `generatedCount=24`.

## Relation Quality

La relación de Ritual con Pinturas de Lascaux se expresa como hipótesis interpretativa y conserva el límite de evidencia. Las otras relaciones no se han evaluado porque no se generó texto nuevo.

## Weak-Corpus Behaviour

Los casos C fueron seleccionados explícitamente: Venus de Willendorf, Paleolítico y el artículo “Cómo mirar la guerra en el arte”. Con el proveedor deshabilitado no se observó degradación lingüística; el benchmark los mantiene pendientes en lugar de rellenar vacíos con conocimiento de pretraining.

## Provider Architecture

- `AI_PROVIDER`: selecciona el adaptador; valor actual `noop`.
- `AI_MODEL`: nuevo nombre de configuración neutral; mantiene fallback compatible con `OLLAMA_MODEL`.
- Ollama es sólo el adaptador disponible hoy, no parte del contrato editorial.
- No se añadieron credenciales ni proveedores externos.

## Quality Matrix

| Entidad      | Resultado                                                 |
| ------------ | --------------------------------------------------------- |
| Ritual       | Parcial: grounding 1/5; rich links 5/5; incertidumbre 4/5 |
| Las otras 23 | `NOT_GENERATED` — requieren proveedor para puntuar        |

El runner calcula las diez dimensiones solicitadas (Clarity, Beginner Accessibility, Factual Grounding, Relevance, Relationship Explanation, Structure Specificity, Uncertainty Handling, Rich Link Quality, Information Density y AI-Prose Risk) sólo cuando existe una salida nueva validada.

## Best 5

No se puede declarar un top 5 honesto con un solo resultado. Ritual destaca únicamente en incertidumbre, enlaces y estructura; no supera el umbral de grounding.

## Worst 5

No se puede declarar un bottom 5 sin generar los 24 casos. Los cinco casos C son los primeros candidatos a revelar fallos cuando Ollama esté disponible.

## Ritual Benchmark

La estructura y la explicación son mejores que la plantilla anterior: definición autónoma, resumen plano, ensayo específico, enlace justificado e incertidumbre explícita.

Sin embargo, el grounding audit marca 10 afirmaciones sin soporte en el contexto actual. Por tanto, Ritual pasa la prueba editorial de forma y no pasa todavía la prueba estricta de procedencia factual.

## Benchmark Gate

El gate informa readiness <75, ausencia de documentary context y relaciones sin justificación; no bloquea técnicamente `foundational:editorial-quality-benchmark:generate`, para permitir pruebas controladas de corpus débil. No se ejecutó esa generación.

## Recommendation

**A. ENRICH_CONTEXT**. El problema dominante es cobertura y procedencia documental, no una razón para rebajar el auditor ni para ejecutar las 24 generaciones. Añadir primero fragmentos citables y justificaciones de relación; después repetir el dry-run.

## New Editorial Depth Model

La preparación se interpreta como capacidad máxima segura, no como permiso binario:

| Nivel               | Capacidad                                                  |
| ------------------- | ---------------------------------------------------------- |
| `IDENTITY_ONLY`     | Sólo identidad; no ensayo.                                 |
| `BASIC_EXPLANATION` | Resumen breve y 1–2 secciones factuales.                   |
| `EDITORIAL_ENTRY`   | Contexto, rasgos y relaciones justificadas; 2–4 secciones. |
| `CONTEXTUAL_ESSAY`  | Desarrollo amplio e interpretaciones sólo soportadas.      |
| `DOCUMENTARY_ESSAY` | Fuentes citadas, atribuciones, debates e incertidumbre.    |

## 24 Entity Depth Audit

La salida `depthAudit` contiene para cada entidad `availableKnowledge`, `sharedRetrievableKnowledge`,
`missingKnowledge` y `maxSafeDepth`. Resultado actual:

| Profundidad máxima | Entidades |
| ------------------ | --------: |
| BASIC_EXPLANATION  |        10 |
| EDITORIAL_ENTRY    |         9 |
| CONTEXTUAL_ESSAY   |         5 |
| DOCUMENTARY_ESSAY  |         0 |
| IDENTITY_ONLY      |         0 |

Esto no penaliza la seed: diez entidades pueden tener una explicación básica útil aunque no puedan sostener un ensayo profundo.

## Ritual Today

Ritual puede publicar hoy una definición breve, sus elementos básicos (reglas, acciones y reconocimiento
colectivo) y una advertencia explícita de que las relaciones con obras no demuestran usos rituales. Su
`maxSafeDepth` actual es `BASIC_EXPLANATION`.

El benchmark incluye `depthAdjustedExample` sin persistirlo: un resumen corto y una única sección que no
afirma ejemplos históricos ni atribuye una función ceremonial a Lascaux.

## Ritual Enriched

Para subir a `EDITORIAL_ENTRY` hacen falta quotes sobre ejemplos concretos y una justificación factual de
la relación con Lascaux. Para `CONTEXTUAL_ESSAY` se necesita además contexto histórico/cultural y evidencia
de interpretaciones. Para `DOCUMENTARY_ESSAY` se requieren varias fuentes citables y procedencia arqueológica.

## Shared Knowledge Opportunities

Picasso puede recuperar fragments documentales de Cubismo; Lascaux, de Paleolítico y Arte rupestre; Ritual,
de Lascaux sólo si esos fragments justifican una afirmación concreta. La relación autoriza la búsqueda,
pero la evidencia recuperada autoriza el uso editorial.

## Migration Implication

La migración futura debería seleccionar la plantilla por `maxSafeDepth`, no por existencia de entidad ni por
número de relaciones. No se ejecutó ninguna migración ni generación masiva.

## Existing Knowledge Architecture

El modelo actual ya separa capas:

| Estructura                  | Qué almacena                                             | Recuperable hoy para el generator                                           | Locator         | Soporte de claim                            |
| --------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- | --------------- | ------------------------------------------- |
| `Source`                    | Bibliografía, autor, publisher, año, URL                 | Sí como catálogo; no como fragmento                                         | No              | No por sí sola                              |
| `SourceRef`                 | Asociación Source–Entity, página, quote, note            | Sí, pero el assembly actual sólo usa quote                                  | Página opcional | Sí si quote está presente                   |
| `Citation`                  | Source asociado a Entity, Relation, Attribute o Evidence | Parcial; el generator recibe relation citations, no todo el Research corpus | Opcional        | Sí si quote y locator están presentes       |
| `LibraryMaterial` / Version | Material, contenido, URL, archivo y versión              | No directamente para entidades públicas                                     | Indirecto       | No hasta extraer fragmentos                 |
| `LibraryExcerpt`            | Texto localizado y fingerprint                           | Sí dentro de Research; no está ensamblado aún para estas entidades          | Sí, obligatorio | Sí como fragmento candidato                 |
| `ResearchEvidence`          | Quote, contexto, source, locator y fingerprint           | No en el assembly público actual                                            | Sí              | Sí                                          |
| `ResearchClaimEvidence`     | Vínculo Claim–Evidence                                   | No                                                                          | Heredado        | Sí indirectamente, tras resolver el Claim   |
| `Relation.justification`    | Explicación de relación                                  | Sí                                                                          | No              | Sólo si contiene premisa factual suficiente |

## Dormant Knowledge

El corpus global contiene:

```text
590 Sources
831 SourceRefs
0 SourceRefs con quote
1.388 Citations
0 Citations con quote
1 LibraryMaterial
1 versión con contenido
12 LibraryExcerpts
10 ResearchEvidence
9 ResearchEvidence con quote
```

Para las 24 entidades seleccionadas, cada una tiene SourceRefs bibliográficas, pero ninguna tiene quote
recuperable. No hay Materials, Excerpts ni ResearchEvidence enlazados a estas entidades canónicas. Por tanto,
el conocimiento “dormant” verificable no es un corpus oculto de las 24 fichas: son principalmente Sources y
SourceRefs sin fragmento, además de ResearchEvidence existente pero sin asociación a estas entidades.

## 24 Entity Knowledge Inventory

La salida JSON contiene por entidad `sources`, `materials`, `excerpts`, `evidence`, `relationEvidence`,
`retrievableFragments` y el desglose `dormant`. El patrón común de las 24 entidades es:

```text
Sources: 1 (Guernica y Fuente: 2)
Materials: 0
Excerpts: 0
Evidence: 0
Relation evidence con quote: 0
Retrievable fragments: 0
Source without quote: igual al número de Sources
```

## Truly Missing Knowledge

Para las 24 entidades faltan realmente quotes documentales, locators y evidencia asociada a afirmaciones
concretas. No basta con mejorar el retrieval para fabricar esos fragmentos. La investigación nueva sólo es
necesaria después de extraer y revisar lo que pueda existir en los Materials/Research no vinculados.

## Minimal Architecture Changes

`NONE` para crear tablas nuevas. `LibraryExcerpt` ya es la unidad más cercana a
`DOCUMENTARY_FRAGMENT`; `ResearchEvidence` añade procedencia, quote, locator y vínculo a Claims. El trabajo
prioritario es exponer estas estructuras al context assembly público, no crear un corpus paralelo para IA.

## Proposed Retrieval Flow

```text
ENTITY CORE
→ TYPE-SPECIFIC METADATA
→ DIRECT SourceRef quotes
→ ENTITY Citations / ResearchEvidence linked to entity
→ JUSTIFIED relation evidence
→ relevant shared LibraryExcerpt / ResearchEvidence
→ source + locator provenance
```

El MVP puede usar entidad, tipo, relation type, topics, dimensiones y relevancia léxica simple. No hay una
necesidad demostrada de embeddings todavía.

## High-Leverage Enrichment Packages

| Paquete                       | Material actual                                    | Entidades beneficiadas                      | Profundidad actual     | Profundidad potencial | Trabajo                          |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------- | ---------------------- | --------------------- | -------------------------------- |
| Paleolítico / Arte rupestre   | Sources bibliográficas, sin quotes                 | Paleolítico, Arte rupestre, Lascaux, Ritual | Basic/Entry            | Entry/Contextual      | Extraer y revisar fragmentos     |
| París / Vanguardias           | SourceRefs de París, Picasso y Cubismo, sin quotes | París, Picasso, Cubismo, Surrealismo        | Entry/Contextual       | Contextual            | Vincular excerpts relevantes     |
| Madrid / Prado / Renacimiento | Sources y relaciones canónicas, sin quotes         | Madrid, Prado, Renacimiento, Caravaggio     | Basic/Entry/Contextual | Contextual            | Recuperar material institucional |

Son paquetes de trabajo, no evidencia ya disponible para publicar.

## Enrichment Priority Queue

1. `Paleolítico`, `Arte rupestre`, `Pinturas de Lascaux`, `Ritual`: mayor reutilización conceptual.
2. `París`, `Pablo Picasso`, `Cubismo`: mayor densidad de relaciones potencialmente explicativas.
3. `Madrid`, `Museo del Prado`, `Renacimiento`, `Caravaggio`.
4. `Guernica`, `Fuente`, `Venus de Willendorf`: enriquecer de forma directa y específica.
5. `Poder`, `Religión`, `Muerte`, `Cuzco`, `Armory Show` y el artículo: tratar primero como entradas básicas.

La cola reutiliza datos existentes cuando sea posible; no se debe asumir que una Source sin quote evitará
una nueva investigación.
