import { describe, expect, it } from 'vitest';
import { positionGraphTooltip } from './graph-tooltip-position';

describe('graph information card placement', () => {
  const bounds = { left: 0, top: 64, right: 640, bottom: 480 };
  it('uses the normal side when it fits and flips at the opposite edges', () => {
    expect(
      positionGraphTooltip({ x: 100, y: 100 }, { width: 280, height: 180 }, bounds),
    ).toMatchObject({ left: 118, top: 118 });
    expect(
      positionGraphTooltip({ x: 620, y: 460 }, { width: 280, height: 180 }, bounds),
    ).toMatchObject({ left: 322, top: 262 });
  });
  it('keeps all corners inside the controls and preserves space for scrolling long content', () => {
    for (const x of [0, 640])
      for (const y of [64, 480]) {
        const result = positionGraphTooltip({ x, y }, { width: 800, height: 1000 }, bounds);
        expect(result).toEqual({ left: 12, top: 76, maxWidth: 616, maxHeight: 392 });
      }
  });

  it.each([
    [0, 64],
    [320, 64],
    [640, 64],
    [0, 272],
    [640, 272],
    [0, 480],
    [320, 480],
    [640, 480],
  ])('contains a measured card at the edge (%i, %i)', (x, y) => {
    const result = positionGraphTooltip({ x, y }, { width: 280, height: 180 }, bounds);
    expect(result.left).toBeGreaterThanOrEqual(12);
    expect(result.top).toBeGreaterThanOrEqual(76);
    expect(result.left + 280).toBeLessThanOrEqual(628);
    expect(result.top + 180).toBeLessThanOrEqual(468);
  });
});
