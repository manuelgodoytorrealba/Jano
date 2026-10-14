import type { Prisma } from '@prisma/client';
import { mapRelation, type RelationEndpoint } from '../knowledge/relation-mapping';

/** Re-read identity and evidence at the action boundary; never trust cached model flags. */
export async function validateRelationProposal(
  db: Prisma.TransactionClient,
  projectId: string,
  proposalId: string,
) {
  const proposal = await db.researchFindingProposal.findFirstOrThrow({
    where: { id: proposalId, projectId, type: 'RELATION' },
    include: { relationType: true, evidence: { include: { evidence: true } } },
  });
  const endpoints = await db.researchFindingProposal.findMany({
    where: {
      projectId,
      jobId: proposal.jobId,
      type: 'ENTITY',
      proposalKey: { in: [proposal.relationFromKey ?? '', proposal.relationToKey ?? ''] },
    },
    include: {
      convertedEntity: { include: { canonicalEntity: true } },
      decisions: { orderBy: { createdAt: 'desc' } },
    },
  });
  const resolve = async (key: string | null): Promise<RelationEndpoint> => {
    const item = endpoints.find((endpoint) => endpoint.proposalKey === key);
    if (!item) return { title: '', type: '', blocked: true };
    const decision = item.decisions[0];
    const payload = decision?.payload as Record<string, unknown> | null;
    const canonicalId =
      item.convertedEntity?.canonicalEntityId ??
      (typeof payload?.canonicalEntityId === 'string' ? payload.canonicalEntityId : null);
    const canonical = canonicalId
      ? await db.entity.findUnique({ where: { id: canonicalId } })
      : null;
    return {
      id: canonical?.id ?? undefined,
      title: canonical?.title ?? item.title,
      type: item.entityKind ?? '',
      canonicalType: canonical?.type,
      // A private ResearchEntity is not a canonical endpoint. It remains blocked
      // until the separately authorized entity apply creates a canonical row.
      blocked:
        !decision ||
        ['DEFER', 'REJECT', 'REQUEST_MORE_CONTEXT'].includes(decision.action) ||
        !canonical,
    };
  };
  const source = await resolve(proposal.relationFromKey);
  const target = await resolve(proposal.relationToKey);
  const result = mapRelation({
    source,
    target,
    predicate: proposal.relationType?.key ?? null,
    proposition: proposal.explanation ?? '',
    quotes: proposal.evidence
      .filter((link) => link.evidence.projectId === projectId)
      .map((link) => link.evidence.quote ?? ''),
  });
  const reversed = result.source === target;
  const existingEdge =
    result.classification === 'VALID_RELATION' && source.id && target.id && proposal.relationTypeId
      ? await db.relation.findUnique({
          where: {
            fromId_relationTypeId_toId: {
              fromId: result.source.id!,
              relationTypeId: proposal.relationTypeId,
              toId: result.target.id!,
            },
          },
          select: { id: true },
        })
      : null;
  return {
    ...result,
    existingEdgeId: existingEdge?.id ?? null,
    canonicalAction: existingEdge
      ? 'ADDITIONAL_PROVENANCE_CANDIDATE'
      : result.classification === 'VALID_RELATION'
        ? 'NEW_RELATION_CANDIDATE'
        : null,
    fromKey: reversed ? proposal.relationToKey : proposal.relationFromKey,
    toKey: reversed ? proposal.relationFromKey : proposal.relationToKey,
  };
}
