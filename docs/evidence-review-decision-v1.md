# Evidence Review Decision V1

Evidence-backed review items previously had no persistence contract without an AI
proposal. ResearchEvidenceDecision now stores the real project, Evidence, logical
review ID, active admin reviewer, enum decision, reason and reviewed payload.
ResearchProposalDecision is unchanged. A project/logical-ID unique key and service
comparison make identical retries no-ops and reject conflicting retries.

The authenticated admin Research controller exposes POST
`:id/evidence-decisions` and GET `:id/review-decisions`. The application service
`readReviewDecisions(projectId, logicalReviewIds)` calculates exact completion
against a supplied authoritative manifest; without one it reports population and
remaining counts as null rather than inventing a denominator. Both decision
models remain separate. Evidence approvals record intent only; they never create
claims, proposals, canonical assertions, SourceRefs or Citations.

Additive migration: `20260907120000_evidence_review_decisions`. One enum, one
private table, three foreign keys and indexes. Applied only to the Docker Compose
`jano-production-local` database, after database/uploads backup at
`/tmp/jano-evidence-review-backup`. No remote production operation occurred.

Validation: Prisma validation and migration passed; typecheck passed; 19 Research
suites / 172 tests passed. Existing tests needed a missing entity-type mock and
whitespace-independent schema checks. Test execution supplies the existing frontend
route/artifact fixtures and clears the deployment media URL. No semantic or
canonical promotion behavior changed.

W003-B01 was persisted through ResearchService in one transaction: 20 created,
second identical transaction 0 created. Reviewer lineage is the same active admin
used for Wave 002, ID `55e0f530-5458-4067-8389-daad2a567b8b`. Canonical counts stayed
824 entities, 1388 relations, 40 assertions, 866 SourceRefs and 1427 Citations.
Evidence/proposal counts stayed unchanged. Full historical proposal-decision rows
were compared before/after without differences: 72 records in the Wave 001 pilot,
95 in Wave 002. W002-D001 through W002-D007 are LEGACY_REVIEW_ANCHOR and untouched.

The authoritative packet still names remaining items W003-B01-021 through
W003-B01-032. They are presented as batch W003-B02 without renaming those stable
logical IDs. Existing recommendations and semantic results are preserved, including
questionable classifications; human review must inspect the exact support.

The service is exercised directly from current TypeScript by the persistence
script. This task does not restart/deploy the running backend HTTP process.
