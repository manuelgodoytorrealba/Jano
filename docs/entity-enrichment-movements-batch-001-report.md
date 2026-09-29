# Enriquecimiento de entidades — Movimientos, Batch 001

Fecha: 2026-09-29  
Entorno: base local `jano`, rama `develop`

## Alcance

Se seleccionaron 20 movimientos publicados que ya tenían resumen bilingüe y ensayo en español, pero
carecían de ensayo en inglés. El batch completó únicamente el campo `EntityTranslation.essay` de
`en`, preservando los textos existentes en español y los resúmenes de ambos idiomas.

La redacción inglesa mantiene la estructura editorial de la ficha: contexto, relaciones de lectura y
continuación, usando periodos, conceptos y artistas conectados por relaciones publicadas. No modifica
el canon ni crea relaciones nuevas.

## Verificación

- 20/20 entidades con ensayo ES/EN no vacío.
- Aplicación dentro de una transacción `BEGIN`/`COMMIT`.
- Segunda ejecución idempotente.
- Movimientos publicados con ensayo EN pendiente después del batch: 29.
- No se modificaron `Relation`, `Source`, `SourceRef`, `CanonicalAssertion` ni producción.

Script reproducible: `backend/api/scripts/entity-enrichment-movements-batch-001.cjs`.
