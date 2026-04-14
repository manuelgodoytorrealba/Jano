# Environment Files

## `/.env`

Archivo usado por Docker Compose.

Controla:

- puertos expuestos (`FRONTEND_PORT`, `BACKEND_PORT`, `POSTGRES_PORT`, `ADMINER_PORT`)
- credenciales y nombre de la base para el stack docker
- `FRONTEND_ORIGIN`
- `MEDIA_PUBLIC_BASE_URL`
- `JWT_SECRET`

Este archivo se usa cuando levantas el proyecto con `npm run docker:up`.

## `/backend/api/.env`

Archivo usado solo por el backend cuando corre fuera de Docker.

Variables esperadas:

- `NODE_ENV`
- `HOST`
- `PORT`
- `FRONTEND_ORIGIN`
- `DATABASE_URL`
- `MEDIA_PUBLIC_BASE_URL`
- `JWT_SECRET`

Si falta `DATABASE_URL`, el backend falla al arrancar.

Si falta `JWT_SECRET`:

- en `development`, el backend avisa y usa un fallback inseguro
- en `production`, el backend falla al arrancar

## Frontend

El frontend no necesita `.env` propio en este momento.

En desarrollo usa `frontend/proxy.conf.js` para redirigir:

- `/api`
- `/uploads`

al backend local o al backend del contenedor, según el script que uses.

## Qué guardar en tu gestor de contraseñas

Guarda los valores reales de:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`

Si más adelante añades servicios externos, sus claves también deben ir ahí, no en Notion ni en texto plano en cloud drive.
