import { describe, expect, it, vi } from 'vitest';
import { GraphComponent } from './graph.component';

describe('mobile detail viewer', () => {
  it('closes the embedded viewer instead of requesting nested browser fullscreen', async () => {
    const emit = vi.fn();
    const state = {
      detailLayout: true,
      isMobileViewport: true,
      workspaceFocused: true,
      workspaceFocusToggle: { emit },
    } as unknown as GraphComponent;
    await GraphComponent.prototype.togglePanelFullscreen.call(state, 'graph', {} as MouseEvent);
    expect(emit).toHaveBeenCalledOnce();
    await GraphComponent.prototype.togglePanelFullscreen.call(state, 'image', {} as MouseEvent);
    expect(emit).toHaveBeenCalledTimes(2);
  });
});

describe('publication detail exploration', () => {
  it('reveals publication connections locally without fetching an entity graph', () => {
    const node = { id: 'research-node', slug: 'canonical-slug' };
    const revealConnections = vi.fn();
    const fetch = vi.fn();
    const state = {
      graphData: {},
      graph: () => ({ nodes: [node] }),
      graphDerived: () => ({ selectedNode: node }),
      expandingNodeId: () => null,
      expansionError: { set: vi.fn() },
      expandedNodeIds: new Set(),
      revealConnections,
      api: { graph: fetch },
    } as unknown as GraphComponent;
    GraphComponent.prototype.expandSelectedNode.call(state);
    expect(revealConnections).toHaveBeenCalledWith('research-node');
    expect(fetch).not.toHaveBeenCalled();
  });
});
