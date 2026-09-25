# Enriquecimiento global de relaciones — Batch 018

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

Se procesaron 20 relaciones publicadas `BELONGS_TO_PERIOD`, seleccionadas por cobertura documental y
ausencia de justificación editorial aprobada.

Relaciones incluidas: Barroco → Edad Moderna; Bauhaus → Siglo XX; Constructivismo → Siglo XX; Dadaísmo
→ Siglo XX; De Stijl → Siglo XX; Armory Show → Siglo XX; Expresionismo → Siglo XX; Expresionismo
abstracto → Siglo XX; Fauvismo → Siglo XX; Fluxus → Siglo XX; Fotografía moderna → Siglo XX;
Futurismo → Siglo XX; Gótico → Edad Media; Guerra civil española → Siglo XX; Impresionismo → Siglo
XIX; Informalismo → Siglo XX; Land Art → Siglo XX; Manierismo → Edad Moderna; Minimalismo → Siglo
XX; Muralismo mexicano → Siglo XX.

## Verificación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Todas quedaron en `APPROVED`, con claims, fuentes y nota de revisión.
- Redacción limitada a ubicación temporal, sin extrapolaciones históricas adicionales.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- Total posterior: 2.548 justificaciones aprobadas, 1.274 por idioma.
- Relaciones `BELONGS_TO_PERIOD` pendientes: 17.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-018.cjs`.
