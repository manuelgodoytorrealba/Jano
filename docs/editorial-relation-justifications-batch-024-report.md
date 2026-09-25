# Cierre de relaciones seguras de baja cardinalidad — Batch 024

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

Se procesaron 6 relaciones publicadas que quedaban fuera de los bloques principales:

- 1 `HAS_SUBJECT`: How We Would Give Birth → Maternidad.
- 3 `PART_OF`: Siglo XIX/Siglo XX/Siglo XXI → Edad Contemporánea.
- 2 `RELATED_TO`: Graffiti y Espacios Educativos → Graffiti/Juventud.

## Verificación

- 12 filas aplicadas: 6 relaciones × `es`/`en`.
- Todas quedaron en `APPROVED`, con claims, fuentes y nota de revisión.
- Redacción conservadora, sin ampliar el alcance semántico de cada tipo.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- Total posterior: 2.712 justificaciones aprobadas, 1.356 por idioma.
- Remanente global: 26 `INFLUENCED_BY` y 5 `BELONGS_TO_MOVEMENT`.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-024.cjs`.
