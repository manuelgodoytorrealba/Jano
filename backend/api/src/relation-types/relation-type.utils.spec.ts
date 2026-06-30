import {
  canonicalRelationDirected,
  canonicalRelationKey,
  canonicalRelationTypeFilter,
} from './relation-type.utils';

describe('relation type identity', () => {
  it('uses RelationType as the only relation identity', () => {
    const relation = {
      relationType: { key: 'RELATED_TO', directed: false },
    };

    expect(canonicalRelationKey(relation)).toBe('RELATED_TO');
    expect(canonicalRelationDirected(relation)).toBe(false);
    expect(canonicalRelationTypeFilter(['RELATED_TO'])).toEqual({
      relationType: { key: { in: ['RELATED_TO'] } },
    });
  });
});
