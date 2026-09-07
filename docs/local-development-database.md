# Local development database

The single supported local JANO development/review runtime is:

- `infra-frontend-1` (`http://127.0.0.1:4200`)
- `infra-backend-1` (`http://127.0.0.1:3000`)
- `infra-db-1`, database `jano` (`127.0.0.1:5432`)

The database contains the authoritative Wave 001–003 state. Host development commands use `backend/api/.env`, whose `DATABASE_URL` points to `127.0.0.1:5432/jano`. Do not use `jano_prod_snapshot` or the stopped `jano-production-local` runtime for normal work. Its PostgreSQL volume remains preserved as temporary recovery data.
