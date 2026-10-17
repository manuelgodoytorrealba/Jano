import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { GraphComponent } from './graph.component';

describe('image double activation', () => {
  it('zooms around the selected point and resets on the next activation', () => {
    const stage = document.createElement('div');
    stage.getBoundingClientRect = () => ({ left: 10, top: 20 }) as DOMRect;
    const state = {
      imageStage: { nativeElement: stage },
      imageAsset: () => ({ width: 1000, height: 1000 }),
      imageViewport: signal({ x: 0, y: 0, scale: 0.5, fitScale: 0.5 }),
      currentImageStageSize: () => ({ width: 500, height: 500 }),
      applyImageViewport: vi.fn(),
      resetImageView: vi.fn(),
    };
    const event = { clientX: 260, clientY: 270 } as PointerEvent;
    GraphComponent.prototype.toggleImageZoom.call(state as unknown as GraphComponent, event);
    expect(state.applyImageViewport).toHaveBeenCalledWith({
      x: -250,
      y: -250,
      scale: 1,
      fitScale: 0.5,
    });
    state.imageViewport.set({ x: -250, y: -250, scale: 1, fitScale: 0.5 });
    GraphComponent.prototype.toggleImageZoom.call(state as unknown as GraphComponent, event);
    expect(state.resetImageView).toHaveBeenCalledOnce();
  });

  it('requires two nearby quick taps and ignores a drag', () => {
    const state = {
      interactions: { imagePointerEnd: vi.fn(), imagePointerMove: vi.fn() },
      persistExplorerState: vi.fn(),
      toggleImageZoom: vi.fn(),
      imageTapStart: { x: 100, y: 100, time: performance.now(), id: 1 },
      lastImageTap: null,
    };
    const event = { pointerId: 1, clientX: 100, clientY: 100 } as PointerEvent;
    GraphComponent.prototype.onImagePointerUp.call(state as unknown as GraphComponent, event);
    expect(state.toggleImageZoom).not.toHaveBeenCalled();
    state.imageTapStart = { x: 100, y: 100, time: performance.now(), id: 1 };
    GraphComponent.prototype.onImagePointerUp.call(state as unknown as GraphComponent, event);
    expect(state.toggleImageZoom).toHaveBeenCalledOnce();
    state.imageTapStart = null!;
    GraphComponent.prototype.onImagePointerUp.call(state as unknown as GraphComponent, event);
    expect(state.toggleImageZoom).toHaveBeenCalledOnce();
  });
});
