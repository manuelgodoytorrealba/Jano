# Editorial Research Studio Boundaries

This note records the minimum product boundary between automatic proposals, human findings, and future structured synthesis. ADR-ERS-001 remains the architectural authority.

## ResearchFindingProposal

A `ResearchFindingProposal` is private automatic output. It is linked to an `AIExecution` and to the evidence used by that execution.

It is not a human finding. It is not accepted knowledge. It only becomes editorial work when Maria explicitly reviews it and chooses a later transition.

## ResearchFinding

A `ResearchFinding` is a private finding incorporated into the research workspace by human action. It represents an observation backed by evidence.

It does not represent complete synthesis. It does not represent a canonical entity. It does not represent a canonical relation.

## Future ResearchClaim

`ResearchClaim` is the future unit of structured synthesis. It should carry contradictions, open questions, concepts, candidates, and provisional relationships.

It is not implemented yet. It should become the basis for the future provisional Canvas, before any controlled canonical promotion.
