# Enriquecimiento global de relaciones — Batch 017

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

## Alcance

Se procesaron 20 relaciones publicadas `BELONGS_TO_PERIOD`, seleccionadas por cobertura documental y
ausencia de justificación editorial aprobada.

Relaciones incluidas: Romanticismo → Siglo XIX; Arquitectura moderna → Siglo XX; Arte africano →
Antigüedad; Arte andino → Antigüedad; Arte bizantino → Edad Media; Arte chino → Antigüedad; Arte
conceptual → Siglo XX; Arte egipcio → Antigüedad; Arte griego → Antigüedad; Arte indio → Antigüedad;
Arte islámico → Edad Media; Arte maya → Antigüedad; Arte mesopotámico → Antigüedad; Arte mexica →
Antigüedad; Arte de performance → Siglo XX; Arte romano → Antigüedad; Arte rupestre → Neolítico;
Arte rupestre → Paleolítico; Art Nouveau → Siglo XIX; Arts and Crafts → Siglo XIX.

## Verificación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Todas quedaron en `APPROVED`, con claims, fuentes y nota de revisión.
- Redacción limitada a ubicación temporal, sin extrapolaciones históricas adicionales.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- Total posterior: 2.508 justificaciones aprobadas, 1.254 por idioma.
- Relaciones `BELONGS_TO_PERIOD` pendientes: 37.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-017.cjs`.
