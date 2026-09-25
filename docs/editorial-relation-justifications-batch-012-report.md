# Enriquecimiento de relaciones de artistas — Batch 012

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

Se procesaron 20 relaciones publicadas `ARTIST → MOVEMENT` de tipo `BELONGS_TO_MOVEMENT`,
seleccionadas por cobertura documental y ausencia de justificación aprobada.

Relaciones incluidas: Robert Morris → Minimalismo; Robert Rauschenberg → Pop Art; Robert Smithson →
Land Art; Romuald Hazoumè → Arte africano; Rosa Bonheur → Realismo; Ryue Nishizawa → Arquitectura
moderna; Salvador Dalí → Surrealismo; Sandro Botticelli → Renacimiento italiano; Shahzia Sikander →
Arte indio; Shigeru Ban → Arquitectura moderna; Shirin Neshat → Arte conceptual; Sokari Douglas Camp
→ Arte africano; Sonia Delaunay → Orfismo; Sophie Calle → Arte conceptual; Sophie Taeuber-Arp →
Dadaísmo; Subodh Gupta → Arte indio; Takashi Murakami → Arte conceptual; Tarsila do Amaral →
Muralismo mexicano; Theaster Gates → Arte conceptual; Tiziano Vecellio → Renacimiento italiano.

## Verificación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Todas quedaron en `APPROVED`, con claims, fuentes y nota de revisión.
- Redacción conservadora, limitada a adscripción histórica/formal.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- 20/20 relaciones tienen justificación bilingüe y fuentes registradas.
- Total posterior: 2.314 justificaciones aprobadas, 1.157 por idioma.
- Relaciones `ARTIST → MOVEMENT` pendientes: 17.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-012.cjs`.
