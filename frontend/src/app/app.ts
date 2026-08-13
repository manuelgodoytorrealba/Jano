import { DOCUMENT } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { AppChromeComponent } from './shared/ui/app-chrome/app-chrome.component';
import { AppAppearanceService } from './core/app-appearance.service';
import { EntityRouteArtworkTransitionService } from './core/entity-route-artwork-transition.service';
import { CommonModule } from '@angular/common';
import { ViewportService } from './core/viewport.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, AppChromeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly appearance = inject(AppAppearanceService);
  protected readonly artworkTransition = inject(EntityRouteArtworkTransitionService);
  private readonly viewport = inject(ViewportService);
  private readonly document = inject(DOCUMENT);
  protected readonly title = signal('jano-web-app');
  protected readonly routeTransitioning = signal(false);
  private readonly schedulePostNavigation =
    typeof globalThis.requestAnimationFrame === 'function'
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0);

  constructor() {
    this.viewport.start();
    this.appearance.load().subscribe();
    this.router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationStart ||
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError,
        ),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.routeTransitioning.set(true);
          return;
        }

        if (event instanceof NavigationCancel || event instanceof NavigationError) {
          this.artworkTransition.cancel();
        }

        this.schedulePostNavigation(() => {
          this.routeTransitioning.set(false);

          if (!this.isEntityDetailRoute() && this.artworkTransition.isActive()) {
            this.artworkTransition.cancel();
          }
        });
      });

    effect(() => {
      const isMobile =
        typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches;
      const themeColor = isMobile ? '#231d1b' : '#0a0a0a';
      this.setThemeColor(themeColor);
    });
  }

  isImmersiveRoute(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/' || url === '/home';
  }

  isEntitiesRoute(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/research' || url === '/entities' || url.startsWith('/entities/');
  }

  isEntityDetailRoute(): boolean {
    return this.router.url.split('?')[0].startsWith('/entity/');
  }

  backgroundImageStyle(): string | null {
    const url = this.appearance.currentBackgroundImageUrl();
    return url ? `url("${url.replace(/"/g, '%22')}")` : null;
  }
  isAuthRoute(): boolean {
    return this.router.url.startsWith('/login');
  }

  private setThemeColor(color: string): void {
    const existing = this.document.querySelector('meta[name="theme-color"]');

    if (existing) {
      existing.setAttribute('content', color);
      return;
    }

    const meta = this.document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = color;
    this.document.head.appendChild(meta);
  }
}
