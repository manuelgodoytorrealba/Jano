# JANO — Auditoría y plan de refactorización arquitectónica

Fecha inicial: 2026-06-27
Última revisión: 2026-06-30
Estado: **COMPLETED — 45/45 unidades**
Alcance: Angular, NestJS, Prisma, estructura, dependencias, estado, presentación y reglas de evolución

> Las secciones 1-3 conservan el diagnóstico inicial. La arquitectura vigente está en
> [`architecture-overview.md`](./architecture-overview.md); las fases siguientes registran la
> ejecución y su cierre.

## Resumen ejecutivo

JANO no necesita una reescritura ni una arquitectura nueva en paralelo. La base es razonable: monorepo simple, módulos Nest por capacidad, Angular standalone con rutas lazy, Prisma como acceso único a datos y una suite de tests útil en backend.

Los problemas principales son cuatro:

1. Hay más de una fuente de verdad para media, home decks y relaciones.
2. Los hotspots concentran ownership de demasiados subdominios, no solo demasiadas líneas.
3. Algunas extracciones han dividido archivos sin descargar responsabilidad del componente original.
4. Las dependencias frontend no siempre apuntan en la dirección correcta: `core` y features públicas importan modelos o datos desde otras features.

Orden recomendado:

1. Corregir dual-truth y fijar límites automáticos.
2. Separar `EntitiesService` por casos de uso sin cambiar endpoints.
3. Convertir el editor de entidades en una página coordinada por una facade, con estado inmutable y secciones UI reales.
4. Consolidar el runtime del grafo; no seguir añadiendo wrappers.
5. Reducir Search, Curated, Home Decks y App Chrome solo donde exista una responsabilidad separable.

La métrica de éxito no es “ningún archivo supera N líneas”. Es que cada cambio tenga un único owner, las reglas persistidas se resuelvan una sola vez y las unidades importantes puedan probarse sin renderizar una página completa.

---

## 1. Estado actual

### 1.1 Inventario

| Área                   |                           Volumen observado | Organización actual                                                                           |
| ---------------------- | ------------------------------------------: | --------------------------------------------------------------------------------------------- |
| Backend runtime        |               88 archivos TS, 13.923 líneas | Módulos Nest por feature, casi todos dependen directamente de Prisma                          |
| Frontend app           |     142 TS, 45 HTML, 60 SCSS; 63.531 líneas | `core`, `shared` y `features`, rutas standalone lazy                                          |
| Prisma                 |         707 líneas de schema, 4.468 de seed | Un schema central, migraciones y seed ejecutable con contenido inline                         |
| Tests                  |           9 specs backend, 9 specs frontend | Buena cobertura de media/entities/search; huecos en editor admin y runtime completo del grafo |
| Dependencias estáticas | 0 ciclos detectados entre imports relativos | Hay acoplamiento conceptual y dependencias invertidas aunque no haya ciclos de compilación    |

### 1.2 Backend actual

`AppModule` compone módulos funcionales: `entities`, `search`, `curated`, `home-decks`, `collections`, `saved`, `auth`, `tags`, `relation-types` y `app-settings`.

El patrón dominante es:

```text
Controller -> Service -> PrismaService
```

Es adecuado para módulos pequeños. Deja de serlo cuando un servicio contiene lectura pública, administración, media, grafo, traducciones y metadatos, como ocurre en `EntitiesService`.

La resolución transversal de entidad se apoya en funciones puras:

- `entities/entity-translation.resolver.ts`
- `entities/media.resolver.ts`
- `entities/image-metadata.ts`

Estas piezas son reutilizadas desde Search, Curated, Collections, Saved y Home Decks, pero viven dentro de `entities`, lo que convierte ese feature en una librería transversal accidental.

### 1.3 Frontend actual

La estructura base es válida:

```text
app/
  core/       APIs, auth, i18n, SEO y servicios singleton
  shared/     media, rich text y UI reutilizable
  features/   páginas y experiencias de producto
```

Fortalezas reales:

- Todas las rutas de producto cargan componentes con `loadComponent`.
- Existen API clients por dominio.
- El listado de entidades ya usa una facade.
- El detalle de entidad ya tiene presenter y vista reutilizable.
- El grafo ya separa escena, controles, inspector y bastante cálculo puro.
- El editor admin ya tiene presenters y algunos child components.

El problema es que esas separaciones son incompletas: la página principal sigue siendo dueña de casi todo el estado y la coordinación.

### 1.4 Modelo de datos y verdad persistida

`Entity` es el agregado central y conecta traducciones, aliases, detalles tipados, media, relaciones, fuentes, contributors, tags, colecciones y decks.

Hay tres compatibilidades que actualmente actúan como verdades paralelas:

- `Relation.type` y `Relation.relationTypeId` (`schema.prisma:202-215`).
- `EntityMedia.role` y `EntityMedia.isPrimary`, donde `isPrimary` representa realmente fallback legacy (`schema.prisma:349-370`).
- `HomeDeck.imageUrl` y `HomeDeck.imageMediaId` (`schema.prisma:650-672`).

Pueden coexistir durante una migración, pero no deben permanecer indefinidamente sin una regla canónica explícita.

### 1.5 Dependencias observadas

No se detectaron ciclos estáticos. Sí se detectaron direcciones incorrectas:

- `core/api/admin-entities.api.ts`, `curated.api.ts` y `entities.api.ts` importan `features/graph/graph.models.ts`.
- Home importa `features/admin/home-deck-starters.ts` y usa `AdminHomeDecksApi` (`home.component.ts:12-20`).
- Admin importa la vista pública de Entity para el preview. La reutilización WYSIWYG es correcta; la ubicación de esa vista no lo es.
- Search, Curated, Home Decks, Saved y Collections importan resolvers desde el feature `entities`.

---

## 2. Problemas detectados

### Prioridades

- **P0**: amenaza la verdad del sistema o hace peligroso el refactor.
- **P1**: frena cambios frecuentes o concentra alto riesgo de regresión.
- **P2**: deuda relevante, pero puede esperar a que P0/P1 estabilicen límites.
- **P3**: limpieza de bajo riesgo o deuda de crecimiento lento.

### 2.1 Hallazgos por archivo o conjunto

| Prioridad | Archivo                                                                                     | Responsabilidad actual                                                                                                                                          | Problema e impacto                                                                                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0        | `frontend/src/app/shared/media/media.utils.ts`                                              | Presentación, URL, selección de slots, fallback, calidad, raster/vector y posters SVG                                                                           | Reimplementa `ROLE_ORDER`, fallback legacy y selección de calidad que ya existen en backend. El público puede resolver una imagen distinta a la canónica. 845 líneas mezclan regla persistida y render.                                                          |
| P0        | `frontend/src/app/features/home/home.component.ts` + `features/admin/home-deck-starters.ts` | Home pública, fallback editorial, materialización admin y mapeo visual                                                                                          | La home pública importa admin, muta backend y muestra decks hardcoded si la API falla (`home.component.ts:130-146`). Oculta fallos y rompe backend-as-source-of-truth.                                                                                           |
| P0        | `backend/api/prisma/schema.prisma`                                                          | Relaciones y compatibilidad de modelos                                                                                                                          | `Relation.type` y `relationTypeId` pueden divergir. Search y Curated todavía filtran por `type`, mientras serializers prefieren `relationType.key`. El mismo vínculo puede interpretarse de dos formas.                                                          |
| P0        | `backend/api/src/entities/entities.service.ts`                                              | Lista pública/admin, detalle, preview, grafo, CRUD, traducciones, aliases, typed details, media, relaciones, tags, fuentes, contributors y enlaces de contenido | God Service de 3.435 líneas y 88 miembros. Cada cambio comparte una superficie de regresión enorme. `adminCreate`/`adminUpdate` persisten entidad, traducción y menciones en operaciones separadas (`1645-1741`), debilitando atomicidad.                        |
| P0        | `frontend/src/app/features/admin/admin-entity-form/admin-entity-form.component.*`           | Página, formulario, routing, siete flujos de API, dirty state, media, preview, almacenamiento UI, mensajes y presentación                                       | God Component: 2.399 TS, 1.659 HTML, 1.630 SCSS, 261 miembros y 119 bindings/ramas relevantes en template. No hay tests del feature. El ownership sigue centralizado pese a los presenters existentes.                                                           |
| P0        | `frontend/src/app/features/admin/admin-entity-form/media-card-editor.component.*`           | Roles, metadata, crops, focal point, drag, preview, warnings y comandos                                                                                         | Muta directamente `editor.draft` recibido por `@Input` (`489-619`). El padre compensa con flags, comparación JSON y `DoCheck`. Estado compartido mutable + OnPush hace difícil razonar sobre dirty/saved/WYSIWYG.                                                |
| P1        | `backend/api/src/entities/media.resolver.ts`                                                | Resolución pública, slots admin, warnings, coverage y quality rules                                                                                             | La lógica es valiosa y está bien probada, pero mezcla dos razones de cambio: resolver producto y diagnosticar admin. Además está mal ubicada como dependencia transversal dentro de Entities.                                                                    |
| P1        | `backend/api/src/entities/entities.controller.ts`                                           | 40 handlers públicos/admin y configuración de upload                                                                                                            | Controller de 405 líneas que refleja el God Service. Duplica configuración Multer con Home Decks. DTOs inline en relaciones/tags debilitan límites.                                                                                                              |
| P1        | `frontend/src/app/features/graph/graph.component.ts` + `graph/*runtime*.ts`                 | Carga, layout, scene state, dos viewports, gestos, focus, filtros, hover, persistencia y navegación                                                             | El componente conserva 104 propiedades y 101 métodos. Existen 10 archivos `*runtime*` (1.482 líneas) con option bags y callbacks que envuelven otras funciones. Es separación por archivo, no transferencia de ownership.                                        |
| P1        | `frontend/src/app/core/api/*` -> `features/graph/graph.models.ts`                           | Contratos HTTP de grafo                                                                                                                                         | `core` depende de una feature de UI. Cualquier reorganización del grafo afecta clientes API no relacionados. Los DTOs deben vivir junto al contrato, no al renderer.                                                                                             |
| P1        | `backend/api/src/search/search.service.ts`                                                  | Orquestación, serialización, secciones, relaciones, decks y variantes                                                                                           | Resuelto parcialmente en Fase 5: el SQL PostgreSQL vive en `SearchQueryRepository` (274 líneas) y el servicio baja de 986 a 722. El resto mantiene cohesión de respuesta editorial y se separará solo por un nuevo caso de uso real.                             |
| P1        | `backend/api/src/home-decks/home-decks.service.ts`                                          | Public/admin CRUD, upload, traducciones persistidas y orden                                                                                                     | Resuelto en Fase 5: el servicio baja de 877 a 416 líneas; presenter y warnings quedan puros. Se eliminan el fallback virtual, su endpoint de materialización y los consumidores frontend. PostgreSQL vuelve a ser la única verdad editorial.                     |
| P1        | `frontend/src/app/shared/ui/app-chrome/app-chrome.component.*`                              | Shell, navegación, rail y header responsive                                                                                                                     | Resuelto en Fase 5: Global Search posee estado, APIs, autocomplete, preparación y UI. App Chrome baja de 723 a 434 TS y de 885 a 681 HTML; deja de inyectar Search, Home Decks y Curated. Los estilos globales de búsqueda pasan de `styles.scss` al componente. |
| P2        | `backend/api/src/curated/curated.service.ts`                                                | Selección, consultas, construcción de grafo y response page                                                                                                     | Resuelto en Fase 5: el servicio baja de 576 a 335 líneas, reutiliza `entity.presenter` y delega presentación a 87 líneas y ranking/diversidad a 122 líneas de funciones puras testeadas.                                                                         |
| P2        | `frontend/src/app/features/entities-explorer-3d/entities-explorer-3d.component.ts`          | Angular adapter, Three scene, texturas canvas, cards, animación, resize, input y accesibilidad                                                                  | Resuelto en Fase 4: el componente baja de 1.285 a 488 líneas y delega Scene/Renderer/Cards, RAF, resize y raycast a un owner concreto. Las texturas y el recorte editorial quedan separados y testeados.                                                         |
| P2        | `frontend/src/app/features/admin/admin-dashboard/admin-global-graph.component.ts`           | WebGL global, worker, cache, filtros, selección, zoom y lifecycle                                                                                               | Evaluado al cierre de Fase 4: continúa siendo un renderer especializado cohesivo y no tiene presión de cambio. Extraer otro runtime ahora movería callbacks sin reducir ownership; se descarta por YAGNI hasta que cambie.                                       |
| P2        | `frontend/src/app/features/admin/admin-home-deck-editor/admin-home-deck-editor.component.*` | Carga, formulario, dirty state, search, mutaciones, reorder optimista y preview                                                                                 | 660 TS, 602 HTML y 1.015 SCSS. Es una página razonablemente cohesiva, pero coordina dos APIs y demasiados estados. No tiene tests de reorder/dirty/save.                                                                                                         |
| P2        | `frontend/src/app/features/entity/entity.component.ts`                                      | Carga, SEO, transición de ruta, share y wiring del detalle                                                                                                      | Resuelto en Fase 5: se eliminan los wrappers duplicados y saved/collections pasa a un facade scoped de 248 líneas. La shell baja de 585 a 216 líneas sin crear estado global.                                                                                    |
| P2        | `docs/search-intent-audit.md`, `docs/home-decks-editorial-admin-plan.md`                    | Planes históricos                                                                                                                                               | Describen como futuras varias piezas ya implementadas. Sin estado de decisión/fecha de cierre, la documentación compite con el código actual.                                                                                                                    |
| P3        | `backend/api/prisma/seed.ts`                                                                | Runner, inferencias, fixtures ES/EN y grafo demo                                                                                                                | 4.468 líneas, pero no es runtime. El problema es mantenimiento editorial y review, no arquitectura de producción. Separar datos del runner cuando vuelva a cambiar con frecuencia.                                                                               |
| P3        | `frontend/package.json`, `backend/api/package.json`                                         | Dependencias                                                                                                                                                    | `tree` no tiene usos en código y `source-map-support` no aparece importado. Son dos candidatos de eliminación, previa verificación de build.                                                                                                                     |

### 2.2 Causas raíz

#### A. Compatibilidad sin fecha de salida

Fallbacks y campos legacy se añadieron para mantener el MVP funcionando, pero no se cerró la migración. El resultado es que una compatibilidad temporal se vuelve arquitectura permanente.

#### B. Servicios organizados por recurso HTTP, no por caso de uso

Entities creció alrededor del prefijo `/entities`. Ese prefijo contiene en realidad catálogo, grafo, media y edición editorial. Una URL común no implica una única responsabilidad.

#### C. Estado frontend mutable y distribuido

El editor admin usa objetos mutables compartidos, numerosos flags y sincronización manual. Los presenters redujeron lógica de mapping, pero no movieron ownership del estado ni de los efectos.

#### D. Extracción por tamaño

El grafo demuestra el riesgo: muchos archivos nuevos pueden aumentar la navegación mental si cada función recibe callbacks hacia el componente que sigue siendo el verdadero owner.

#### E. Contratos en la capa equivocada

`GraphResponseDto` vive en la feature que lo renderiza, aunque lo consumen API clients, admin, collections y curated. Esto invierte `core -> feature`.

### 2.3 Lo que no merece refactor inmediato

- `entities-list.facade.ts` es grande, pero tiene una responsabilidad reconocible: estado de URL, filtros y carga del catálogo. Extraer solo normalizadores puros cuando se toque; no crear otra facade encima.
- `entity-detail.presenter.ts` es una colección de transformaciones puras. Su tamaño no es una urgencia.
- `media.resolver.ts` no debe trocearse por número de líneas; debe separar resolución pública de diagnósticos admin y cambiar de owner.
- Los SCSS grandes deben bajar como consecuencia de extraer componentes visuales. Dividirlos en partials sin componente owner solo esconde el tamaño.
- Admin Global Graph y el Graph público no deben compartir renderer: uno es WebGL global y el otro una experiencia interactiva de detalle. Deben compartir contratos y cálculo puro, no una superclase.

---

## 3. Propuesta de arquitectura

### 3.1 Principios

1. El backend resuelve toda regla persistida.
2. El frontend puede resolver únicamente estado local no guardado para preview.
3. Una extracción debe mover estado, efectos o invariantes; mover funciones no basta.
4. Feature-first, con capas internas solo en features que lo necesiten.
5. Funciones puras antes que servicios; servicios concretos antes que interfaces sin segunda implementación.
6. Prisma puede usarse directamente en servicios simples. Crear repository solo cuando exista una consulta compleja o una frontera de persistencia real.
7. No introducir un package compartido, Nx, NgRx, CQRS ni generación de clientes para resolver este refactor.

### 3.2 Backend objetivo

Mantener los módulos top-level actuales y profundizar únicamente los grandes:

```text
backend/api/src/
  media/
    media.resolver.ts             # resolución canónica de slots persistidos
    media-admin-diagnostics.ts    # warnings y coverage del admin
    media-upload.config.ts        # límites/MIME/Multer compartidos
    image-metadata.ts

  entities/
    controllers/
      entities-query.controller.ts
      admin-entities.controller.ts
      admin-entity-media.controller.ts
      admin-entity-graph.controller.ts
    application/
      entity-read.service.ts
      entity-editorial.service.ts
      entity-media.service.ts
      entity-graph.service.ts
    domain/
      entity-localization.ts
      relation.presenter.ts
      content-links.ts
    dto/
    entities.module.ts

  search/
    search.service.ts              # orquestador
    search-intent.service.ts
    search-query.repository.ts     # SQL y candidate rows
    search.presenter.ts            # mapping/sections puras

  curated/
    curated.service.ts             # orquestador
    curated-ranking.ts             # scoring y diversidad puros
    curated.presenter.ts

  home-decks/
    home-decks.service.ts          # persistencia y casos de uso
    home-deck.presenter.ts         # traducción y response mapping
    home-deck-warnings.ts          # reglas puras
```

No todos esos archivos deben crearse en la primera PR. Son owners finales, no scaffolding inicial.

#### División de Entities

| Owner                    | Responsabilidad                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `EntityReadService`      | list público/admin, filtros, detail y preview                                                                |
| `EntityGraphService`     | grafo por slug y workspace graph                                                                             |
| `EntityMediaService`     | create/upload/ingest/promote/restore/update/delete media                                                     |
| `EntityEditorialService` | create/update/delete entity, traducciones, details, aliases, tags, fuentes, contributors y sync de menciones |

Los controllers pueden compartir `@Controller('entities')`; los paths públicos no cambian. No conservar un `EntitiesService` facade que solo delegue 40 métodos: eso mantendría el God Object con otro nombre.

#### Read models compartidos

La localización base y typed details debe existir una sola vez como función pura de dominio. Search, Curated y Home Decks pueden consumirla. No centralizar un gigantesco Prisma `include` universal: cada query pide solo los datos que necesita y comparte el presenter, no el overfetch.

#### Media

Separar:

- resolución canónica de slots;
- presentación/serialización;
- diagnósticos editoriales;
- almacenamiento/upload.

La regla de selección debe existir solo en backend. Tras guardar un draft, el admin debe refrescar `mediaLibrary` y mostrar la respuesta canónica.

### 3.3 Frontend objetivo

Conservar `core/shared/features`. Aplicar subcapas solo a features grandes:

```text
frontend/src/app/
  core/
    api/
      graph.models.ts             # DTOs HTTP, fuera del renderer
      entities.models.ts
      ...api.ts
    auth/
    i18n/
    seo/

  shared/
    media/
      jano-media.component.*
      media-presentation.ts       # URL, fit, position; no resolución de negocio
    entity-detail/
      entity-detail-view.component.*
      entity-detail.presenter.ts
    ui/

  features/
    admin/entity-editor/
      admin-entity-editor.component.*    # route shell
      admin-entity-editor.facade.ts      # server state y commands
      model/                             # presenters y draft models puros
      ui/
        entity-content-editor.component.*
        entity-taxonomy-editor.component.*
        entity-metadata-editor.component.*
        entity-relations-editor.component.*
        entity-media-library.component.*
        entity-preview-panel.component.*

    graph/
      graph.component.*                  # Angular adapter
      graph-runtime.ts                   # un owner concreto de runtime
      model/                             # layout, geometry, filters, viewport
      ui/                                # scene, controls, inspector

    entities-explorer-3d/
      entities-explorer-3d.component.*   # Angular adapter
      explorer-3d-scene.ts               # lifecycle Three concreto
      explorer-3d-textures.ts            # funciones canvas puras
```

#### Estado del editor admin

La facade debe poseer:

- entity cargada y baseline persistido;
- drafts por sección;
- estados `idle/dirty/saving/saved/error`;
- comandos de API;
- refresh canónico tras mutación;
- coordinación de preview.

Los child components reciben view models inmutables y emiten patches o intents. No mutan inputs. Los presenters siguen siendo funciones puras.

#### Grafo

Conservar las buenas piezas puras: layout, geometry, labels, filters, viewport y rendering derivado.

Eliminar gradualmente wrappers `runXRuntime(options)` que devuelven el control al componente mediante muchos callbacks. Un `GraphRuntime` concreto debe poseer viewports, gestures, timers, RAF, positions y cleanup. `GraphComponent` traduce Angular inputs/outputs y DOM refs.

No crear interfaz, factory ni store global para el runtime: hay una implementación y su vida pertenece a una instancia del componente.

#### App Chrome

Extraer una feature UI de búsqueda global con su propio estado y tests. App Chrome conserva layout, navegación, responsive header y rail. La búsqueda carga Search/HomeDecks/Curated desde su componente o facade, no desde el shell.

### 3.4 Dirección de dependencias

```text
Frontend:
routes/features -> shared UI -> core contracts/services
features -> core
shared -> core (solo capacidades realmente globales)
core -X-> features
feature A -X-> feature B, salvo un renderer promovido explícitamente a shared

Backend:
controller -> application service -> Prisma/domain functions
feature service -> shared domain capability
domain function -X-> Nest/Prisma/HTTP
```

---

## 4. Plan de migración incremental

Cada PR mantiene endpoints y comportamiento, ejecuta `npm run check` y añade o conserva un test que proteja la responsabilidad movida.

Estado global (2026-06-30): 45/45 unidades cerradas (100%).

### Fase 0 — Red de seguridad y límites

Objetivo: hacer el refactor medible antes de mover responsabilidades.

Estado (2026-06-27): completada.

- Contratos public, admin, preview y graph protegidos con tests de caracterización.
- Mapping de contenido y preservación del dirty draft de media protegidos como funciones puras.
- Resize, pointer threshold y cambio de slug del grafo protegidos sin renderizar el componente.
- `GraphResponseDto` vive en `core/api/graph.models.ts`.
- ESLint impide `core -> features` y nuevas dependencias `public feature -> admin`.

Deuda explícita: `home.component.ts` conserva temporalmente el único import público hacia
`home-deck-starters` de admin. Está documentado con una excepción local de ESLint y debe desaparecer
en la fase 1 al retirar el fallback editorial; la excepción no autoriza nuevos imports invertidos.

1. PR: tests de caracterización de responses de Entity public/admin/preview/graph.
2. PR: tests puros del dirty state y mapping del editor admin; sin render completo.
3. PR: tests de lifecycle/viewport/pointer del grafo sobre las funciones actuales.
4. PR: mover `GraphResponseDto` a `core/api/graph.models.ts` y corregir imports.
5. PR: añadir `no-restricted-imports` con ESLint para impedir `core -> features` y public feature -> admin.

Salida: no hay dependencias invertidas nuevas y los contratos críticos están congelados.

### Fase 1 — Una sola verdad

Objetivo: eliminar divergencia antes de reorganizar.

Estado (2026-06-30): completada.

- La presentación pública consume exclusivamente `resolvedMedia`; se retiró la resolución local de
  roles, calidad y fallback desde `mediaLinks`.
- Home ya no sustituye errores, respuestas vacías ni imágenes ausentes por contenido hardcoded.
- Home muestra estados loading/empty/error explícitos y permite reintentar tras un error.
- `home-deck-starters.ts` solo es consumido desde admin; ESLint bloquea futuras dependencias públicas.
- El preview draft admin conserva su resolución local porque representa cambios aún no persistidos.
- `RelationType.key` y `RelationType.directed` son la identidad canónica compartida por Entities,
  Search, Curated y Collections.
- La migración de backfill crea tipos legacy faltantes y enlaza relaciones huérfanas.
- La migración de cutover aborta si detecta una relación sin `relationTypeId`; después hace el campo
  obligatorio y elimina `Relation.type`.
- El alias HTTP `type` se deriva de `RelationType.key`, por lo que los clientes existentes conservan
  su contrato sin mantener una segunda verdad persistida.

1. PR: separar en frontend presentación de media y fallback legacy. Público consume `resolvedMedia`; resolver local queda limitado al draft admin.
2. PR: eliminar fallbacks editoriales silenciosos de Home pública. Error/empty state explícito; contenido desde backend.
3. PR: sacar Home starters del path público. Mantenerlos solo como acción admin temporal o migrarlos a seed/backend.
4. PR: definir `RelationType` como verdad canónica; auditoría y backfill de `relationTypeId`.
5. PR: cambiar lecturas Search/Curated/Collections a la clave canónica con fallback legacy temporal.
6. PR posterior y separado: hacer `relationTypeId` obligatorio y retirar `Relation.type` cuando producción esté migrada. **Completada.**

Salida: frontend no decide output persistido y relaciones tienen una interpretación única.

### Fase 2 — Backend Entities

Estado (2026-06-28): completada (PR 1 a PR 9).

- `media.resolver.ts`, `image-metadata.ts` y los tests del resolver viven en `backend/api/src/media`.
- Entities, Search, Curated, Collections, Saved y Home Decks consumen la capacidad desde su nuevo
  owner transversal.
- No se creó un `MediaModule`: las piezas movidas son funciones puras y no necesitan DI.
- `media.resolver.ts` contiene solo resolución pública y primitivas compartidas; bajó de 1.188 a
  679 líneas.
- `media-diagnostics.ts` posee slots, warnings y cobertura exclusivamente administrativos en 405
  líneas.
- `EntityMediaService` posee alta, upload, ingestión, promoción, restauración, edición y borrado de
  media de entidad; `EntitiesService` solo lo invoca para normalizar el fallback legacy al cargar el
  workspace admin.
- `EntityMediaController` conserva las siete rutas existentes bajo `/entities/:id/media`; no hubo
  cambio de URL, guards, DTO ni response shape.
- Entities y Home Decks reutilizan una única configuración Multer para imágenes (directorio, tipos
  MIME y límite de 15 MB).
- `EntityGraphService` posee las consultas y el mapping del grafo público y del workspace admin en
  422 líneas; `EntityGraphController` conserva `/entities/:slug/graph` y
  `/entities/admin/workspace/graph` con sus guards originales.
- `EntitiesService` ya no expone rutas ni métodos de grafo y baja a 2.193 líneas.
- `entity.presenter.ts` concentra localización de entidades/details, selección de traducciones y
  serialización de relaciones/fuentes como funciones puras compartidas por Entities, Graph y
  Curated.
- Se eliminó la resolución duplicada `locale -> es -> en`; `EntitiesService` baja a 1.930 líneas,
  `EntityGraphService` a 350 y Curated a 576.
- `EntityEditorialService` posee el lifecycle principal create/update/delete, traducciones y typed
  details en 384 líneas. Cada mutación ejecuta en una transacción y después delega únicamente la
  lectura de respuesta admin.
- La traducción española, el mirror base y la sincronización de relaciones `MENTIONS` se confirman
  o revierten juntos; actualizar summary/content ya no deja la traducción española desfasada.
- `EntitiesService` baja a 1.468 líneas. Los subrecursos editoriales restantes (aliases, relaciones,
  tags, fuentes y contributors) se moverán durante el cutover final de controllers de la PR 7.
- El antiguo `EntitiesService` se renombró a `EntityReadService`; no conserva mutaciones ni actúa
  como facade. Los controllers de lectura (76 líneas) y edición (146) comparten `/entities` sin
  cambiar paths ni guards.
- Aliases/relaciones/tags viven en `EntityTaxonomyService` (247 líneas) y fuentes/contributors en
  `EntityCreditsService` (222). `EntityEditorialService` conserva el lifecycle principal en 384.
- Tras la PR 7 quedaron dos triggers medidos: `EntityReadService` con 790 líneas y
  `EntityMediaService` con 858. La fase no se considera cerrada hasta ejecutar las PR 8 y 9.
- `EntityCatalogService` posee filtros, paginación, facetas y Home en 371 líneas;
  `EntityReadService` queda limitado a detail, preview y lecturas admin en 429. Ninguno supera ya el
  trigger de 600.
- `EntityMediaService` conserva CRUD/upload y normalización en 361 líneas;
  `EntityMediaLifecycleService` posee ingest/promote/restore, filesystem y lineage en 519. Ambos
  reutilizan la misma invariante de primary y mantienen las siete rutas originales.

1. PR: mover resolver/image metadata a `media/` sin cambiar exports ni behavior.
2. PR: separar diagnostics admin del resolver público.
3. PR: extraer `EntityMediaService` y controller de media; reutilizar upload config. **Completada.**
4. PR: extraer `EntityGraphService` y controller de grafo. **Completada.**
5. PR: extraer localización/serialización puras y reutilizarlas desde Curated. **Completada.**
6. PR: extraer `EntityEditorialService`; hacer atómicos entity + traducción + menciones.
   **Completada.**
7. PR: renombrar el remanente a `EntityReadService` y dividir query/admin controllers.
   **Completada.**
8. PR: separar catálogo/listados de detail/preview en lectura. **Completada.**
9. PR: separar ingest/promote/restore del CRUD de media. **Completada.**

Salida: ningún servicio de Entities supera el trigger de 600 líneas y cada uno puede probarse con un Prisma mock reducido.

### Fase 3 — Editor de entidades

Estado (2026-06-29): completada (PR 1 a PR 9). Progreso global: 29/45 unidades (64%); Fase 3: 9/9
(100%).

- `AdminEntityFormFacade` es scoped por route component y posee load/save/refresh, guardado de
  traducción y feedback asociado; navegación, confirmaciones e hidratación visual siguen en el
  componente.
- `MediaCardEditor` clona su input, edita estado local y emite nuevos drafts. El container reemplaza
  editors inmutablemente; ningún `ngModel` muta ya el input recibido.
- Las PR 1 y 2 se ejecutaron juntas porque compartían el mismo límite de estado/efectos; la PR 3 se
  incluyó tras quedar protegida por una prueba pequeña de inmutabilidad.
- `AdminEntityTranslationEditorComponent` posee locale activo, edición inmutable, payload y guardado
  de traducciones; el container recibe snapshots para preview y persistencia principal.
- `AdminEntityTaxonomyEditorComponent` posee catálogo y mutaciones de tags/aliases.
  `AdminEntityRelationsEditorComponent` posee tipos, búsqueda, CRUD y estados de carga/error de
  relaciones. El route component conserva únicamente los snapshots necesarios para preview,
  sidebar y discoverability.
- Los componentes extraídos tienen estilos propios y reutilizan un partial pequeño de controles; no
  duplican el SCSS completo del formulario. El container baja de 2.417 a 1.906 líneas TS y de 1.659
  a 1.168 líneas HTML.
- Fuentes y colaboradores son owners separados, sin un wrapper `Metadata` delegador:
  `AdminEntitySourcesEditorComponent` (150 líneas) y `AdminEntityContributorsEditorComponent` (137)
  poseen drafts, validación, CRUD y feedback; el container conserva snapshots para preview/sidebar.
  El formulario principal baja de nuevo a 1.714 líneas TS y 738 HTML.
- El payload de fuentes usa el título ES editado como título canónico; antes el formulario escribía
  `sourceTitleEs` pero la validación exigía el campo legacy `sourceTitle`, haciendo fallar altas
  válidas.
- `AdminEntityPreviewComponent` (83 líneas) posee la construcción y render del preview público. Una
  `stateKey` pura dispara cambios del agregado y elimina por completo `DoCheck`, polling y refreshes
  con microtasks del route component.
- `AdminEntityMediaLibraryComponent` (180 líneas) posee view-model, navegación interna y selección
  visual; comunica acciones mediante un único intent discriminado. El route component baja a 1.489
  líneas TS y 415 HTML. La orquestación HTTP de media sigue siendo la principal responsabilidad
  pendiente y se mueve explícitamente al owner scoped en la PR 8 antes de cerrar la fase.
- `AdminEntityMediaActions` es scoped por Media Library y posee alta/upload, dirty drafts, guardado,
  borrado optimista, ingest/promote/restore y refresh canónico. El route component ya solo recibe el
  snapshot necesario para preview/sidebar y baja a 1.031 líneas; su SCSS baja de 1.404 a 986 tras
  retirar bloques transferidos. El chunk admin baja de 320,8 a 313,0 kB.
- `admin-entity-discoverability.presenter.ts` concentra score, tono, mensajes y policy de aviso al
  publicar con test puro. `AdminEntityGlobalDataComponent` posee el formulario base, slug,
  autocompletado de enlaces y coordinación de traducción/taxonomía/ficha; el editor de detalles
  posee su payload, guardado y feedback sin mutar inputs.
- `AdminEntityRouteShell` posee contexto seguro de ruta, persistencia de sección/sidebar y
  navegación tras guardar. El route queda en 489 líneas TS y 121 HTML, por debajo del trigger de
  500; su SCSS residual baja de 986 a 65 líneas. El chunk admin baja de 313,0 a 303,8 kB.

1. PR: crear facade usando el estado existente; el componente sigue renderizando igual.
   **Completada.**
2. PR: mover load/save/refresh y estados de feedback a facade. **Completada.**
3. PR: hacer inmutables los drafts de media; `MediaCardEditor` emite un draft nuevo completo.
   **Completada sin añadir un tipo patch innecesario.**
4. PR: extraer Content/Translation editor con tests de payload. **Completada.**
5. PR: extraer Relations/Taxonomy editor. **Completada.**
6. PR: extraer Metadata (sources/contributors) editor. **Completada.**
7. PR: convertir Media Library y Preview en owners visuales reales; eliminar `DoCheck`.
   **Completada.**
8. PR: mover la orquestación HTTP restante de media a su owner scoped, borrar wrappers/presenters
   muertos y retirar SCSS ya transferido. **Completada.**
9. PR de cierre: extraer Global Data/typed details y shell/discoverability hasta dejar el route por
   debajo del trigger; retirar el SCSS residual sin divisiones cosméticas. **Completada.**

Salida: route component menor de 400-500 líneas, cero mutación de inputs, preview canónico tras save.

### Fase 4 — Runtime de grafo y 3D

Estado (2026-06-30): completada. Fase 4: 7/7 decisiones cerradas (6 implementadas, 1 descartada por
YAGNI).

- `GraphCameraRuntime` es el único owner de viewport animado, posición de tooltip, aplicación de
  planes de foco y foco inicial. Se eliminaron los cuatro controllers/wrappers que reenviaban
  callbacks y `GraphComponent` consume directamente el runtime; la matemática permanece pura.
- `GraphInteractionRuntime` posee sesiones pointer, pan/drag, pinch de grafo e imagen, RAF y cleanup.
  Reutiliza las transiciones puras existentes, elimina `graph-pointer-runtime.ts` y reduce
  `GraphComponent` de 1.970 a 1.639 líneas.
- Solo `GraphCameraRuntime` y `GraphInteractionRuntime` conservan el sufijo runtime porque poseen
  estado/lifecycle. Se eliminan shell/hover/UI/image delegadores; loop y stage quedan como
  coordinadores puros. El chunk del grafo baja de 185,7 a 180,8 kB.
- `GraphComponent` queda como adapter Angular/DOM: inputs, signals de vista, refs/observers,
  suscripción API, routing/outputs y wiring hacia owners puros. Filtros, reutilización de posiciones,
  pinning y estabilización salen a `graph-setup.ts`. Sus 1.603 líneas superan el trigger general,
  pero no se crea un mega-runtime que solo traslade el God Object; futuras reglas deben entrar en
  módulos puros o en los dos runtimes propietarios.
- `Explorer3dScene` es el único owner de Scene/Renderer/Cards, raycast, RAF, resize y liberación de
  recursos. El componente Angular conserva interacción, navegación y accesibilidad; baja de 1.285 a
  488 líneas. La generación de texturas y el cálculo de foco/cover salen a funciones independientes
  con tests de caracterización.

1. PR: organizar contratos/modelos fuera del renderer. **Completada en Fase 0.**
2. PR: consolidar viewport + tooltip + focus en un runtime concreto. **Completada.**
3. PR: migrar pointer/pinch/RAF y cleanup al runtime. **Completada.**
4. PR: borrar wrappers `graph-*-runtime.ts` redundantes. **Completada.**
5. PR: dejar `GraphComponent` como adapter de inputs, DOM y outputs. **Completada.**
6. PR independiente: extraer `Explorer3dScene` y texturas puras. **Completada.**
7. PR opcional: aplicar el mismo patrón a Admin Global Graph solo si vuelve a cambiar. **Descartada
   por YAGNI tras revisar su ownership actual.**

Salida: una sola unidad posee cada loop/lifecycle; los cálculos siguen puros y testeados.

### Fase 5 — Servicios secundarios y shell

Estado (2026-06-30): completada. Fase 5: 5/5 (100%).

- `SearchQueryRepository` posee la consulta PostgreSQL y sus filtros; `SearchService` conserva
  intención, combinación de variantes, entidades y packaging editorial. No se añade interfaz de un
  solo uso ni se fragmenta el ranking entre capas.
- Curated reutiliza `translationField` y `resolveLocalizedEntityWithDetails`; scoring, merge, orden y
  diversidad viven en funciones puras sin dependencias de Nest o Prisma. El presenter de respuesta
  también queda puro y `CuratedService` baja de 576 a 335 líneas.
- Home Decks deja de inventar el deck `place`: se eliminan fallback virtual, materialización y ramas
  frontend asociadas. Presenter y warnings son puros; el servicio baja de 877 a 416 líneas. El campo
  `isVirtual: false` se conserva temporalmente solo como compatibilidad HTTP.
- `GlobalSearchComponent` posee búsqueda, sugerencias, preparación editorial, teclado y sus tres
  APIs. App Chrome queda como shell de navegación/rail, baja de 723 a 434 líneas y elimina estado de
  filtro muerto que la plantilla nunca podía activar.
- Entity elimina 25 wrappers que duplicaban su presenter. `EntitySavedCollectionsFacade`, scoped a
  la ruta, posee guardado, colecciones, feedback y timers; la shell baja de 585 a 216 líneas.

1. PR: extraer `SearchQueryRepository` para el SQL; SearchService conserva orquestación.
   **Completada.**
2. PR: extraer ranking/presentación puros de Curated y eliminar localización duplicada.
   **Completada.**
3. PR: extraer presenter/warnings de Home Decks y retirar virtual fallback tras migración.
   **Completada.**
4. PR: extraer Global Search de App Chrome. **Completada.**
5. PR: limpiar wrappers muertos de Entity y aislar saved/collections si vuelve a crecer.
   **Completada.**

### Fase 6 — Consolidación

Estado (2026-06-30): completada. Fase 6: 4/4 (100%).

- `architecture-overview.md` vuelve a describir el sistema real y actúa como referencia canónica.
- Los planes de Search Intent y Home Decks declaran explícitamente su estado histórico y enlazan a
  la arquitectura vigente.
- `seed.ts` sí cambia con frecuencia (12 commits en seis meses): 979 líneas de fixtures estáticos de
  traducción y taxonomía pasan a `seed.fixtures.ts`; la orquestación relacional permanece junta.
- La auditoría de imports retira `tree` y su dependencia transitiva `underscore`; no se añaden
  herramientas ni abstracciones para perseguir falsos positivos.

1. Actualizar `architecture-overview.md` para reflejar la arquitectura final. **Completada.**
2. Marcar planes históricos como `implemented`, `superseded` o `active`. **Completada.**
3. Separar fixtures de `seed.ts` solo si continúa recibiendo cambios frecuentes. **Completada.**
4. Eliminar dependencias sin uso tras build/test. **Completada.**

### Cierre técnico posterior

- `relationTypeId` pasa a ser obligatorio y `Relation.type` desaparece tras una migración que aborta
  si el backfill no está completo. El alias HTTP `type` se deriva de `RelationType.key`.
- La auditoría de estilos elimina la copia de Graph Scene que permanecía en el padre y residuos en
  App Chrome, Entity Deck, Media Card, Explorer Shell y Home Deck Editor.
- El budget `anyComponentStyle` de 28 kB es ahora error de build; producción compila sin warnings.
- `index.html` aporta una marca de arranque accesible mientras i18n bloquea el bootstrap, evitando el
  frame inicial con solo el fondo.

---

## 5. Reglas arquitectónicas

Los tamaños son triggers de revisión, no objetivos que se puedan “cumplir” moviendo líneas a helpers.

| Unidad                     | Objetivo | Revisión obligatoria | Acción esperada                                                            |
| -------------------------- | -------: | -------------------: | -------------------------------------------------------------------------- |
| Angular route/container TS |   <= 300 |                > 500 | Extraer estado/efectos a facade o subflujo con owner                       |
| Angular presentational TS  |   <= 250 |                > 400 | Extraer una interacción o sección visual completa                          |
| Angular template           |   <= 300 |                > 500 | Crear child components por tarea de usuario                                |
| Component SCSS             |   <= 600 |                > 900 | Extraer junto con el componente que posee esos estilos                     |
| Nest application service   |   <= 400 |                > 600 | Separar por caso de uso/invariante                                         |
| Controller                 |   <= 250 |                > 350 | Separar surface pública/admin/subrecurso                                   |
| Facade                     |   <= 350 |                > 500 | Dividir subflujo o mover transformaciones puras                            |
| Presenter/helper puro      |   <= 250 |                > 400 | Separar por output o regla de dominio                                      |
| Método                     |    <= 40 |                 > 80 | Extraer policy/query/presenter; excepción documentada para SQL declarativo |

### Cuándo crear cada pieza

#### Facade

Crear cuando una página coordina al menos dos de estos ejes:

- routing/query params;
- dos o más API clients;
- server state + draft state;
- varios child components;
- estados de save/error/refresh.

No crear para envolver un único método de API.

#### Presenter

Crear para una transformación pura de domain/API model a view model. No inyecta servicios, no navega, no usa DOM y debe poder probarse con una llamada de función.

#### Helper

Crear para una operación pequeña, pura y reutilizada. Si contiene política editorial o invariantes, no es `utils`: nombrarlo `*.policy.ts`, `*.resolver.ts` o `*.presenter.ts`.

#### Service

Backend: posee un caso de uso, transacción o integración.
Frontend: solo para capacidad singleton transversal o facade de feature. No usar service como cajón de funciones.

#### Composable

Angular no necesita convención `useX`. Para estado reutilizable ligado a DI usar `*.facade.ts` o `*.state.ts`; para cálculo reutilizable usar función pura; para runtime imperativo usar una clase concreta `*.runtime.ts`.

#### Component

Dividir cuando una sección tenga:

- una tarea de usuario identificable;
- estado local propio;
- lifecycle/DOM propio;
- inputs/outputs claros;
- template o estilos que puedan vivir con ella.

No dividir un bloque estático de 30 líneas solo para bajar una métrica.

### Dónde vive la lógica

| Lógica                                          | Debe vivir en                          | No debe vivir en                   |
| ----------------------------------------------- | -------------------------------------- | ---------------------------------- |
| Reglas persistidas, ranking, fallback editorial | Backend domain/application             | Angular component o frontend utils |
| Validación de trust boundary                    | DTO/pipe/backend service               | Solo en formulario frontend        |
| Transacción multi-modelo                        | Backend application service            | Controller                         |
| Mapping API -> view model                       | Presenter frontend puro                | Template complejo                  |
| Draft no persistido                             | Facade/state de feature                | Backend global o shared singleton  |
| DOM, pointer, RAF, WebGL                        | Component adapter/runtime concreto     | Facade de negocio                  |
| Estilos                                         | Componente que renderiza la estructura | Partial global sin owner           |

---

## 6. Convenciones

### 6.1 Nombres backend

- `*.controller.ts`: HTTP únicamente.
- `*.service.ts`: caso de uso con I/O o transacción.
- `*.presenter.ts`: mapping puro de response.
- `*.resolver.ts`: regla determinista que elige un resultado.
- `*.policy.ts`: invariante o decisión de dominio.
- `*.repository.ts`: consulta/persistencia compleja; no wrapper genérico de Prisma.
- `*.models.ts`: contratos internos sin comportamiento.

### 6.2 Nombres frontend

- `*-page.component.ts` para nuevas route pages; no renombrar todas las existentes solo por estilo.
- `*.facade.ts` para orquestación de una feature.
- `*.presenter.ts` para mapping puro.
- `*.models.ts` para modelos locales de feature.
- `*.runtime.ts` para ownership imperativo concreto.
- Evitar `helpers.ts`/`utils.ts` cuando existe un nombre de dominio más preciso.

### 6.3 Imports

- `core` nunca importa `features`.
- `shared` nunca importa route components.
- Una feature no importa otra feature; promover la pieza reutilizable a `shared` o el contrato a `core`.
- Excepción explícita: durante una PR de migración, con TODO/deuda y fecha de retirada.
- Imports explícitos; no añadir barrels globales para ocultar dependencias.

### 6.4 Contratos API

- Request DTO en backend; response model documentado y cubierto por test de caracterización.
- Frontend mantiene sus tipos en `core/api`, no en components/renderers.
- No introducir generación OpenAPI hasta que el drift contractual sea un problema medido.
- Un refactor interno no cambia endpoints ni shape en la misma PR.

### 6.5 Estado Angular

- Child component no muta `@Input`.
- Inputs describen estado; outputs describen intentos o patches.
- Signals/computed para estado local; RxJS para streams async/cancelación.
- Evitar `DoCheck` para sincronizar modelos grandes.
- Dirty state se calcula desde baseline + draft estable o se marca en el comando de edición; no mediante polling implícito.

### 6.6 Tests

- Toda extracción conserva primero un characterization test.
- Resolver/presenter/policy: test puro.
- Service con transacción: test del caso de uso y rollback relevante.
- Runtime gráfico: test de transición/lifecycle, no snapshots gigantes.
- Component visual: test solo para contrato de interacción importante.

### 6.7 Documentación

Todo documento de arquitectura o plan debe incluir:

- fecha;
- estado: `active`, `implemented`, `superseded`, `historical`;
- owner o área;
- links a decisiones posteriores.

Usar ADR breve solo para decisiones difíciles de revertir: verdad de relaciones, media canónica, dirección de dependencias. No crear ADR para cada refactor de archivo.

---

## 7. Políticas permanentes propuestas

Estas reglas deben añadirse a `AGENTS.md` y, donde sea posible, a ESLint/CI.

1. **[PERMANENTE] Backend owns persisted truth.** El frontend no reimplementa resolución de media, ranking, publicación o fallback editorial. Solo puede previsualizar drafts no guardados.
2. **[PERMANENTE] No hidden public fallback.** Un fallo de API no se sustituye por contenido editorial hardcoded; se muestra estado vacío/error explícito.
3. **[PERMANENTE] One canonical field.** Todo campo legacy paralelo requiere owner, plan de backfill y condición de retirada.
4. **[PERMANENTE] Import direction.** `core -X-> features`; public feature `-X-> admin`; cross-feature solo tras promover contrato/UI.
5. **[PERMANENTE] Extraction must transfer ownership.** Un nuevo archivo debe poseer estado, efecto, lifecycle, query o regla; wrappers delegadores no cuentan como refactor.
6. **[PERMANENTE] Immutable component inputs.** Los child components no mutan objetos recibidos.
7. **[PERMANENTE] Size review triggers.** Superar los umbrales obliga a justificar owner/cohesión en la PR; no obliga a una división cosmética.
8. **[PERMANENTE] Stable contracts during refactor.** Mover arquitectura y cambiar behavior/API son PRs distintas.
9. **[PERMANENTE] Test before move.** Ningún hotspot P0/P1 se divide sin un test ejecutable que cubra el flujo movido.
10. **[PERMANENTE] No speculative layers.** Sin interfaces de una implementación, repositories que solo delegan Prisma, factories de un producto o stores globales para estado local.
11. **[PERMANENTE] CSS budget is a build gate.** Ningún component style puede superar 28 kB; dividir
    partials sin transferir ownership no resuelve el problema.
12. **[PERMANENTE] First frame is product UI.** El arranque previo a Angular debe mostrar una marca o
    estado accesible, nunca solo decoración de fondo.

Automatización mínima recomendada, sin dependencias nuevas:

- ESLint `no-restricted-imports` para dirección frontend.
- ESLint `max-lines` y `max-lines-per-function` como warning/trigger, no error inicial.
- `npm run check` continúa como gate único de CI.

---

## 8. Roadmap priorizado

| Orden | Iniciativa                                         | Valor                                       | Riesgo     | Decisión                         |
| ----: | -------------------------------------------------- | ------------------------------------------- | ---------- | -------------------------------- |
|     1 | Fuente única de media/home/relations               | Máximo: verdad, WYSIWYG y estabilidad       | Medio      | Hacer primero                    |
|     2 | Characterization tests + import boundaries         | Reduce riesgo de todas las fases            | Bajo       | Hacer primero                    |
|     3 | Split de Entities por casos de uso                 | Desbloquea backend y reduce blast radius    | Medio      | Inmediato tras P0                |
|     4 | Facade + componentes reales en Admin Entity Editor | Mayor cuello de botella frontend            | Medio/alto | Inmediato tras contratos backend |
|     5 | Consolidación del runtime de Graph                 | Reduce mucha complejidad accidental         | Alto       | Después de tests y del editor    |
|     6 | Search SQL repository + Curated pure ranking       | Mejora testabilidad de discovery            | Medio      | Completada                       |
|     7 | App Chrome search extraction                       | Aísla una feature transversal visible       | Bajo/medio | Después de P1                    |
|     8 | Home Deck editor facade/presenter                  | Mejora mantenibilidad, sin urgencia crítica | Bajo       | Puede esperar                    |
|     9 | Explorer 3D scene extraction                       | Útil si se añaden interacciones o layouts   | Medio      | Completada                       |
|    10 | Admin Global Graph runtime                         | Cohesivo hoy; poco retorno inmediato        | Medio      | Descartado por YAGNI             |
|    11 | Seed fixtures y SCSS restantes                     | Limpieza de mantenimiento                   | Bajo       | Último                           |

### Qué no refactorizar ahora

- Auth, Saved, Tags, Relation Types, Users y App Settings: son pequeños y cohesivos.
- Collections: 390 líneas y una responsabilidad clara; revisar solo si crecen graph y CRUD por separado.
- API client generation o shared workspace package: no hay evidencia suficiente para pagar ese coste.
- NgRx/CQRS/event bus: no resuelven ninguno de los problemas observados.
- Unificar todos los grafos/renderers: eliminaría diferencias de producto útiles.

---

## 9. Checklist de PR arquitectónica

- [ ] ¿La PR mueve una responsabilidad real o solo líneas?
- [ ] ¿Hay una única fuente de verdad después del cambio?
- [ ] ¿El endpoint y response shape permanecen estables?
- [ ] ¿El nuevo owner tiene nombre de dominio claro?
- [ ] ¿El child component evita mutar inputs?
- [ ] ¿Se mantuvo la dirección de imports?
- [ ] ¿Existe un test pequeño que fallaría si la extracción se rompe?
- [ ] ¿Se eliminaron wrappers/deuda que la nueva pieza reemplaza?
- [ ] ¿`npm run check` pasa?
- [ ] ¿El build de producción pasa sin warnings ni errores de budget?
- [ ] ¿La documentación afectada cambia de estado?

---

## 10. Apéndice Ponytail: complejidad eliminable

Hallazgos ordenados por corte potencial:

- `shrink:` eliminar wrappers runtime del grafo a medida que un único runtime adopta ownership; conservar funciones matemáticas puras. `[frontend/src/app/features/graph/*runtime*.ts]`
- `delete:` retirar resolución legacy pública del frontend; usar `resolvedMedia` backend. `[frontend/src/app/shared/media/media.utils.ts]`
- `delete:` retirar fallback editorial hardcoded del path público tras migrar seed/backend. `[frontend/src/app/features/admin/home-deck-starters.ts]`
- `shrink:` borrar wrappers muertos de presenter en Entity shell. `[frontend/src/app/features/entity/entity.component.ts]`
- `native:` usar una única configuración Multer/Nest para uploads de imagen. `[backend/api/src/entities/entities.controller.ts, backend/api/src/home-decks/home-decks.controller.ts]`
- `delete:` quitar `tree` y probablemente `source-map-support` tras verificar build. `[frontend/package.json, backend/api/package.json]`
- `yagni:` no añadir repositories genéricos, interfaces de una implementación, stores globales ni un package shared nuevo.

Potencial conservador una vez completadas las migraciones: **-700 a -1.200 líneas netas y -2 dependencias**, sin contar la redistribución de templates/SCSS ni exigir reducción artificial.

---

## Conclusión

El refactor queda cerrado: las fuentes de verdad paralelas fueron retiradas, Entities y el editor
admin tienen owners concretos, Graph/3D separan lifecycle de cálculo puro y los servicios secundarios
conservan límites explícitos. Este documento pasa a histórico; `architecture-overview.md` es la
referencia activa para nuevas implementaciones.
