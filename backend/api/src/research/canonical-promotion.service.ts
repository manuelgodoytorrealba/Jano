import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertionFingerprint } from '../knowledge/canonical-assertion.service';
import { TargetStatus } from '../knowledge/entity-target-router';

export type CanonicalPromotionOperation = {
  kind: 'ASSERTION' | 'PROVENANCE_RELATION' | 'PROVENANCE_ENTITY' | 'RELATION';
  entityId: string;
  sourceId: string;
  evidenceId: string;
  excerptId: string;
  quote: string;
  proposition: string;
  dimension: string;
  targetRelationId?: string;
  relationTypeId?: string;
  targetEntityId?: string;
  relationJustification?: string;
  targetStatus?: TargetStatus;
};

@Injectable()
export class CanonicalPromotionService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(operations: CanonicalPromotionOperation[]) {
    return this.prisma.$transaction(async (tx) => {
      const results: any[] = [];
      for (const operation of operations) {
        if (
          operation.targetStatus &&
          !['TARGET_CONFIRMED', 'MULTI_ENTITY_VALID'].includes(operation.targetStatus)
        )
          throw new Error(`TARGETING_GATE_BLOCKED:${operation.targetStatus}`);
        const evidence = await tx.researchEvidence.findUnique({
          where: { id: operation.evidenceId },
          select: { id: true, sourceId: true, libraryExcerptId: true },
        });
        if (
          !evidence ||
          evidence.sourceId !== operation.sourceId ||
          evidence.libraryExcerptId !== operation.excerptId
        )
          throw new Error(`EVIDENCE_PROVENANCE_MISMATCH:${operation.evidenceId}`);
        const sourceRef =
          operation.kind === 'PROVENANCE_RELATION'
            ? await tx.sourceRef.findFirst({
                where: { entityId: operation.entityId, sourceId: operation.sourceId },
                orderBy: { id: 'asc' },
                select: { id: true },
              })
            : operation.kind === 'ASSERTION'
              ? await tx.sourceRef.findFirst({
                  where: {
                    entityId: operation.entityId,
                    sourceId: operation.sourceId,
                    quote: operation.quote,
                  },
                  select: { id: true },
                })
              : null;
        let sourceRefId = sourceRef?.id ?? null;
        if (!sourceRefId && operation.kind === 'ASSERTION') {
          sourceRefId = (
            await tx.sourceRef.create({
              data: {
                entityId: operation.entityId,
                sourceId: operation.sourceId,
                page: (
                  await tx.libraryExcerpt.findUniqueOrThrow({
                    where: { id: operation.excerptId },
                    select: { locator: true },
                  })
                ).locator,
                quote: operation.quote,
                note: `[${operation.dimension}] ${operation.proposition}`,
              },
              select: { id: true },
            })
          ).id;
        }
        let relationId = operation.targetRelationId ?? null;
        let action = sourceRef
          ? 'PROVENANCE_REUSED'
          : operation.kind === 'PROVENANCE_ENTITY'
            ? 'PROVENANCE_ATTACHED'
            : 'ASSERTION_CREATED';
        if (operation.kind === 'RELATION') {
          const existing = await tx.relation.findFirst({
            where: {
              fromId: operation.entityId,
              toId: operation.targetEntityId,
              relationTypeId: operation.relationTypeId,
            },
            select: { id: true },
          });
          if (existing) relationId = existing.id;
          else {
            try {
              relationId = (
                await tx.relation.create({
                  data: {
                    fromId: operation.entityId,
                    toId: operation.targetEntityId!,
                    relationTypeId: operation.relationTypeId!,
                    status: 'PUBLISHED',
                    justification: operation.relationJustification ?? operation.proposition,
                    confidence: 1,
                  },
                  select: { id: true },
                })
              ).id;
            } catch (error) {
              if ((error as { code?: unknown }).code !== 'P2002') throw error;
              relationId = (
                await tx.relation.findUniqueOrThrow({
                  where: {
                    fromId_relationTypeId_toId: {
                      fromId: operation.entityId,
                      relationTypeId: operation.relationTypeId!,
                      toId: operation.targetEntityId!,
                    },
                  },
                  select: { id: true },
                })
              ).id;
            }
          }
          action = existing ? 'RELATION_ALREADY_PRESENT' : 'RELATION_CREATED';
        }
        const citationWhere =
          operation.kind === 'PROVENANCE_RELATION' || operation.kind === 'RELATION'
            ? { relationId }
            : { entityId: operation.entityId };
        const citation = await tx.citation.findFirst({
          where: {
            sourceId: operation.sourceId,
            researchEvidenceId: operation.evidenceId,
            quote: operation.quote,
            ...citationWhere,
          },
          select: { id: true },
        });
        const citationId =
          citation?.id ??
          (
            await tx.citation.create({
              data: {
                sourceId: operation.sourceId,
                researchEvidenceId: operation.evidenceId,
                stance: 'SUPPORTS',
                locator: (
                  await tx.libraryExcerpt.findUniqueOrThrow({
                    where: { id: operation.excerptId },
                    select: { locator: true },
                  })
                ).locator,
                quote: operation.quote,
                note: `[${operation.dimension}] ${operation.proposition}`,
                ...(relationId ? { relationId } : { entityId: operation.entityId }),
              },
              select: { id: true },
            })
          ).id;
        let assertionId: string | null = null;
        if (operation.kind === 'ASSERTION') {
          const assertion = await tx.canonicalAssertion.upsert({
            where: {
              entityId_dimension_normalizedFingerprint: {
                entityId: operation.entityId,
                dimension: operation.dimension,
                normalizedFingerprint: assertionFingerprint(operation.proposition),
              },
            },
            create: {
              entityId: operation.entityId,
              dimension: operation.dimension,
              proposition: operation.proposition,
              normalizedFingerprint: assertionFingerprint(operation.proposition),
            },
            update: {},
            select: { id: true },
          });
          assertionId = assertion.id;
          await tx.canonicalAssertionSourceRef.upsert({
            where: {
              assertionId_sourceRefId: {
                assertionId,
                sourceRefId: sourceRefId!,
              },
            },
            create: { assertionId, sourceRefId: sourceRefId! },
            update: {},
          });
          await tx.citation.update({
            where: { id: citationId },
            data: { canonicalAssertionId: assertionId },
          });
        }
        results.push({
          kind: operation.kind,
          entityId: operation.entityId,
          relationId,
          sourceRefId,
          citationId,
          assertionId,
          action,
          citationCreated: !citation,
        });
      }
      return results;
    });
  }
}
