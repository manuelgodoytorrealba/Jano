# Prisma Studio

Prisma Studio is an internal administration tool. Do not expose it through
Cloudflare, nginx, or a public route.

## Network Model

The backend container publishes Prisma Studio only on the server loopback
interface:

```yaml
127.0.0.1:5555:5555
```

This means:

- It is reachable from the server itself at `http://localhost:5555`.
- It is not published on the public network interface.
- It can be reached from your PC through an SSH tunnel.

Inside the backend container, Prisma Studio must listen on `0.0.0.0` so Docker
can forward traffic from the host loopback interface into the container.

## Start Prisma Studio

On the server:

```bash
cd /srv/apps/jano
docker compose -f infra/docker-compose.yml exec backend npm run studio
```

This runs:

```bash
prisma studio --hostname 0.0.0.0 --port 5555 --browser none
```

Keep this process running while you use Studio.

## Verify On The Server

From the server:

```bash
curl -I http://localhost:5555
```

Expected result:

```text
HTTP/1.1 200 OK
```

or another HTTP response with HTML content from Prisma Studio.

## Connect From Your PC With SSH Tunnel

From your PC:

```bash
ssh -L 5555:localhost:5555 user@server
```

Then open:

```text
http://localhost:5555
```

Keep the SSH session open while using Studio.

## Alternative One-Off Run

If the backend service is not already running, you can start a temporary
container with service ports:

```bash
docker compose -f infra/docker-compose.yml run --rm --service-ports backend npm run studio
```

Prefer `docker compose exec backend npm run studio` when the backend service is
already running.

## Security Notes

- Do not add Prisma Studio to Cloudflare Tunnel.
- Do not route it through nginx.
- Do not bind it as `5555:5555` unless the server firewall strictly blocks
  external access to port `5555`.
- Prefer `127.0.0.1:5555:5555` and SSH tunneling.
