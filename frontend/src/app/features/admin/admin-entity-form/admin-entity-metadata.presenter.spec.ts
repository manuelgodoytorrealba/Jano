import { describe, expect, it } from 'vitest';
import { buildContributorPayload, buildSourceRefPayload } from './admin-entity-metadata.presenter';

describe('admin-entity-metadata presenter', () => {
  it('validates and trims source and contributor payloads', () => {
    expect(
      buildSourceRefPayload({ sourceTitleEs: '  Ways of Seeing  ', sourceYear: 1972 }, (value) =>
        Number(value),
      ).payload,
    ).toMatchObject({ sourceTitle: 'Ways of Seeing', sourceYear: 1972 });

    expect(
      buildContributorPayload({ name: '  John Berger  ', role: '  Author  ', note: '  Essay  ' }),
    ).toEqual({
      payload: { name: 'John Berger', role: 'Author', note: 'Essay' },
      error: null,
    });
  });
});
