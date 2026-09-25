# Enriquecimiento global de relaciones — Batch 014

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

## Alcance

Inicio del bloque global `ABOUT_CONCEPT`. Se procesaron 20 relaciones publicadas con cobertura de
fuentes, citas y entidades publicadas, sin justificación editorial aprobada antes del lote.

## Aplicación y verificación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Estado editorial: `APPROVED`.
- Todas las filas tienen `claimsUsed`, `sourcesUsed` y nota de revisión.
- La redacción señala una asociación editorial y evita interpretaciones cerradas o afirmaciones
  causales.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- Total posterior: 2.388 justificaciones aprobadas, 1.194 por idioma.
- Relaciones `ABOUT_CONCEPT` pendientes: 40.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-014.cjs`.
