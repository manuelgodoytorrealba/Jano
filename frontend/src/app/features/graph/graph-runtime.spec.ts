import { describe, expect, it } from 'vitest';

import { createGraphPanSession, updateGraphPanSession } from './graph-interaction';
import { GraphCameraRuntime } from './graph-camera-runtime';
import { GraphInteractionRuntime } from './graph-interaction-runtime';
import { prepareExplorerStateForSlugChange, restoreResizedGraphStageView } from './graph-lifecycle';
import { ExplorerPersistedState, serializeGraphViewport } from './graph-persistence';
import { reuseGraphPositions } from './graph-setup';

describe('graph runtime transitions', () => {
  it('reuses positions relative to the new graph center', () => {
    const graph = {
      centerId: 'center',
      nodes: [{ id: 'center' }, { id: 'neighbor' }, { id: 'new' }],
    } as Parameters<typeof reuseGraphPositions>[0];

    expect(
      reuseGraphPositions(
        graph,
        { center: { x: 40, y: 20 }, neighbor: { x: 90, y: 50 } },
        { new: { x: -20, y: 10 } },
      ),
    ).toEqual({
      center: { x: 0, y: 0 },
      neighbor: { x: 50, y: 30 },
      new: { x: -20, y: 10 },
    });
  });

  it('owns pointer state and emits a viewport only after the drag threshold', () => {
    const runtime = new GraphInteractionRuntime();
    const target = {
      closest: () => null,
      setPointerCapture: () => undefined,
    };
    const event = (clientX: number) =>
      ({
        target,
        currentTarget: target,
        pointerId: 1,
        clientX,
        clientY: 100,
      }) as unknown as PointerEvent;
    let viewport = { x: 0, y: 0, scale: 1 };

    runtime.graphStagePointerDown({
      event: event(100),
      isMobile: false,
      currentViewport: viewport,
      cancelInitialFocus: () => undefined,
      clearViewportTarget: () => undefined,
      clearTooltip: () => undefined,
    });
    runtime.graphStagePointerMove({
      event: event(104),
      currentViewport: viewport,
      clearViewportTarget: () => undefined,
      setViewport: (next) => (viewport = next),
      scheduleViewport: (next) => (viewport = next),
      markReady: () => undefined,
    });
    expect(viewport.x).toBe(0);

    runtime.graphStagePointerMove({
      event: event(108),
      currentViewport: viewport,
      clearViewportTarget: () => undefined,
      setViewport: (next) => (viewport = next),
      scheduleViewport: (next) => (viewport = next),
      markReady: () => undefined,
    });

    expect(runtime.pointerSession?.kind).toBe('graph-pan');
    expect(viewport.x).toBe(4);
  });

  it('applies an immediate focus plan through the single camera owner', () => {
    const camera = new GraphCameraRuntime();
    let selected = '';
    let viewport = { x: 0, y: 0, scale: 1 };
    let persisted = false;

    camera.applyFocusPlan({
      plan: {
        selectedNodeId: 'artwork',
        selectedNodeSource: 'explicit',
        shouldPinCenter: false,
        shouldCancelPendingInitialFocus: false,
        shouldClearViewportTarget: true,
        shouldMarkGraphViewportReady: true,
        shouldMarkInitialGraphViewportReady: true,
        shouldBumpRenderTick: false,
        nextViewport: { x: 120, y: 80, scale: 1.2 },
        animate: false,
      },
      setSelectedNodeSource: () => undefined,
      setSelectedNodeId: () => (selected = 'artwork'),
      pinCenterNode: () => undefined,
      setViewport: (next) => (viewport = next),
      setGraphViewportReady: () => undefined,
      setInitialGraphViewportReady: () => undefined,
      bumpRenderTick: () => undefined,
      cancelPendingInitialFocus: () => undefined,
      startAnimation: () => undefined,
      persist: () => (persisted = true),
    });

    expect(selected).toBe('artwork');
    expect(viewport).toEqual({ x: 120, y: 80, scale: 1.2 });
    expect(persisted).toBe(true);
  });

  it('preserves the world focus when the graph stage is resized', () => {
    const previousSize = { width: 1000, height: 700 };
    const nextSize = { width: 760, height: 520 };
    const currentViewport = { x: 430, y: 280, scale: 1.25 };

    const restored = restoreResizedGraphStageView({
      previousSize,
      nextSize,
      currentViewport,
      targetViewport: null,
    });

    expect(restored).not.toBeNull();
    expect(serializeGraphViewport(restored!.current, nextSize)).toEqual(
      serializeGraphViewport(currentViewport, previousSize),
    );
  });

  it('does not classify a click as a pan until the drag threshold is crossed', () => {
    const session = createGraphPanSession(7, { x: 100, y: 100 });
    if (session.kind !== 'graph-pan') throw new Error('Expected graph pan session');
    const clickMotion = updateGraphPanSession(session, { x: 103, y: 104 });
    const dragMotion = updateGraphPanSession(clickMotion.nextSession, { x: 106, y: 100 });

    expect(clickMotion.moved).toBe(false);
    expect(clickMotion).toEqual(expect.objectContaining({ deltaX: 3, deltaY: 4 }));
    expect(dragMotion.moved).toBe(true);
  });

  it('drops slug-specific positions and image state while preserving graph filters', () => {
    const state: ExplorerPersistedState = {
      graph: {
        focus: { x: 12, y: 24 },
        scale: 0.9,
        positions: { artwork: { x: 80, y: 90 } },
        selectedNodeId: 'artwork',
        labelsMode: 'always',
        entityTypeFilters: { ARTWORK: true },
        relationTypeFilters: { CREATED_BY: true },
      },
      image: {
        center: { x: 40, y: 50 },
        scaleRatio: 1.4,
      },
      updatedAt: 1,
    };

    expect(prepareExplorerStateForSlugChange(state)).toEqual({
      ...state,
      graph: {
        ...state.graph,
        positions: {},
        selectedNodeId: null,
      },
      image: undefined,
    });
  });
});
