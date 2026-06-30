import { describe, expect, it } from 'vitest';

import { AdminLocale } from '../../../core/api/admin-entities.api';
import { AdminEntityPreviewTranslationForm } from './admin-entity-preview.presenter';
import {
  buildEntityPayload,
  buildTranslationPayload,
  createEmptyLocalizedDetailsForm,
} from './admin-entity-content.presenter';

describe('admin-entity-content presenter', () => {
  it('builds the persisted entity fields from the canonical Spanish draft', () => {
    const translations: Record<AdminLocale, AdminEntityPreviewTranslationForm> = {
      es: {
        title: '  Guernica  ',
        shortDescription: '  Una denuncia contra la guerra  ',
        essay: '  Ensayo editorial  ',
        notes: '',
        excerpt: '',
      },
      en: {
        title: 'Guernica',
        shortDescription: 'An indictment of war',
        essay: 'Editorial essay',
        notes: '',
        excerpt: '',
      },
    };

    expect(
      buildEntityPayload(
        {
          type: 'ARTWORK',
          title: 'Legacy title',
          slug: '  guernica  ',
          summary: 'Legacy summary',
          content: 'Legacy content',
          contentLevel: 'INTERMEDIATE',
          status: 'PUBLISHED',
          startYear: '1937',
          endYear: '',
        },
        translations,
      ),
    ).toEqual({
      type: 'ARTWORK',
      title: 'Guernica',
      slug: 'guernica',
      summary: 'Una denuncia contra la guerra',
      content: 'Ensayo editorial',
      contentLevel: 'INTERMEDIATE',
      status: 'PUBLISHED',
      startYear: 1937,
      endYear: undefined,
    });
  });

  it('builds a trimmed translation payload with localized details', () => {
    const translations: Record<AdminLocale, AdminEntityPreviewTranslationForm> = {
      es: { title: 'Guernica', shortDescription: '', essay: '', notes: '', excerpt: '' },
      en: {
        title: '  Guernica  ',
        shortDescription: '  An indictment of war  ',
        essay: '  Editorial essay  ',
        notes: '',
        excerpt: '',
      },
    };
    const englishDetails = { ...createEmptyLocalizedDetailsForm(), technique: '  Oil on canvas  ' };

    expect(
      buildTranslationPayload(
        'en',
        translations,
        {},
        { es: createEmptyLocalizedDetailsForm(), en: englishDetails },
        (value) => (value == null || value === '' ? null : Number(value)),
      ),
    ).toEqual({
      title: 'Guernica',
      shortDescription: 'An indictment of war',
      essay: 'Editorial essay',
      notes: null,
      excerpt: null,
      details: { technique: 'Oil on canvas', birthYear: null, deathYear: null },
    });
  });
});
