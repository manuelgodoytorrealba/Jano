# Enriquecimiento global de relaciones — Batch 015

Fecha: 2026-09-25  
Entorno: base local `jano`, rama `develop`

## Alcance

Se procesaron 20 relaciones publicadas `ABOUT_CONCEPT`, seleccionadas por cobertura documental y
ausencia de justificación editorial aprobada.

Relaciones incluidas: Arte rupestre → Ritual; Art Nouveau → Ornamento; Arts and Crafts → Artesanía;
Barroco → Performance; Barroco → Poder; Bauhaus → Tecnología; Constructivismo → Tecnología; Dadaísmo
→ Autoría; De Stijl → Abstracción; Armory Show → Modernidad; Expresionismo abstracto → Forma;
Fauvismo → Color; Fluxus → Performance; Fotografía → Tecnología; Fotografía moderna → Tecnología;
Futurismo → Máquina; Gótico → Religión; Impresionismo → Modernidad; Informalismo → Materialidad;
Land Art → Naturaleza.

## Verificación

- 40 filas aplicadas: 20 relaciones × `es`/`en`.
- Todas quedaron en `APPROVED`, con claims, fuentes y nota de revisión.
- Redacción limitada a asociación editorial; no añade interpretaciones cerradas ni causalidad.
- Operación transaccional e idempotente mediante `(relationId, locale)`.
- Total posterior: 2.428 justificaciones aprobadas, 1.214 por idioma.
- Relaciones `ABOUT_CONCEPT` pendientes: 20.
- Cambios recientes en `Relation`: 0.
- Segunda ejecución: sin duplicados.

Script reproducible: `backend/api/scripts/editorial-relation-justifications-batch-015.cjs`.
