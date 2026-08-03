type Evidence = { id: string; libraryExcerptId: string | null };
type Claim = { id: string; evidence: Array<{ evidenceId: string }> };
type Entity = { id: string; evidence: Array<{ evidenceId: string }> };
type Relation = {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  claims: Array<{ claimId: string }>;
};
type Section<TExcerpt> = {
  id: string;
  excerptReferences: Array<{ libraryExcerptId: string; libraryExcerpt: TExcerpt }>;
};

const byId = <T extends { id: string }>(items: T[]) =>
  [...items].sort((left, right) => left.id.localeCompare(right.id));

export function presentSectionDossiers<
  TExcerpt,
  TEvidence extends Evidence,
  TClaim extends Claim,
  TEntity extends Entity,
  TRelation extends Relation,
  TSection extends Section<TExcerpt>,
>(
  sections: TSection[],
  evidence: TEvidence[],
  claims: TClaim[],
  entities: TEntity[],
  relations: TRelation[],
) {
  return sections.map((section) => {
    const excerptIds = new Set(section.excerptReferences.map((item) => item.libraryExcerptId));
    const selectedEvidence = byId(
      evidence.filter((item) => item.libraryExcerptId && excerptIds.has(item.libraryExcerptId)),
    );
    const evidenceIds = new Set(selectedEvidence.map((item) => item.id));
    const selectedClaims = byId(
      claims.filter((claim) => claim.evidence.some((item) => evidenceIds.has(item.evidenceId))),
    );
    const claimIds = new Set(selectedClaims.map((claim) => claim.id));
    const selectedRelations = byId(
      relations.filter((relation) => relation.claims.some((item) => claimIds.has(item.claimId))),
    );
    const relationEntityIds = new Set(
      selectedRelations.flatMap((relation) => [relation.fromEntityId, relation.toEntityId]),
    );
    return {
      ...section,
      dossier: {
        excerpts: section.excerptReferences.map((item) => item.libraryExcerpt),
        evidence: selectedEvidence,
        claims: selectedClaims,
        entities: byId(
          entities.filter(
            (entity) =>
              relationEntityIds.has(entity.id) ||
              entity.evidence.some((item) => evidenceIds.has(item.evidenceId)),
          ),
        ),
        relations: selectedRelations,
      },
    };
  });
}
