import { createHash } from 'node:crypto';
import { ResearchJobType } from '@prisma/client';

const fingerprint = (parts: Array<string | null | undefined>) =>
  createHash('sha256')
    .update(parts.map((value) => value ?? '').join('\u001f'))
    .digest('hex');

export function researchJobFingerprint(input: {
  projectId: string;
  type: ResearchJobType;
  sourceId?: string;
  materialVersionId?: string;
  contextFingerprint?: string;
}) {
  return fingerprint([
    input.projectId,
    input.sourceId ?? input.materialVersionId ?? input.contextFingerprint,
    input.type,
  ]);
}

export function researchEvidenceFingerprint(input: {
  sourceId: string;
  sourceVersion: string;
  locator: string;
  quote: string | null;
  context: string | null;
  note: string | null;
  libraryExcerptId?: string;
}) {
  return fingerprint([
    input.sourceId,
    input.sourceVersion,
    input.locator,
    input.quote,
    input.context,
    input.note,
    input.libraryExcerptId,
  ]);
}

export function researchAnalysisContextFingerprint(context: unknown) {
  return createHash('sha256').update(JSON.stringify(context)).digest('hex');
}
