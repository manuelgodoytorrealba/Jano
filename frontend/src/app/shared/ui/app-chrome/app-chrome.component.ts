import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink } from '@angular/router';
import { navigateToAppSearch } from '../../../core/search/search-navigation';
import { AuthService } from '../../../core/auth/auth.service';
import { AppChromeRailService, ContextualRailAction } from './app-chrome-rail.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { filter, fromEvent } from 'rxjs';

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
  private static readonly COLLAPSIBLE_HEADER_MAX_WIDTH = 1200;
  private readonly router = inject(Router);
  readonly rail = inject(AppChromeRailService);
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly currentUrl = signal(this.normalizeUrl(this.router.url));
  private readonly pendingUrl = signal<string | null>(null);
  readonly compactHeaderEnabled = signal(this.readCompactHeaderEnabled());
  readonly headerCollapsed = signal(false);
  readonly detailHeaderRevealed = signal(false);
  readonly brandPressing = signal(false);

  readonly navItems: HeaderNavItem[] = [
    { label: 'nav.discover', route: '/', kind: 'route', group: 'public', exact: true },
    { label: 'nav.explore', route: '/entities/artwork', kind: 'route', group: 'public' },
    { label: 'nav.articles', route: '/entities/article', kind: 'route', group: 'public' },
    { label: 'nav.curated', route: '/recommended', kind: 'route', group: 'public' },
    { label: 'nav.profile', route: '/profile', kind: 'route', group: 'personal' },
    { label: 'nav.mySpace', route: '/my-space', kind: 'route', group: 'personal' },
  ];

  readonly utilityItems: UtilityItem[] = [
    { label: 'nav.profile', route: '/profile', icon: 'profile', kind: 'route' },
    { label: 'nav.mySpace', route: '/my-space', icon: 'space', kind: 'route' },
    { label: 'nav.articles', route: '/entities/article', icon: 'articles', kind: 'route' },
    { label: 'nav.admin', route: '/admin', icon: 'admin', kind: 'route', adminOnly: true },
    { label: 'nav.settings', route: '/settings', icon: 'settings', kind: 'route' },
  ];

  pressBrand(): void {
    this.brandPressing.set(true);
  }

  releaseBrand(): void {
    this.brandPressing.set(false);
  }

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
      this.syncDetailHeaderState();
    });

    if (typeof window !== 'undefined') {
      fromEvent(window, 'resize').pipe(takeUntilDestroyed()).subscribe(() => {
        const compact = this.readCompactHeaderEnabled();
        this.compactHeaderEnabled.set(compact);

        if (!compact && !this.isDetailRoute() && this.headerCollapsed()) {
          this.headerCollapsed.set(false);
        }
      });

      fromEvent<KeyboardEvent>(window, 'keydown').pipe(takeUntilDestroyed()).subscribe((event) => {
        if (event.key === 'Escape' && this.isDetailRoute()) {
          this.revealDetailHeader();
        }
      });
    }

    this.syncDetailHeaderState();
  }

  private readCompactHeaderEnabled(): boolean {
    return typeof window !== 'undefined'
      ? window.innerWidth <= AppChromeComponent.COLLAPSIBLE_HEADER_MAX_WIDTH
      : false;
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

  collapseHeader(): void {
    if (!this.compactHeaderEnabled() && !this.isDetailRoute()) {
      return;
    }

    this.headerCollapsed.set(true);
    this.detailHeaderRevealed.set(false);
  }

  expandHeader(): void {
    this.headerCollapsed.set(false);
    if (this.isDetailRoute()) {
      this.detailHeaderRevealed.set(true);
    }
  }

  toggleDetailHeader(): void {
    if (!this.isDetailRoute()) {
      this.expandHeader();
      return;
    }

    if (this.headerCollapsed()) {
      this.expandHeader();
      return;
    }

    this.collapseHeader();
  }

  detailHeaderMode(): boolean {
    return this.isDetailRoute();
  }

  headerToggleVisible(): boolean {
    return this.compactHeaderEnabled() || this.detailHeaderMode();
  }

  showHeaderCloseButton(): boolean {
    return this.compactHeaderEnabled() && !this.detailHeaderMode();
  }

  private syncDetailHeaderState(): void {
    if (this.isDetailRoute()) {
      this.minimizeDetailHeader();
      return;
    }

    this.detailHeaderRevealed.set(false);
    if (!this.compactHeaderEnabled()) {
      this.headerCollapsed.set(false);
    }
  }

  private revealDetailHeader(): void {
    this.headerCollapsed.set(false);
    this.detailHeaderRevealed.set(true);
  }

  private minimizeDetailHeader(): void {
    this.headerCollapsed.set(true);
    this.detailHeaderRevealed.set(false);
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
      items.push({ label: 'button.save', icon: 'save', kind: 'action', action: 'save' });
    }

    items.push(
      { label: 'button.focus', icon: 'focus', kind: 'action', action: 'focus' },
      { label: 'button.share', icon: 'share', kind: 'action', action: 'share' },
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

    if (item.icon === 'profile') {
      return url === '/profile';
    }

    if (item.icon === 'space') {
      return url === '/my-space';
    }

    if (item.icon === 'admin') {
      return url === '/admin' || url.startsWith('/admin/');
    }

    if (item.icon === 'articles') {
      return url.startsWith('/entities/article');
    }

    if (item.icon === 'settings') {
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
        return contextual.isSaved ? this.i18n.t('button.removingSaved') : this.i18n.t('button.saving');
      }

      return contextual?.isSaved ? this.i18n.t('button.saved') : this.i18n.t(item.label);
    }

    if (item.kind === 'action' && item.action === 'focus') {
      return this.i18n.t('button.focus');
    }

    return this.i18n.t(item.label);
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
