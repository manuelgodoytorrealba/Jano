import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { GraphComponent } from './graph.component';

describe('detail panel fullscreen', () => {
  const setup = () => {
    const panel = document.createElement('section');
    panel.className = 'explorer-image-pane';
    const button = document.createElement('button');
    panel.append(button);
    const state = {
      detailLayout: true,
      fullscreenPanel: signal<'image' | 'graph' | null>(null),
      fullscreenFailed: signal(false),
      workspaceFocusToggle: { emit: vi.fn() },
    };
    const event = { currentTarget: button } as unknown as MouseEvent;
    return { panel, state, event };
  };

  it('expands the selected panel without changing workspace or zoom state', async () => {
    const { panel, state, event } = setup();
    panel.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    await GraphComponent.prototype.togglePanelFullscreen.call(
      state as unknown as GraphComponent,
      'image',
      event,
    );
    expect(panel.requestFullscreen).toHaveBeenCalledOnce();
    expect(state.fullscreenPanel()).toBe('image');
    expect(state.workspaceFocusToggle.emit).not.toHaveBeenCalled();
    GraphComponent.prototype.onFullscreenChange.call(state as unknown as GraphComponent);
    expect(state.fullscreenPanel()).toBeNull();
  });

  it('reports fullscreen rejection without changing the selected panel', async () => {
    const { panel, state, event } = setup();
    panel.requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'));
    await GraphComponent.prototype.togglePanelFullscreen.call(
      state as unknown as GraphComponent,
      'image',
      event,
    );
    expect(state.fullscreenFailed()).toBe(true);
    expect(state.fullscreenPanel()).toBeNull();
  });

  it('preserves the existing focus action outside entity details', async () => {
    const { state, event } = setup();
    state.detailLayout = false;
    await GraphComponent.prototype.togglePanelFullscreen.call(
      state as unknown as GraphComponent,
      'graph',
      event,
    );
    expect(state.workspaceFocusToggle.emit).toHaveBeenCalledOnce();
  });
});
