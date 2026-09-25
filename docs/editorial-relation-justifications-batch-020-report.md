# Cierre del bloque LOCATED_IN — Batch 020

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

Se procesaron las 17 relaciones publicadas `LOCATED_IN` que carecían de justificación editorial
aprobada.

Relaciones incluidas: Académie des Beaux-Arts → París; Escuela Bauhaus → Dessau; Escuela de Atenas →
Atenas; Instituto de Arte de Chicago → Chicago; Instituto Warburg → Londres; Museo del Louvre → París;
Metropolitan Museum of Art → Nueva York; Museo de Arte Moderno → Nueva York; Museo Británico →
Londres; Museo del Prado → Madrid; Museo Egipcio de El Cairo → El Cairo; Museo Nacional de
Antropología → Ciudad de México; Museo Nacional de Arte → Ciudad de México; Museo Reina Sofía →
Madrid; National Gallery → Londres; Tate Modern → Londres; Galería Uffizi → Florencia.

## Verificación

- 34 filas aplicadas: 17 relaciones × `es`/`en`.
- Todas quedaron en `APPROVED`, con claims, fuentes y nota de revisión.
- Redacción limitada a localización, sin añadir contexto institucional no documentado.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- Total posterior: 2.616 justificaciones aprobadas, 1.308 por idioma.
- Relaciones `LOCATED_IN` pendientes: **0**.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-020.cjs`.
