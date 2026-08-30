# Controlled Ingestion Pilot 2 — 2026-08-30

Validation set independiente. Las 20 Sources son nuevas respecto al primer pilot. No se generaron ensayos,
no se ejecutó Qwen y no se modificó producción.

## Pilot 1 REVIEW Analysis

Los siete `REVIEW` del primer pilot no se convirtieron automáticamente en `KEEP`:

| Source                       | Entity  | Causa                                                                                |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------ |
| Marcel Duchamp: Fountain     | Fuente  | AMBIGUOUS_RELEVANCE                                                                  |
| Cubism                       | Cubismo | OVERLY_GENERAL_EXCERPT                                                               |
| Art & Architecture Thesaurus | Muerte  | WEAK_SOURCE                                                                          |
| Madrid Destino (4 fragments) | Madrid  | WEAK_SOURCE / OVERLY_GENERAL_EXCERPT / INSUFFICIENT_EVIDENCE / BAD_FRAGMENT_BOUNDARY |

El patrón sistémico es que una SourceRef identifica un candidato, pero no garantiza que cada fragment sea
`ABOUT` la entidad ni que tenga densidad editorial.

## Frozen Pipeline Contract

El segundo pilot usó sin cambios funcionales las reglas congeladas:

- purpose derivado de title/URL/links;
- `main/article` y limpieza de chrome HTML;
- validación de URL y red privada;
- 403 → `ACCESS_DENIED`/manual;
- 429 → Retry-After/backoff/cache/límite finito;
- PDF remoto requiere Material almacenado;
- excerpts por párrafos coherentes;
- asociación inicial sólo a entidad primaria;
- Evidence candidate sólo para fragments sustantivos;
- ResearchEntity y Evidence permanecen privadas/PENDING.

## Pilot 2 Dataset

20 Sources nuevas: Louise Bourgeois, The Art of Birth, Raphael Rooms, Gyotaku, Leonardo, Velázquez, Frida
Kahlo, Hokusai, Las Meninas, Olympia, The Scream, Impressionism, Body Art, Representation, Nefertiti,
Parthenon, Hagia Sophia, Mezquita de Córdoba, Tapiz de Bayeux y Catedral de Chartres.

## Accessibility

| Estado     | Sources |
| ---------- | ------: |
| Preparadas |       4 |
| Fallidas   |      16 |

Fallos principales: 403, 404, `fetch failed`, 429 y PDF remoto sin Material local. No se intentó evadir
ninguno.

## Content Quality

| Calidad      | Sources |
| ------------ | ------: |
| HIGH_VALUE   |       3 |
| MEDIUM_VALUE |       0 |
| LOW_VALUE    |       0 |
| UNUSABLE     |       1 |

Las páginas útiles fueron Louise Bourgeois, Body Art y Bayeux Tapestry. Raphael Rooms devolvió sólo 197
caracteres.

## Excerpt Quality

Se produjeron 8 excerpts candidatos. El evaluador independiente marcó 0 como `KEEP` automático y 8 como
`REVIEW`; no se marcó ninguno `REJECT` sin revisión. La asociación no se infla contando `REVIEW` como correcta.

## Evidence Quality

Se produjeron 8 Evidence candidates. Cada una conserva un posible uso `DIRECT_DOCUMENTARY_EVIDENCE`, pero
requiere revisión; ninguna se promocionó al Core.

## Association Precision

```text
total associations: 8
KEEP: 0
REVIEW: 8
REJECT: 0
precision KEEP/(KEEP+REJECT): no estimable (sin decisiones KEEP/REJECT)
```

La decisión correcta en este validation set es mantener la incertidumbre, no convertir `REVIEW` en éxito.

## Knowledge Gain

El pilot afectó 18 entidades candidatas, pero ninguna subida definitiva de depth se acepta mientras sus
Evidence o asociaciones estén en `REVIEW`. El JSON contiene `entityImpact` completo.

## Pilot 1 vs Pilot 2

| Métrica                | Pilot 1 |    Pilot 2 |
| ---------------------- | ------: | ---------: |
| Sources encontradas    |      19 |         20 |
| Accessible/prepared    |      11 |          4 |
| HIGH_VALUE             |       7 |          3 |
| MEDIUM_VALUE           |       1 |          0 |
| LOW_VALUE              |       1 |          0 |
| UNUSABLE               |       2 |          1 |
| Excerpts               |      19 |          8 |
| Evidence candidates    |      15 |          8 |
| Associations iniciales |     152 | 8 directas |
| Association KEEP       |      12 |          0 |
| Association REVIEW     |       7 |          8 |

La variación de accesibilidad es propia de los dominios seleccionados y no se trató como fallo automático
del pipeline. La precisión y trazabilidad se mantuvieron conservadoras.

## Generalization Findings

El comportamiento generaliza en ownership, seguridad y ausencia de mutaciones canónicas. No generaliza aún
en rendimiento de acceso ni en asociación semántica suficiente para aceptar automáticamente fragments.

## Data Created

```text
ResearchProject Pilot 2: cmtg3bkv60000s2sj3rt2m8rf
LibraryMaterials: 20
LibraryMaterialVersions: 20
LibraryExcerpts: 8
ResearchEvidence: 8
ResearchEntities: 3 (las que recibieron Evidence candidata)
ResearchEntityEvidence: 8
```

## Rollback

Eliminar el ResearchProject `cmtg3bkv60000s2sj3rt2m8rf` y después los LibraryMaterials con prefijo `[PILOT]`.

## Bugs Found

No apareció un bug de ownership ni de seguridad. Los 403/404/429 y el PDF remoto son estados esperables.
Sí se confirmó una limitación funcional: la asociación primaria sigue necesitando revisión semántica antes
de aceptar Evidence.

## Recommendation

**E. FIX_INGESTION_FURTHER**

No escalar a 100 Sources. Primero mejorar selección de fragments y tratamiento de fuentes con contenido
legible pero relevancia ambigua. La tasa de acceso baja no es por sí sola el problema; la prioridad es la
precisión de Evidence y asociaciones.
