import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { GraphComponent } from './graph.component';
import { GraphData } from './graph.models';

describe('graph node zoom reference', () => {
  function setup() {
    const size = signal({ width: 0, height: 0 });
    const fitScale = signal<number | null>(null);
    const graph: GraphData = {
      centerId: 'center',
      nodes: ['center', 'top', 'bottom'].map((id) => ({
        id,
        label: id,
        slug: id,
        type: 'ARTWORK',
        degree: 1,
        image: `/uploads/${id}/graph-thumbnail.webp`,
      })),
      edges: [],
      entityTypes: ['ARTWORK'],
      relationTypes: [],
    };
    const component = {
      graph: () => graph,
      graphNodeFitScale: fitScale,
      currentGraphStageSize: size,
      positions: { center: { x: 0, y: 0 }, top: { x: 0, y: -450 }, bottom: { x: 0, y: 450 } },
      graphDerived: () => ({ filteredNodes: graph.nodes }),
      nodeHaloSize: () => 40,
      detailLayout: true,
      isMobileViewport: false,
      overviewMode: false,
    } as unknown as GraphComponent;
    const fit = () => GraphComponent.prototype['createFittedGraphViewport'].call(component);
    return { size, fitScale, fit };
  }

  it('waits for a measured graph and keeps the initial reference during resize or reset', () => {
    const { size, fitScale, fit } = setup();
    expect(fit()).toBeNull();
    expect(fitScale()).toBeNull();
    size.set({ width: 800, height: 500 });
    const initial = fit()!;
    expect(fitScale()).toBe(initial.scale);
    size.set({ width: 1500, height: 1000 });
    expect(fit()!.scale).toBeGreaterThan(initial.scale);
    expect(fitScale()).toBe(initial.scale);
    size.set({ width: 800, height: 500 });
    expect(fit()!.scale).toBe(initial.scale);
    expect(fitScale()).toBe(initial.scale);
  });
});
