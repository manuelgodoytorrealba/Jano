import { describe, expect, it } from 'vitest';
import {
  buildCreateRelationPayload,
  createEmptyRelationDraft,
} from './admin-entity-relations.presenter';

describe('admin-entity-relations presenter', () => {
  it('uses the preferred relation type and trims the mutation payload', () => {
    const draft = createEmptyRelationDraft([
      {
        id: 'type-1',
        key: 'RELATED_TO',
        label: 'Related to',
        directed: false,
        isActive: true,
        sortOrder: 0,
      },
    ]);

    expect(
      buildCreateRelationPayload({
        ...draft,
        toId: 'entity-2',
        justificationEs: '  Contexto editorial  ',
      }),
    ).toEqual({
      toId: 'entity-2',
      type: 'RELATED_TO',
      relationTypeId: 'type-1',
      justificationEs: 'Contexto editorial',
      justificationEn: undefined,
      status: 'PUBLISHED',
      confidence: null,
      validFromYear: null,
      validToYear: null,
    });
  });
});
