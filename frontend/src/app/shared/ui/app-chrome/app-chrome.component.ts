import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

type HeaderNavItem = {
  label: string;
  route?: string;
  kind: 'route' | 'placeholder';
};

type UtilityItem = {
  label: string;
  icon: 'profile' | 'saved' | 'collections' | 'settings';
  route?: string;
  kind: 'route' | 'placeholder';
};

@Component({
  standalone: true,
  selector: 'app-app-chrome',
  imports: [RouterLink],
  templateUrl: './app-chrome.component.html',
  styleUrl: './app-chrome.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppChromeComponent {
  private readonly router = inject(Router);

  readonly navItems: HeaderNavItem[] = [
    { label: 'Explorar', route: '/entities/artwork', kind: 'route' },
    { label: 'Colecciones', kind: 'placeholder' },
    { label: 'Descubrir', route: '/recommended', kind: 'route' },
    { label: 'Perfil', route: '/my-space', kind: 'route' },
  ];

  readonly utilityItems: UtilityItem[] = [
    { label: 'Perfil', route: '/my-space', icon: 'profile', kind: 'route' },
    { label: 'Favoritos', route: '/recommended', icon: 'saved', kind: 'route' },
    { label: 'Colecciones', icon: 'collections', kind: 'placeholder' },
    { label: 'Ajustes', icon: 'settings', kind: 'placeholder' },
  ];

  isRouteActive(item: HeaderNavItem | UtilityItem): boolean {
    if (!item.route) {
      return false;
    }

    if (item.route === '/') {
      return this.router.url === '/';
    }

    return this.router.url.startsWith(item.route);
  }

  preventPlaceholderAction(event: Event): void {
    event.preventDefault();
  }
}
