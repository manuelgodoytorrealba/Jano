import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ReviewedEvidenceInput = {
  projectId: string;
  sourceId: string;
  excerptId: string;
  canonicalEntityId: string;
  supportQuote: string;
  proposition: string;
  dimension: string;
  reviewItemId: string;
  role: string;
  decisionSource: 'USER_CONFIRMED_REVIEW';
  originalProposition: string | null;
  originalDimension: string | null;
};

@Injectable()
export class ReviewedResearchEvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  static fingerprint(
    input: Pick<
      ReviewedEvidenceInput,
      'sourceId' | 'excerptId' | 'canonicalEntityId' | 'supportQuote' | 'proposition'
    >,
  ) {
    return createHash('sha256').update(JSON.stringify(input)).digest('hex');
  }

  async materialize(input: ReviewedEvidenceInput) {
    const [source, entity, excerpt] = await Promise.all([
      this.prisma.source.findUnique({ where: { id: input.sourceId }, select: { id: true } }),
      this.prisma.entity.findUnique({
        where: { id: input.canonicalEntityId },
        select: { id: true, title: true },
      }),
      this.prisma.libraryExcerpt.findUnique({
        where: { id: input.excerptId },
        include: { materialVersion: { select: { id: true, version: true, materialId: true } } },
      }),
    ]);
    if (!source || !entity || !excerpt)
      throw new Error(`INVALID_REVIEWED_EVIDENCE_REFERENCES:${input.reviewItemId}`);
    if (excerpt.text.indexOf(input.supportQuote) < 0)
      throw new Error(`INVALID_SUPPORT_QUOTE:${input.reviewItemId}`);

    const fingerprint = ReviewedResearchEvidenceService.fingerprint(input);
    const existing = await this.prisma.researchEvidence.findUnique({
      where: {
        projectId_sourceId_fingerprint: {
          projectId: input.projectId,
          sourceId: input.sourceId,
          fingerprint,
        },
      },
      select: { id: true },
    });
    if (existing) return { evidenceId: existing.id, created: false, fingerprint };

    await this.prisma.$transaction(async (tx) => {
      await tx.researchProjectSource.upsert({
        where: { projectId_sourceId: { projectId: input.projectId, sourceId: input.sourceId } },
        create: { projectId: input.projectId, sourceId: input.sourceId },
        update: {},
      });
      await tx.researchLibraryMaterial.upsert({
        where: {
          projectId_materialId: {
            projectId: input.projectId,
            materialId: excerpt.materialVersion.materialId,
          },
        },
        create: { projectId: input.projectId, materialId: excerpt.materialVersion.materialId },
        update: {},
      });
      await tx.researchEvidence.create({
        data: {
          projectId: input.projectId,
          sourceId: input.sourceId,
          libraryExcerptId: input.excerptId,
          sourceVersion: `material-v${excerpt.materialVersion.version}`,
          locator: excerpt.locator,
          quote: input.supportQuote,
          context: input.proposition,
          note: JSON.stringify({
            reviewItemId: input.reviewItemId,
            canonicalEntityId: input.canonicalEntityId,
            role: input.role,
            finalDimension: input.dimension,
            originalProposition: input.originalProposition,
            originalDimension: input.originalDimension,
            humanDecision: 'APPROVE',
            decisionSource: input.decisionSource,
          }),
          fingerprint,
        },
      });
    });
    const evidence = await this.prisma.researchEvidence.findUniqueOrThrow({
      where: {
        projectId_sourceId_fingerprint: {
          projectId: input.projectId,
          sourceId: input.sourceId,
          fingerprint,
        },
      },
      select: { id: true },
    });
    return { evidenceId: evidence.id, created: true, fingerprint };
  }
}
