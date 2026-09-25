# Enriquecimiento global de relaciones — Batch 022

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

Se procesaron 20 relaciones publicadas `ASSOCIATED_WITH`, seleccionadas por cobertura documental y
ausencia de justificación editorial aprobada.

Relaciones incluidas: Hanói → Ciudad; Jartum → Ciudad; Johannesburgo → Ciudad; Kioto → Ciudad; La
Habana → Ciudad; Los Ángeles → Ciudad; Mantua → Ciudad; Milán → Ciudad; Bombay → Ciudad; Múnich →
Ciudad; Museo → Museo del Louvre; Museo → Museo de Arte Moderno; Museo → Museo del Prado; Nápoles →
Ciudad; Núremberg → Ciudad; Pekín → Ciudad; Praga → Ciudad; Seúl → Ciudad; Teherán → Ciudad;
Tenochtitlan → Ciudad.

## Verificación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Todas quedaron en `APPROVED`, con claims, fuentes y nota de revisión.
- Redacción explícitamente no causal: no afirma influencia, equivalencia conceptual ni identidad.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- Total posterior: 2.696 justificaciones aprobadas, 1.348 por idioma.
- Relaciones `ASSOCIATED_WITH` pendientes: 2.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-022.cjs`.
