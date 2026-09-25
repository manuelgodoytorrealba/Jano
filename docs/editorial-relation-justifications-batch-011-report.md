# Enriquecimiento de relaciones de artistas — Batch 011

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

Se procesaron 20 relaciones publicadas `ARTIST → MOVEMENT` de tipo `BELONGS_TO_MOVEMENT`,
seleccionadas por cobertura documental y ausencia de justificación aprobada.

Relaciones incluidas: Odilon Redon → Simbolismo; Óscar Murillo → Arte conceptual; Oskar Schlemmer →
Bauhaus; Otobong Nkanga → Arte africano; Paul Cézanne → Postimpresionismo; Paul Gauguin →
Postimpresionismo; Paul Klee → Bauhaus; Peter Paul Rubens → Barroco; Philip Guston → Expresionismo
abstracto; Piero della Francesca → Renacimiento italiano; Pierre-Auguste Renoir → Impresionismo;
Pieter Bruegel el Viejo → Renacimiento nórdico; Piet Mondrian → De Stijl; Rafael → Renacimiento
italiano; Raja Ravi Varma → Arte indio; Rembrandt van Rijn → Barroco; Remedios Varo → Surrealismo;
René Magritte → Surrealismo; Richard Serra → Minimalismo; Robert Delaunay → Orfismo.

## Verificación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Todas quedaron en `APPROVED`, con claims, fuentes y nota de revisión.
- Redacción conservadora, limitada a adscripción histórica/formal.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- 20/20 relaciones tienen justificación bilingüe y fuentes registradas.
- Total posterior: 2.274 justificaciones aprobadas, 1.137 por idioma.
- Relaciones `ARTIST → MOVEMENT` pendientes: 37.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-011.cjs`.
