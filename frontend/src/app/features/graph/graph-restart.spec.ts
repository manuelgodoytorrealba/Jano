import { expect, it, vi } from 'vitest';
import { GraphComponent } from './graph.component';

it('resets the desktop camera without reloading data or replacing the current scene', () => {
  const positions = { center: { x: 0, y: 0 }, top: { x: 0, y: -200 } };
  const state = {
    isMobileViewport: false,
    graph: () => ({ centerId: 'center' }),
    positions,
    cancelPendingInitialGraphFocus: vi.fn(),
    stabilizeGraphLayout: vi.fn(),
    inspectorVisible: { set: vi.fn() },
    hoveredNodeId: { set: vi.fn() },
    hoveredEdgeId: { set: vi.fn() },
    tooltip: { set: vi.fn() },
    resetGraphView: vi.fn(),
    loadGraph: vi.fn(),
    applyGraphResponse: vi.fn(),
  };
  GraphComponent.prototype.restartExploration.call(state as unknown as GraphComponent);
  expect(state.cancelPendingInitialGraphFocus).toHaveBeenCalledWith(true);
  expect(state.stabilizeGraphLayout).toHaveBeenCalledOnce();
  expect(state.resetGraphView).toHaveBeenCalledOnce();
  expect(state.loadGraph).not.toHaveBeenCalled();
  expect(state.applyGraphResponse).not.toHaveBeenCalled();
  expect(state.positions).toBe(positions);
});
