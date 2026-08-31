import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const artifact = (name: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), '../../artifacts', name), 'utf8'));

describe('Batch 02 review commit artifacts', () => {
  const packet = artifact('controlled-entity-enrichment-batch-02-human-review-packet.json');
  const decisions = artifact('controlled-entity-enrichment-batch-02-human-review-decisions.json');
  const deferred = artifact('controlled-entity-enrichment-batch-02-defer-repair-plan.json');
  const promotion = artifact('controlled-entity-enrichment-batch-02-promotion-plan.json');

  it('reconciles 60 immutable V3 items with 9/18/33 human decisions', () => {
    expect(new Set(packet.items.map((item: any) => item.reviewItemId)).size).toBe(60);
    expect(decisions.items).toHaveLength(60);
    expect(
      decisions.items.reduce((counts: Record<string, number>, item: any) => {
        counts[item.humanDecision] = (counts[item.humanDecision] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({ APPROVE: 9, REJECT: 18, DEFER: 33 });
    expect(
      decisions.items.every((item: any) => item.decisionSource === 'USER_CONFIRMED_REVIEW'),
    ).toBe(true);
  });

  it('keeps deferred work private and pending', () => {
    expect(deferred.items).toHaveLength(33);
    expect(deferred.items.every((item: any) => item.status === 'PENDING')).toBe(true);
  });

  it('creates a closed non-applying promotion plan only for approved Evidence', () => {
    expect(promotion.apply).toBe(false);
    expect(promotion.items).toHaveLength(9);
    expect(promotion.items.every((item: any) => item.apply === false)).toBe(true);
    expect(promotion.knowledgeCoreMutated).toBe(false);
    expect(promotion.canonicalRelationsCreated).toBe(0);
  });

  it('keeps item 22 as a relation proposal and does not create a Relation', () => {
    const item = promotion.items.find((entry: any) => entry.reviewItemId.endsWith('22'));
    expect(item.promotionTarget).toBe('RELATION_PROPOSAL');
    expect(item.proposedAction).toBe('REVIEW_RELATION');
    expect(item.relationProposal).toMatchObject({
      targetEntity: { title: 'Paul Cézanne' },
      candidatePredicate: { key: 'INFLUENCED_BY' },
      humanReviewRequired: true,
      apply: false,
    });
  });
});
