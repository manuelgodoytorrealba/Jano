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

describe('small detail graph readability', () => {
  it('keeps glyphs legible while fitting distant nodes without moving their positions', async () => {
    const { buildRenderedGraphNodes } = await import('./graph-render');
    const nodes = buildRenderedGraphNodes({
      nodes: [{ id: 'a', label: 'Obra', slug: 'obra', type: 'ARTWORK', degree: 0 }],
      positions: { a: { x: 400, y: 0 } },
      centerId: 'a',
      selectedNodeId: 'a',
      selectedNeighbors: new Set(),
      readableScale: 0.5,
    });
    expect(nodes[0].point).toEqual({ x: 400, y: 0 });
    expect(nodes[0].transform).toBe('translate(400 0) scale(2)');
    expect(nodes[0].labelTextAnchor).toBe('middle');
  });
});
