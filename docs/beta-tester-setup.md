# Beta Tester Setup

This guide is for running JANO on another computer for local beta testing.

## Recommended Option: Full Docker

Use this when the beta tester only needs to try the product, not develop it.

Requirements:

- Git
- Docker Desktop or Docker Engine

Steps:

```bash
git clone <repo-url>
cd Jano
cp .env.example .env
npm run docker:up
```

Open:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000`
- Adminer: `http://localhost:8080`

The Docker backend runs:

```bash
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

So committed migrations are applied automatically.

## Seed Data

If the tester needs demo data, run this from another terminal:

```bash
npm run prisma:seed
```

If the backend is running only inside Docker and local Node dependencies are not
installed, use:

```bash
npm run setup:local
npm run prisma:seed
```

## Pulling Updates

After you push new commits:

```bash
git pull
npm run docker:up
```

If dependencies or Prisma changed, Docker rebuilds the app. If the database is
already present, migrations are applied on backend startup.

## Resetting The Test Database

Use this when the tester wants a clean database:

```bash
npm run docker:reset
npm run docker:up
npm run prisma:seed
```

This deletes the local Docker database volume.

## Sharing Over The Same Network

For another device on the same Wi-Fi/LAN:

1. Find the host computer IP.
2. Set `.env` before starting Docker:

```bash
FRONTEND_ORIGIN=http://<host-ip>:4200
MEDIA_PUBLIC_BASE_URL=http://<host-ip>:3000
```

3. Start the stack:

```bash
npm run docker:up
```

4. Open this on the tester device:

```text
http://<host-ip>:4200
```

Make sure the firewall allows ports `4200` and `3000`.

## Production SSR Behind Cloudflare Tunnel

For the home server deployment behind Cloudflare Tunnel, keep browser traffic on
the public JANO host and keep SSR/backend traffic inside the Docker network.

Recommended frontend environment:

```bash
PORT=4200
NG_ALLOWED_HOSTS=localhost,127.0.0.1,jano.manuelgodoy.eu
SSR_API_ORIGIN=http://backend:3000
API_PROXY_TARGET=http://backend:3000
```

Meaning:

- Browser requests use the public origin and call `/api` through the frontend
  Express proxy.
- SSR requests rewrite `/api` and `/uploads` directly to
  `http://backend:3000`.
- Angular SSR only accepts configured hosts, including
  `jano.manuelgodoy.eu`.

Do not set the SSR API origin to `https://jano.manuelgodoy.eu`; that sends
server-side rendering back through the public tunnel and can fail or loop.

## Not Recommended For External Beta

Do not expose the local dev stack directly to the public internet. It uses
development settings and a local PostgreSQL container.

For external testers outside your network, deploy the app to a proper hosting
environment or use a temporary tunnel only for short supervised sessions.
