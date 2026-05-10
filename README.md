# JANO

Full-stack art knowledge platform built with NestJS, Prisma, PostgreSQL and Angular.

## Quick Start

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
npm run db:up
npm run backend:dev
npm run frontend:dev
npm run prisma:migrate
npm run prisma:seed
npm run docker:up
npm run docker:down
```

## Docs adicionales

- [docs/commands.md](docs/commands.md)
- [docs/architecture-overview.md](docs/architecture-overview.md)
- [docs/development-workflow.md](docs/development-workflow.md)
- [docs/environment.md](docs/environment.md)
- [docs/home-decks-editorial-admin-plan.md](docs/home-decks-editorial-admin-plan.md)
