import { describe, expect, it } from 'vitest';
import { buildAdminEntityDiscoverabilityModel } from './admin-entity-discoverability.presenter';

describe('admin entity discoverability presenter', () => {
  it('warns published entities below the editorial threshold', () => {
    const model = buildAdminEntityDiscoverabilityModel({
      hasLanguageBase: true,
      aliasesCount: 0,
      tagsCount: 0,
      structuredFieldCount: 1,
      contextCount: 0,
      translationCoverage: false,
      published: true,
    });
    expect(model.completedCount).toBe(2);
    expect(model.tone).toBe('weak');
    expect(model.publishWarning).toBeTruthy();
  });
});
