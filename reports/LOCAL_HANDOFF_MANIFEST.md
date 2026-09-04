# LOCAL_HANDOFF_MANIFEST

Generated from the development handoff audit on 2026-08-30. Secrets are intentionally omitted.

## Git

- Branch: `handoff/editorial-knowledge-pipeline`
- Base: `develop` at `a36b054d7eda83e98c0d7779d72aa903276b6fc8`
- Remote: `origin` (`git@github.com:manuelgodoytorrealba/Jano.git`)
- Includes editorial generation/depth, source preparation and idempotency fixes, semantic evidence contracts/classifiers, benchmark scripts, tests, and frozen QA fixtures.

```bash
git clone git@github.com:manuelgodoytorrealba/Jano.git
cd Jano
git fetch origin handoff/editorial-knowledge-pipeline
git switch --track origin/handoff/editorial-knowledge-pipeline
```

## Database

- PostgreSQL 16.13, Docker service `db`, database `jano`.
- Live database: approximately 23 MB; streamed custom dump estimate: approximately 1.1 MB.
- Production uses external volumes from `infra/.env.production`; no dump was written on this server.

From the local machine (replace `USER@SERVER` only):

```bash
ssh USER@SERVER 'cd /srv/apps/jano && docker compose --env-file infra/.env.production -f infra/docker-compose.prod.yml exec -T db sh -eu -c '\''exec pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom --no-owner --no-acl'\'' ' > ~/jano-production-snapshot.dump
```

## Local restore

```bash
cd Jano
cp .env.example .env
# Set local-only POSTGRES_* values; never copy infra/.env.production.
docker compose -f infra/docker-compose.yml up -d db
docker compose -f infra/docker-compose.yml exec -T db createdb -U jano jano_prod_snapshot
cat ~/jano-production-snapshot.dump | docker compose -f infra/docker-compose.yml exec -T db pg_restore -U jano -d jano_prod_snapshot --no-owner --no-acl
cd backend/api
DATABASE_URL='postgresql://jano:jano123@localhost:5432/jano_prod_snapshot?schema=public' npx prisma migrate status
DATABASE_URL='postgresql://jano:jano123@localhost:5432/jano_prod_snapshot?schema=public' npx prisma migrate deploy
```

The source database reports all 73 migrations applied. `migrate deploy` is only a local compatibility check.

## Files and media

- PostgreSQL does not include physical uploads.
- `infra_backend_uploads` is approximately 634 MB; `infra_jano_pgdata` approximately 82 MB.
- Media is not needed for the semantic benchmark, but is needed for a faithful editorial/UI showcase. Copy it separately only if required; never add it to Git.

## AI

- Server experiment: Ollama 0.33.2 at `/srv/apps/jano/.tools/ollama`.
- Model cache: `/home/manuel/.ollama` (~1.8 GB; qwen blob ~1.93 GB).
- No systemd unit was found and no process remains running.
- Runtime, weights, caches, and keys are excluded from Git.
- Local-only configuration:

```dotenv
AI_PROVIDER=ollama
AI_MODEL=<model selected for local hardware>
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

The code does not depend on the server path or hardcode `qwen2.5:3b`.

## Security and user data

- Secret scan: PASS.
- User-related tables exist: `User` (5 rows), `EmailVerificationToken` (3 rows), `PasswordResetToken` (0 rows). No personal values are included.
- Treat the dump as sensitive. After local restore, invalidate sessions/tokens, disable outbound mail/jobs, use local-only URLs/secrets, and anonymize emails if sharing the environment.
- No sanitizer was executed or added; any future sanitizer must reject production `DATABASE_URL` and operate only on the local snapshot.

## Tests

- Backend typecheck passed with `npx tsc --noEmit --incremental false -p tsconfig.json` (normal incremental check is blocked by root-owned generated `dist/tsconfig.tsbuildinfo`).
- Relevant backend tests: 8 suites, 45 tests passed.
- Frontend build and i18n validation passed.

## Continuation point

- Safety: 88/100; semantic automation: 45/100 (real runtime not tested); batch operations: 82/100; canonical promotion: 86/100; overall: 68/100.
- Next local task: audit hardware, select a provider/model, run the frozen 51-excerpt benchmark, then—only if it passes—perform the 5–10 entity editorial showcase.
