# Enriquecimiento de relaciones de artistas — Batch 007

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

## Alcance

Se procesaron 20 relaciones publicadas `ARTIST → MOVEMENT` de tipo `BELONGS_TO_MOVEMENT`,
seleccionadas por cobertura documental y ausencia de justificación editorial aprobada.

## Relaciones incluidas

Diego Velázquez → Barroco; Artistas de Djenné → Arte africano; Do Ho Suh → Arte conceptual;
Donald Judd → Minimalismo; Donatello → Renacimiento italiano; Doris Salcedo → Arte conceptual;
Edgar Degas → Impresionismo; Édouard Manet → Realismo; Edvard Munch → Expresionismo; Edward Hopper
→ Realismo; Egon Schiele → Expresionismo; El Anatsui → Arte africano; Elena Guro → Futurismo;
El Lissitzky → Constructivismo; Émile Bernard → Postimpresionismo; Ernst Ludwig Kirchner →
Expresionismo; Eva Hesse → Minimalismo; Fra Angelico → Renacimiento italiano; Francis Picabia →
Dadaísmo; François Boucher → Rococó.

## Aplicación y verificación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Estado editorial: `APPROVED`.
- Todas las filas tienen `claimsUsed`, `sourcesUsed` y nota de revisión.
- Redacción limitada a adscripción histórica/formal, sin afirmar fundación, influencia o causalidad.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- 20/20 relaciones tienen justificación aprobada en ambos idiomas y fuentes registradas.
- Total posterior: 2.114 justificaciones aprobadas, 1.057 por idioma.
- Relaciones `ARTIST → MOVEMENT` pendientes: 117.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-007.cjs`.
