# Dependency security update — 2026-11-07

Node is now pinned to 22.23.4, including the October Brotli security fix,
across development, CI and both container images. npm 11.21.2 replaces npm 10:
the older resolver crashed while resolving the patched workspace dependency tree.
TypeScript stays on 5.9 to match Angular 21 and the existing application.

The refreshed lockfile updates affected packages within the application's existing
framework major versions. Overrides enforce patched Multer, Undici, Glob and
Minimatch versions. The Minimatch override only applies to affected major versions;
older callers that expect the version 3 API retain their compatible dependency.
Express and Multer are now explicit backend dependencies because backend code
imports them directly; runtime startup no longer relies on workspace hoisting.

PostgreSQL is pinned to 16.15-trixie in development, production, CI and the backup
helper. This keeps the existing database major version and distribution family.
Before replacing an existing database container, take and verify a coordinated
backup of PostgreSQL and uploads using the previous deployment configuration.
Preserve the existing volumes and follow `docs/deployment.md`.

## Verification

- Clean installation with Node 22.23.4 and npm 11.21.2.
- Backend: 76 test suites, 452 tests passed.
- Frontend: 93 test files, 398 tests passed.
- Type checks, lint and production builds passed. Existing lint and bundle-size
  warnings remain.
- Runtime npm audit: no known vulnerabilities.
- Full npm audit: no moderate, high or critical findings.
- OSV exact-version check: no malware matches in the refreshed lockfile.
- CI now checks development dependencies as well as runtime dependencies.

Container smoke tests use an isolated copy of the existing local database. A
pre-existing editorial migration requires seeded canonical entities and fails on
an empty database; this update does not change that migration or production data.

## Remaining low-severity advisory

`deepmerge` 4.3.1 has GHSA-gcqx-w48m-w2h4 with no patched release available.
Eight npm audit entries reflect that one advisory and its propagation through Jest
and the Nest build tooling. It is absent from the production runtime dependency
tree. Do not use `npm audit fix --force` to downgrade the test/build toolchain.
Recheck the upstream fix and update when a compatible patched release is available.

This update is not a forensic assessment or a guarantee against unknown flaws.
