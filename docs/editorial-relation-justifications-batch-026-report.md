# Auditoría de relaciones de influencia — Batch 026

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

## Decisión

Se auditaron las 26 relaciones publicadas `INFLUENCED_BY`. Aunque todas tienen alguna cita, la
mayoría sólo dispone de fórmulas genéricas o fuentes de entidad que no prueban por sí solas una
influencia causal.

Se aprobó únicamente:

- **Cubismo → Paul Cézanne**, porque cuenta con una justificación canónica específica sobre la
  influencia parcial de la obra tardía de Cézanne y una fuente directamente asociada a la relación.

Las otras 25 relaciones permanecen pendientes de revisión editorial y evidencia causal específica.

## Verificación

- 2 filas aplicadas: 1 relación × `es`/`en`.
- Estado editorial: `APPROVED`.
- Claims y fuentes conservados en la capa editorial.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- Total posterior: 2.724 justificaciones aprobadas, 1.362 por idioma.
- Relaciones `INFLUENCED_BY` pendientes: 25.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-026.cjs`.
