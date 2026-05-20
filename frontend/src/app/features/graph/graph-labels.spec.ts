import { describe, expect, it } from 'vitest';

import {
  graphEdgeLabelBudget,
  graphNodeLabelBudget,
  selectRankedGraphLabels,
} from './graph-labels';

describe('graph-labels', () => {
  it('keeps forced labels visible even when the budget is tight', () => {
    const visible = selectRankedGraphLabels([
      { id: 'center', priority: 1000, forced: true },
      { id: 'selected', priority: 900, forced: true },
      { id: 'secondary', priority: 500 },
      { id: 'tertiary', priority: 300 },
    ], 1);

    expect(visible).toEqual({
      center: true,
      selected: true,
    });
  });

  it('fills remaining label slots by descending priority', () => {
    const visible = selectRankedGraphLabels([
      { id: 'center', priority: 1000, forced: true },
      { id: 'a', priority: 400 },
      { id: 'b', priority: 650 },
      { id: 'c', priority: 280 },
    ], 3);

    expect(visible).toEqual({
      center: true,
      b: true,
      a: true,
    });
  });

  it('shrinks node label budget as the graph gets denser', () => {
    expect(graphNodeLabelBudget({ scale: 1.1, nodeCount: 8, edgeCount: 8 })).toBe(8);
    expect(graphNodeLabelBudget({ scale: 1.1, nodeCount: 32, edgeCount: 40 })).toBeLessThan(8);
  });

  it('shrinks edge label budget as relation count grows', () => {
    expect(graphEdgeLabelBudget({ scale: 1.1, edgeCount: 6 })).toBe(6);
    expect(graphEdgeLabelBudget({ scale: 1.1, edgeCount: 48 })).toBeLessThan(6);
  });
});
