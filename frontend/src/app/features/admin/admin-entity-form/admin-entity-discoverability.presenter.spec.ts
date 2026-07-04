import { describe, expect, it } from 'vitest';
import { buildAdminEntityDiscoverabilityModel } from './admin-entity-discoverability.presenter';
import { buildAdminEntityPublicationChecks } from './admin-entity-preview.presenter';

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

describe('admin entity publication review', () => {
  it('guides publication without treating missing signals as blockers', () => {
    const checks = buildAdminEntityPublicationChecks({
      hasTitle: true,
      hasNarrative: true,
      mediaCount: 1,
      sourcesCount: 0,
      relationsCount: 2,
      translationCount: 1,
      totalTranslations: 2,
    });

    expect(checks.filter((check) => check.done).map((check) => check.label)).toEqual([
      'Contenido',
      'Media',
      'Relaciones',
    ]);
    expect(checks).toHaveLength(5);
  });
});
