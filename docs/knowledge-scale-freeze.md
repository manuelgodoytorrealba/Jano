# JANO knowledge scale freeze

**INFRASTRUCTURE_FROZEN: YES** — SCALE_READY_5000 is closed for the current scope.

## Frozen core

- Source → Material → Excerpt provenance
- Semantic Evidence V3
- Target Router v1 and Identity Resolution v1
- Human-gated entity/relation proposal workflow
- Canonical assertion and relation promotion boundaries
- Claim-Level Editorial Realizer V1.2
- Public/private boundary
- Deterministic coverage and research queue
- Relation Mapping V2: semantic predicate contracts, canonical-type compatibility,
  direction normalization, explicit assertion/review outcomes and existing-edge dedup.

## JANO_KNOWLEDGE_FEED_LOOP_V1

1. Coverage identifies gaps; the research queue selects work.
2. Acquire and prepare sources, then target excerpts and resolve identity.
3. Generate proposals; humans approve, reject, defer, reroute, or split.
4. Materialize private evidence, promote approved knowledge, and create approved entities/relations.
5. Regenerate affected editorial, recompute coverage, and repeat.

## Growth phases

A: 805→1,000 (densify); B: 1,000→1,500 (high-confidence nodes); C: 1,500→2,500 (graph breadth); D: 2,500→5,000 (coverage and niche depth).

Changes after freeze require an observed problem, severity, reproduction, migration plan, and regression benchmark.

## Authorized P1 amendment: Relation Mapping V2

The Wave 001 relation audit reproduced a P1 defect in the private proposal path:
predicate IDs were validated mechanically, but predicate meaning, endpoint
types and semantic direction were not validated before relation review or
acceptance. The canonical graph was structurally audited without demonstrated
corruption.

The V2 gate is deterministic and conservative. A proposal must have resolved
canonical endpoints, a compatible predicate and an explicit supported
proposition. Otherwise it becomes `ASSERTION_INSTEAD`, `NO_SUPPORTED_RELATION`,
`REVIEW_MAPPING` or `BLOCKED_BY_ENTITY`. Null is a valid model result; no
nearest-predicate fallback is allowed. Existing triples become provenance
candidates after, never before, semantic mapping.

V2 does not add predicates or alter canonical data. Subsequent changes require
the same freeze policy: reproducible defect, severity, fixture, migration
impact and regression benchmark.
