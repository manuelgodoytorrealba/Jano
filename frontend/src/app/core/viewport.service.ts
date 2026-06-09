import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, NgZone, PLATFORM_ID, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly document = inject(DOCUMENT);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private cleanupCallbacks: Array<() => void> = [];
  private rafId: number | null = null;
  private started = false;

  start(): void {
    if (this.started || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.started = true;

    this.ngZone.runOutsideAngular(() => {
      this.applyViewport();

      const scheduleApply = () => this.scheduleApply();
      const viewport = window.visualViewport;

      window.addEventListener('resize', scheduleApply, { passive: true });
      window.addEventListener('orientationchange', scheduleApply, { passive: true });
      window.addEventListener('pageshow', scheduleApply, { passive: true });
      this.cleanupCallbacks.push(() => {
        window.removeEventListener('resize', scheduleApply);
        window.removeEventListener('orientationchange', scheduleApply);
        window.removeEventListener('pageshow', scheduleApply);
      });

      if (viewport) {
        viewport.addEventListener('resize', scheduleApply, { passive: true });
        viewport.addEventListener('scroll', scheduleApply, { passive: true });
        this.cleanupCallbacks.push(() => {
          viewport.removeEventListener('resize', scheduleApply);
          viewport.removeEventListener('scroll', scheduleApply);
        });
      }
    });
  }

  stop(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cleanupCallbacks.forEach((cleanup) => cleanup());
    this.cleanupCallbacks = [];

    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.started = false;
  }

  private scheduleApply(): void {
    if (this.rafId !== null) {
      return;
    }

    this.rafId = window.requestAnimationFrame(() => {
      this.rafId = null;
      this.applyViewport();
    });
  }

  private applyViewport(): void {
    const viewport = window.visualViewport;
    const root = this.document.documentElement;
    const layoutHeight = window.innerHeight || root.clientHeight;
    const visualHeight = viewport?.height || layoutHeight;
    const width = viewport?.width || window.innerWidth || root.clientWidth;

    root.style.setProperty('--app-visual-viewport-height', `${Math.round(visualHeight)}px`);
    root.style.setProperty('--app-layout-viewport-height', `${Math.round(layoutHeight)}px`);
    root.style.setProperty('--app-real-viewport-height', `${Math.round(visualHeight)}px`);
    root.style.setProperty('--app-real-viewport-width', `${Math.round(width)}px`);
  }
}
