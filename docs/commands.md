# Jano Commands

## Versiones soportadas

- Node: `>=22.14.0 <23` (`22.14.0` está fijado en `.nvmrc` y Docker)
- npm: `>=10.9.4 <11`

Usa la version pinneada del repo antes de instalar o arrancar nada:

```bash
nvm install
nvm use
```

o con Volta:

```bash
volta install node@22.14.0 npm@10.9.4
```

Si entras con Node 25 o cualquier otra mayor, no lo des por valido aunque algo arranque: el repo, CI y scripts locales se verifican con Node 22.

## Setup inicial

### Full Docker

```bash
cp .env.example .env
npm run docker:up
```

### Híbrido recomendado

```bash
cp .env.example .env
cp backend/api/.env.example backend/api/.env
nvm use
npm run setup:local
npm run db:up
```

## Levantar proyecto

### Stack completo en Docker

```bash
npm run docker:up
```

### Solo base de datos en Docker

```bash
npm run db:up
```

### Backend local

```bash
npm run backend:dev
```

### Frontend local

```bash
npm run frontend:dev
```

### Stack local completo

```bash
npm run dev
```

### Stack local mobile

```bash
npm run mobile
```

## Calidad

```bash
npm run lint
npm run typecheck
npm test --workspaces --if-present -- --watch=false
npm run check
npm run frontend:build
```

`npm run check` es el gate real del repo. Ejecuta lint, typecheck, tests del monorepo y format check.
El build frontend es además el gate visual: falla si cualquier component style supera 28 kB.

## Backend

```bash
npm run backend:install
npm run backend:dev
npm run backend:build
```

## Frontend

```bash
npm run frontend:install
npm run frontend:dev
npm run frontend:build
```

## Prisma

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
npm run prisma:reset
```

### Prisma Studio

```bash
docker compose -f infra/docker-compose.yml exec backend npm run studio
ssh -L 5555:localhost:5555 user@server
```

See [prisma-studio.md](prisma-studio.md).

## Private Beta

```bash
docker compose -f infra/docker-compose.yml exec backend node -e "const bcrypt=require('bcrypt'); bcrypt.hash(process.argv[1],10).then(console.log)" 'plain-password'
```

See [private-beta.md](private-beta.md).

## Search and Taxonomy Checks

```bash
curl -sS "http://localhost:3000/api/search?q=picasso&limit=10"
curl -sS "http://localhost:3000/api/search?tag=surrealism&limit=10"
curl -sS "http://localhost:3000/api/relation-types"
curl -sS "http://localhost:3000/api/tags"
```

## Base de datos

```bash
npm run db:up
npm run db:down
docker compose -f infra/docker-compose.yml exec db psql -U "${POSTGRES_USER:-jano}" -d "${POSTGRES_DB:-jano}"
```

## Reset total

```bash
npm run docker:reset
rm -rf backend/api/node_modules backend/api/dist frontend/node_modules frontend/dist
```

## Debug

```bash
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml logs -f backend
docker compose -f infra/docker-compose.yml logs -f frontend
docker compose -f infra/docker-compose.yml logs -f db
```

## Docker

```bash
npm run docker:up:detached
npm run docker:down
npm run docker:logs
docker compose -f infra/docker-compose.yml up --build backend frontend
docker compose -f infra/docker-compose.yml up -d db adminer
```

## Producción

Producción usa un Compose y un entorno separados. No uses `infra/docker-compose.yml` en el servidor.

```bash
cp infra/.env.production.example infra/.env.production
chmod 600 infra/.env.production
docker volume ls
```

Después de configurar los nombres exactos de los volúmenes existentes y los secretos:

```bash
git pull --ff-only origin develop
RELEASE="$(git rev-parse --short=12 HEAD)"
bash infra/scripts/prod.sh preflight "$RELEASE"
bash infra/scripts/prod.sh deploy "$RELEASE"
bash infra/scripts/prod.sh status "$RELEASE"
```

Backup y comprobación manual:

```bash
bash infra/scripts/prod.sh backup
bash infra/scripts/prod.sh healthcheck
```

Rollback de aplicación, solo después de confirmar compatibilidad con el esquema actual:

```bash
bash infra/scripts/prod.sh rollback COMMIT_ANTERIOR --schema-compatible
```

Consulta el procedimiento completo en [deployment.md](deployment.md).

## Troubleshooting

### Prisma client desactualizado

```bash
npm run prisma:generate
```

### Base de datos vacía o desincronizada

```bash
npm run prisma:migrate
npm run prisma:seed
```

### Volúmenes o contenedores corruptos

```bash
npm run docker:reset
npm run docker:up
```

### Puerto ocupado

Edita `.env` en la raíz y cambia `FRONTEND_PORT`, `BACKEND_PORT`, `POSTGRES_PORT` o `ADMINER_PORT`.

### Dependencias rotas al cambiar de máquina

```bash
nvm install
nvm use
npm install --global npm@10.9.4
npm ci
```

En servidores usa `npm ci`, nunca `npm install`: instala exactamente el lockfile y no intenta resolver versiones nuevas. Si el despliegue es completamente Docker, no necesitas instalar las dependencias en el host; ejecuta directamente `docker compose -f infra/docker-compose.yml up --build -d`.

### `EBADENGINE` durante la instalación

No ignores el aviso ni uses `--force`. Comprueba y corrige el runtime antes de instalar:

```bash
node --version
npm --version
nvm install 22.14.0
nvm use 22.14.0
npm install --global npm@10.9.4
npm ci
```

### Error de entorno en backend

Si el backend muestra `Missing env var` o `Using insecure dev fallback`, revisa `backend/api/.env`.
