import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AppChromeComponent } from './shared/ui/app-chrome/app-chrome.component';
import { AppAppearanceService } from './core/app-appearance.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppChromeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);
  private readonly appearance = inject(AppAppearanceService);
  protected readonly title = signal('jano-web-app');

  constructor() {
    this.appearance.load().subscribe();
  }

  isImmersiveRoute(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/' || url === '/recommended';
  }

  isEntitiesRoute(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/entities' || url.startsWith('/entities/');
  }

  backgroundImageStyle(): string | null {
    const url = this.appearance.backgroundImageUrl();
    return url ? `url("${url.replace(/"/g, '%22')}")` : null;
  }
}
