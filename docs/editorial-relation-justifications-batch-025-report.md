# Cierre del bloque BELONGS_TO_MOVEMENT no artístico — Batch 025

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

Se procesaron las últimas 5 relaciones publicadas `BELONGS_TO_MOVEMENT` que no partían de artistas:

- Aristóteles → Arte griego
- Homero → Arte griego
- Plinio el Viejo → Arte romano
- Sófocles → Arte griego
- Vitruvio → Arte romano

## Verificación

- 10 filas aplicadas: 5 relaciones × `es`/`en`.
- Todas quedaron en `APPROVED`, con claims, fuentes y nota de revisión.
- Redacción contextual, sin afirmar influencia causal.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- Total posterior: 2.722 justificaciones aprobadas, 1.361 por idioma.
- Remanente global: únicamente 26 relaciones `INFLUENCED_BY`.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-025.cjs`.
