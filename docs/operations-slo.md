# JANO operational objectives

Status: initial beta objectives, effective 2026-10-05. Review monthly with production measurements.

## Service objectives

| Signal                          |                          Objective |             Alert threshold |
| ------------------------------- | ---------------------------------: | --------------------------: |
| Public application availability |           99.5% per calendar month |                 below 99.5% |
| Public catalog/search latency   |                   p95 under 750 ms |    p95 above 1 s for 15 min |
| Authentication latency          |                   p95 under 500 ms |    p95 above 1 s for 10 min |
| Admin mutation latency          | p95 under 1.5 s, excluding uploads |  p95 above 2.5 s for 15 min |
| API server errors               |               below 1% of requests |         above 2% for 10 min |
| Research job acknowledgement    |                          under 2 s |               p95 above 5 s |
| Research job completion         |                       under 15 min | any job running over 30 min |

Liveness only proves that the process responds. Readiness additionally checks PostgreSQL. Deployment
health requires backend readiness, frontend `/healthz` and the frontend-to-backend proxy smoke test.

## Capacity limits

- Research PDF upload: 300 MB; the SSR proxy allows five minutes for this route family.
- Image upload and remote image ingest: 15 MB.
- Application settings asset upload: 12 MB.
- Acquired remote source: 20 MB; document conversion buffers at most 5 MB.
- Research AI context: at most 80 segments of 1,400 characters per execution.

Increasing a limit requires a measured memory/duration test and an updated timeout. Do not increase
the global proxy allowance to solve a route-specific need.

## Measurement and incident use

Backend request logs are JSON records containing timestamp, correlation ID, method, path, status and
duration. They intentionally exclude query strings, authorization headers and bodies. The reverse
proxy should preserve `X-Request-Id`. Correlate a frontend report with the response `X-Request-Id`.

When `METRICS_TOKEN` is configured, `GET /api/metrics` exposes Prometheus text metrics using
`Authorization: Bearer <token>`. It returns 404 while disabled. It publishes request count by method
and status class, a latency histogram, uptime and resident memory; paths are deliberately omitted to
keep cardinality bounded. Derive p50/p95/p99 and the 5xx ratio from these series.

PostgreSQL loads `pg_stat_statements` in both Compose environments. Run
`npm run db:performance-report` from the repository root to inspect the 25 statements with the most
accumulated execution time. Resetting its counters is an explicit DBA action and is not part of a
deployment.

Unhandled backend errors can be sent to Sentry by setting `SENTRY_DSN`. It is disabled when unset,
does not enable default PII collection, and traces are disabled unless
`SENTRY_TRACES_SAMPLE_RATE` is deliberately set between 0 and 1.

An alert must link to the deployment runbook, current release and last verified backup. A failed SLO
month requires an incident note with cause, affected window and one owned corrective action.

## Backup and recovery objectives

- Recovery point objective: the latest verified release backup; 24 hours maximum during beta.
- Recovery time objective: four hours after declaring a restore incident.
- Retention and off-host copy follow `deployment.md`.
- Run a restore drill at least quarterly against a temporary PostgreSQL database and uploads volume.
