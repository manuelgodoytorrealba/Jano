# 13 — Plan de migración Library y cierre de Fase 0

## Estado tras Fase 1

Fase 1 completada: Library es el único propietario del corpus documental. ResearchMaterial, sus enums, el adaptador temporal y la clave de backfill fueron retirados mediante la migración Contract tras verificar cero discrepancias. Research conserva asociaciones y contexto; los contratos públicos de Research permanecen estables.

## Estado inicial (histórico)

`ResearchMaterial` es propiedad de `ResearchProject`. Conserva tipo (`TEXT`, `URL`, `PDF`), estado de preparación, título, contenido o URL, metadatos de fichero y `storageKey`. Lo escriben `ResearchService.createMaterial` y `createPdfMaterial`; lo exponen `POST /research/:id/materials`, `POST /research/:id/materials/pdf`, `GET /research/:id`, `ResearchApi` y el workspace admin. No tiene consumidores externos.

Sus metadatos y la carga PDF son reutilizables. Su FK con cascada a Research, sus endpoints y su tipo frontend son transitorios: contradicen que Biblioteca posea el corpus.

## Ownership destino

Library será la fuente de verdad de Material, Source, versiones y Extracto. Research sólo conservará asociaciones a objetos Library y Evidence declarará su uso argumentativo respecto de Extracto. El flujo será `Library → Research`; Research nunca copiará ni poseerá el corpus.

## Plan de migración de Fase 1

1. **Expand.** Añadir agregados Library: Material, MaterialVersion/representación de fichero y Extracto; añadir una tabla de asociación `ResearchLibraryMaterial` idempotente. No tocar `ResearchMaterial` ni rutas existentes.
2. **Escritura compatible.** El nuevo flujo crea Material en Library y su asociación a Research. Un adaptador de lectura compone temporalmente materiales nuevos y legacy en la respuesta actual de Research.
3. **Backfill.** Copiar cada `ResearchMaterial` a un Material Library preservando id legacy, título, tipo, contenido/URL, `storageKey`, nombre, MIME, tamaño, timestamps y Research de origen. Registrar la asociación con clave única. Reintentos no duplican por `legacyResearchMaterialId` único.
4. **Verificación.** Comparar conteos, hashes de contenido/URL y metadatos de fichero; verificar una asociación por material legacy y cero filas sin destino. Mantener ambos caminos de lectura durante una versión desplegada.
5. **Cutover.** Cambiar API y frontend a contratos Library; Research devuelve asociaciones, no materiales propios. Retirar las escrituras legacy sólo después de métricas y revisión manual.
6. **Contract.** Completado: `ResearchMaterial`, el adaptador y la clave temporal de backfill fueron retirados en una migración destructiva independiente, tras verificación sin discrepancias.

## Prisma, compatibilidad y rollback

Las migraciones serán aditivas primero y destructivas al final. Tablas nuevas: Library Material, versión/representación, Extracto y asociación Research–Material. Se reutilizan los campos y almacenamiento actuales; `ResearchMaterial` es eliminable sólo en contract. Durante compatibilidad se mantienen DTO y respuesta legacy mediante adaptador, sin doble fuente de verdad para escrituras.

Antes de backfill: backup PostgreSQL y uploads como un snapshot. El rollback previo a cutover restaura la aplicación anterior y deja las tablas nuevas sin uso; no borra legacy. Tras cutover, rollback usa el adaptador mientras `ResearchMaterial` exista. Nunca se borra almacenamiento durante backfill.

El backfill se ejecuta explícitamente con `npm run library:backfill` desde `backend/api`. Usa `legacyResearchMaterialId` único, crea en una transacción Material, primera versión y asociación, y termina sólo si su verificación devuelve cero discrepancias. Conserva timestamps, contenido/URL, representación PDF y asociación al Research.

Mientras `ResearchMaterial` y el adaptador existan, el rollback no requiere borrar Library: la aplicación anterior puede seguir leyendo legacy. El Contract posterior será la única fase que podrá retirar datos o el adaptador, tras una verificación independiente.

## Riesgos y aceptación de Fase 1

Riesgos: pérdida de `storageKey`, duplicidad temporal, estado de preparación divergente, respuestas API mixtas y referencias UI a `project.materials`. Mitigaciones: hashes/contadores, clave de idempotencia, adaptador de sólo lectura, despliegue expand/backfill/cutover y rollback con snapshot.

Fase 1 estará aceptada cuando Library sea el único writer de corpus, cada material legacy tenga un destino verificable, Evidence pueda referenciar extractos localizables, Research sólo tenga asociaciones, frontend no use contratos `ResearchMaterial`, y la retirada legacy pase tests y verificación de producción.

## Cierre de Fase 0

- **0.1:** eliminó promoción directa Research → Core y dependencias de escritura canónica.
- **0.2:** separó el POC de las rutas de producto; las investigaciones abren su workspace real.
- **0.3:** inventarió tablas, API, frontend, tests y deuda de ownership.
- **0.4:** añadió owner explícito, backfill aprobado, acceso por propietario y archivado atribuible no destructivo.
- **0.5:** convirtió límites Core, ownership, archivado, rutas y backfill en invariantes automáticos.
- **0.6:** define la transición segura de ResearchMaterial a Library sin implementación anticipada.

La Fase 0 aporta fronteras explícitas, privacidad de dominio, autoría mínima, archivado preservable, trazabilidad de migración y protección contra regresiones. Eliminó el riesgo de promoción canónica accidental, acceso transversal entre propietarios y POC como flujo de producto.

Permanecen conscientemente: ownership de corpus, Extractos versionados, Research Knowledge privado, Publication, Proposal/Review y borrado condicionado a derivaciones. Todos pertenecen a fases posteriores.

## Auditoría North Star

La implementación respeta los límites aprobados: Research no escribe Core, Promotion no tiene atajo, POC está aislado, objetos privados dependen de Research y ownership pertenece al agregado. No se detectan desviaciones activas respecto de la North Star.
