import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KNOWLEDGE_CONTRACT_VERSIONS } from './knowledge-contract-versions';

export type SemanticCacheInput = {
  classifierVersion: string;
  model: string;
  excerptFingerprint: string;
  candidateEntityFingerprint: string;
  input: unknown;
  inputContractVersion?: string;
};

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(',')}}`;
  return JSON.stringify(value);
};

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export function semanticCacheKey(input: SemanticCacheInput) {
  const inputContractVersion =
    input.inputContractVersion ?? KNOWLEDGE_CONTRACT_VERSIONS.semanticCacheInput;
  const inputFingerprint = hash(stable(input.input));
  return {
    inputContractVersion,
    inputFingerprint,
    cacheKey: hash(
      stable({
        classifierVersion: input.classifierVersion,
        model: input.model,
        excerptFingerprint: input.excerptFingerprint,
        candidateEntityFingerprint: input.candidateEntityFingerprint,
        inputContractVersion,
        inputFingerprint,
      }),
    ),
  };
}

@Injectable()
export class SemanticResultCacheService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCompute<T extends Prisma.JsonObject>(
    input: SemanticCacheInput,
    compute: () => Promise<T>,
  ): Promise<{ result: T; status: 'CACHE_HIT' | 'CACHE_MISS' | 'CACHE_INVALIDATED' }> {
    const key = semanticCacheKey(input);
    const cached = await this.prisma.semanticResultCache.findUnique({
      where: { cacheKey: key.cacheKey },
    });
    if (cached) {
      await this.prisma.semanticResultCache.update({
        where: { id: cached.id },
        data: { hitCount: { increment: 1 }, lastHitAt: new Date() },
      });
      return { result: cached.result as T, status: 'CACHE_HIT' };
    }
    const invalidated = await this.prisma.semanticResultCache.findFirst({
      where: {
        excerptFingerprint: input.excerptFingerprint,
        candidateEntityFingerprint: input.candidateEntityFingerprint,
      },
      select: { id: true },
    });
    const result = await compute();
    await this.prisma.semanticResultCache.upsert({
      where: { cacheKey: key.cacheKey },
      create: {
        cacheKey: key.cacheKey,
        classifierVersion: input.classifierVersion,
        model: input.model,
        excerptFingerprint: input.excerptFingerprint,
        candidateEntityFingerprint: input.candidateEntityFingerprint,
        inputContractVersion: key.inputContractVersion,
        inputFingerprint: key.inputFingerprint,
        result,
      },
      update: {},
    });
    return { result, status: invalidated ? 'CACHE_INVALIDATED' : 'CACHE_MISS' };
  }
}
