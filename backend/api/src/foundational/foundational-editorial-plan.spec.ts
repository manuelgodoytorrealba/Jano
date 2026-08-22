import { foundationalV1TierAEssayPlan } from '../../prisma/editorial/foundational-v1-tier-a-essay-plan';

describe('Foundational Tier A editorial plan', () => {
  it('keeps an explicit editorial decision for every Tier A entity', () => {
    const plan = foundationalV1TierAEssayPlan();

    expect(plan).toHaveLength(128);
    expect(plan.filter((item) => item.eligibility === 'YES')).toHaveLength(10);
    expect(plan.filter((item) => item.eligibility === 'MAYBE')).toHaveLength(28);
    expect(plan.filter((item) => item.eligibility === 'NO')).toHaveLength(90);
    expect(plan.every((item) => item.question && item.reason)).toBe(true);
  });
});
