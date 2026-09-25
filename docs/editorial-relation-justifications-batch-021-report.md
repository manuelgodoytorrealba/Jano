# Enriquecimiento global de relaciones — Batch 021

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

## Alcance

Se procesaron 20 relaciones publicadas `ASSOCIATED_WITH`, seleccionadas por cobertura documental y
ausencia de justificación editorial aprobada.

Relaciones incluidas: Armory Show → Cubismo; Revolución francesa → Neoclasicismo; Alejandría →
Ciudad; Amberes → Ciudad; Atenas → Ciudad; Barcelona → Ciudad; Belgrado → Ciudad; Benin City →
Ciudad; Bruselas → Ciudad; Bucarest → Ciudad; Buenos Aires → Ciudad; El Cairo → Ciudad; Chicago →
Ciudad; Constantinopla → Ciudad; Constructivismo → Revolución rusa; Córdoba → Ciudad; Cuzco → Ciudad;
Dadaísmo → Primera Guerra Mundial; Dessau → Ciudad; Djenné → Ciudad.

## Verificación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Todas quedaron en `APPROVED`, con claims, fuentes y nota de revisión.
- Redacción explícitamente no causal: no afirma influencia, equivalencia conceptual ni identidad.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- Total posterior: 2.656 justificaciones aprobadas, 1.328 por idioma.
- Relaciones `ASSOCIATED_WITH` pendientes: 22.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-021.cjs`.
