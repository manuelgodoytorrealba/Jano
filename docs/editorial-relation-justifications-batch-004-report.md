# Enriquecimiento de relaciones de artistas — Batch 004

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

## Alcance

Se seleccionaron 20 relaciones publicadas `ARTIST → MOVEMENT` de tipo
`BELONGS_TO_MOVEMENT` que no tenían justificación editorial aprobada en `es` ni `en`.
La prioridad se calculó con cobertura de `SourceRef`, citas de la relación y assertions de
las entidades conectadas.

## Relaciones incluidas

| Artista                  | Movimiento            |
| ------------------------ | --------------------- |
| Francisco de Goya        | Romanticismo          |
| J. M. W. Turner          | Romanticismo          |
| John Constable           | Romanticismo          |
| Théodore Géricault       | Romanticismo          |
| William Blake            | Romanticismo          |
| Doménikos Theotokópoulos | Manierismo            |
| Giambologna              | Manierismo            |
| Pontormo                 | Manierismo            |
| Agnes Martin             | Minimalismo           |
| Ai Weiwei                | Arte chino            |
| Ai Weiwei                | Arte conceptual       |
| Albrecht Dürer           | Renacimiento nórdico  |
| Alexander Calder         | Surrealismo           |
| Alfred Sisley            | Impresionismo         |
| Alfred Stieglitz         | Fotografía moderna    |
| Alice Neel               | Realismo              |
| Amar Kanwar              | Arte indio            |
| Andrea Mantegna          | Renacimiento italiano |
| Andy Warhol              | Pop Art               |
| Annibale Carracci        | Barroco               |

## Aplicación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Estado editorial: `APPROVED`.
- Cada fila conserva `claimsUsed`, `sourcesUsed` y la nota de revisión del batch.
- La redacción se limita a la adscripción histórica/formal; no afirma fundación, influencia ni
  causalidad.
- La operación usa `BEGIN`/`COMMIT` y la clave `(relationId, locale)`, por lo que es idempotente.

## Verificación

- 20/20 relaciones con justificación aprobada en ambos idiomas.
- 20/20 con fuentes registradas en ambos idiomas.
- Total posterior: 2.008 justificaciones aprobadas, 1.004 por idioma.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-004.cjs`.
