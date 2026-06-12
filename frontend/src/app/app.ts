import { DOCUMENT } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AppChromeComponent } from './shared/ui/app-chrome/app-chrome.component';
import { AppAppearanceService } from './core/app-appearance.service';
import { CommonModule } from '@angular/common';
import { ViewportService } from './core/viewport.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, AppChromeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);
  private readonly appearance = inject(AppAppearanceService);
  private readonly viewport = inject(ViewportService);
  private readonly document = inject(DOCUMENT);
  protected readonly title = signal('jano-web-app');

  constructor() {
    this.viewport.start();
    this.appearance.load().subscribe();
    effect(() => {
      const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches;
      const themeColor = isMobile ? '#231d1b' : '#0a0a0a';
      this.setThemeColor(themeColor);
    });
  }

  isImmersiveRoute(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/' || url === '/recommended';
  }

  isEntitiesRoute(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/entities' || url.startsWith('/entities/');
  }

  isEntityDetailRoute(): boolean {
    return this.router.url.split('?')[0].startsWith('/entity/');
  }

  backgroundImageStyle(): string | null {
    const url = this.appearance.backgroundImageUrl();
    return url ? `url("${url.replace(/"/g, '%22')}")` : null;
  }
  isAuthRoute(): boolean {
    return this.router.url.startsWith('/login');
  }

  private setThemeColor(color: string): void {
    const existing = this.document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;

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
