import { ResearchJobType } from '@prisma/client';
import {
  researchAnalysisContextFingerprint,
  researchEvidenceFingerprint,
  researchJobFingerprint,
} from './research-fingerprints';

describe('research fingerprints', () => {
  it('is stable for identical job inputs and separates source jobs', () => {
    const base = { projectId: 'project', type: ResearchJobType.PREPARE_SOURCE };
    expect(researchJobFingerprint({ ...base, sourceId: 'source-a' })).toBe(
      researchJobFingerprint({ ...base, sourceId: 'source-a' }),
    );
    expect(researchJobFingerprint({ ...base, sourceId: 'source-a' })).not.toBe(
      researchJobFingerprint({ ...base, sourceId: 'source-b' }),
    );
  });

  it('preserves empty evidence fields while separating material excerpts', () => {
    const base = {
      sourceId: 'source',
      sourceVersion: 'v1',
      locator: 'p. 1',
      quote: null,
      context: null,
      note: null,
    };
    expect(researchEvidenceFingerprint(base)).not.toBe(
      researchEvidenceFingerprint({ ...base, libraryExcerptId: 'excerpt' }),
    );
  });

  it('tracks changes to the analysis context', () => {
    expect(researchAnalysisContextFingerprint({ versions: ['a'] })).not.toBe(
      researchAnalysisContextFingerprint({ versions: ['b'] }),
    );
  });
});
