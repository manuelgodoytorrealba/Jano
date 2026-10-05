-- The self-hosted PostgreSQL service preloads pg_stat_statements in Compose.
-- Managed PostgreSQL providers must make the extension available before this migration runs.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
