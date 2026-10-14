import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { GraphComponent } from './graph.component';
import { GraphInteractionRuntime } from './graph-interaction-runtime';

describe('empty graph canvas selection', () => {
  function setup(pointerType = 'mouse') {
    const runtime = new GraphInteractionRuntime();
    const stage = Object.assign(document.createElement('div'), {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => false),
      releasePointerCapture: vi.fn(),
    });
    const viewport = { x: 160, y: 80, scale: 1.25 };
    const persist = vi.fn();
    const flushViewport = vi.fn();
    const event = (overrides: Partial<PointerEvent> = {}) =>
      ({
        type: 'pointerdown',
        target: stage,
        currentTarget: stage,
        button: 0,
        isPrimary: true,
        pointerId: 1,
        pointerType,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
        ...overrides,
      }) as PointerEvent;
    const down = (pointer: PointerEvent) =>
      runtime.graphStagePointerDown({
        event: pointer,
        isMobile: pointerType === 'touch',
        stage,
        currentViewport: viewport,
        cancelInitialFocus: vi.fn(),
        clearViewportTarget: vi.fn(),
        clearTooltip: vi.fn(),
      });
    const up = (overrides: Partial<PointerEvent> = {}) =>
      runtime.graphStagePointerUp({
        event: event({ type: 'pointerup', ...overrides }),
        flushViewport,
        persist,
      });
    return { runtime, stage, viewport, event, down, up, persist, flushViewport };
  }

  it.each(['mouse', 'touch'])(
    'recognizes a primary %s click or tap within the drag threshold',
    (type) => {
      const { runtime, event, down, up, flushViewport } = setup(type);
      down(event());
      expect(up({ clientX: 103, clientY: 104 })).toBe(true);
      expect(runtime.pointerSession).toBeNull();
      expect(flushViewport).toHaveBeenCalledOnce();
    },
  );

  it('does not clear focus for canceled, secondary, or foreign pointer releases', () => {
    for (const release of [
      { type: 'pointercancel' },
      { button: 2 },
      { isPrimary: false },
      { pointerId: 2 },
      { clientX: 106 },
    ]) {
      const { event, down, up } = setup();
      down(event());
      expect(up(release)).toBe(false);
    }
    const { runtime, stage, event, down, up } = setup();
    down(event({ button: 2 }));
    expect(runtime.pointerSession).toBeNull();
    expect(stage.setPointerCapture).not.toHaveBeenCalled();
    expect(up({ button: 2 })).toBe(false);
  });

  it('keeps focus after a pan even when the cursor returns to its starting position', () => {
    const { runtime, event, down, up, viewport } = setup();
    down(event());
    runtime.graphStagePointerMove({
      event: event({ type: 'pointermove', clientX: 106 }),
      currentViewport: viewport,
      clearViewportTarget: vi.fn(),
      setViewport: vi.fn(),
      scheduleViewport: vi.fn(),
      markReady: vi.fn(),
    });
    expect(up()).toBe(false);
  });

  it.each(['graph-node', 'graph-edge-hit', 'graph-edge-label', 'graph-tooltip'])(
    'does not start a pan or capture a touch on %s',
    (className) => {
      const { runtime, stage, event, down, up } = setup('touch');
      const target = document.createElement('span');
      target.className = className;
      const child = target.appendChild(document.createElement('span'));
      down(event({ target: child }));
      expect(runtime.pointerSession).toBeNull();
      expect(stage.setPointerCapture).not.toHaveBeenCalled();
      expect(up({ target: child })).toBe(false);
    },
  );

  it('does not treat either release of a pinch as a tap', () => {
    const { runtime, event, down, up, persist } = setup('touch');
    down(event());
    down(event({ pointerId: 2, clientX: 200, isPrimary: false }));
    expect(runtime.pointerSession).toBeNull();
    expect(up()).toBe(false);
    expect(up({ pointerId: 2, clientX: 200, isPrimary: false })).toBe(false);
    expect(persist).toHaveBeenCalledOnce();
  });

  it('can begin a pinch with the first finger on a relation without capturing its single tap', () => {
    const { runtime, stage, event, down, up, viewport } = setup('touch');
    const edge = document.createElement('span');
    edge.className = 'graph-edge-hit';
    down(event({ target: edge }));
    expect(stage.setPointerCapture).not.toHaveBeenCalled();
    down(event({ pointerId: 2, clientX: 200, isPrimary: false }));
    expect(stage.setPointerCapture).toHaveBeenCalledWith(1);
    expect(stage.setPointerCapture).toHaveBeenCalledWith(2);
    expect(runtime.pointerSession).toBeNull();
    const setViewport = vi.fn();
    runtime.graphStagePointerMove({
      event: event({ type: 'pointermove', clientX: 50 }),
      stage,
      currentViewport: viewport,
      clearViewportTarget: vi.fn(),
      setViewport,
      scheduleViewport: vi.fn(),
      markReady: vi.fn(),
    });
    expect(setViewport).toHaveBeenCalledOnce();
    expect(setViewport.mock.calls[0][0].scale).toBeGreaterThan(viewport.scale);
    expect(up()).toBe(false);
    expect(up({ pointerId: 2, clientX: 200, isPrimary: false })).toBe(false);
  });

  it('clears selection and hover state without changing the camera or zoom', () => {
    const viewport = { x: 160, y: 80, scale: 1.25 };
    const state = {
      interactions: { graphStagePointerUp: vi.fn(() => true) },
      selectedNodeId: signal<string | null>('neighbor'),
      selectedNodeSource: 'explicit',
      lastNodeActivation: { nodeId: 'neighbor', at: 1 },
      graphViewport: signal(viewport),
      markGraphInteractionActive: vi.fn(),
      dismissTooltip: vi.fn(),
      tooltip: () => null,
      persistExplorerState: vi.fn(),
    };
    GraphComponent.prototype.onGraphStagePointerUp.call(
      state as unknown as GraphComponent,
      {} as PointerEvent,
    );
    expect(state.selectedNodeId()).toBeNull();
    expect(state.selectedNodeSource).toBe('center');
    expect(state.lastNodeActivation).toBeNull();
    expect(state.dismissTooltip).toHaveBeenCalledOnce();
    expect(state.persistExplorerState).toHaveBeenCalledOnce();
    expect(state.graphViewport()).toBe(viewport);
  });
});
