# Auditoría y enriquecimiento de relaciones — lote 003

Fecha: 2026-09-25  
Entorno: PostgreSQL local `jano` / `infra/docker-compose.yml` / rama `develop`

## Decisión de alcance

La capa editorial `EditorialRelationJustification` ya está separada del conocimiento canónico. Por
tanto, el lote no modifica `Relation`, `RelationTranslation`, `CanonicalAssertion`, `Source`,
`SourceRef`, `Citation` ni `ResearchEvidence`.

Se seleccionaron 20 relaciones publicadas que no tenían justificación editorial aprobada en ninguno
de los dos idiomas. El orden priorizó cobertura documental disponible en las entidades relacionadas
y citas existentes; se aceptaron sólo tipos con redacción conservadora (`BELONGS_TO_MOVEMENT`,
`BELONGS_TO_PERIOD`, `ABOUT_CONCEPT` y `LOCATED_IN`). Se excluyeron `INFLUENCED_BY`, `RELATED_TO`,
`ASSOCIATED_WITH` y cualquier afirmación causal o interpretativa no respaldada de forma específica.

## Registro de decisiones

| Relación                              | Tipo                |                  Cobertura usada | Decisión editorial                                                                  |
| ------------------------------------- | ------------------- | -------------------------------: | ----------------------------------------------------------------------------------- |
| Pablo Picasso → Cubismo               | BELONGS_TO_MOVEMENT | 11 refs / 1 cita / 10 assertions | Aprobar vínculo de adscripción; no afirmar que Picasso fundó o causó el movimiento. |
| Georges Braque → Cubismo              | BELONGS_TO_MOVEMENT |                        6 / 1 / 4 | Aprobar marco histórico-formal compartido; no añadir influencia específica.         |
| Marcel Duchamp → Cubismo              | BELONGS_TO_MOVEMENT |                        6 / 1 / 4 | Mantener el vínculo canónico con formulación no causal.                             |
| Cubismo → Siglo XX                    | BELONGS_TO_PERIOD   |                        6 / 1 / 4 | Aprobar ubicación temporal.                                                         |
| Cubismo → Abstracción                 | ABOUT_CONCEPT       |                        6 / 1 / 4 | Señalar marco de lectura, sin convertirlo en interpretación cerrada.                |
| Cubismo → Modernidad                  | ABOUT_CONCEPT       |                        6 / 1 / 4 | Señalar asociación editorial, sin causalidad.                                       |
| Josef Albers → Bauhaus                | BELONGS_TO_MOVEMENT |                        5 / 1 / 3 | Aprobar adscripción documentada.                                                    |
| Black Mountain College → Nueva York   | LOCATED_IN          |                        5 / 1 / 3 | Aprobar localización; la justificación sólo concreta el lugar asociado.             |
| Angelica Kauffmann → Neoclasicismo    | BELONGS_TO_MOVEMENT |                        3 / 1 / 2 | Aprobar adscripción documentada.                                                    |
| Antonio Canova → Neoclasicismo        | BELONGS_TO_MOVEMENT |                        3 / 1 / 2 | Aprobar adscripción documentada.                                                    |
| Jacques-Louis David → Neoclasicismo   | BELONGS_TO_MOVEMENT |                        3 / 1 / 2 | Aprobar adscripción documentada.                                                    |
| Neoclasicismo → Siglo XIX             | BELONGS_TO_PERIOD   |                        3 / 1 / 2 | Aprobar ubicación temporal.                                                         |
| Neoclasicismo → Tradición             | ABOUT_CONCEPT       |                        3 / 1 / 2 | Señalar asociación conceptual sin interpretación exhaustiva.                        |
| Manierismo → Cuerpo                   | ABOUT_CONCEPT       |                        4 / 1 / 1 | Señalar marco temático; no inferir una tesis estética.                              |
| Sol LeWitt → Arte conceptual          | BELONGS_TO_MOVEMENT |                        3 / 1 / 1 | Aprobar adscripción documentada.                                                    |
| Alberto Giacometti → Cuerpo           | ABOUT_CONCEPT       |                        3 / 1 / 1 | Señalar asociación temática sin atribuir intención.                                 |
| Arte griego → Cuerpo                  | ABOUT_CONCEPT       |                        3 / 1 / 1 | Señalar asociación temática sin generalizar toda la tradición.                      |
| Expresionismo → Cuerpo                | ABOUT_CONCEPT       |                        3 / 1 / 1 | Señalar marco de lectura sin causalidad.                                            |
| Caspar David Friedrich → Romanticismo | BELONGS_TO_MOVEMENT |                        2 / 1 / 1 | Aprobar adscripción documentada.                                                    |
| Eugène Delacroix → Romanticismo       | BELONGS_TO_MOVEMENT |                        2 / 1 / 1 | Aprobar adscripción documentada.                                                    |

Las cifras de cobertura son de entidad: cuentan `SourceRef` y `CanonicalAssertion` de los dos
extremos, además de citas directamente asociadas a la relación. No se presentan como prueba de que
cada fuente respalde por sí sola toda la relación.

## Aplicación y verificación

- Se insertaron o actualizaron 40 filas: 20 relaciones × `es`/`en`.
- Todas quedaron en estado `APPROVED`, con `claimsUsed`, `sourcesUsed` y nota de revisión.
- La operación se ejecutó dentro de `BEGIN`/`COMMIT` y es idempotente mediante la clave única
  `(relationId, locale)`.
- Tras el lote: 1.968 justificaciones aprobadas, 984 por idioma.
- Las 20 relaciones seleccionadas tienen exactamente una justificación aprobada en cada idioma.
- No se detectaron justificaciones aprobadas sin fuentes registradas en el lote.
- `Relation` no tuvo cambios recientes durante la aplicación; el canon permaneció intacto.

El artefacto reproducible de selección y aplicación se genera en
`artifacts/editorial-recovery/editorial-relation-justifications-batch-003.json` y el script queda en
`backend/api/scripts/editorial-relation-justifications-batch-003.cjs`.

## Siguiente prioridad

Continuar con otro lote pequeño de `BELONGS_TO_MOVEMENT`, `BELONGS_TO_PERIOD` y `LOCATED_IN` con
fuentes y assertions explícitas. Mantener en revisión manual los tipos causales o ambiguos hasta
disponer de evidencia específica de la relación, no sólo de las entidades conectadas.
