import { afterEach, describe, expect, it, vi } from 'vitest';
import { GraphComponent } from './graph.component';

describe('graph card dismissal', () => {
  afterEach(() => vi.useRealTimers());

  function state(keyboardFocus = false) {
    return {
      graphStage: {
        nativeElement: {
          querySelector: vi.fn((selector: string) =>
            selector.includes(':focus-within') ||
            (keyboardFocus && selector.includes(':focus-visible'))
              ? {}
              : null,
          ),
        },
      },
      clearHoverClearTimer: vi.fn(),
      interactions: { pointerSession: null },
      dismissTooltip: vi.fn(),
    } as unknown as GraphComponent;
  }

  it('closes a mouse-focused card after the cursor leaves', () => {
    vi.useFakeTimers();
    const component = state();
    GraphComponent.prototype.clearHover.call(component);
    vi.advanceTimersByTime(199);
    expect(component.dismissTooltip).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(component.dismissTooltip).toHaveBeenCalledOnce();
  });

  it('keeps the card while the user is reading with keyboard focus', () => {
    vi.useFakeTimers();
    const component = state(true);
    GraphComponent.prototype.clearHover.call(component);
    vi.runAllTimers();
    expect(component.dismissTooltip).not.toHaveBeenCalled();
  });

  it('schedules closure when a pan ends over empty canvas', () => {
    const component = {
      interactions: { graphStagePointerUp: vi.fn() },
      markGraphInteractionActive: vi.fn(),
      tooltip: vi.fn(() => ({ title: 'Work' })),
      clearHover: vi.fn(),
    } as unknown as GraphComponent;
    const event = { target: { closest: () => null } } as unknown as PointerEvent;
    GraphComponent.prototype.onGraphStagePointerUp.call(component, event);
    expect(component.clearHover).toHaveBeenCalledOnce();
  });
});
