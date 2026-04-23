import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { navigateToAppSearch } from '../../../core/search/search-navigation';
import { AuthService } from '../../../core/auth/auth.service';

type HeaderNavItem = {
  label: string;
  route?: string;
  kind: 'route' | 'placeholder';
  group: 'public' | 'personal';
  exact?: boolean;
};

type UtilityItem = {
  label: string;
  icon: 'profile' | 'space' | 'articles' | 'admin' | 'settings';
  route?: string;
  kind: 'route' | 'placeholder';
  adminOnly?: boolean;
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
  readonly auth = inject(AuthService);

  readonly navItems: HeaderNavItem[] = [
    { label: 'Descubrir', route: '/', kind: 'route', group: 'public', exact: true },
    { label: 'Explorar', route: '/entities/artwork', kind: 'route', group: 'public' },
    { label: 'Artículos', route: '/entities/article', kind: 'route', group: 'public' },
    { label: 'Curated', route: '/recommended', kind: 'route', group: 'public' },
    { label: 'Perfil', route: '/profile', kind: 'route', group: 'personal' },
    { label: 'Mi espacio', route: '/my-space', kind: 'route', group: 'personal' },
  ];

  readonly utilityItems: UtilityItem[] = [
    { label: 'Perfil', route: '/profile', icon: 'profile', kind: 'route' },
    { label: 'Mi espacio', route: '/my-space', icon: 'space', kind: 'route' },
    { label: 'Artículos', route: '/entities/article', icon: 'articles', kind: 'route' },
    { label: 'Admin', route: '/admin', icon: 'admin', kind: 'route', adminOnly: true },
    { label: 'Ajustes', route: '/settings', icon: 'settings', kind: 'route' },
  ];

  visibleUtilityItems(): UtilityItem[] {
    return this.utilityItems.filter((item) => !item.adminOnly || this.isAdmin());
  }

  targetRoute(item: HeaderNavItem | UtilityItem): string {
    return item.route ?? '/';
  }

  isRouteActive(item: HeaderNavItem | UtilityItem): boolean {
    const route = this.targetRoute(item);

    if (!route) {
      return false;
    }

    if ('exact' in item && item.exact) {
      return this.router.url.split('?')[0] === route;
    }

    if (route === '/') {
      return this.router.url === '/';
    }

    return this.router.url.startsWith(route);
  }

  activeNavIndex(): number {
    return this.navItems.findIndex((item) => this.isRouteActive(item));
  }

  activeUtilityIndex(): number {
    return this.visibleUtilityItems().findIndex((item) => this.isUtilityActive(item));
  }

  isAdmin(): boolean {
    return this.auth.currentUser?.role === 'ADMIN';
  }

  isUtilityActive(item: UtilityItem): boolean {
    const url = this.router.url.split('?')[0];

    if (item.label === 'Perfil') {
      return url === '/profile';
    }

    if (item.label === 'Mi espacio') {
      return url === '/my-space';
    }

    if (item.label === 'Admin') {
      return url === '/admin' || url.startsWith('/admin/');
    }

    if (item.label === 'Artículos') {
      return url.startsWith('/entities/article');
    }

    if (item.label === 'Ajustes') {
      return url === '/settings';
    }

    return false;
  }

  preventPlaceholderAction(event: Event): void {
    event.preventDefault();
  }

  onSearchSubmit(event: Event, rawQuery: string): void {
    event.preventDefault();
    void navigateToAppSearch(this.router, rawQuery);
  }
}
