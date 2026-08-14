import { describe, expect, it } from 'vitest';
import { entryAnimationProgress } from './explorer-3d-scene';

describe('explorer 3d entry animation', () => {
  it('spreads from the center with a bounded, distance-based stagger', () => {
    expect(entryAnimationProgress(0, 0)).toBe(0);
    expect(entryAnimationProgress(0, 2)).toBe(0);
    expect(entryAnimationProgress(560, 0)).toBe(1);
    expect(entryAnimationProgress(604, 2)).toBe(1);
  });
});
