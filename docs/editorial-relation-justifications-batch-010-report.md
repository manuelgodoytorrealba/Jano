# Enriquecimiento de relaciones de artistas — Batch 010

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

## Alcance

Se procesaron 20 relaciones publicadas `ARTIST → MOVEMENT` de tipo `BELONGS_TO_MOVEMENT`,
seleccionadas por cobertura documental y ausencia de justificación editorial aprobada.

## Relaciones incluidas

Louise Bourgeois → Arte conceptual; Lygia Clark → Arte conceptual; Lygia Pape → Arte conceptual;
Lyonel Feininger → Bauhaus; Man Ray → Dadaísmo; Manuela Ballester → Muralismo mexicano; Marcel
Duchamp → Dadaísmo; Marcel Duchamp → Surrealismo; Marina Abramović → Arte de performance; Mark Rothko
→ Expresionismo abstracto; Marlene Dumas → Arte conceptual; Martha Rosler → Arte conceptual; Mary
Cassatt → Impresionismo; Masaccio → Renacimiento italiano; Max Ernst → Surrealismo; Meret Oppenheim
→ Surrealismo; Miguel Ángel → Renacimiento italiano; Mona Hatoum → Arte conceptual; Monir Shahroudy
Farmanfarmaian → Arte conceptual; Natalia Goncharova → Futurismo.

## Verificación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Todas quedaron en `APPROVED`, con claims, fuentes y nota de revisión.
- Redacción conservadora, limitada a adscripción histórica/formal.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- 20/20 relaciones tienen justificación bilingüe y fuentes registradas.
- Total posterior: 2.234 justificaciones aprobadas, 1.117 por idioma.
- Relaciones `ARTIST → MOVEMENT` pendientes: 57.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-010.cjs`.
