import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AssertionDeduplication =
  | 'NEW_KNOWLEDGE'
  | 'EXACT_DUPLICATE'
  | 'SEMANTIC_DUPLICATE'
  | 'PARTIAL_OVERLAP'
  | 'ADDITIONAL_PROVENANCE'
  | 'CONFLICTING_KNOWLEDGE'
  | 'AMBIGUOUS';

export const normalizeAssertion = (value: string) =>
  value
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

export const assertionFingerprint = (value: string) =>
  createHash('sha256').update(normalizeAssertion(value)).digest('hex');

const tokens = (value: string) => new Set(normalizeAssertion(value).split(' ').filter(Boolean));

export function classifyAssertion(
  proposition: string,
  existing: Array<{ proposition: string; normalizedFingerprint: string }>,
  options: { sameProvenance?: boolean; conflict?: boolean } = {},
): AssertionDeduplication {
  if (options.conflict) return 'CONFLICTING_KNOWLEDGE';
  const fingerprint = assertionFingerprint(proposition);
  if (existing.some((item) => item.normalizedFingerprint === fingerprint))
    return options.sameProvenance ? 'EXACT_DUPLICATE' : 'ADDITIONAL_PROVENANCE';
  const incoming = tokens(proposition);
  for (const item of existing) {
    const prior = tokens(item.proposition);
    const overlap = [...incoming].filter((token) => prior.has(token)).length;
    const ratio = overlap / Math.max(1, Math.min(incoming.size, prior.size));
    if (ratio === 1) return 'SEMANTIC_DUPLICATE';
    if (ratio >= 0.7) return 'PARTIAL_OVERLAP';
  }
  return existing.length ? 'AMBIGUOUS' : 'NEW_KNOWLEDGE';
}

@Injectable()
export class CanonicalAssertionService {
  constructor(private readonly prisma: PrismaService) {}

  async add(input: {
    entityId: string;
    dimension: string;
    proposition: string;
    sourceRefId: string;
    citationId?: string;
    qualifiers?: Prisma.InputJsonValue;
  }) {
    const normalizedFingerprint = assertionFingerprint(input.proposition);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.canonicalAssertion.findUnique({
        where: {
          entityId_dimension_normalizedFingerprint: {
            entityId: input.entityId,
            dimension: input.dimension,
            normalizedFingerprint,
          },
        },
        include: { sourceRefs: { where: { sourceRefId: input.sourceRefId } } },
      });
      const assertion =
        existing ??
        (await tx.canonicalAssertion.create({
          data: {
            entityId: input.entityId,
            dimension: input.dimension,
            proposition: input.proposition.trim(),
            normalizedFingerprint,
            qualifiers: input.qualifiers,
          },
        }));
      await tx.canonicalAssertionSourceRef.upsert({
        where: {
          assertionId_sourceRefId: { assertionId: assertion.id, sourceRefId: input.sourceRefId },
        },
        create: { assertionId: assertion.id, sourceRefId: input.sourceRefId },
        update: {},
      });
      if (input.citationId)
        await tx.citation.update({
          where: { id: input.citationId },
          data: { canonicalAssertionId: assertion.id },
        });
      return {
        assertionId: assertion.id,
        classification: existing
          ? existing.sourceRefs.length
            ? ('EXACT_DUPLICATE' as const)
            : ('ADDITIONAL_PROVENANCE' as const)
          : ('NEW_KNOWLEDGE' as const),
      };
    });
  }
}
