# Enriquecimiento de relaciones de artistas — Batch 009

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

## Alcance

Se procesaron 20 relaciones publicadas `ARTIST → MOVEMENT` de tipo `BELONGS_TO_MOVEMENT`,
seleccionadas por cobertura documental y ausencia de justificación editorial aprobada.

## Relaciones incluidas

Hiroshi Sugimoto → Fotografía moderna; Honoré Daumier → Realismo; Ibrahim el-Salahi → Arte
africano; Jackson Pollock → Expresionismo abstracto; Jan van Eyck → Renacimiento nórdico; Jasper
Johns → Pop Art; Jean Fautrier → Informalismo; Jean-François Millet → Realismo; Jean-Honoré
Fragonard → Rococó; Joan Miró → Surrealismo; Johannes Vermeer → Barroco; José de Ribera → Barroco;
Judy Chicago → Arte conceptual; Katsushika Hokusai → Ukiyo-e; Kazimir Malévich → Suprematismo;
László Moholy-Nagy → Bauhaus; Le Corbusier → Bauhaus; Lee Krasner → Expresionismo abstracto;
Leonardo da Vinci → Renacimiento italiano; Liubov Popova → Constructivismo.

## Verificación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Todas quedaron en `APPROVED`, con claims, fuentes y nota de revisión.
- Redacción conservadora, limitada a adscripción histórica/formal.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- 20/20 relaciones tienen justificación bilingüe y fuentes registradas.
- Total posterior: 2.194 justificaciones aprobadas, 1.097 por idioma.
- Relaciones `ARTIST → MOVEMENT` pendientes: 77.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-009.cjs`.
