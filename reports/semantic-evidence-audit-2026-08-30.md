# Semantic Evidence Audit — 2026-08-30

Auditoría exclusivamente sobre los datasets de Pilot 1 y Pilot 2. No se procesaron Sources nuevas, no se
generaron ensayos, no se ejecutó Qwen y no se modificó el Knowledge Core.

## Root Cause

Pilot 2 terminó con 8/8 `REVIEW` porque el pipeline anterior tenía una unidad documental correcta, pero no
una proposition verificable por fragmento. Además, la selección conservaba navegación, promoción y listados
de enlaces. La Source podía ser relevante sin que el excerpt lo fuera, y el excerpt podía ser relevante sin
ser suficiente para una Evidence concreta.

## Pilot 1 Review Cases

Revisión independiente de los 7 casos:

```text
KEEP: 4
REVIEW: 0
REJECT: 3
precision KEEP/(KEEP+REJECT): 57,1%
```

Los `KEEP` corresponden a fragments sustantivos de Cubism. Los `REJECT` son navegación/related content de
Fountain y contenido institucional no demostrativo del Getty AAT. No se aceptó automáticamente ningún caso
por mera mención.

## Pilot 2 Review Cases

Revisión independiente de los 8 excerpts:

```text
KEEP: 1
REVIEW: 5
REJECT: 2
precision KEEP/(KEEP+REJECT): 33,3%
```

El `KEEP` es la definición explícita de Body Art. Los `REVIEW` son fragments de Bayeux y páginas Tate que
contienen algún contexto, pero necesitan separar contenido editorial de promoción. Los `REJECT` son chrome,
menús y navegación sin proposition útil.

## Semantic Relevance Contract

```text
PRIMARY_SUBJECT
ABOUT
CONTEXT_FOR
SUPPORTS_RELATION
MENTION
UNRELATED
```

Sólo las cuatro primeras categorías pueden alimentar retrieval. `MENTION` y `UNRELATED` no pueden elevar
editorialDepth.

## Evidence Proposition Contract

Cada candidata debe responder:

```text
statement
evidenceRole
supportedEntity
supportedDimension
source
locator
confidence
```

La proposition debe ser una paráfrasis estricta del excerpt. Si exige fechas, causalidad o interpretación
ausentes, se rechaza o pasa a revisión.

## Semantic Span Strategy

Se mantienen paragraphs/sections como `LibraryExcerpt`. La Evidence puede apuntar a un span más preciso
mediante `quote` y `locator`, sin crear chunks arbitrarios ni nuevas tablas.

## Candidate Entity Strategy

El candidate set debe provenir de:

- entidad primaria del SourceRef;
- entidades canónicas mencionadas explícitamente;
- relaciones directas relevantes;
- entidades compatibles con la dimensión editorial.

No se evalúan 805 entidades contra cada excerpt.

## Classifier Decision

La solución recomendada es híbrida:

1. filtros deterministas para chrome, propósito, idioma, longitud semántica y provenance;
2. revisión humana para casos ambiguos;
3. clasificación IA opcional y provider-neutral sólo como ayuda, nunca como fuente de conocimiento.

No se adopta todavía embeddings ni vector DB. El volumen actual no demuestra esa necesidad.

## Provider Architecture

Si se incorpora clasificación semántica asistida, recibirá únicamente:

```text
EXCERPT
ENTITY CANDIDATE
ENTITY CORE / METADATA MÍNIMA
```

Se seleccionará mediante `AI_PROVIDER` y `AI_MODEL`. No se fija Ollama, Qwen ni otro proveedor en el dominio.

## Pilot 1 Before / After

| Estado  | KEEP | REVIEW | REJECT |
| ------- | ---: | -----: | -----: |
| Antes   |    0 |      7 |      0 |
| Después |    4 |      0 |      3 |

## Pilot 2 Before / After

| Estado  | KEEP | REVIEW | REJECT |
| ------- | ---: | -----: | -----: |
| Antes   |    0 |      8 |      0 |
| Después |    1 |      5 |      2 |

No se considera `REVIEW` como éxito.

## Precision Assessment

Pilot 1 mejora al separar navegación de contenido, pero su precisión observada es 57,1%. Pilot 2 obtiene
33,3% porque contiene más páginas institucionales y promocionales. Esto confirma que la selección semántica
es el cuello de botella; no justifica escalar.

## Human Review Contract

El investigador debe ver:

```text
Source
Excerpt con span resaltado
Entity
Role propuesto
Evidence proposition
Dimension
Confidence
KEEP / REVIEW / REJECT
```

Research ya contiene Sources, Excerpts, Evidence, Claims, decisiones y Promotion; no se diseña un segundo
sistema editorial.

## Architecture Changes

No se añadieron tablas ni estados nuevos. El resultado QA es transitorio y vive en:

[semantic-evidence-audit.json](/srv/apps/jano/artifacts/semantic-evidence-audit.json)

## Tests

```text
6 tests passed
```

Incluyen limpieza HTML, rechazo de relaciones sin evidencia, fixtures editoriales y dataset benchmark.

## Rollout Readiness

GLOBAL_ROLLOUT_READINESS: **63 / 100**

CURRENT_STAGE: `STAGE_0_EXPERIMENTAL`

NEXT_STAGE: `STAGE_1_SMALL_BATCH_READY`

CRITICAL_BLOCKERS_OPEN: 2

- B-01: precisión semántica de excerpts/Evidence insuficiente.
- B-02: workflow de revisión de propositions todavía no validado operativamente.

IMPORTANT_BLOCKERS_OPEN: 1

- B-03: quedan fragments promocionales y de navegación en algunas páginas.

MAJOR_STEPS_REMAINING: 4

VALIDATION_BATCHES_REMAINING: 1 antes de un batch de 100 Sources.

KNOWLEDGE_COVERAGE: La mayoría de la seed sigue siendo bibliografía sin fragments; esto es independiente de
la madurez del pipeline.

ESTIMATED_WORK_REMAINING: `HIGH`

## Path To Full Seed

1. Validar el contrato semantic excerpt → proposition en Pilot 1 y Pilot 2.
2. Ejecutar un batch controlado de 100 Sources.
3. Medir carga de revisión, idempotencia, retries y rollback.
4. Ejecutar dry-run sobre la seed completa.
5. Aplicar sólo después de revisión y promoción explícitas.

## Full Seed Gate

**NOT_READY**.

Falta demostrar:

- precision alta de Evidence KEEP;
- REJECT correcto para mention-only/chrome;
- workflow de revisión manejable;
- retrieval contextual con budget;
- batch de 100 sin mutaciones canónicas;
- rollback e idempotencia bajo carga.

## Recommendation

**C. NEEDS_MORE_SEMANTIC_WORK**

No se procesaron Sources nuevas ni se ejecutó un tercer pilot.
