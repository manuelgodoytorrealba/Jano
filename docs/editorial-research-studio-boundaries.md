# Editorial Research Studio Boundaries

This note records the minimum product boundary between automatic proposals, human findings, and future structured synthesis. ADR-ERS-001 remains the architectural authority.

## ResearchFindingProposal

A `ResearchFindingProposal` is private automatic output. It is linked to an `AIExecution` and to the evidence used by that execution.

It is not a human finding. It is not accepted knowledge. It only becomes editorial work when Maria explicitly reviews it and chooses a later transition.

## ResearchFinding

A `ResearchFinding` is a private finding incorporated into the research workspace by human action. It represents an observation backed by evidence.

It does not represent complete synthesis. It does not represent a canonical entity. It does not represent a canonical relation.

## ResearchMaterial

`ResearchMaterial` is private input owned by a research project. Pasted text, URLs, and uploaded PDFs remain documentary working material and never create or modify a canonical `Source`.

## ResearchClaim

`ResearchClaim` is the private unit of structured synthesis. It carries subject candidates, provisional connection hypotheses, concepts, contradictions, open questions, and synthesis statements.

It is still research state. It is not a canonical entity, relation, source reference, or publication.

## Research Canvas

The Research Canvas is a private projection of `ResearchClaim`. It can show candidate subjects, concepts, and evidence-backed provisional connections only after structured synthesis exists.

Canvas edits update Research state. They never publish and never write to `Entity`, `Relation`, `SourceRef`, or `Publication`; canonical promotion remains a separate human-controlled transition.
