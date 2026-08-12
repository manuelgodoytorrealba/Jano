# JANO — contexto integral para ChatGPT

> Documento de referencia para un proyecto de ChatGPT. Estado consolidado: 2026-08-06.
>
> Esta fuente explica el producto, sus límites de dominio, arquitectura, tecnología y estado actual. No contiene secretos, credenciales, datos privados ni sustituye al repositorio. Si entra en conflicto con `docs/architecture/`, prevalecen los documentos de esa carpeta, especialmente `README.md`, `15-research-studio-experience.md` y `16-editorial-pipeline.md`.

## Instrucciones para un asistente que trabaja sobre JANO

JANO es una plataforma premium de descubrimiento cultural, conocimiento conectado y exploración editorial. No debe tratarse como un CRUD, un CMS de páginas, una enciclopedia, un gestor de enlaces o un clon de Google Arts. La ambición es que una persona explore cultura y relaciones significativas, no que navegue una base de datos.

Al proponer producto, UX, código o arquitectura para JANO:

- Piensa simultáneamente como directora editorial, diseñadora de producto, investigadora, arquitecta de software y especialista en grafos de conocimiento.
- Prioriza curiosidad, procedencia, relaciones explicables, lectura, contexto y calidad editorial sobre cantidad de contenido, automatización o dashboards.
- Parte de las entidades y sus relaciones, no de “páginas” aisladas. Una página es una manera de explorar entidades.
- Mantén al backend como fuente de verdad de reglas, integridad, autorización, relaciones y recomendaciones. El frontend presenta, interactúa y conserva estado local; no duplica reglas de negocio.
- Evita abstracciones especulativas: no introducir stores globales, CQRS, event buses, repositorios genéricos, factories o interfaces de una sola implementación sin una necesidad medida.
- Favorece vertical slices completas y cambios pequeños, verificables y coherentes con el dominio.
- Nunca conviertas una salida de IA, un documento procesado o una similitud visual en conocimiento aceptado. La IA propone; una persona revisa y decide.
- No propongas sincronización automática entre Research, Publication y Knowledge Core. Cada transición entre dominios es explícita, selectiva, atribuible y trazable.
- Conserva incertidumbre, contradicciones y límites documentales. No los ocultes ni los promedies para aparentar certeza.

### Calidad de producto y diseño

La interfaz debe sentirse calmada, intencional, premium, legible y atemporal; más cercana a Apple, Linear, Notion, Arc Browser o una exposición museística que a Bootstrap, Material Admin o un SaaS genérico. La jerarquía y el espacio en blanco importan más que la decoración.

Objetivo principal de responsive: escritorio portátil entre 1100 y 1500 px. Primero se pule ese intervalo; después pantallas grandes, tablet y móvil. No sacrificar la ergonomía desktop para resolver primero extremos móviles.

Principios de UI:

- Densidad legible, tipografía refinada, espaciado consistente y divulgación progresiva.
- Acciones claras y cercanas al objeto que modifican; evitar diálogos innecesarios.
- Movimiento sutil y con significado, sin animación decorativa.
- Relación, fuente, evidencia y siguiente paso útil visibles cuando importan.
- Interfaces editoriales antes que formularios administrativos.

## Qué es JANO

JANO conecta seis pilares:

1. **Conocimiento conectado:** entidades y relaciones con significado editorial.
2. **Exploración visual:** el grafo es un modelo de navegación, no un adorno.
3. **Narrativa editorial:** rutas, artículos, colecciones y páginas curadas orientan el descubrimiento.
4. **Investigación personal:** Research Studio permite transformar un corpus en pensamiento trazable y escritura.
5. **Descubrimiento inteligente:** búsqueda, recomendaciones y relaciones abren caminos posteriores.
6. **Calidad premium:** experiencia serena, confiable y cuidadosamente articulada.

Una obra de arte, artista, movimiento, museo, lugar, periodo, concepto, técnica, acontecimiento, artículo, colección o ruta curada puede convertirse en el centro de un viaje de exploración. Desde un objeto el usuario debe poder entender por qué importa y encontrar una continuación interesante.

### Lo que JANO no es

- No es un CRUD con etiquetas culturales.
- No es un CMS de páginas independientes.
- No es un grafo de conexiones autogeneradas sin sentido.
- No es una base de datos pública de “hechos” sin una capa editorial.
- No es una herramienta que delega la investigación o las decisiones a una IA.

## Modelo conceptual global

```text
Biblioteca / corpus documental
        ↓
Research privado
        ↓
Evidence → Claims → Entidades privadas → Relaciones privadas
        ↓                         ↘
Research Knowledge / Research Graph  Outline → Section → Draft y revisiones
        ↓                                      ↓
Promotion Proposal                         Publication (explícita)
        ↓                                      ↓
Knowledge Review                         Publication Version → Editorial Edition
        ↓
Knowledge Core canónico
```

Las flechas no representan sincronización viva. Representan contratos de dominio con ownership, iniciador, trazabilidad e idempotencia explícitos.

## Dominios, ownership y fronteras

| Dominio                | Posee                                                                                        | No posee ni puede hacer automáticamente                            |
| ---------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Biblioteca**         | materiales, fuentes, versiones, extractos y procedencia documental                           | Claims, narrativas, decisiones editoriales o conocimiento canónico |
| **Research**           | investigación privada, estados, Outline, Sections, dossiers, Drafts y revisión investigadora | Publication, Edition y Knowledge Core                              |
| **Research Knowledge** | Evidence, Claims, entidades privadas y relaciones privadas de un Research                    | entidades/relaciones canónicas, corpus copiado o verdad definitiva |
| **Publication**        | identidad de obra editorial, composición y versiones                                         | workspace privado de Research o sincronización con Drafts          |
| **Editorial Edition**  | una expresión editorial autónoma de una Publication Version                                  | Research, otras Editions o texto mutable compartido                |
| **Knowledge Core**     | entidades y relaciones canónicas reutilizables                                               | hipótesis privadas, notas, dossiers y Drafts                       |

### Reglas irrenunciables

- Cada objeto persistente tiene un único owner.
- Research es privado y situado: puede existir sin el Core.
- Biblioteca es la fuente de verdad documental; Research la referencia sin duplicarla.
- Publication es una derivación editorial autónoma y preservable; nunca una vista viva del Research.
- El Core sólo cambia mediante una Promotion Proposal revisada explícitamente.
- Una contradicción es información editorial. Claims incompatibles pueden coexistir.
- La inmutabilidad de una versión publicada o de una Draft Revision protege la trazabilidad.

## Investigación: Research Studio

Research Studio es el espacio privado donde una investigadora transforma una pregunta editorial y un corpus documental en conocimiento revisable, trazable y apto para escritura o derivación editorial. No es un gestor de archivos ni una pantalla de formularios.

### Flujo editorial continuo

```text
Enmarcar una pregunta
→ reunir y preparar corpus
→ leer y seleccionar evidencia
→ formular Claims, entidades y relaciones
→ revisar soporte, huecos y contradicciones
→ explorar y comprobar
→ escribir una narrativa privada
→ derivar opcionalmente una publicación o propuesta de promoción
```

### Research Project

Una investigación tiene título, objetivo, alcance opcional, propietario, fechas, corpus asociado y estado:

- `ACTIVE` / Activa: trabajo en curso.
- `PAUSED` / Pausada: contexto preservado, sin ser el foco actual.
- `READY_TO_DECIDE` / Lista para decidir: madura para una decisión editorial, no publicada automáticamente.
- `ARCHIVED` / Archivada: contexto conservado, no equivale a borrado.

En la lista de Research Studio cada tarjeta permite cambiar estado y eliminar con confirmación. El borrado destruye el trabajo privado del Research y sus asociaciones; los materiales de Biblioteca permanecen globales y reutilizables. Un Research con Publications derivadas no debería eliminarse destructivamente según la arquitectura normativa; si se habilita esa condición debe protegerse en backend.

### Biblioteca y corpus asociado

Los materiales viven globalmente en Biblioteca. Una investigación puede:

- crear un material nuevo desde texto pegado, URL o PDF;
- asociar un material ya existente de Biblioteca sin duplicarlo;
- retirar la asociación de su corpus sin borrar el material global;
- leer materiales preparados y crear extractos localizables.

Formatos y disponibilidad actual:

| Entrada                       | Estado actual                                        |
| ----------------------------- | ---------------------------------------------------- |
| Texto pegado                  | disponible                                           |
| Source / referencia existente | asociable                                            |
| PDF con texto extraíble       | preparación asíncrona disponible                     |
| URL pública estática          | preparación asíncrona disponible cuando es accesible |
| Markdown y HTML               | actualmente como texto pegado                        |
| Imagen, DOCX, EPUB            | todavía no soportados directamente                   |

Un material puede estar incorporado, verificando procedencia, preparando contenido, disponible para lectura, en revisión documental, utilizado como evidencia o archivado. Estar asociado al corpus no significa que esté listo para evidencia ni que constituya conocimiento.

### Section y dossier editorial

La `ResearchOutlineSection` es la unidad cotidiana de trabajo. Tiene título, estado editorial, objetivo, notas, preguntas abiertas, referencias a materiales y extractos seleccionados, y un Draft activo. La Section orienta el trabajo, pero no posee copias de corpus ni de Research Knowledge.

El dossier reúne referencias existentes y derivadas del mismo Research para responder una cuestión concreta. Puede incluir MaterialVersions, LibraryExcerpts, Evidence, Claims, entidades, relaciones o propuestas; una referencia puede usarse en varias Sections sin duplicación. Objetivo, preguntas y notas pertenecen a la Section y no son “referencias del dossier”.

En desktop el diseño objetivo es:

```text
Draft activo              Dossier contextual           Asistencia editorial
texto y revisiones        preguntas y materiales        sugerencias trazables
```

El Draft domina visualmente. Dossier y asistente no sustituyen la escritura. El Research Graph sólo se abre cuando una decisión exige comprobar una conexión.

### Outline, preguntas, notas y Drafts

El Outline estructura la investigación mediante Sections y subsecciones. Las preguntas abiertas mantienen una línea de indagación, pero no son propietarias de Claims o Evidence por inferencia.

Un Draft es narrativa privada y provisional de una única Section. Posee contenido autoral y revisiones lineales inmutables. Puede referenciar de forma selectiva Claims, Evidence o LibraryExcerpts; no copia automáticamente el dossier, textos de fuentes, procedencia ni conocimiento. Un título largo de Section puede envolver visualmente en dos líneas en el encabezado del Draft sin dejar de ser un único título semántico.

No hay publicación automática al crear, revisar o completar un Draft.

## Research Knowledge

Research Knowledge es conocimiento privado, situado y revisable. Su proyección es un read model efímero y determinista: no existe una tabla o writer separados para “el grafo”. Se deriva de los objetos persistentes del Research.

### Objetos principales

| Objeto                        | Significado                                                           |
| ----------------------------- | --------------------------------------------------------------------- |
| **LibraryMaterial / Version** | documento global, su versión y disponibilidad                         |
| **LibraryExcerpt**            | fragmento localizable de una versión documental                       |
| **ResearchEvidence**          | uso argumentativo de una fuente o extracto dentro de un Research      |
| **ResearchClaim**             | afirmación atómica privada y revisable                                |
| **ResearchEntity**            | referente privado identificado dentro del Research                    |
| **ResearchRelation**          | conexión semántica entre dos entidades privadas, explicada por Claims |
| **RelationType**              | vocabulario canónico opcional y de sólo lectura para predicados       |

#### Evidence

Evidence conserva por qué se invoca una fuente: `sourceId`, versión de fuente, locator, quote opcional, contexto y nota. Si tiene `libraryExcerptId`, ese extracto debe pertenecer a un material asociado al mismo Research. Puede haber Evidence bibliográfica válida sin extracto localizable; el producto debe comunicar honestamente ese límite.

#### Claims

Un Claim pertenece a un solo Research y se respalda con una o más Evidence del mismo Research. Estados editoriales: `DRAFT`, `SUPPORTED`, `QUESTIONED`, `CONTRADICTED`. `SUPPORTED` no es verdad canónica ni promoción preparada. Claims contradictorios no se eliminan para forzar consenso.

#### Entidades y relaciones privadas

Una ResearchEntity puede tener aliases, resumen, confianza, Evidence de identificación y un `canonicalEntityId` opcional de reconocimiento. Ese vínculo no autoriza modificar el Core.

Una ResearchRelation une dos entidades privadas del mismo Research, no permite autorrelaciones y se explica con uno o más Claims mediante `ResearchRelationClaim`. La relación no posee Evidence directa: los Claims son la procedencia y el significado.

### Research Graph

El Graph visualiza exclusivamente entidades privadas como nodos y relaciones privadas como aristas. Claims, Evidence, Sources y extractos aparecen como contexto de inspección, no como nodos por defecto.

Ruta de trazabilidad:

```text
Entidad privada → Relación privada → Claim → Evidence → Extracto opcional → Material / Source
```

El Graph no persiste posiciones, clusters, pesos, scores, rankings ni snapshots. No crea conocimiento, no consulta entidades canónicas para fabricar topología y no escribe en Research, Biblioteca o Core.

## Pipeline editorial e IA

### Editorial Jobs

Un Editorial Job es una unidad observable, reanudable e idempotente para preparar un documento, analizarlo o diagnosticar una investigación. No es Evidence, Claim, Relation, decisión humana ni actualización del Graph.

Estados del Job:

```text
Solicitado → elegible → en curso → espera de intervención
→ completado | completado con limitaciones | fallido | cancelado
```

Las familias actuales son preparar documento, analizar documento y diagnosticar investigación. Un Job terminado puede añadir propuestas a la cola editorial, pero nunca aceptar conocimiento.

### Asistente editorial de Section

La asistencia de IA es local y contextual. El proveedor activo previsto es Ollama, configurable mediante `AI_PROVIDER=ollama`, `OLLAMA_BASE_URL` y `OLLAMA_MODEL`; si no está disponible el sistema usa `noop` y no bloquea el trabajo manual.

La IA de la Section recibe sólo el snapshot contextual construido en backend:

- título, objetivo y notas de la Section;
- preguntas abiertas;
- títulos, tipos y versiones de materiales asociados;
- hasta ocho extractos disponibles, truncados;
- el Draft activo, truncado a 6.000 caracteres;
- un historial reciente y acotado de conversación.

No tiene navegador, búsqueda web ni acceso a Internet. No recibe automáticamente un PDF o URL completos: sólo extractos disponibles en Biblioteca. El prompt le exige usar exclusivamente ese contexto, no inventar hechos, citas o referencias y devolver JSON estructurado. Sus respuestas y sugerencias se guardan con snapshot y metadatos de ejecución para trazabilidad.

La IA puede sugerir preguntas, estructura, contrastes, extractos relevantes, Evidence candidatas, Claims, entidades, relaciones, tensiones o cobertura insuficiente. Nunca puede aceptar Claims, resolver contradicciones, inventar quotes/locators, modificar un Draft silenciosamente, publicar o promover al Core.

## Publication, Editions y Knowledge Core

### Publication

Publication es la identidad duradera de una obra editorial derivada explícitamente de un Research. Una investigación puede producir varias Publications. Una Publication Version es una composición concreta; una Editorial Edition es una expresión autónoma de una versión.

- Una Publication importa selectivamente una DraftRevision o fragmento identificado.
- Después de importar, la composición pasa a ser propiedad de Publication.
- Una versión publicada es inmutable.
- Cambios de la investigación posterior no actualizan Publication automáticamente.
- Cambiar tesis, audiencia, formato o identidad editorial requiere nueva Publication; ampliar la misma obra genera una nueva Publication Version.

### Promotion Proposal y Knowledge Core

Knowledge Core conserva entidades y relaciones canónicas compartidas. Research nunca lo modifica directamente. Una Promotion Proposal expresa una operación canónica explícita —crear, vincular, fusionar, actualizar o retirar— con evidencia, razonamiento, contradicciones, autor y decisión. Knowledge Review aprueba, rechaza o devuelve la propuesta. Aprobar no convierte ni borra los objetos privados que la originaron.

## Producto público y espacio personal

Además de Research Studio, JANO incluye:

- **Home:** portada editorial basada en Home Decks persistidos.
- **Archivo / catálogo de entidades:** exploración por tipo y filtros.
- **Detalle de entidad:** lectura editorial, media resuelta por backend, relaciones, créditos, tags y contexto.
- **Graph público:** navegación de entidades y relaciones canónicas.
- **Búsqueda:** punto de entrada a exploración, con intención y resultados contextualizados; no una lista infinita indiferenciada.
- **Curado / Recommended:** estanterías, mapas de descubrimiento, entidades relacionadas, staff picks y continuidad editorial.
- **My Space, guardados y colecciones:** espacio personal y colecciones ordenables.
- **Perfil y Settings.**
- **Administración:** dashboard, selector visual, editor de entidades, curaciones/Home Decks y Research Studio.

Las rutas públicas requieren autenticación. `/admin` y sus subrutas requieren rol de administrador. Rutas principales: `/`, `/curated`, `/search`, `/entities/:type`, `/entity/:slug`, `/my-space`, `/collections/:id`, `/profile`, `/settings`, `/admin/research` y `/admin/research/:id`.

## Arquitectura técnica actual

```text
Angular 21 standalone + SSR + RxJS + Three.js
              ↓ /api/*
NestJS 11 + Passport JWT + class-validator
              ↓
Prisma 7
              ↓
PostgreSQL 16
              ↘
         uploads persistidos
```

### Repositorio

```text
frontend/                 Angular SSR
  src/app/core/           clientes HTTP, auth, SEO y servicios transversales
  src/app/features/       rutas y componentes de producto/admin
  src/app/shared/         UI reutilizable sin reglas de dominio

backend/api/
  prisma/                 schema, migraciones y seed
  src/entities/           lectura, catálogo, editor, taxonomía, grafo y créditos
  src/research/           Research Studio y Knowledge privado
  src/library/            corpus, versiones, preparación y extractos
  src/media/              uploads, links, resolución y lifecycle de media
  src/search/             intención, SQL y composición de resultados
  src/curated/            lectura y ranking de curado
  src/home-decks/         decks editoriales persistidos
  src/auth/, users/       JWT, roles y sesiones
  src/saved/, collections/ espacio personal
  src/sources/, citations/, relation-types/, tags/, taxonomies/, attributes/

infra/                    Docker Compose y scripts de producción
docs/architecture/        fuente normativa de Research Studio
```

### Backend

NestJS organiza módulos por dominio. Controllers son adapters HTTP, services contienen comportamiento cohesivo y Prisma accede a PostgreSQL. DTOs con `class-validator` delimitan entradas. Los presenters y helpers puros no inyectan Nest ni acceden a Prisma.

Módulos destacados: `Entities`, `Auth`, `Users`, `Saved`, `Collections`, `AppSettings`, `HomeDecks`, `Search`, `RelationTypes`, `Tags`, `Taxonomies`, `Attributes`, `Citations`, `Sources`, `Curated`, `Research` y `Library`.

Media se resuelve en backend mediante roles, orden y crop de `EntityMedia`; el público consume `resolvedMedia`. El frontend no reordena candidatos ni inventa slots.

Search separa intención, consulta SQL y composición de resultados. Curated usa ranking y presenter puros. Home y Curated consumen Home Decks persistidos: no existe fallback virtual autogenerado.

### Frontend

Angular usa componentes standalone, lazy routes y `ChangeDetectionStrategy.OnPush` donde corresponde. `core` no importa `features`. La regla de dirección es:

```text
ruta/componente → facade o runtime o presenter → core API
controller → service de aplicación → Prisma
```

Un componente debe tener una responsabilidad. Los efectos imperativos, RAF, listeners, WebGL y recursos GPU tienen un owner explícito con cleanup. Graph y Explorer 3D aíslan sus runtimes de interacción/cámara/escena; no convertir sus componentes en acumuladores de callbacks.

### Seguridad y acceso

- JWT mediante Passport; guards de autenticación, beta y roles.
- Research usa `ResearchOwnerGuard`: una persona sólo puede operar sus investigaciones privadas.
- Administración requiere rol `ADMIN`.
- Validación de DTOs en los límites de entrada.
- Variables sensibles fuera de Git. No incluir secretos o contraseñas en documentación, prompts o logs.

## API de Research y Biblioteca: guía práctica

La base de las rutas es `/api/research`. Rutas representativas:

| Operación                               | Método y ruta                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| listar / crear Research                 | `GET` / `POST /research`                                                        |
| leer Research                           | `GET /research/:id`                                                             |
| cambiar estado                          | `PATCH /research/:id/status`                                                    |
| eliminar Research                       | `DELETE /research/:id`                                                          |
| asociar material global                 | `POST /research/:id/library-materials`                                          |
| retirar material del Research           | `DELETE /research/:id/library-materials/:materialId`                            |
| crear texto o URL                       | `POST /research/:id/materials`                                                  |
| subir PDF                               | `POST /research/:id/materials/pdf`                                              |
| preparar material                       | `POST /research/:id/materials/:materialId/jobs/prepare`                         |
| crear Section                           | `POST /research/:id/outline/sections`                                           |
| actualizar Section                      | `PATCH /research/:id/outline/sections/:sectionId`                               |
| preguntas                               | rutas bajo `/outline/sections/:sectionId/questions`                             |
| materiales de Section                   | rutas bajo `/outline/sections/:sectionId/materials`                             |
| Draft y revisión                        | rutas bajo `/outline/sections/:sectionId/drafts` y `/drafts/:draftId/revisions` |
| asistente de Section                    | `GET`, sugerencias y mensajes bajo `/outline/sections/:sectionId/assistant`     |
| Research Knowledge                      | `GET /research/:id/knowledge`                                                   |
| Claims, Evidence, entidades, relaciones | rutas anidadas de `/research/:id`                                               |

La Biblioteca global se expone bajo `/api/library/materials`. Sus materiales se asocian a Research mediante una tabla puente idempotente. Nunca deben copiarse de nuevo sólo para reutilizarlos.

## Modelo de datos: orientación

PostgreSQL y Prisma son la fuente de verdad. Tipos relevantes incluyen `User`, `Entity`, `RelationType`, relaciones canónicas, `MediaAsset`, `EntityMedia`, `Source`, `LibraryMaterial`, `LibraryMaterialVersion`, `LibraryExcerpt`, `ResearchProject`, `ResearchOutlineSection`, `ResearchDraft`, `ResearchDraftRevision`, `ResearchEvidence`, `ResearchClaim`, `ResearchEntity`, `ResearchRelation`, `ResearchRelationClaim`, `ResearchAssistantThread`, `ResearchAssistantMessage`, `AIExecution`, `Publication`, `PublicationVersion` y Edition.

Las claves foráneas de objetos privados de Research usan cascada cuando corresponde; las asociaciones a Biblioteca se eliminan sin destruir el material global. Las migraciones Prisma preservan compatibilidad siempre que sea posible.

## Desarrollo, verificación y operación

### Requisitos

- Node `>=22.14.0 <23` y npm `10.9.4`.
- PostgreSQL 16 mediante Docker para desarrollo local.
- Prisma 7.

### Comandos útiles

```bash
npm run setup:local
npm run db:up
npm run dev
npm run backend:dev
npm run frontend:dev
npm run prisma:migrate
npm run prisma:seed
npm run typecheck
npm run test
npm run check
```

`npm run check` ejecuta lint, typecheck, tests y comprobación de formato. El frontend aplica presupuestos de estilos; superar 28 kB por componente es un error de arquitectura que debe resolverse eliminando CSS muerto o redistribuyendo ownership, no elevando el presupuesto sin análisis.

### Producción

La única ruta válida de producción es `infra/docker-compose.prod.yml` mediante `infra/scripts/prod.sh`. Cada release usa imágenes runtime inmutables etiquetadas por commit. El flujo hace preflight, backup de PostgreSQL **y uploads** como una sola instantánea, migración Prisma one-shot, recreación, healthchecks y smoke tests.

Nunca en producción:

- `prisma migrate reset`;
- `prisma db push`;
- `docker compose down -v`;
- montajes de código host, `start:dev` o migraciones al arrancar;
- borrar volúmenes o omitir backup antes de cambios de schema.

Un rollback de aplicación no deshace una migración. Las migraciones incompatibles requieren estrategia expand/contract, ventana de mantenimiento o restauración deliberada del backup validado.

## Estado actual y roadmap honesto

Completado: límites y trazabilidad de Research, Biblioteca básica, Claims/Evidence/entidades/relaciones privadas, Research Graph, Outline y dossier, Drafts con revisiones básicas, asociaciones globales de Biblioteca, asistencia contextual con Ollama y gestión de estados de Research.

No debe presentarse como ya implementado si no se confirma en código:

- experiencia continua completa de captura, lectura, revisión, escritura y publicación;
- OCR avanzado, imágenes, DOCX y EPUB;
- ingestión robusta de páginas dependientes de JavaScript o contenido protegido;
- búsqueda web de la IA;
- asistencia de escritura que modifique Drafts automáticamente;
- publicación integrada, Editions completas, Promotion Proposal y Knowledge Review completos;
- colaboración compleja, coautoría, comentarios granulares, ramas de revisiones;
- embeddings como requisito del MVP;
- automatización sofisticada de contradicciones.

El orden deseado de evolución es: contrato de propuestas, flujo continuo corpus→Evidence, procesamiento de PDF extraíble, cola editorial unificada, asistencia local trazable, consolidación de Knowledge/Graph y ampliación documental/asistencia a escritura.

## Checklist para propuestas futuras

Antes de recomendar o implementar una función, responder:

1. ¿Qué pilar de JANO refuerza?
2. ¿Qué entidad u objeto es owner del nuevo estado?
3. ¿Cruza dominios? Si sí, ¿cuál es el contrato unidireccional, iniciador, procedencia e idempotencia?
4. ¿Puede una persona entender por qué existe una relación, Claim o recomendación?
5. ¿La propuesta preserva incertidumbre, contradicción y trazabilidad?
6. ¿Qué parte es real hoy y qué parte sigue siendo roadmap?
7. ¿Se puede resolver reutilizando un patrón o servicio ya existente?
8. ¿Cómo se verificará: prueba, typecheck, build, flujo visual o migración revisada?

## Referencias internas de autoridad

- `docs/architecture/README.md`: índice y jerarquía normativa.
- `docs/architecture/00-product-vision.md`: visión estratégica.
- `docs/architecture/01-domain-overview.md`: mapa de agregados y ownership.
- `docs/architecture/02-research.md`: Research y Section.
- `docs/architecture/03-library.md`: Biblioteca.
- `docs/architecture/04-research-knowledge.md`: Evidence, Claims, entidades, relaciones y Graph.
- `docs/architecture/05-publication.md`: Publication y versiones.
- `docs/architecture/06-knowledge-core.md`: Core y promoción.
- `docs/architecture/07-contracts.md`: contratos entre dominios.
- `docs/architecture/11-research-drafts.md`: Drafts y revisiones.
- `docs/architecture/15-research-studio-experience.md`: experiencia editorial normativa.
- `docs/architecture/16-editorial-pipeline.md`: pipeline documental, Jobs e IA.
- `docs/architecture-overview.md`: arquitectura técnica vigente.
- `docs/deployment.md`: despliegue y seguridad operativa.
- `backend/api/prisma/schema.prisma`: modelo de datos ejecutable.
- `frontend/src/app/app.routes.ts`: rutas actuales.

---

Si se usa este documento como fuente de ChatGPT, el asistente debe responder en español salvo que se solicite otro idioma, diferenciar con claridad entre estado implementado y visión futura, y desafiar respetuosamente cualquier propuesta que debilite ownership, trazabilidad, calidad editorial o la experiencia premium de JANO.
