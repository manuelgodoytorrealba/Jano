type Evidence = { id: string; libraryExcerptId: string | null };
type Claim = {
  id: string;
  title: string;
  kind: string;
  status: string;
  evidence: Array<{ evidenceId: string }>;
};
type Entity = { id: string; evidence: Array<{ evidenceId: string }> };
type Relation = {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  claims: Array<{ claimId: string }>;
};
type Section<TExcerpt> = {
  id: string;
  questions: Array<{ id: string; text: string }>;
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
  sections: TSection[] = [],
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
    const evidenceByExcerpt = new Set(selectedEvidence.map((item) => item.libraryExcerptId));
    const claimEvidenceIds = new Set(
      selectedClaims.flatMap((claim) => claim.evidence.map((item) => item.evidenceId)),
    );
    const supportedClaimCount = selectedClaims.filter(
      (claim) => claim.status === 'SUPPORTED',
    ).length;
    const questionedClaimCount = selectedClaims.filter(
      (claim) => claim.status === 'QUESTIONED',
    ).length;
    const contradictionCount = selectedClaims.filter(
      (claim) => claim.kind === 'CONTRADICTION' || claim.status === 'CONTRADICTED',
    ).length;
    const pendingClaim = selectedClaims.find((claim) => claim.status !== 'SUPPORTED');
    const nextTask = !section.excerptReferences.length
      ? { kind: 'SELECT_EXCERPT' as const, title: 'Selecciona un pasaje para esta pregunta' }
      : section.excerptReferences.find((item) => !evidenceByExcerpt.has(item.libraryExcerptId))
        ? {
            kind: 'CREATE_EVIDENCE' as const,
            title: 'Convierte un pasaje seleccionado en evidencia',
          }
        : selectedEvidence.find((item) => !claimEvidenceIds.has(item.id))
          ? {
              kind: 'CREATE_CLAIM' as const,
              title: 'Formula el argumento que sostiene esta evidencia',
            }
          : pendingClaim
            ? {
                kind: 'REVIEW_CLAIM' as const,
                title: `Revisa el respaldo de «${pendingClaim.title}»`,
                claimId: pendingClaim.id,
              }
            : {
                kind: 'READY' as const,
                title: 'Esta Section tiene un recorrido editorial consolidado',
              };
    const state = !section.excerptReferences.length
      ? {
          kind: 'NEEDS_CORPUS' as const,
          title: 'La pregunta aún no tiene corpus seleccionado',
          description: 'Elige un pasaje antes de empezar a interpretar.',
        }
      : !selectedEvidence.length
        ? {
            kind: 'NEEDS_EVIDENCE' as const,
            title: 'El corpus necesita convertirse en evidencia',
            description: 'Los extractos seleccionados todavía no sostienen un uso investigador.',
          }
        : !selectedClaims.length
          ? {
              kind: 'NEEDS_ARGUMENT' as const,
              title: 'La evidencia necesita una formulación editorial',
              description: 'Hay soporte documental, pero aún no una afirmación que lo articule.',
            }
          : contradictionCount
            ? {
                kind: 'HAS_TENSION' as const,
                title: 'La Section conserva una tensión editorial',
                description:
                  'Existen Claims contradictorios que requieren contexto, no una resolución automática.',
              }
            : questionedClaimCount || supportedClaimCount < selectedClaims.length
              ? {
                  kind: 'NEEDS_REVIEW' as const,
                  title: 'El argumento necesita contraste editorial',
                  description: 'Algunos Claims todavía no están respaldados de forma suficiente.',
                }
              : {
                  kind: 'SUPPORTED' as const,
                  title: 'La Section dispone de un argumento respaldado',
                  description: 'Corpus, evidencia y Claims mantienen una trazabilidad completa.',
                };

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
        review: { nextTask },
        summary: {
          excerptCount: section.excerptReferences.length,
          evidenceCount: selectedEvidence.length,
          claimCount: selectedClaims.length,
          supportedClaimCount,
          questionedClaimCount,
          contradictionCount,
          questionsWithoutExplicitSupport: section.questions,
          state,
        },
      },
    };
  });
}
