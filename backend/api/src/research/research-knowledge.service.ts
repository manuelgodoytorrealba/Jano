import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ResearchClaimKind,
  ResearchClaimStatus,
  ResearchProposalReviewState,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ResearchKnowledgeFocusType } from './dto/research-knowledge.query';

const researchSourceSelect = {
  id: true,
  type: true,
  title: true,
  author: true,
  publisher: true,
  year: true,
  url: true,
} satisfies Prisma.SourceSelect;

export const researchKnowledgeEntitySelect = {
  id: true,
  projectId: true,
  canonicalEntityId: true,
  kind: true,
  title: true,
  aliases: true,
  summary: true,
  confidence: true,
  mentionCount: true,
  reviewState: true,
  createdAt: true,
  updatedAt: true,
};

export const researchKnowledgeClaimSelect = {
  id: true,
  projectId: true,
  kind: true,
  title: true,
  summary: true,
  subjectClaimId: true,
  objectClaimId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export const researchKnowledgeEvidenceSelect = {
  id: true,
  projectId: true,
  sourceId: true,
  libraryExcerptId: true,
  sourceVersion: true,
  locator: true,
  quote: true,
  context: true,
  note: true,
  fingerprint: true,
  createdAt: true,
  updatedAt: true,
};

export const researchEvidenceTraceInclude = {
  source: { select: researchSourceSelect },
  libraryExcerpt: {
    select: {
      id: true,
      locator: true,
      text: true,
      materialVersion: {
        select: {
          id: true,
          version: true,
          material: { select: { id: true, title: true, source: { select: researchSourceSelect } } },
        },
      },
    },
  },
} satisfies Prisma.ResearchEvidenceInclude;

export function presentKnowledgeEvidence<T extends object>(evidence: T, loaded = true) {
  return {
    ...evidence,
    excerptStatus: loaded
      ? (evidence as { libraryExcerpt?: unknown }).libraryExcerpt
        ? 'AVAILABLE'
        : 'UNAVAILABLE'
      : 'NOT_LOADED',
  };
}

export const sortKnowledgeById = <T extends { id: string }>(items: T[]) =>
  [...items].sort((left, right) => left.id.localeCompare(right.id));

@Injectable()
export class ResearchKnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  relationInclude(projectId: string) {
    return {
      fromEntity: { select: researchKnowledgeEntitySelect },
      toEntity: { select: researchKnowledgeEntitySelect },
      relationType: { select: { id: true, key: true, label: true } },
      claims: {
        where: { claim: { projectId } },
        include: { claim: { select: researchKnowledgeClaimSelect } },
      },
    };
  }

  response<T extends Record<string, unknown>>(projectId: string, scope: string, data: T) {
    return { projectId, scope, focus: null, ...data };
  }

  async topology(projectId: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        entities: { select: researchKnowledgeEntitySelect, orderBy: { id: 'asc' as const } },
        relations: {
          include: this.relationInclude(projectId),
          orderBy: { id: 'asc' as const },
        },
      },
    });
    if (!project) throw new NotFoundException('Research project not found');

    const researchEntityByCanonicalId = new Map(
      project.entities
        .filter((entity) => entity.canonicalEntityId)
        .map((entity) => [entity.canonicalEntityId!, entity]),
    );
    const canonicalEntityIds = [...researchEntityByCanonicalId.keys()];
    const canonicalRelations =
      canonicalEntityIds.length > 1
        ? await this.prisma.relation.findMany({
            where: { fromId: { in: canonicalEntityIds }, toId: { in: canonicalEntityIds } },
            select: {
              id: true,
              fromId: true,
              toId: true,
              relationTypeId: true,
              relationType: { select: { id: true, key: true, label: true } },
              justification: true,
              confidence: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { id: 'asc' },
          })
        : [];
    const researchRelationKeys = new Set(
      project.relations.map(
        (relation) =>
          `${relation.fromEntityId}:${relation.toEntityId}:${relation.relationTypeId ?? ''}`,
      ),
    );
    const projectedCanonicalRelations = canonicalRelations.flatMap((relation) => {
      const fromEntity = researchEntityByCanonicalId.get(relation.fromId);
      const toEntity = researchEntityByCanonicalId.get(relation.toId);
      if (!fromEntity || !toEntity) return [];
      const key = `${fromEntity.id}:${toEntity.id}:${relation.relationTypeId}`;
      if (researchRelationKeys.has(key)) return [];
      return [
        {
          id: `core:${relation.id}`,
          canonicalRelationId: relation.id,
          origin: 'KNOWLEDGE_CORE' as const,
          canonicalStatus: relation.status,
          projectId,
          fromEntityId: fromEntity.id,
          toEntityId: toEntity.id,
          fromEntity,
          toEntity,
          relationTypeId: relation.relationTypeId,
          relationType: relation.relationType,
          explanation: relation.justification,
          confidence: relation.confidence,
          reviewState:
            relation.status === 'PUBLISHED'
              ? ResearchProposalReviewState.REVIEWED
              : ResearchProposalReviewState.PENDING,
          claims: [],
          createdAt: relation.createdAt,
          updatedAt: relation.updatedAt,
        },
      ];
    });

    return {
      projectId: project.id,
      scope: 'topology' as const,
      focus: null,
      expansions: { claims: 'SUMMARY', evidence: 'NOT_LOADED', traceability: 'NOT_LOADED' },
      entities: sortKnowledgeById(project.entities),
      relations: sortKnowledgeById([
        ...project.relations.map((relation) => ({ ...relation, origin: 'RESEARCH' as const })),
        ...projectedCanonicalRelations,
      ]),
      claims: [],
      contradictions: [],
      supportingEvidence: [],
    };
  }
  async complete(projectId: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        entities: {
          select: {
            ...researchKnowledgeEntitySelect,
            evidence: {
              where: { evidence: { projectId } },
              include: { evidence: { include: researchEvidenceTraceInclude } },
            },
          },
          orderBy: { id: 'asc' },
        },
        relations: { include: this.relationInclude(projectId), orderBy: { id: 'asc' } },
        claims: {
          select: {
            ...researchKnowledgeClaimSelect,
            evidence: {
              where: { evidence: { projectId } },
              include: { evidence: { include: researchEvidenceTraceInclude } },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Research project not found');

    const entities = project.entities.map((entity) => ({
      ...entity,
      evidence: entity.evidence.map((item) => ({
        ...item,
        evidence: presentKnowledgeEvidence(item.evidence),
      })),
    }));
    const claims = project.claims.map((claim) => ({
      ...claim,
      evidence: claim.evidence.map((item) => ({
        ...item,
        evidence: presentKnowledgeEvidence(item.evidence),
      })),
    }));
    return this.response(project.id, 'complete', {
      expansions: { claims: 'LOADED', evidence: 'LOADED', traceability: 'LOADED' },
      entities,
      relations: project.relations,
      claims,
      contradictions: claims.filter(
        (claim) =>
          claim.kind === ResearchClaimKind.CONTRADICTION ||
          claim.status === ResearchClaimStatus.CONTRADICTED,
      ),
      supportingEvidence: sortKnowledgeById(
        claims
          .flatMap((claim) => claim.evidence.map((item) => item.evidence))
          .filter(
            (evidence, index, all) => all.findIndex((item) => item.id === evidence.id) === index,
          ),
      ),
    });
  }

  async focus(projectId: string, focus: { type: ResearchKnowledgeFocusType; id: string }) {
    const relationWhere =
      focus.type === 'entity'
        ? { OR: [{ fromEntityId: focus.id }, { toEntityId: focus.id }] }
        : focus.type === 'relation'
          ? { id: focus.id }
          : focus.type === 'claim'
            ? { claims: { some: { claimId: focus.id } } }
            : { claims: { some: { claim: { evidence: { some: { evidenceId: focus.id } } } } } };
    const claimWhere =
      focus.type === 'entity'
        ? { relations: { some: { relation: relationWhere } } }
        : focus.type === 'relation'
          ? { relations: { some: { relationId: focus.id } } }
          : focus.type === 'claim'
            ? { id: focus.id }
            : { evidence: { some: { evidenceId: focus.id } } };
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        entities: {
          where: focus.type === 'entity' ? { id: focus.id } : { id: { in: [] } },
          select: researchKnowledgeEntitySelect,
        },
        relations: {
          where: relationWhere,
          include: this.relationInclude(projectId),
          orderBy: { id: 'asc' },
        },
        claims: { where: claimWhere, select: researchKnowledgeClaimSelect, orderBy: { id: 'asc' } },
        evidence: {
          where: focus.type === 'evidence' ? { id: focus.id } : { id: { in: [] } },
          select: researchKnowledgeEvidenceSelect,
        },
      },
    });
    if (!project) throw new NotFoundException('Research project not found');
    const focused =
      focus.type === 'entity'
        ? project.entities[0]
        : focus.type === 'relation'
          ? project.relations.find((item) => item.id === focus.id)
          : focus.type === 'claim'
            ? project.claims[0]
            : project.evidence[0];
    if (!focused) throw new NotFoundException('Research Knowledge focus not found');

    const relations = project.relations;
    const entities = sortKnowledgeById(
      [
        ...project.entities,
        ...relations.flatMap((relation) => [relation.fromEntity, relation.toEntity]),
      ].filter((entity, index, all) => all.findIndex((item) => item.id === entity.id) === index),
    );
    const claims = sortKnowledgeById(
      [
        ...project.claims,
        ...relations.flatMap((relation) => relation.claims.map((item) => item.claim)),
      ].filter((claim, index, all) => all.findIndex((item) => item.id === claim.id) === index),
    );
    return this.response(project.id, 'focus', {
      focus,
      expansions: {
        claims: 'SUMMARY',
        evidence: focus.type === 'evidence' ? 'SUMMARY' : 'NOT_LOADED',
        traceability: 'NOT_LOADED',
      },
      entities,
      relations,
      claims,
      contradictions: claims.filter(
        (claim) =>
          claim.kind === ResearchClaimKind.CONTRADICTION ||
          claim.status === ResearchClaimStatus.CONTRADICTED,
      ),
      supportingEvidence: project.evidence.map((evidence) =>
        presentKnowledgeEvidence(evidence, false),
      ),
    });
  }

  async traceability(projectId: string, focus: { type: ResearchKnowledgeFocusType; id: string }) {
    const relationWhere =
      focus.type === 'entity'
        ? { OR: [{ fromEntityId: focus.id }, { toEntityId: focus.id }] }
        : focus.type === 'relation'
          ? { id: focus.id }
          : focus.type === 'claim'
            ? { claims: { some: { claimId: focus.id } } }
            : { claims: { some: { claim: { evidence: { some: { evidenceId: focus.id } } } } } };
    const claimWhere =
      focus.type === 'entity'
        ? { relations: { some: { relation: relationWhere } } }
        : focus.type === 'relation'
          ? { relations: { some: { relationId: focus.id } } }
          : focus.type === 'claim'
            ? { id: focus.id }
            : { evidence: { some: { evidenceId: focus.id } } };
    const evidenceWhere =
      focus.type === 'evidence'
        ? { evidenceId: focus.id, evidence: { projectId } }
        : { evidence: { projectId } };
    const relationInclude = {
      fromEntity: { select: researchKnowledgeEntitySelect },
      toEntity: { select: researchKnowledgeEntitySelect },
      claims: {
        where: { claim: { projectId } },
        include: {
          claim: {
            select: {
              ...researchKnowledgeClaimSelect,
              evidence: {
                where: evidenceWhere,
                include: { evidence: { include: researchEvidenceTraceInclude } },
              },
            },
          },
        },
      },
    };
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        entities: {
          where: focus.type === 'entity' ? { id: focus.id } : { id: { in: [] } },
          select: {
            ...researchKnowledgeEntitySelect,
            evidence: {
              where: { evidence: { projectId } },
              include: { evidence: { include: researchEvidenceTraceInclude } },
            },
          },
        },
        relations: { where: relationWhere, include: relationInclude, orderBy: { id: 'asc' } },
        claims: {
          where: claimWhere,
          select: {
            ...researchKnowledgeClaimSelect,
            evidence: {
              where: evidenceWhere,
              include: { evidence: { include: researchEvidenceTraceInclude } },
            },
          },
          orderBy: { id: 'asc' },
        },
        evidence: {
          where: focus.type === 'evidence' ? { id: focus.id } : { id: { in: [] } },
          include: researchEvidenceTraceInclude,
        },
      },
    });
    if (!project) throw new NotFoundException('Research project not found');
    const focused =
      focus.type === 'entity'
        ? project.entities[0]
        : focus.type === 'relation'
          ? project.relations.find((item) => item.id === focus.id)
          : focus.type === 'claim'
            ? project.claims[0]
            : project.evidence[0];
    if (!focused) throw new NotFoundException('Research Knowledge focus not found');

    const entities = sortKnowledgeById(
      [
        ...project.entities.map((entity) => ({
          ...entity,
          evidence: entity.evidence.map((item) => ({
            ...item,
            evidence: presentKnowledgeEvidence(item.evidence),
          })),
        })),
        ...project.relations.flatMap((relation) => [relation.fromEntity, relation.toEntity]),
      ].filter((entity, index, all) => all.findIndex((item) => item.id === entity.id) === index),
    );
    const claims = sortKnowledgeById(
      [
        ...project.claims,
        ...project.relations.flatMap((relation) => relation.claims.map((item) => item.claim)),
      ]
        .map((claim) => ({
          ...claim,
          evidence: claim.evidence.map((item) => ({
            ...item,
            evidence: presentKnowledgeEvidence(item.evidence),
          })),
        }))
        .filter((claim, index, all) => all.findIndex((item) => item.id === claim.id) === index),
    );
    const supportingEvidence = sortKnowledgeById(
      [
        ...project.evidence.map((evidence) => presentKnowledgeEvidence(evidence)),
        ...claims.flatMap((claim) => claim.evidence.map((item) => item.evidence)),
      ].filter(
        (evidence, index, all) => all.findIndex((item) => item.id === evidence.id) === index,
      ),
    );
    return this.response(project.id, 'traceability', {
      focus,
      expansions: { claims: 'LOADED', evidence: 'LOADED', traceability: 'LOADED' },
      entities,
      relations: project.relations,
      claims,
      contradictions: claims.filter(
        (claim) =>
          claim.kind === ResearchClaimKind.CONTRADICTION ||
          claim.status === ResearchClaimStatus.CONTRADICTED,
      ),
      supportingEvidence,
    });
  }
}
