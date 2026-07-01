# JANO

Full-stack art knowledge platform built with NestJS, Prisma, PostgreSQL and Angular.

## Quick Start

Versiones soportadas del repo:

- Node: `>=22.14.0 <23` (`22.14.0` es la versión fijada para desarrollo y Docker)
- npm: `>=10.9.4 <11`

Si usas `nvm`, ejecuta:

```bash
nvm install
nvm use
```

Si usas Volta:

```bash
volta install node@22.14.0 npm@10.9.4
```

Node 20 y Node 25 no son compatibles. Prisma 7 requiere Node 22 o superior y el repositorio limita la versión mayor a Node 22.

### Opcion recomendada: hibrido

Base de datos en Docker. Backend y frontend en tu host.

```bash
cp .env.example .env
cp backend/api/.env.example backend/api/.env
nvm use
npm run setup:local
npm run db:up
npm run prisma:migrate
npm run backend:dev
npm run frontend:dev
```

URLs:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000`
- Adminer: `http://localhost:8080`

### Opcion full Docker

Todo el stack en contenedores.

```bash
cp .env.example .env
npm run docker:up
```

## Variables de entorno

### `/.env`

Se usa para Docker Compose y controla puertos y variables compartidas del stack.

### `/backend/api/.env`

Se usa solo cuando el backend corre fuera de Docker. Aqui van `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `MEDIA_PUBLIC_BASE_URL`, `PORT` y `HOST`.

### Frontend

El frontend no necesita `.env` propio ahora mismo.

En desarrollo usa `proxy.conf.js` para enviar `/api` y `/uploads` al backend.

## Comandos principales

```bash
npm run setup:local
npm run check
npm run db:up
npm run dev
npm run mobile
npm run backend:dev
npm run frontend:dev
npm run prisma:migrate
npm run prisma:seed
npm run docker:up
npm run docker:down
```

`npm run check` ejecuta lint, typecheck, tests y format check para todo el monorepo.

## Docs adicionales

- [docs/deployment.md](docs/deployment.md)
- [docs/commands.md](docs/commands.md)
- [docs/architecture-overview.md](docs/architecture-overview.md)
- [docs/development-workflow.md](docs/development-workflow.md)
- [docs/environment.md](docs/environment.md)
- [docs/home-decks-editorial-admin-plan.md](docs/home-decks-editorial-admin-plan.md)

////DESPPLIEGUE EN PROD

# JANO Production Deployment Guide

> Última actualización: 2026-06-30

Este documento describe el flujo oficial para desplegar JANO en producción.

**No utilizar nunca `infra/docker-compose.yml` para producción.**

Toda la infraestructura de producción utiliza:

- `infra/docker-compose.prod.yml`
- `infra/scripts/prod.sh`

---

# Arquitectura

Producción utiliza imágenes inmutables etiquetadas por commit.

```
Git Commit
      │
      ▼
Build Runtime Images
      │
      ▼
Preflight
      │
      ▼
Backup
      │
      ▼
Prisma Migration
      │
      ▼
Backend Runtime
      │
      ▼
Frontend Runtime
      │
      ▼
Healthchecks
      │
      ▼
Smoke Tests
```

Nunca se monta código del host.

Nunca se ejecuta `start:dev`.

Nunca se ejecutan migraciones al arrancar el backend.

---

# Primer despliegue

## 1. Obtener el último código

```bash
git pull origin develop
```

Actualiza el repositorio local.

---

## 2. Confirmar que no existen cambios

```bash
git status --short --branch
```

Debe devolver un árbol limpio.

---

## 3. Obtener la release

```bash
RELEASE=$(git rev-parse --short=12 HEAD)
```

Ejemplo:

```
462a25af724
```

Ese identificador será el nombre de las imágenes y de la release.

---

# Preflight

```bash
bash infra/scripts/prod.sh preflight "$RELEASE"
```

## ¿Qué hace?

No modifica absolutamente nada.

Comprueba:

- `.env.production`
- permisos
- variables obligatorias
- Docker
- imágenes
- volúmenes
- DATABASE_URL
- PostgreSQL
- credenciales
- espacio para backups
- configuración Docker Compose

Si falla, el despliegue no comienza.

---

# Deploy

```bash
bash infra/scripts/prod.sh deploy "$RELEASE"
```

## ¿Qué hace exactamente?

### 1.

Valida nuevamente el entorno.

---

### 2.

Reutiliza o construye las imágenes de la release.

```
jano-backend:<release>

jano-frontend:<release>
```

---

### 3.

Valida el schema Prisma.

---

### 4.

Detiene únicamente los escritores.

- Backend
- Frontend
- Adminer

La base de datos permanece activa.

---

### 5.

Verifica las credenciales de producción.

---

### 6.

Crea un backup completo.

Incluye:

- PostgreSQL
- Uploads

Valida automáticamente:

- checksum
- pg_restore
- integridad del tar

---

### 7.

Ejecuta

```
prisma migrate deploy
```

mediante el servicio `migrate`.

No utiliza el backend.

---

### 8.

Comprueba:

```
prisma migrate status
```

---

### 9.

Levanta:

- Backend Runtime
- Frontend Runtime

---

### 10.

Espera a que ambos estén:

```
healthy
```

---

### 11.

Ejecuta smoke tests públicos.

Por ejemplo:

- API
- SSR
- Health endpoints

---

### 12.

Registra:

- release actual
- release anterior
- backup generado

---

# Estado

```bash
bash infra/scripts/prod.sh status "$RELEASE"
```

Muestra:

- Backend
- Frontend
- PostgreSQL

Con:

- imagen
- estado
- health

---

# Healthcheck

```bash
bash infra/scripts/prod.sh healthcheck "$RELEASE"
```

Comprueba:

## Internamente

- backend readiness
- frontend health

## Externamente

- URL pública
- API pública

---

# Rollback

Solo disponible cuando ya existe una release previa compatible.

```bash
bash infra/scripts/prod.sh rollback <release> --schema-compatible
```

El rollback:

- cambia backend
- cambia frontend

No modifica PostgreSQL.

No restaura backups automáticamente.

---

# Backups

Todos los despliegues generan automáticamente:

```
database.dump

uploads.tar.gz
```

Además se generan:

```
SHA256
```

para validar integridad.

Los backups quedan en:

```
/srv/apps/jano/.deploy/backups
```

---

# Archivos importantes

```
infra/docker-compose.prod.yml
```

Infraestructura oficial de producción.

---

```
infra/scripts/prod.sh
```

Punto único de entrada para despliegues.

---

```
infra/.env.production
```

Variables de producción.

Debe tener permisos:

```
600
```

---

# Nunca ejecutar

Nunca utilizar:

```bash
docker compose -f infra/docker-compose.yml up
```

Ese compose es únicamente para desarrollo.

---

Nunca ejecutar:

```bash
docker compose down -v
```

Eliminaría los volúmenes.

---

Nunca ejecutar:

```bash
prisma migrate reset
```

---

Nunca ejecutar:

```bash
prisma db push
```

en producción.

---

Nunca ejecutar:

```bash
docker volume prune
```

---

Nunca ejecutar:

```bash
docker image prune
```

sin saber exactamente qué imágenes eliminar.

---

# Flujo recomendado para cada release

```bash
git pull origin develop

git status --short --branch

RELEASE=$(git rev-parse --short=12 HEAD)

bash infra/scripts/prod.sh preflight "$RELEASE"

bash infra/scripts/prod.sh deploy "$RELEASE"

bash infra/scripts/prod.sh status "$RELEASE"

bash infra/scripts/prod.sh healthcheck "$RELEASE"
```

Este es el único flujo soportado para desplegar JANO en producción.

---

# Historial de releases

Release actual:

```bash
cat .deploy/current-release
```

Release anterior:

```bash
cat .deploy/previous-release
```

Último backup:

```bash
cat .deploy/last-backup
```

---

# Buenas prácticas

✅ Siempre ejecutar `preflight`.

✅ Confirmar Git limpio antes de desplegar.

✅ Mantener backups fuera del servidor (`JANO_BACKUP_MIRROR`).

✅ Desplegar siempre mediante imágenes versionadas.

✅ Nunca ejecutar el compose de desarrollo en producción.

✅ Verificar el login y una operación editorial después de cada release.
