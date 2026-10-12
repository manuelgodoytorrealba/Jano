import { describe, expect, it, vi } from 'vitest';
import { GraphComponent } from './graph.component';

describe('graph hover during dragging', () => {
  it('does not construct or reposition a tooltip during a mouse drag', () => {
    const clearHoverClearTimer = vi.fn();
    const graphDerived = vi.fn(() => ({ nodeMap: new Map([['node', { id: 'node' }]]) }));
    const hoveredNodeId = vi.fn();
    const tooltip = vi.fn();
    const state = {
      clearHoverClearTimer,
      graphDerived,
      interactions: { pointerSession: { kind: 'node-drag' } },
      hoveredNodeId,
      tooltip,
    } as unknown as GraphComponent;
    for (let sample = 0; sample < 1000; sample++) {
      GraphComponent.prototype.onNodeHover.call(
        state,
        { pointerType: 'mouse' } as PointerEvent,
        'node',
      );
      GraphComponent.prototype.onTooltipMove.call(state);
    }
    expect(hoveredNodeId).not.toHaveBeenCalled();
    expect(tooltip).not.toHaveBeenCalled();
  });
});
