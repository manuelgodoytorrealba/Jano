import { describe, expect, it } from 'vitest';
import { entryAnimationProgress, spatialEntryEase } from './explorer-3d-scene';

describe('explorer 3d entry animation', () => {
  it('spreads from the center with a bounded, distance-based stagger', () => {
    expect(entryAnimationProgress(0, 0)).toBe(0);
    expect(entryAnimationProgress(0, 2)).toBe(0);
    expect(entryAnimationProgress(720, 0)).toBe(1);
    expect(entryAnimationProgress(816, 2)).toBe(1);
  });

  it('uses a smooth bounded ease for the spatial unfold', () => {
    expect(spatialEntryEase(0)).toBe(0);
    expect(spatialEntryEase(0.25)).toBeGreaterThan(0.65);
    expect(spatialEntryEase(1)).toBe(1);
    expect(spatialEntryEase(2)).toBe(1);
  });
});
