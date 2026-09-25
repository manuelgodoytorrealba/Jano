# Enriquecimiento de relaciones de artistas — Batch 008

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

## Alcance

Se procesaron 20 relaciones publicadas `ARTIST → MOVEMENT` de tipo `BELONGS_TO_MOVEMENT`,
seleccionadas por cobertura documental y ausencia de justificación editorial aprobada.

## Relaciones incluidas

Frank Lloyd Wright → Arquitectura moderna; Frans Hals → Barroco; Frida Kahlo → Muralismo mexicano;
Georges de La Tour → Barroco; Georges Seurat → Postimpresionismo; Geta Brătescu → Arte conceptual;
Giambattista Tiepolo → Rococó; Gian Lorenzo Bernini → Barroco; Giorgione → Renacimiento italiano;
Giotto di Bondone → Gótico; Guido Reni → Barroco; Guillermo Kuitca → Arte conceptual; Gustave Courbet
→ Realismo; Gustave Moreau → Simbolismo; Gustav Klimt → Art Nouveau; Hannah Höch → Dadaísmo; Hans
Haacke → Arte conceptual; Helen Frankenthaler → Expresionismo abstracto; Henrike Naumann → Arte
conceptual; Henri Matisse → Fauvismo.

## Aplicación y verificación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Estado editorial: `APPROVED`.
- Todas las filas tienen `claimsUsed`, `sourcesUsed` y nota de revisión.
- Redacción limitada a adscripción histórica/formal, sin afirmar fundación, influencia o causalidad.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- 20/20 relaciones tienen justificación aprobada en ambos idiomas y fuentes registradas.
- Total posterior: 2.154 justificaciones aprobadas, 1.077 por idioma.
- Relaciones `ARTIST → MOVEMENT` pendientes: 97.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-008.cjs`.
