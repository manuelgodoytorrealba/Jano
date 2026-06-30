# JANO Production Deployment

Estado: procedimiento P0 implementado  
Objetivo: despliegues repetibles en un único servidor Ubuntu con Docker Compose, PostgreSQL y datos reales.

## 0. Decisiones no negociables

- La base de datos y `backend_uploads` son datos de producción. Ambos se respaldan.
- Producción usa imágenes `runtime`, nunca `dev` ni bind mounts de código.
- Cada release usa un tag inmutable derivado del commit, por ejemplo `bfdaa0a1c2d`.
- Las imágenes se construyen o descargan antes de detener escrituras.
- Las migraciones se ejecutan una sola vez como fase de release, nunca al arrancar el backend.
- `prisma migrate reset`, `prisma db push` y `docker compose down -v` están prohibidos en producción.
- Un rollback de Git o Docker no revierte una migración.
- Una release con migraciones destructivas requiere ventana de mantenimiento o estrategia expand/contract.
- Los secretos no tienen valores por defecto y no se guardan en Git.

## 1. Flujo oficial de despliegue

### 1.1 Antes del merge

La PR debe completar:

```bash
npm ci
npm run check
npm run backend:build
npm run frontend:build
docker compose -f infra/docker-compose.yml build
```

Si contiene migraciones:

1. Revisar manualmente cada `migration.sql`.
2. Confirmar que no elimina ni reescribe datos sin una fase previa de backfill.
3. Probarla sobre una copia reciente de producción o staging.
4. Confirmar que la versión anterior y la nueva pueden convivir con el esquema resultante.
5. Preparar un plan de restauración o una migración inversa ensayada.

### 1.2 Preparación en el servidor

```bash
cd /srv/apps/jano
git status --short
git fetch origin
git pull --ff-only origin develop
export JANO_RELEASE="$(git rev-parse --short=12 HEAD)"
bash infra/scripts/prod.sh preflight "$JANO_RELEASE"
bash infra/scripts/prod.sh deploy "$JANO_RELEASE"
```

`git status --short` debe estar vacío antes del pull. El script de despliegue debe abortar en caso contrario.

No se ejecuta `npm install` en el servidor. `npm ci` y `prisma generate` ya se ejecutan dentro de las etapas Docker correspondientes. Esto evita que el runtime Node del host forme parte del despliegue.

Antes del primer uso se crea el entorno productivo:

```bash
cp infra/.env.production.example infra/.env.production
chmod 600 infra/.env.production
docker volume ls
```

`POSTGRES_VOLUME` y `UPLOADS_VOLUME` deben coincidir exactamente con los volúmenes existentes. Son volúmenes `external`: un nombre incorrecto aborta el despliegue en vez de crear una base vacía.

Para obtener los nombres reales sin asumir prefijos:

```bash
DB_CONTAINER="$(docker ps --filter label=com.docker.compose.service=db -q | head -n1)"
BACKEND_CONTAINER="$(docker ps --filter label=com.docker.compose.service=backend -q | head -n1)"
docker inspect "$DB_CONTAINER" --format '{{range .Mounts}}{{println .Name "->" .Destination}}{{end}}'
docker inspect "$BACKEND_CONTAINER" --format '{{range .Mounts}}{{println .Name "->" .Destination}}{{end}}'
```

Copiar en `infra/.env.production` el volumen montado en `/var/lib/postgresql/data` como `POSTGRES_VOLUME` y el montado en `/app/backend/api/uploads` como `UPLOADS_VOLUME`. No continuar si los nombres no coinciden.

### 1.3 Orden interno del despliegue

`infra/scripts/prod.sh deploy` realiza exactamente este orden:

1. Adquirir un lock exclusivo mediante creación atómica de directorio para impedir dos despliegues simultáneos.
2. Validar Git limpio, commit, variables obligatorias, espacio libre y salud de PostgreSQL.
3. Leer `current-release` y conservarlo como `previous-release`.
4. Construir o descargar las imágenes runtime con tag `${JANO_RELEASE}`.
5. Validar que ambas imágenes existen y que los builds terminaron.
6. Activar mantenimiento o detener el backend para congelar escrituras.
7. Crear y verificar backups de PostgreSQL y `backend_uploads`.
8. Ejecutar `prisma migrate status` desde la imagen nueva.
9. Ejecutar `prisma migrate deploy` como contenedor one-shot.
10. Volver a ejecutar `prisma migrate status` y comprobar que no hay migraciones pendientes o fallidas.
11. Recrear backend con la nueva imagen y esperar su readiness check.
12. Recrear frontend y esperar su healthcheck.
13. Ejecutar smoke tests internos y externos.
14. Desactivar mantenimiento.
15. Escribir atómicamente `current-release`, backup asociado, timestamp y commit anterior.
16. Mantener al menos las dos últimas imágenes y aplicar la política de retención de backups.

No se cambia el contenedor en ejecución si el build falla. El periodo sin escrituras empieza después de construir las imágenes.

### 1.4 Comprobaciones posteriores

- Backend liveness: proceso HTTP activo.
- Backend readiness: conexión PostgreSQL y `SELECT 1` correctos.
- Frontend health: servidor SSR activo.
- Smoke externo: login, assets, `/api`, `/uploads` y una lectura pública conocida.
- `docker compose ps`: todos los servicios esperados están `healthy`.
- Logs nuevos sin excepciones, reinicios ni errores Prisma.
- `_prisma_migrations` sin filas fallidas y sin migraciones pendientes.
- Conteos básicos de entidades, usuarios, relaciones, media y decks razonables.
- Escritura controlada opcional: login y operación reversible con usuario smoke-test.

## 2. Estrategia segura para la base de datos

### 2.1 Qué significa “sin pérdida de datos”

Un `pg_dump` es una instantánea consistente, pero una restauración descartaría las escrituras realizadas después del dump. Para garantizar cero pérdida durante un rollback de release hay dos opciones:

1. Ventana de mantenimiento: detener escrituras antes del backup y mantenerlas detenidas hasta validar la release.
2. Alta disponibilidad: backup base más archivado continuo de WAL y recuperación point-in-time (PITR).

Para el servidor actual se adopta la opción 1. PITR es la siguiente mejora de infraestructura.

### 2.2 Backup por release

Usar formato custom de PostgreSQL, no SQL plano:

```text
/srv/backups/jano/
  20260630T142500Z-bfdaa0a1c2d/
    database.dump
    database.dump.sha256
    database.list
    uploads.tar.gz
    uploads.tar.gz.sha256
    release.env
```

El script debe:

1. Crear el dump dentro del contenedor con `pg_dump --format=custom --no-owner --no-acl`.
2. Copiarlo a un archivo temporal del host.
3. Rechazar archivos vacíos.
4. Ejecutar `pg_restore --list` y guardar el catálogo.
5. Generar SHA-256.
6. Respaldar el volumen `backend_uploads` y generar su SHA-256.
7. Mover los archivos temporales al directorio final solo cuando todas las verificaciones terminen.
8. Copiar el backup cifrado fuera del servidor.

`pg_restore --list` confirma que el archivo puede leerse, pero no prueba una restauración completa. Debe existir un restore drill periódico que restaure el dump en una base temporal y ejecute consultas de integridad.

### 2.3 Política de retención

- Un backup por release durante 30 días.
- Backups diarios durante 14 días.
- Backups semanales durante 8 semanas.
- Backups mensuales durante 12 meses.
- Al menos una copia cifrada fuera del servidor.
- Monitorización de espacio y alerta si falla la copia externa.

Un backup que solo existe en el mismo disco que PostgreSQL no protege frente a pérdida del servidor.

### 2.4 Migraciones

La imagen de migración debe ser exactamente la misma release que se desplegará:

```bash
docker compose -f infra/docker-compose.prod.yml run --rm migrate npx prisma migrate status
docker compose -f infra/docker-compose.prod.yml run --rm migrate npx prisma migrate deploy
docker compose -f infra/docker-compose.prod.yml run --rm migrate npx prisma migrate status
```

`migrate deploy` aplica migraciones pendientes, pero no genera Prisma Client ni detecta drift completo. La generación pertenece al build de la imagen. El status y la revisión del SQL son gates independientes.

### 2.5 Fallo de migración

1. Mantener backend detenido y mantenimiento activo.
2. No repetir comandos a ciegas.
3. Guardar logs y consultar `_prisma_migrations`.
4. Determinar si PostgreSQL revirtió la operación o quedaron cambios parciales.
5. Si no hubo cambios persistentes, corregir la migración y usar `prisma migrate resolve` únicamente cuando el estado real coincida con la resolución declarada.
6. Si hubo cambios incompatibles o pérdida lógica, restaurar el backup verificado y los uploads asociados.
7. Arrancar las imágenes anteriores y completar smoke tests.

`prisma migrate resolve --rolled-back` no deshace SQL ni recupera datos; solo corrige el historial de Prisma después de una intervención real.

## 3. Rollback

### 3.1 Matriz de decisión

| Fallo                                                  | Acción                                              | Base de datos                           |
| ------------------------------------------------------ | --------------------------------------------------- | --------------------------------------- |
| Build backend/frontend                                 | Abortar. Los contenedores actuales siguen intactos. | No tocar.                               |
| Frontend nuevo                                         | Recrear frontend con `previous-release`.            | No tocar.                               |
| Backend nuevo, sin migración                           | Recrear backend con `previous-release`.             | No tocar.                               |
| Backend nuevo, migración backward-compatible           | Recrear backend con `previous-release` y validar.   | Mantener esquema nuevo.                 |
| Migración pendiente o fallida sin cambios persistentes | Resolver la causa y repetir la fase de migración.   | No restaurar sin diagnóstico.           |
| Migración aplicada e incompatible con backend anterior | Forward fix o restauración completa.                | Git/Docker no bastan.                   |
| Corrupción o pérdida lógica                            | Detener escrituras y restaurar backup verificado.   | Restaurar DB y uploads del mismo punto. |

### 3.2 Rollback de aplicación

El rollback normal debe recibir un tag, nunca “el commit anterior” inferido:

```bash
bash infra/scripts/prod.sh rollback bfdaa0a1c2d --schema-compatible
```

El script valida que las dos imágenes existen, conserva la base de datos, recrea backend/frontend con el tag solicitado, espera healthchecks y ejecuta smoke tests. Si la release objetivo no es compatible con el esquema actual, debe abortar antes de recrear el backend.

### 3.3 Restauración de emergencia

La restauración de base de datos es una operación separada y deliberadamente no está automatizada por `prod.sh`. Debe seguir un runbook revisado por dos personas; el rollback normal nunca modifica PostgreSQL.

Guardas obligatorias:

- `CONFIRM_RESTORE=production`.
- Backend y frontend detenidos o mantenimiento activo.
- Backup y checksum válidos.
- Espacio libre suficiente.
- Copia adicional del estado roto antes de sobrescribirlo.
- Confirmación interactiva con nombre de base y release.

El restore debe usar `pg_restore --exit-on-error --single-transaction` sobre una base vacía, restaurar los uploads del mismo snapshot, verificar conteos y arrancar la release asociada al backup.

## 4. Arquitectura de despliegue objetivo

### 4.1 Estado implementado

- `infra/docker-compose.yml` sigue siendo exclusivamente desarrollo.
- `infra/docker-compose.prod.yml` usa runtimes inmutables etiquetados por commit.
- Producción no monta código del host ni ejecuta `start:dev`.
- Las migraciones se ejecutan con el servicio one-shot `migrate`.
- Backend, frontend y PostgreSQL tienen healthchecks.
- PostgreSQL no publica puertos y Adminer requiere el profile `tools` en localhost.
- Los secretos son obligatorios y no tienen defaults.
- Los volúmenes existentes son externos y el backup incluye DB y uploads.
- Los logs Docker tienen rotación.

Riesgo pendiente: los runtimes todavía se ejecutan como root. Cambiar a usuario no root queda en P1 porque requiere validar permisos del volumen de uploads.

### 4.2 Compose recomendado

Mantener dos archivos:

- `infra/docker-compose.yml`: desarrollo local.
- `infra/docker-compose.prod.yml`: definición standalone de producción.

Producción debe incluir:

- `image: jano-backend:${JANO_RELEASE:?JANO_RELEASE required}` y equivalente frontend.
- Backend construido con target `runtime`.
- Servicio one-shot `migrate` basado en la imagen backend de la release.
- Sin bind mounts de código.
- `NODE_ENV=production`.
- Healthchecks y `depends_on: condition: service_healthy`.
- PostgreSQL solo en red interna; sin `ports` públicos.
- Backend ligado a `127.0.0.1` o solo expuesto internamente, según el reverse proxy.
- Adminer bajo profile `tools` y ligado a `127.0.0.1`.
- Variables obligatorias con `${VARIABLE:?required}` y secrets fuera de Git.
- `init: true`, `stop_grace_period`, rotación de logs y límites razonables.
- Etiquetas con commit, fecha y versión.
- Volúmenes de DB y uploads nombrados explícitamente y con backup.

### 4.3 Dockerfiles

Lo correcto actualmente:

- contexto raíz del monorepo;
- lockfile único;
- instalación por workspace;
- etapas separadas de desarrollo, build y runtime;
- `npm ci --omit=dev` en runtime;
- cache mounts de npm;
- `.dockerignore` raíz.

Mejoras pendientes:

- ejecutar runtime como usuario no root;
- separar una etapa `migration` con Prisma CLI de un runtime backend mínimo;
- añadir OCI labels con commit y fecha;
- añadir healthchecks o herramientas mínimas para ejecutarlos;
- generar SBOM y escanear las imágenes en CI;
- construir en CI, publicar en registry y desplegar por digest en lugar de compilar en producción.

## 5. Automatización

El host de producción solo necesita Bash, Git y Docker. Los wrappers npm existen para desarrollo, pero la interfaz canónica del servidor es `bash infra/scripts/prod.sh`.

```text
infra/
  docker-compose.yml
  docker-compose.prod.yml
  scripts/
    prod.sh
```

Subcomandos: `preflight`, `backup`, `healthcheck`, `deploy`, `rollback`, `status` y `self-test`. El script comparte validación, locks, Compose, backups y estado de release sin duplicar lógica.

Wrappers npm opcionales para operadores locales:

```json
{
  "deploy:prod": "bash infra/scripts/prod.sh deploy",
  "backup:prod": "bash infra/scripts/prod.sh backup",
  "healthcheck:prod": "bash infra/scripts/prod.sh healthcheck",
  "rollback:prod": "bash infra/scripts/prod.sh rollback"
}
```

Todos los scripts deben usar `set -Eeuo pipefail`, trap de error, timeouts, logs con timestamp y códigos de salida no cero. El deploy debe ser idempotente y no continuar tras un fallo.

## 6. Checklist de release

### Antes del merge

- [ ] PR revisada y rama `develop` protegida.
- [ ] `npm ci` correcto.
- [ ] `npm run check` correcto.
- [ ] Builds frontend y backend correctos.
- [ ] Build Docker runtime correcto.
- [ ] `npm audit` y escaneo de imágenes revisados.
- [ ] Migraciones SQL revisadas manualmente.
- [ ] Migraciones probadas sobre staging o copia reciente.
- [ ] Compatibilidad backward/forward documentada.
- [ ] Plan de rollback definido.

### Preflight del servidor

- [ ] Ventana de despliegue comunicada.
- [ ] Working tree limpio.
- [ ] `git pull --ff-only origin develop` correcto.
- [ ] Release SHA registrado.
- [ ] Variables y secrets obligatorios presentes.
- [ ] PostgreSQL saludable.
- [ ] Espacio suficiente para imágenes, dump y restore temporal.
- [ ] Imágenes nuevas construidas o descargadas antes del downtime.

### Datos y migraciones

- [ ] Escrituras detenidas o mantenimiento activo.
- [ ] Dump custom creado.
- [ ] Dump no vacío y catálogo `pg_restore --list` válido.
- [ ] SHA-256 del dump válido.
- [ ] Uploads respaldados y checksum válido.
- [ ] Backup copiado fuera del servidor.
- [ ] `prisma migrate status` previo revisado.
- [ ] `prisma migrate deploy` correcto.
- [ ] `prisma migrate status` final limpio.
- [ ] Conteos e invariantes principales válidos.

### Aplicación

- [ ] Backend recreado con tag inmutable.
- [ ] Backend `healthy` y sin reinicios.
- [ ] Frontend recreado con el mismo tag de release.
- [ ] Frontend `healthy` y sin reinicios.
- [ ] Smoke interno correcto.
- [ ] Smoke externo correcto.
- [ ] Login y sesión correctos.
- [ ] Assets y uploads accesibles.
- [ ] Logs sin errores nuevos.
- [ ] Mantenimiento desactivado.
- [ ] Release y backup asociado registrados.

### Después

- [ ] Monitorizar errores, reinicios y latencia durante 30 minutos.
- [ ] Confirmar backup externo.
- [ ] Conservar previous release e imágenes anteriores.
- [ ] Documentar incidencias y tiempo de despliegue.

## 7. Roadmap priorizado

### P0 — completado

1. Compose standalone de producción.
2. Health/readiness endpoints y healthchecks.
3. Migraciones separadas del arranque del backend.
4. Tags inmutables y current/previous release.
5. Backup verificado de DB y uploads.
6. Puertos DB/Adminer protegidos y secretos obligatorios.
7. Deploy, healthcheck y rollback de aplicación.

### P1 — siguiente iteración

1. Staging con restore anonimizado reciente.
2. Registry y builds CI en lugar de builds en producción.
3. Restore drills automáticos.
4. Usuario no root, límites, log rotation y escaneo de imágenes.
5. Alertas de espacio, backup, salud y reinicios.

### P2 — crecimiento

1. Backups base y archivado WAL con PITR.
2. Despliegue blue/green o rolling detrás del reverse proxy.
3. PostgreSQL administrado o réplica externa.
4. Observabilidad centralizada y métricas de release.

## Referencias oficiales

- [Prisma: `migrate deploy`](https://docs.prisma.io/docs/cli/migrate/deploy)
- [Prisma: migraciones en producción](https://docs.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
- [Docker: Compose en producción](https://docs.docker.com/compose/how-tos/production/)
- [Docker: servicios y healthchecks](https://docs.docker.com/reference/compose-file/services/)
- [PostgreSQL: `pg_dump`](https://www.postgresql.org/docs/16/app-pgdump.html)
- [PostgreSQL: `pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html)
