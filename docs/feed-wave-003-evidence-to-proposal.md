# Wave 003 Evidence → Proposal

Five `APPROVE_CLAIM` Evidence decisions advanced to five `ResearchFindingProposal`
rows. Each proposal is `CLAIM`, carries the human review ID in `proposalKey`, keeps
the exact Evidence link, and records a human-review `AIExecution` audit envelope;
no model was called. The proposal remains `PENDING` and is not human-approved at
the proposal layer.

`W003-B01-010` remains provenance-only. No separate provenance proposal path exists
in the current domain, so it is recorded in the promotion preview and was not
represented as a duplicate claim.

The operation is idempotent by deterministic proposal key/result fingerprint and
the existing project/job uniqueness boundary. A second run created zero proposals.
Rejected and deferred Evidence has zero proposal links.

Canonical counts remained 824 entities, 1388 relations and 40 assertions; SourceRefs
and Citations were unchanged. No Qwen call, Evidence creation, entity proposal or
relation proposal occurred.
