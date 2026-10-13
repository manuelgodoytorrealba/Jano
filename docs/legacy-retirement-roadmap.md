# Legacy retirement roadmap

Owner: JANO technical lead. Baseline: 2026-10-05.

| Compatibility layer                  | Exit condition                                                                         | Target review | Removal target |
| ------------------------------------ | -------------------------------------------------------------------------------------- | ------------- | -------------- |
| `ResearchFinding`                    | zero production rows; no API serializer, import or report consumes it                  | 2026-10-31    | 2026-11-15     |
| legacy `EntityType` bridge           | every entity has a valid `EntityTypeDefinition`; clients read canonical key/kind only  | 2026-11-30    | 2026-12-15     |
| media `PRIMARY_LEGACY` / `isPrimary` | every published entity resolves explicit roles and no fallback is observed for 30 days | 2026-12-31    | 2027-01-15     |

Each removal uses expand/contract: measure and backfill first, stop writes second, remove reads third,
then remove schema fields in a later release. A rollback must remain possible between each phase. The
owner records production counts and the release that disabled the final read before approving the
destructive migration.
