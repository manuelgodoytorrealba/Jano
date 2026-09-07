# Wave 003 zero-yield diagnosis

## Root cause

The 22 prepared documents were mostly usable: median prepared length was 2,616 characters and 21/22 exceeded the deterministic excerpt minimum. The Wave 003 semantic driver nevertheless processed only `sourceIds.slice(0,10)`, producing 10 excerpts. It also selected three unrelated canonical targets (Winckelmann, Nancy Spero and Ana Mendieta) for the processed sources, so Semantic Evidence returned low-confidence `REVIEW` results without support spans. This is an orchestration/target-pairing defect, not a Semantic Evidence quality defect.

Probe counts were probe outcomes across all 300 candidates. They were not fetch failures for the 57 selected Sources. Actual fetch was attempted for zero Sources in the bounded replay; 22 prepared materials were reused from existing READY versions.

## Minimal V2.1 change

The next-run driver no longer truncates prepared sources to ten and prefers an entity already linked to the Source when forming a target pair. A deterministic target×source ranking adds explicit-title/alias, document density/content type and generic-page signals. Frozen semantic systems are unchanged. The fixture `backend/api/scripts/wave003-zero-yield-fixture.test.cjs` passes.

## Replay

Using the same 120 targets and 300 candidates, the non-mutating V2.1 replay selects the same 57 accessible Sources, projects 22 prepared-capable documents and 21 excerpt-capable documents. No semantic calls or canonical writes were made by the replay.
