import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GraphSceneComponent } from './graph-scene.component';

describe('graph hover intent', () => {
  afterEach(() => vi.useRealTimers());
  it('ignores passing pointers and cancels pending labels on leave', () => {
    vi.useFakeTimers();
    const scene = new GraphSceneComponent();
    const emit = vi.spyOn(scene.nodeHover, 'emit');
    const event = { pointerType: 'mouse', buttons: 0 } as PointerEvent;
    scene.hoverNode(event, 'a');
    vi.advanceTimersByTime(100);
    expect(emit).not.toHaveBeenCalled();
    scene.leaveNode();
    vi.advanceTimersByTime(100);
    expect(emit).not.toHaveBeenCalled();
    scene.hoverNode(event, 'b');
    vi.advanceTimersByTime(140);
    expect(emit).toHaveBeenCalledWith({ event, nodeId: 'b' });
    scene.ngOnDestroy();
  });
  it('does not start hover work during dragging or on touch', () => {
    vi.useFakeTimers();
    const scene = new GraphSceneComponent();
    const emit = vi.spyOn(scene.nodeHover, 'emit');
    scene.hoverNode({ pointerType: 'touch', buttons: 0 } as PointerEvent, 'a');
    scene.hoverNode({ pointerType: 'mouse', buttons: 1 } as PointerEvent, 'a');
    vi.runAllTimers();
    expect(emit).not.toHaveBeenCalled();
  });
});
