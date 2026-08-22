import {
  discoveryBenchmark,
  evaluateDiscoveryBenchmark,
} from '../../scripts/foundational-discovery-benchmark';

describe('Foundational MVP discovery benchmark', () => {
  it('keeps a representative, meaningful discovery corpus', () => {
    expect(discoveryBenchmark).toHaveLength(65);
    expect(discoveryBenchmark.filter((item) => item.category === 'people')).toHaveLength(20);
    expect(discoveryBenchmark.filter((item) => item.category === 'works')).toHaveLength(20);
  });

  it('protects must-discover relationships without structural shortcuts', () => {
    const result = evaluateDiscoveryBenchmark();
    expect(result.directCoverage).toBeGreaterThanOrEqual(90);
    expect(result.usefulCoverage).toBeGreaterThanOrEqual(95);
    expect(result.missing).toEqual([]);
  });
});
