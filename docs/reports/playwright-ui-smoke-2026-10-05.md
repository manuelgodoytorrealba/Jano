# Playwright UI smoke — 2026-10-05

## Resultado

**PASS** — los flujos públicos principales cargan, hidratan y responden después de los refactors
arquitectónicos y de runtime.

## Flujos verificados

- `/home`: home pública, navegación principal y tarjetas editoriales.
- `/entities`: explorador 3D, apertura de filtros y cambio a vista de lista.
- `/entities?q=Picasso`: búsqueda, resultados, resaltado de coincidencias y paginación deshabilitada
  correctamente al estar en la única página de resultados.
- `/entity/pablo-picasso`: detalle público, imagen, relaciones, fuentes y grafo.
- Detalle: cambio entre `Split View`, `Graph` e `Image`.
- Detalle: cambio de idioma inglés ↔ español, incluyendo navegación y contenido traducido.
- `/research`: publicaciones públicas de Research y explorador visual.
- `/login`: formulario de inicio de sesión y estado disabled inicial del botón.

## Evidencias

- `output/playwright/ui-entities.png`
- `output/playwright/ui-entity-detail.png`

## Consola

Las respuestas `401 Unauthorized` de `GET /api/auth/me` son esperadas en una sesión anónima y
confirman que la protección de rutas sigue activa. No se observaron excepciones JavaScript ni fallos
de hidratación; Angular reportó la hidratación completa de los componentes renderizados.

## Criterio de cierre

La auditoría arquitectónica queda cerrada al 100% para las 45 unidades planificadas. Las capas de
compatibilidad de datos (`ResearchFinding`, bridge de `EntityType` y `isPrimary`) permanecen con su
roadmap expand/contract y no se eliminan durante una prueba UI: requieren primero sus ventanas de
observación y backfill definidos en `docs/legacy-retirement-roadmap.md`.
