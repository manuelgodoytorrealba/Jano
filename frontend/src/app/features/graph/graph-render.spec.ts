import { describe, expect, it } from 'vitest';
import { graphNodeImage } from './graph-render';

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

describe('experimental graph thumbnails', () => {
  const node = {
    id: 'image',
    label: 'Work',
    slug: 'work',
    type: 'ARTWORK',
    degree: 0,
    image: '/uploads/thumbnail-400.webp',
  };
  it('loads thumbnails from the initial view and never downloads original files', () => {
    expect(graphNodeImage(node, 0)).toBeNull();
    expect(graphNodeImage(node, 0.24)).toBe(node.image);
    expect(graphNodeImage(node, 0.45)).toBe(node.image);
    expect(graphNodeImage({ ...node, image: '/uploads/master.jpg' }, 1)).toBeNull();
    expect(graphNodeImage({ ...node, image: null }, 1)).toBeNull();
  });
  it('changes presentation without changing node position, size, scale or selection', async () => {
    const { buildRenderedGraphNodes } = await import('./graph-render');
    const options = {
      nodes: [node],
      positions: { image: { x: 100, y: 200 } },
      centerId: 'image',
      selectedNodeId: 'image',
      selectedNeighbors: new Set<string>(),
      viewportScale: 0.36,
    };
    const photo = buildRenderedGraphNodes(options)[0];
    const icon = buildRenderedGraphNodes({ ...options, imagesEnabled: false })[0];
    expect(photo.imageUrl).toBe(node.image);
    expect(icon.imageUrl).toBeNull();
    expect(icon.point).toEqual(photo.point);
    expect(icon.transform).toBe(photo.transform);
    expect(icon.size).toBe(photo.size);
    expect(icon.selected).toBe(photo.selected);
  });
});
