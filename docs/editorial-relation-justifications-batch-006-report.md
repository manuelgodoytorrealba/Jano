# Enriquecimiento de relaciones de artistas — Batch 006

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

## Alcance

Se procesaron 20 relaciones publicadas `ARTIST → MOVEMENT` de tipo `BELONGS_TO_MOVEMENT`,
seleccionadas por cobertura de fuentes, citas y entidades publicadas. Todas carecían de justificación
editorial aprobada antes del lote.

## Relaciones incluidas

Antoine Watteau → Rococó; Artemisia Gentileschi → Barroco; Auguste Rodin → Simbolismo;
Bartolomé Esteban Murillo → Barroco; Beatriz González → Arte conceptual; Artistas del Reino de Benín
→ Arte africano; Ben Shahn → Realismo; Berthe Morisot → Impresionismo; Bridget Riley → Minimalismo;
Camille Pissarro → Impresionismo; Canaletto → Rococó; Caravaggio → Barroco; Carlos Cruz-Diez → Arte
conceptual; Cildo Meireles → Arte conceptual; Claes Oldenburg → Pop Art; Claude Monet → Impresionismo;
Cy Twombly → Expresionismo abstracto; Dan Flavin → Minimalismo; David Alfaro Siqueiros → Muralismo
mexicano; Diego Rivera → Muralismo mexicano.

## Aplicación y verificación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Estado editorial: `APPROVED`.
- Todas las filas tienen `claimsUsed`, `sourcesUsed` y nota de revisión.
- Redacción limitada a adscripción histórica/formal, sin afirmar fundación, influencia o causalidad.
- La operación usa `BEGIN`/`COMMIT` y `(relationId, locale)`, por lo que es idempotente.
- 20/20 relaciones tienen justificación aprobada en ambos idiomas y fuentes registradas.
- Total posterior: 2.074 justificaciones aprobadas, 1.037 por idioma.
- Relaciones `ARTIST → MOVEMENT` pendientes: 137.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-006.cjs`.
