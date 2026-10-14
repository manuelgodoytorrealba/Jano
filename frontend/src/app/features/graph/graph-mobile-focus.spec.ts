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
