# Editorial resumption audit — 2026-09-09

Read-only verification against `infra-db-1/jano`: 824 entities, 812 published,
138 with nonempty Spanish summary/content and English shortDescription/essay.

The previous label `EDITORIAL_COMPLETE_BILINGUAL` was incorrect: its query only
tested nonempty fields. These 138 entities have bilingual field coverage, not
verified editorial completion. The remaining 686 lack at least one field;
this is a coverage backlog, not the full editorial-quality backlog.

Do not increase batch size on the basis of the previous PASS reports. They do
not establish claim-level grounding or visits to every entity in both languages.

Concrete review targets in the stored batch scripts:

- Batch 005, Bronces de Benín: contradictory woodblock/paper metadata was
  incorporated into public prose instead of blocking the assertion.
- Batch 006, Agnes Martin and Alberto Giacometti: public essays discuss
  undocumented biography or available knowledge, contrary to the editorial brief.
- Dates in Entity.startYear must not automatically become exact birth dates,
  execution dates or completion dates without supporting public provenance.
- Published graph edges alone cannot support added visual interpretations,
  historical significance or claims about an artist's practice.

Next work must build explicit public claim/source sets, review these defects,
retain before/after snapshots and verify both locales before asserting completion.
No editorial database writes were made during this resumption audit.
