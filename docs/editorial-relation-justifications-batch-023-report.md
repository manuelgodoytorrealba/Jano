# Cierre del bloque ASSOCIATED_WITH — Batch 023

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

Se procesaron las últimas 2 relaciones publicadas `ASSOCIATED_WITH` que carecían de justificación
editorial aprobada:

- Teotihuacan → Ciudad
- Toledo → Ciudad

## Verificación

- 4 filas aplicadas: 2 relaciones × `es`/`en`.
- Todas quedaron en `APPROVED`, con claims, fuentes y nota de revisión.
- Redacción explícitamente no causal.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- Total posterior: 2.700 justificaciones aprobadas, 1.350 por idioma.
- Relaciones `ASSOCIATED_WITH` pendientes: **0**.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-023.cjs`.
