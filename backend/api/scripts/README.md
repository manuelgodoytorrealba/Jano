# Editorial operations scripts

This directory contains maintained operational tools and legacy one-off executions. A file being
present here does not make it a supported command.

## Lifecycle

- **Supported:** invoked by a named command in `backend/api/package.json`. These commands must keep a
  dry-run mode where they can write canonical data, and an explicit `:apply` command for the write.
- **Manual:** TypeScript or small JavaScript diagnostics without a package command. They are source
  material for a future maintained tool, not a production runbook.
- **Fixture:** deterministic regression inputs ending in `.fixture.test.cjs`.
- **Historical:** legacy `.cjs` batches and browser capture helpers. They record already executed
  editorial work and must not be rerun against a current database.

Run `npm run editorial-ops:check` from the repository root to validate command references, parse all
JavaScript files and print the current catalog counts.

## Rules for new work

1. Do not add another numbered batch script to this directory.
2. Recurrent work belongs in `tools/editorial-ops` and exposes a named package command.
3. Every mutating command defaults to dry-run and requires an explicit apply flag or command.
4. Record owner, creation date, expected inputs, output artifact and rollback/reversibility.
5. Once an operation is complete, keep its outcome in a report; do not keep executable historical
   payloads in the active product path.
