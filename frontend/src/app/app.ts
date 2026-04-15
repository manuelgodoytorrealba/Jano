import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AppChromeComponent } from './shared/ui/app-chrome/app-chrome.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppChromeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);
  protected readonly title = signal('jano-web-app');

  isImmersiveRoute(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/' || url === '/recommended';
  }

  isEntitiesRoute(): boolean {
    return this.router.url.split('?')[0].startsWith('/entities/');
  }
}
