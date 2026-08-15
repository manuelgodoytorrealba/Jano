import { describe, expect, it } from 'vitest';
import { graphTooltipStyle } from './graph-render';

describe('graph tooltip positioning', () => {
  it('converts pointer coordinates to the graph stage coordinate space', () => {
    const host = {
      getBoundingClientRect: () => ({ left: 120, top: 210 }),
    } as HTMLElement;

    expect(
      graphTooltipStyle({ kind: 'node', x: 640, y: 480, title: 'Obra', subtitle: 'ARTWORK' }, host),
    ).toEqual({ left: '538px', top: '288px' });
  });
});
