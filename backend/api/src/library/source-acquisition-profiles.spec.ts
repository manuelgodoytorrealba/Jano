import { buildAcquisitionProfiles } from './source-acquisition-profiles';

describe('acquisition profiles', () => {
  it('aggregates access outcomes and recommends an alternative for blocked domains', () => {
    const [profile] = buildAcquisitionProfiles([
      { domain: 'blocked.test', event: true, status: 403, responseMs: 100, at: '2026-01-01' },
      { domain: 'blocked.test', event: true, status: 403, responseMs: 300, at: '2026-01-02' },
      { domain: 'blocked.test', event: true, status: 200, responseMs: 200, at: '2026-01-03' },
    ]);
    expect(profile).toMatchObject({
      attempts: 3,
      successes: 1,
      '403_count': 2,
      average_response_time: 200,
      recommended_acquisition_strategy: 'OFFICIAL_ALTERNATIVE_OR_MANUAL',
    });
  });

  it('reports knowledge yield only after every prepared item is assessed', () => {
    const records = [
      { candidate: { url: 'https://source.test/a' }, prepared: {}, effective: true },
      { candidate: { url: 'https://source.test/b' }, prepared: {} },
    ];
    expect(buildAcquisitionProfiles(records)[0].knowledge_yield_rate).toBeNull();
    expect(
      buildAcquisitionProfiles([...records.slice(0, 1), { ...records[1], effective: false }])[0]
        .knowledge_yield_rate,
    ).toBe(0.5);
  });
});
