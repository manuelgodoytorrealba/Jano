import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink } from '@angular/router';
import { navigateToAppSearch } from '../../../core/search/search-navigation';
import { AuthService } from '../../../core/auth/auth.service';
import { AppChromeRailService, ContextualRailAction } from './app-chrome-rail.service';
import { filter } from 'rxjs';

type HeaderNavItem = {
  label: string;
  route?: string;
  kind: 'route' | 'placeholder';
  group: 'public' | 'personal';
  exact?: boolean;
};

type UtilityItem = {
  label: string;
  icon: 'profile' | 'space' | 'articles' | 'admin' | 'settings' | 'save' | 'share' | 'focus';
  route?: string;
  kind: 'route' | 'placeholder' | 'action';
  adminOnly?: boolean;
  action?: ContextualRailAction;
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
  readonly rail = inject(AppChromeRailService);
  readonly auth = inject(AuthService);
  private readonly currentUrl = signal(this.normalizeUrl(this.router.url));
  private readonly pendingUrl = signal<string | null>(null);

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

  constructor() {
    this.router.events.pipe(
      filter((event) =>
        event instanceof NavigationStart ||
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError,
      ),
      takeUntilDestroyed(),
    ).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.pendingUrl.set(this.normalizeUrl(event.url));
        return;
      }

      this.currentUrl.set(this.normalizeUrl(this.router.url));
      this.pendingUrl.set(null);
    });
  }

  private normalizeUrl(url: string): string {
    return (url ?? '').split('?')[0] || '/';
  }

  private activeUrl(): string {
    return this.pendingUrl() ?? this.currentUrl();
  }

  isDetailRoute(): boolean {
    return this.activeUrl().startsWith('/entity/');
  }

  contextualUtilityItems(): UtilityItem[] {
    const state = this.rail.contextualRail();
    if (!this.isDetailRoute()) {
      return [];
    }

    const items: UtilityItem[] = [];

    if (!state || state.kind !== 'detail') {
      return [];
    }

    if (state.canSave) {
      items.push({ label: 'Guardar', icon: 'save', kind: 'action', action: 'save' });
    }

    items.push(
      { label: 'Compartir', icon: 'share', kind: 'action', action: 'share' },
      { label: 'Inicio', icon: 'focus', kind: 'action', action: 'focus' },
    );

    return items;
  }

  currentUtilityItems(): UtilityItem[] {
    const contextual = this.contextualUtilityItems();
    if (this.isDetailRoute()) {
      return contextual;
    }

    if (contextual.length) {
      return contextual;
    }

    return this.visibleUtilityItems();
  }

  visibleUtilityItems(): UtilityItem[] {
    return this.utilityItems.filter((item) => !item.adminOnly || this.isAdmin());
  }

  targetRoute(item: HeaderNavItem | UtilityItem): string {
    return item.route ?? '/';
  }

  isRouteActive(item: HeaderNavItem | UtilityItem): boolean {
    const route = this.targetRoute(item);
    const activeUrl = this.activeUrl();

    if (!route) {
      return false;
    }

    if ('exact' in item && item.exact) {
      return activeUrl === route;
    }

    if (route === '/') {
      return activeUrl === '/';
    }

    return activeUrl.startsWith(route);
  }

  activeNavIndex(): number {
    return this.navItems.findIndex((item) => this.isRouteActive(item));
  }

  activeUtilityIndex(): number {
    return this.currentUtilityItems().findIndex((item) => this.isUtilityActive(item));
  }

  isAdmin(): boolean {
    return this.auth.currentUser?.role === 'ADMIN';
  }

  isUtilityActive(item: UtilityItem): boolean {
    const contextual = this.rail.contextualRail();
    if (item.kind === 'action' && contextual?.kind === 'detail') {
      return item.action === 'save' ? contextual.isSaved : false;
    }

    const url = this.activeUrl();

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

  primeRoute(item: HeaderNavItem | UtilityItem): void {
    if (item.kind !== 'route') {
      return;
    }

    this.pendingUrl.set(this.targetRoute(item));
  }

  utilityAriaLabel(item: UtilityItem): string {
    if (item.kind === 'action' && item.action === 'save') {
      const contextual = this.rail.contextualRail();
      if (contextual?.saveLoading) {
        return contextual.isSaved ? 'Quitando guardado' : 'Guardando entidad';
      }

      return contextual?.isSaved ? 'Entidad guardada' : item.label;
    }

    if (item.kind === 'action' && item.action === 'focus') {
      return 'Inicio';
    }

    return item.label;
  }

  isUtilityDisabled(item: UtilityItem): boolean {
    const contextual = this.rail.contextualRail();
    if (item.kind !== 'action') {
      return false;
    }

    if (!contextual || contextual.kind !== 'detail') {
      return true;
    }

    if (item.action === 'save') {
      return contextual.saveLoading || !contextual.canSave;
    }

    return false;
  }

  triggerUtilityAction(item: UtilityItem, event: Event): void {
    if (item.kind !== 'action' || !item.action) {
      return;
    }

    event.preventDefault();
    this.rail.trigger(item.action);
  }

  preventPlaceholderAction(event: Event): void {
    event.preventDefault();
  }

  onSearchSubmit(event: Event, rawQuery: string): void {
    event.preventDefault();
    void navigateToAppSearch(this.router, rawQuery);
  }
}
