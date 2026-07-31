# 11 — Inventario actual de Research

Fecha de corte original: 2026-07-28. Inventario histórico previo al Contract de Fase 1; no describe el estado documental actual.

## Modelos y tablas

| Modelo                                       | Estado actual, relaciones y destino                                                                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ResearchProject`                            | Workspace privado con `ownerId`, archivado atribuible y estado; raíz de Research. Alineado y reutilizable.                                                                        |
| `ResearchOutlineSection`, `ResearchQuestion` | Índice jerárquico, notas, objetivos, preguntas y orden. Cascada desde Project; alineados, reutilizables.                                                                          |
| `ResearchProjectSource`                      | Asociación idempotente a `Source` con nota; referencia válida Research → Biblioteca. Reutilizar, migrando sólo la identidad de Biblioteca futura.                                 |
| `ResearchEvidence`                           | Extracto versionado, locator, cita, contexto y fingerprint. Project/Source; evidencia de Claims, Findings y candidates. Reutilizable, pero su procedencia migrará con Biblioteca. |
| `ResearchMaterial`                           | Texto, URL o PDF local con metadatos. Sólo Project. Contradice ownership Biblioteca: migrar datos antes de retirar tabla.                                                         |
| `ResearchClaim`, `ResearchClaimEvidence`     | Afirmación privada, grafo subject/object, evidencia y `readyForPromotion`. Reutilizar como Research Knowledge; el flag no es Promotion Proposal.                                  |
| `ResearchEntityCandidate` y evidencia        | Referente privado, aliases, confianza, revisión y `suggestedEntityId`. Reutilizar/migrar como entidad privada; referencia a Entity sólo lectura.                                  |
| `ResearchRelationCandidate` y evidencia      | Arista privada entre candidates, explicación, confianza, revisión y `relationTypeId`. Reutilizar/migrar como relación privada; RelationType es vocabulario de lectura.            |
| `ResearchFinding` y evidencia                | Hallazgo, estado y FK histórica `promotedEntityId`. Transitorio: North Star lo define como estado/etiqueta de Claim; consolidar, no borrar.                                       |
| `ResearchDecision`                           | Decisión humana atribuida sobre Finding. Reutilizar como Review investigador; revisar el vínculo exclusivo a Finding al consolidar Claims.                                        |
| `ResearchJob`, `AIExecution`                 | Trabajo idempotente, reintentos, error y trazabilidad IA. Estables como infraestructura asíncrona.                                                                                |
| `ResearchFindingProposal` y evidencia        | Propuesta IA revisable y convertible a Finding. Transitoria: no es Promotion Proposal al Core; preservar evidencia al reubicarla.                                                 |

Las tablas puente de evidencia tienen PK compuesta e idempotencia. Las relaciones Project son `Cascade`; referencias externas a Source/Entity/RelationType son `Restrict` o `SetNull`.

## Core y acoplamientos

Referencias válidas: `ResearchProjectSource.sourceId → Source`, `ResearchEvidence.sourceId → Source`, `ResearchEntityCandidate.suggestedEntityId → Entity` y `ResearchRelationCandidate.relationTypeId → RelationType`; todas son de lectura.

Pendientes: `ResearchFinding.promotedEntityId` y `ResearchEvidence.citations` conservan trazas de la promoción histórica directa; `ResearchMaterial` duplica corpus; `readyForPromotion`/`REVIEWED` no sustituyen Proposal ni Knowledge Review. Story 0.1 retiró toda escritura de Research hacia Entity, Relation y Citation.

## API

| Grupo         | Endpoints actuales                                                       | Estado                                                       |
| ------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Workspace     | `GET/POST /research`, `GET /research/:id`, `GET /research/studio/status` | Workspace alineado; `studio/status` es diagnóstico temporal. |
| Outline       | secciones/questions: alta, edición, orden y borrado de question          | Alineado.                                                    |
| Corpus        | búsqueda/asociación de Source; materiales texto/URL/PDF                  | Source alineado; `materials*` transitorio hasta Biblioteca.  |
| Conocimiento  | Claims, Evidence, Entity/Relation candidates y reviews                   | Privado y reutilizable; consolidar en Research Knowledge.    |
| Hallazgos     | Findings, Decisions, FindingProposal y conversión                        | Transitorio semánticamente.                                  |
| Procesamiento | preparar Source, extraer findings, ejecutar job                          | Alineado: manual, idempotente y trazable.                    |

Todos requieren `JwtAuthGuard`, `RolesGuard`, rol `ADMIN` y, para un Research concreto, ownership por `ownerId`. No existe endpoint de promoción al Core. No retirar endpoints hasta la migración del agregado correspondiente.

## Frontend y tests

Pantallas reales: `AdminResearchComponent`/`ResearchApi` (lista, creación y workspace) y `ResearchProjectComponent` (Project/Outline, breadcrumbs). Reutilizables por partes. `ResearchFindingsSectionComponent` es reutilizable de presentación, aunque Finding es transitorio. `ResearchStudioPocComponent` queda aislado en `/admin/research/prototype/:screen`, bajo admin y sin `ResearchApi`.

Tests actuales protegen: privacidad básica sin Entity canónica, ausencia de promoción directa, asociación Source idempotente, validación de Evidence/Claim/Material, decisiones, Outline/Questions y jobs (fingerprint, estados, éxito/fallo), y navegación real básica.

Tests pendientes: owner por usuario, archivado/no borrado con Publication, procedencia Evidence → extracto de Biblioteca, ownership exclusivo, separación Research/Publication, inmutabilidad publicada, Proposal/Review y que el POC no sea destino de navegación de producto.

## Migraciones futuras, sin ejecutar

1. Diseñar/migrar `ResearchMaterial` a Biblioteca antes de retirar su tabla.
2. Consolidar Candidates, Findings y FindingProposal en Research Knowledge, preservando evidencia y decisiones.
3. Sustituir `promotedEntityId` y `readyForPromotion` por Promotion Proposal y Knowledge Review con trazabilidad histórica.
