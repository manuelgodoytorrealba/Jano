# Grounding recovery — 2026-09-09 (INCOMPLETE)

## Corrected metrics

Read-only snapshot: `infra-db-1/jano`. No editorial or canonical database writes
have been made by this recovery. The earlier resumption note is preserved.

| Metric | All entities | Published only |
| --- | ---: | ---: |
| Total | 824 | 812 |
| Bilingual field coverage | 138 | 135 |
| Field coverage backlog | 686 | 677 |
| Editorial verified bilingual in this recovery | 134 | 134 |
| True editorial backlog (not yet certified) | 690 | 678 |

The previous 138 completion count tested nonempty fields, not factual quality.
The old count of 138 was field presence, not quality. The recovery has now
verified 134 public entities; the complete semantic audit and recovery have
**not** finished. The five conservative repairs have now passed claim-level
certification with their unresolved source conflicts recorded outside the
public prose. No published entities remain insufficiently grounded in this
recovery group; two user-owned records are excluded from future editorial
batches: Graffiti y Espacios Educativos and How We Would Give Birth. The latter
is a draft.

## Inventory, not final semantic audit

All 138 IDs and their four original fields are frozen in
`artifacts/editorial-recovery/public-snapshot.json`. Public typed facts,
assertions, bibliographic references and eligible relation candidates have
deterministic fingerprints in `artifacts/editorial-recovery/audit.json`.
Supplementary public inputs are in `public-extra.json` in that directory.
These local artifacts are ignored by Git: retain the directory for resumption.

The inventory contains 1,529 input candidates, **not 1,529 approved claims**,
and 862 paragraph review units. Their claim mappings are still pending.
Relation candidates without substantive supporting quotations are deliberately
not authorized for strong historical or interpretive prose.

Before repairs, the inventory buckets were 47 NEEDS_REPAIR, 89 BLOCKED
pending review (including Benin), 2 INSUFFICIENT_GROUNDED_KNOWLEDGE (Martin and
Giacometti), and 0 VERIFIED. After reconciliation, 134 public entities are
verified, two user-owned records are excluded from future editorial batches,
and 3 covered entities remain drafts in the historical coverage inventory.
These are not
final classifications of all 138.
Deterministic scans flagged 42 meta-language passages, 66 mechanical/filler
candidates, one canonical conflict and one Rich Text error across 50 entities.
Counts overlap; filler candidates require semantic review. Unsupported-claim,
false-precision and parity totals are **not established**, not zero.

## Known defects

- **Bronces de Benín** (`cmsvvxilt00op85sjq65olk3e`): woodblock/paper
  structured metadata conflicts with identity and bronze-related inputs.
  The essay repeats the contested metadata and adds unsupported cultural
  interpretation. Record `CANONICAL_INPUT_CONFLICT`; do not pick a material
  or repair the canonical tables. Existing British Museum reference returned
  HTTP 403 during attempted retrieval. No replacement has been published.
- **Agnes Martin** (`cmsvvxisl00ss85sj7m1mww9y`): typed ArtistDetails dates
  support 1912–2004. They do not support the essay's contemplative/perceptual
  interpretation. The explicit undocumented-biography paragraph is prohibited
  process prose. Available direct reference is image provenance, not
  interpretive support. Replacement blocked on sufficient allowed grounding.
- **Alberto Giacometti** (`cmtaf2hn1000u07qt125vea8f`): typed dates support
  1901–1966, but graph associations do not establish the perceptual arguments.
  Both languages include available-knowledge/process prose. The institutional
  homepage alone does not ground the existing interpretation. Replacement
  blocked on sufficient allowed grounding.

## Repair preparation

Seven drafts were prepared in `artifacts/editorial-recovery/repairs.json`.
Romanticismo and Neoclasicismo were separately reviewed, applied atomically,
and verified. The remaining five drafts are still unapplied and unverified;
do not run a bulk apply on that file.

The 113 verified repairs use the same allowed public claim set in both
languages. The
Romanticismo essay contains one supported link to the published Naturaleza
entity; Neoclasicismo leaves Winckelmann unlinked because that target is draft.
No relation justification was changed.

The latest public batch added eighteen artwork repairs grounded only in allowed
structured fields. They intentionally omit ambiguous dates, authorship and
interpretation. Two draft entities were excluded from public certification and
their temporary editorial changes were reverted. The final safe remainder
repair added Giambattista Tiepolo and Campbell’s Soup Cans using typed facts
and eligible factual relations; the remaining provisional records are not
being forced into prose while their public grounding is insufficient or
contradictory. A conservative pass then repaired eight of the nine previously
blocked public records: disputed propositions were removed rather than
resolved by guesswork. They remain provisional until the claim-level recovery
review certifies them. Graffiti y Espacios Educativos remains blocked because
its only provenance is an internal editorial record without a public authority
source.

## Environment and verification

The development backend and frontend are currently running on ports 3000 and
4200 using the recovery override that omits migrations. The database is healthy
and readable. The normal backend startup command includes `prisma migrate
deploy`; this recovery did not run migrations or substitute the production-local
frontend.

Playwright: PASS for 51/51 public repaired routes in both locales, including ES → EN →
ES toggles, rendered Rich Text, no self-links and no visible escape sequences.
The browser emitted only expected 401 responses for unauthenticated
`/api/auth/me`; public entity content rendered correctly. The required visual
sample was completed for ten representative repaired routes.
Faces and Phases is excluded from certification because its visible structured
date (`2010–2010`) conflicts with the grounded collection assertion
(`2007–2013`).

The latest 20 public artwork repairs are factual-only: they use allowed
structured technique, material, dimension, location, collection and state
fields, and deliberately omit ambiguous dates, authorship and interpretation.

The latest 20 artist repairs are also factual-only: they use only the typed
artist identity and birth/death fields. No nationality, style, influence or
biographical interpretation was added.

## Resume

1. Restore the normal infra runtime without using production or mutating the
   knowledge core. Recheck authoritative database identity before any write.
2. Finish the 138 entity-level entailment reviews from the frozen snapshot;
   do not treat regex flags as the audit. Preserve unchanged passing entities.
3. Resolve the known-case editorial grounding blocks, then apply at most
   twenty other supported repairs with before/after snapshots and ES/EN parity.
4. Verify every repaired route in both locales and publish final metrics.

READY_FOR_BATCH_007: NO. Recommended size after recovery passes: 20.

Re-run the deterministic inventory from repository root with
`node backend/api/scripts/editorial-recovery-audit.cjs`.
Snapshot scripts use read-only transactions and refuse to overwrite snapshots.
