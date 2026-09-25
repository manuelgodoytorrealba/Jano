# Enriquecimiento de relaciones de artistas — Batch 005

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

## Alcance

Se seleccionaron 13 relaciones publicadas que involucran artistas y que no tenían justificación
editorial aprobada en `es` ni `en`. La prioridad fue `CREATED_BY`, seguida de `ABOUT_CONCEPT` y
`ASSOCIATED_WITH`, siempre con fuentes registradas y redacción no causal.

## Relaciones incluidas

| Origen                | Tipo            | Destino       |
| --------------------- | --------------- | ------------- |
| Marilyn Diptych       | CREATED_BY      | Andy Warhol   |
| Oswald de Andrade     | ABOUT_CONCEPT   | Modernidad    |
| Georges Braque        | ASSOCIATED_WITH | Pablo Picasso |
| Alberto Giacometti    | ASSOCIATED_WITH | Surrealismo   |
| Carrie Mae Weems      | ASSOCIATED_WITH | Fotografía    |
| Cindy Sherman         | ASSOCIATED_WITH | Fotografía    |
| Constantin Brâncuși   | ASSOCIATED_WITH | Abstracción   |
| Dorothea Lange        | ASSOCIATED_WITH | Fotografía    |
| Edvard Munch          | ASSOCIATED_WITH | Simbolismo    |
| Georgia O'Keeffe      | ASSOCIATED_WITH | Abstracción   |
| Henri Cartier-Bresson | ASSOCIATED_WITH | Fotografía    |
| Hilma af Klint        | ASSOCIATED_WITH | Abstracción   |
| Marina Abramović      | ASSOCIATED_WITH | Performance   |

## Aplicación y verificación

- 26 filas aplicadas: 13 relaciones × `es`/`en`.
- Todas quedaron en estado `APPROVED`, con `claimsUsed`, `sourcesUsed` y nota de revisión.
- Las asociaciones se redactaron como conexiones publicadas; no se añadió influencia, causalidad ni
  identidad conceptual no documentada.
- La operación usa `BEGIN`/`COMMIT` y `(relationId, locale)`, por lo que es idempotente.
- 13/13 relaciones tienen justificación aprobada en ambos idiomas.
- 13/13 tienen fuentes registradas en ambos idiomas.
- Total posterior: 2.034 justificaciones aprobadas, 1.017 por idioma.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-005.cjs`.
