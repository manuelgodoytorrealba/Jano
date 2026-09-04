# Controlled Source Ingestion Pilot — 2026-08-30

Pilot ejecutado únicamente en development. No se ejecutó Qwen, no se generaron ensayos y no se procesaron
las otras Sources.

## Source Purpose Model

El propósito se infiere de title, URL y entidades enlazadas; no se añadió ninguna columna.

| Propósito             | Tratamiento                                               |
| --------------------- | --------------------------------------------------------- |
| `VISUAL_PROVENANCE`   | Centralidad alta, pero excluida del rendimiento editorial |
| `CANONICAL_METADATA`  | Útil para datos básicos, no automáticamente para ensayo   |
| `EDITORIAL_REFERENCE` | Candidata contextual si devuelve texto sustantivo         |
| `DOCUMENTARY_TEXT`    | Prioridad alta para excerpts y Evidence                   |
| `GENERAL_REFERENCE`   | Revisión de utilidad antes de asociar                     |

“Academia — procedencia visual” produjo 14.166 caracteres de Wikimedia, pero se clasificó como
`VISUAL_PROVENANCE` y generó cero excerpts editoriales. La cantidad de entidades enlazadas no la convierte
en fuente de ensayo.

## Recalculated High-Leverage Ranking

El ranking editorial debe excluir o penalizar Sources de procedencia visual y separar centralidad de valor
textual. En el inventario completo, el ranking central bruto estaba dominado por “Academia — procedencia
visual”; el ranking editorial del piloto la excluye.

## Pilot Sources

Se seleccionaron 20 IDs planificados; 19 existían en la base actual. Incluyen museo, catálogo, artículo,
conceptos, movimientos, artistas, obras, lugares, periodos y dos casos visuales de bajo valor esperado.

## Accessibility Results

| Resultado                  | Sources |
| -------------------------- | ------: |
| Accesibles y preparadas    |      11 |
| Fallidas                   |       8 |
| Source planificada ausente |       1 |

No hubo scraping agresivo ni bypass de bloqueos. Se respetaron validación de URL, redirects, límites y
timeouts del servicio existente.

## Preparation Results

Fallos observados:

- HTTP 403: cuatro páginas del Prado/Louvre;
- HTTP 429: Met y páginas de Renaissance/Paris;
- PDF: `PDF storage is unavailable` porque la URL no estaba materializada como archivo local.

## Content Quality

| Calidad                | Sources |
| ---------------------- | ------: |
| `HIGH_VALUE`           |       7 |
| `MEDIUM_VALUE`         |       1 |
| `LOW_VALUE`            |       1 |
| `UNUSABLE`             |       2 |
| No evaluable por fallo |       8 |

“Collections” devolvió sólo 400 caracteres y Lascaux 358: ambos son accesibles técnicamente, pero inútiles
como contexto editorial. Las páginas Wikimedia contenían mucho chrome y fueron excluidas por propósito.

## Excerpt Results

Se crearon 19 excerpts candidatos en unidades de párrafo/sección, con locator `paragraph-N`, fingerprint,
source, material y version. No se usaron chunks ciegos de tamaño fijo.

## Evidence Results

Se crearon 15 Evidence candidates de tipo `DIRECT_DOCUMENTARY_EVIDENCE`, asociadas a ResearchEntities
canónicas del pilot. No se convirtieron todos los excerpts en Evidence.

## Ingestion Yield

`USEFUL_YIELD = evidence candidates / excerpt candidates`, interpretado junto con chars preparados y
calidad, no como volumen bruto.

Los mejores yields fueron Picasso, Cubism, Repensar Guernica, Madrid Destino y Getty AAT. Wikimedia visual,
Collections y Lascaux tuvieron yield editorial cero.

## Entity Impact

El pilot produjo Evidence asociada a 152 referencias de entidades; el JSON conserva el desglose por entidad.
El impacto de profundidad es potencial y limitado a una subida de un nivel como máximo hasta revisión.

Casos relevantes:

| Entidad       | Antes      | Evidence nueva | Después potencial |
| ------------- | ---------- | -------------: | ----------------- |
| Pablo Picasso | Contextual |              3 | Contextual        |
| Cubismo       | Editorial  |              3 | Contextual        |
| Guernica      | Contextual |              3 | Contextual        |
| Fuente        | Contextual |              2 | Contextual        |
| Madrid        | Editorial  |              3 | Contextual        |
| Ritual        | Basic      |              0 | Basic             |
| Lascaux       | Editorial  |              0 | Editorial         |
| Paleolítico   | Basic      |              0 | Basic             |
| Arte rupestre | Editorial  |              0 | Editorial         |

## Ritual / Lascaux Findings

Las Sources existentes del piloto no permitieron sostener nuevos claims sobre ritual, práctica ceremonial,
símbolo/comunidad, ubicación profunda de Lascaux o interpretación ritual. No se usó conocimiento externo.

## Failures

Los detalles exactos de cada failure están en `results[*].failureReason` del JSON.

## Noise Problems

- HTTP 403/429 por políticas de los sitios;
- páginas de catálogo sin contenido sustantivo;
- Wikimedia con contenido visual/procedencia, no textual;
- material PDF remoto no disponible como storage local;
- texto corto o dominado por navegación.

## Existing Pipeline Evaluation

Funcionó correctamente para URLs que aceptaron la petición: preparación, limpieza HTML, versionado,
excerpts, Evidence y asociación ResearchEntity. El principal ajuste pendiente es distinguir propósito de
Source antes de priorizar, y mejorar la selección semántica de párrafos.

## Data Created

```text
ResearchProject pilot: cmtg2m5jt0000t0sjv7swffi3
LibraryMaterials [PILOT]: 19
LibraryMaterialVersions: 19
LibraryExcerpts: 19
ResearchEvidence: 15
ResearchEntities canónicas: creadas dentro del proyecto pilot, estado `PENDING`
```

## Rollback

Eliminar el `ResearchProject` anterior y después los `LibraryMaterial` cuyo título empieza por `[PILOT]`.
Las relaciones en cascada eliminan Evidence, Excerpts y ResearchLibraryMaterial del proyecto.

## Recommendation

**B. FIX_INGESTION** antes de escalar: el pipeline es reutilizable, pero 8/19 Sources fallaron por 403/429
o PDF no materializado y 2 accesibles produjeron contenido inutilizable. Después debe ajustarse la
fragmentación y repetirse un piloto pequeño antes de procesar 100 Sources.

## Research / Core Boundary

Research es privado. `ResearchEvidence → public entity generator` no existe como dependencia directa. El
camino correcto es Evidence candidata en Research, revisión explícita mediante Knowledge Review/Promotion y
materialización de la procedencia en SourceRef/Citation o en el vínculo canónico equivalente. El Core debe
conservar Source, locator y provenance aunque el ResearchProject se archive.

## 152 Association Audit

Las 152 referencias originales eran el producto de multiplicar cada Evidence candidate por todas las
entidades enlazadas a su Source. No eran 152 asociaciones editoriales revisadas: mezclaban enlace de Source,
posible mención y relevancia supuesta. No hubo selección manual ni confidence editorial.

El pilot corregido sólo asocia Evidence a la entidad primaria de la Source; las demás quedan como
`mention-only`/candidatas y no elevan depth. Resultado persistido: 15 Evidence y 15 vínculos
ResearchEntityEvidence.

## Mention vs Relevance Model

Se separan `MENTION`, `ABOUT`, `SUPPORTS_RELATION`, `CONTEXT_FOR` y `PRIMARY_SUBJECT`. Sólo las cuatro
últimas pueden alimentar retrieval. La asociación primaria requiere enlace explícito y comprobación
independiente por título/texto; aparecer en una página no basta.

## Evidence Candidate Review

Las 15 ResearchEvidence siguen siendo candidatas privadas. `ResearchEvidence` no tiene un campo de estado
propio; los `ResearchEntity` del pilot están en `PENDING`, y la aceptación debe resolverse mediante el flujo
de Research Review/Promotion existente. No hay promoción automática al Core.

## 403 Strategy

403 se registra como `ACCESS_DENIED` y `MANUAL_ACQUISITION_REQUIRED`. La Source bibliográfica se conserva.
Cuando exista una alternativa pública adecuada se prioriza como `ALTERNATIVE_PUBLIC_SOURCE_PREFERRED`.
No se implementó evasión.

## 429 Strategy

El preparador ahora aplica rate limit por host, cache por URL, backoff exponencial limitado, `Retry-After` y
máximo de reintentos. 429 agotado se conserva como error reintentable, no como loop infinito.

## Remote PDF Strategy

El preparador PDF sigue requiriendo `storageKey`. Una Source con URL PDF debe pasar primero por adquisición de
Material/Version; no se descarga arbitrariamente desde `PreparationService`.

## HTML Extraction Changes

Se mantienen `main/article` como prioridad y ahora se eliminan también `form/dialog` y bloques identificados
como cookies, breadcrumbs, related, share, social, subscribe, newsletter, advert o banner. Se añadieron tests
para este chrome.

## Pilot Before / After

| Métrica                |               Antes |                            Después |
| ---------------------- | ------------------: | ---------------------------------: |
| Sources encontradas    |                  19 |                                 19 |
| Preparadas             |                  11 |                                 11 |
| HIGH_VALUE             |                   7 |                                  7 |
| Excerpts               |                  19 |                                 19 |
| Evidence candidates    |                  15 |                                 15 |
| Referencias de entidad |                 152 |      15 vínculos Evidence directos |
| Association audit      |    No independiente |                 12 KEEP / 7 REVIEW |
| 403                    |            HTTP 403 |            ACCESS_DENIED explícito |
| 429                    |     fallo inmediato |     reintentos finitos con backoff |
| PDF                    | storage unavailable | mismo límite, adquisición separada |

La mejora principal es de precisión y ownership, no de volumen.
