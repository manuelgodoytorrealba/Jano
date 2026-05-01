# Jano Commands

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
rm -rf backend/api/node_modules frontend/node_modules
npm run setup:local
```

### Error de entorno en backend

Si el backend muestra `Missing env var` o `Using insecure dev fallback`, revisa `backend/api/.env`.
