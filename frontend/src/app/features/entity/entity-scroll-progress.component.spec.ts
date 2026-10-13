import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { EntityScrollProgressComponent } from './entity-scroll-progress.component';

describe('entity page scrollbar', () => {
  it('maps dragging to page position and follows scrolling, including short pages', () => {
    const root = { scrollHeight: 2000, clientHeight: 500, scrollTop: 750 };
    const scrollTo = vi.fn();
    const state = {
      document: { scrollingElement: root, defaultView: { scrollTo } },
      progress: signal(0),
      scrollRange: signal(0),
    } as unknown as EntityScrollProgressComponent;
    EntityScrollProgressComponent.prototype.updateProgress.call(state);
    expect(state.progress()).toBe(50);
    EntityScrollProgressComponent.prototype.navigate.call(state, {
      target: { valueAsNumber: 80 },
    } as unknown as Event);
    expect(scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: 'instant' });
    root.scrollHeight = 500;
    EntityScrollProgressComponent.prototype.updateProgress.call(state);
    expect(state.scrollRange()).toBe(0);
    expect(state.progress()).toBe(0);
  });
});
