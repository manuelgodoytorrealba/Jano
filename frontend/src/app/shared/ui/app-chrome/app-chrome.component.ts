import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  HostListener,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
} from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AppAppearanceService } from '../../../core/app-appearance.service';
import { AppChromeRailService, ContextualRailAction } from './app-chrome-rail.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { filter, fromEvent } from 'rxjs';
import { GlobalSearchComponent } from './global-search.component';

type HeaderNavItem = {
  label: string;
  route?: string;
  kind: 'route' | 'placeholder';
  exact?: boolean;
  icon: 'home' | 'archive' | 'articles' | 'research';
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
  imports: [RouterLink, GlobalSearchComponent],
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
  readonly appearance = inject(AppAppearanceService);
  private readonly currentUrl = signal(this.normalizeUrl(this.router.url));
  private readonly pendingUrl = signal<string | null>(null);
  readonly compactHeaderEnabled = signal(this.readCompactHeaderEnabled());
  readonly headerCollapsed = signal(this.shouldStartHeaderCollapsed());
  readonly accountMenuOpen = signal(false);
  readonly detailHeaderRevealed = signal(false);
  readonly brandPressing = signal(false);
  readonly orientationLockVisible = signal(this.readOrientationLockVisible());
  readonly headerDragOffset = signal(0);
  readonly chromeReady = signal(false);
  private sheetPointerId: number | null = null;
  private sheetPointerStartY = 0;
  private sheetPointerStartX = 0;
  private sheetPointerLastY = 0;
  private sheetPointerLastAt = 0;
  private sheetPointerVelocity = 0;

  @HostBinding('class.app-chrome--orientation-lock')
  get orientationLockActive(): boolean {
    return this.orientationLockVisible();
  }

  @HostBinding('class.app-chrome--ready')
  get ready(): boolean {
    return this.chromeReady();
  }

  readonly navItems: HeaderNavItem[] = [
    { label: 'nav.discover', route: '/home', kind: 'route', exact: true, icon: 'home' },
    { label: 'nav.explore', route: '/entities', kind: 'route', icon: 'archive' },
    { label: 'nav.articles', route: '/entities/article', kind: 'route', icon: 'articles' },
    { label: 'nav.research', route: '/research', kind: 'route', icon: 'research' },
  ];

  readonly utilityItems: UtilityItem[] = [
    { label: 'nav.profile', route: '/profile', icon: 'profile', kind: 'route' },
    { label: 'nav.mySpace', route: '/my-space', icon: 'space', kind: 'route' },
    { label: 'nav.articles', route: '/entities/article', icon: 'articles', kind: 'route' },
    { label: 'nav.research', route: '/research', icon: 'articles', kind: 'route' },
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
    afterNextRender(() => this.chromeReady.set(true));

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
          this.pendingUrl.set(this.normalizeUrl(event.url));
          return;
        }

        this.currentUrl.set(this.normalizeUrl(this.router.url));
        this.pendingUrl.set(null);
        this.syncHeaderState();
      });

    if (typeof window !== 'undefined') {
      fromEvent(window, 'resize')
        .pipe(takeUntilDestroyed())
        .subscribe(() => {
          const compact = this.readCompactHeaderEnabled();
          this.orientationLockVisible.set(this.readOrientationLockVisible());
          this.compactHeaderEnabled.set(compact);

          this.syncHeaderState();
        });

      fromEvent<KeyboardEvent>(window, 'keydown')
        .pipe(takeUntilDestroyed())
        .subscribe((event) => {
          if (event.key === 'Escape') {
            if (this.accountMenuOpen()) {
              this.accountMenuOpen.set(false);
            } else if (this.isDetailRoute()) {
              this.revealDetailHeader();
            }
          }
        });
    }

    this.syncHeaderState();
  }

  private shouldStartHeaderCollapsed(): boolean {
    const url = this.normalizeUrl(this.router.url);
    return shouldCollapseHeaderInitially(this.readCompactHeaderEnabled(), url);
  }

  private readOrientationLockVisible(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const isIpad =
      (/iPad/i.test(window.navigator.userAgent) ||
        (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)) &&
      window.innerWidth >= 768 &&
      window.innerWidth <= 1180;

    return (
      isIpad &&
      window.matchMedia('(orientation: portrait) and (pointer: coarse) and (hover: none)').matches
    );
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
    const url = this.activeUrl();
    return url.startsWith('/entity/') || /^\/research\/[^/]+$/.test(url);
  }

  isAdminRoute(): boolean {
    return this.activeUrl().startsWith('/admin');
  }

  collapseHeader(): void {
    if (!this.compactHeaderEnabled() && !this.isDetailRoute()) {
      return;
    }

    this.headerDragOffset.set(0);
    this.headerCollapsed.set(true);
    this.detailHeaderRevealed.set(false);
  }

  expandHeader(): void {
    this.headerDragOffset.set(0);
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

  onSheetPointerDown(event: PointerEvent): void {
    if (this.headerCollapsed() || !this.compactHeaderEnabled()) {
      return;
    }

    this.sheetPointerId = event.pointerId;
    this.sheetPointerStartY = event.clientY;
    this.sheetPointerStartX = event.clientX;
    this.sheetPointerLastY = event.clientY;
    this.sheetPointerLastAt = performance.now();
    this.sheetPointerVelocity = 0;
    this.headerDragOffset.set(0);
    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  @HostListener('document:pointermove', ['$event'])
  onSheetPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.sheetPointerId) return;

    const horizontalDistance = Math.abs(event.clientX - this.sheetPointerStartX);
    const verticalDistance = event.clientY - this.sheetPointerStartY;
    const now = performance.now();
    const elapsed = Math.max(1, now - this.sheetPointerLastAt);

    this.sheetPointerVelocity = (event.clientY - this.sheetPointerLastY) / elapsed;
    this.sheetPointerLastY = event.clientY;
    this.sheetPointerLastAt = now;

    if (horizontalDistance > Math.abs(verticalDistance) && horizontalDistance > 12) {
      this.headerDragOffset.set(0);
      return;
    }

    this.headerDragOffset.set(Math.max(0, verticalDistance));
  }

  @HostListener('document:pointerup', ['$event'])
  onSheetPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.sheetPointerId) return;

    const distance = this.headerDragOffset();
    const headerHeight =
      document.querySelector<HTMLElement>('.app-chrome__header')?.offsetHeight ?? 620;
    const distanceThreshold = Math.min(160, Math.max(96, headerHeight * 0.22));
    const shouldCollapse =
      distance >= distanceThreshold || (distance >= 48 && this.sheetPointerVelocity > 0.7);
    this.sheetPointerId = null;
    this.headerDragOffset.set(0);

    if (shouldCollapse) this.collapseHeader();
  }

  @HostListener('document:pointercancel', ['$event'])
  onSheetPointerCancel(event: PointerEvent): void {
    if (event.pointerId !== this.sheetPointerId) return;

    this.sheetPointerId = null;
    this.headerDragOffset.set(0);
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('.app-chrome__header, .app-chrome__header-toggle')) {
      return;
    }

    this.accountMenuOpen.set(false);
    if (this.isDetailRoute() && !this.headerCollapsed()) this.collapseHeader();
  }

  detailHeaderMode(): boolean {
    return this.isDetailRoute();
  }

  headerToggleVisible(): boolean {
    return this.compactHeaderEnabled() || this.detailHeaderMode();
  }

  showHeaderCloseButton(): boolean {
    return this.compactHeaderEnabled();
  }

  accountName(): string {
    return (
      this.auth.currentUser?.name?.trim() || this.auth.currentUser?.email?.split('@')[0] || 'JANO'
    );
  }

  toggleAccountMenu(): void {
    this.accountMenuOpen.set(!this.accountMenuOpen());
  }

  closeAccountMenu(): void {
    this.accountMenuOpen.set(false);
  }

  logout(): void {
    this.closeAccountMenu();
    this.auth.logout();
  }

  toggleTheme(): void {
    this.appearance.setThemePreference(
      this.appearance.resolvedTheme() === 'dark' ? 'light' : 'dark',
    );
  }

  toggleLocale(): void {
    this.i18n.setLocale(this.i18n.locale() === 'es' ? 'en' : 'es');
  }

  themeToggleLabel(): string {
    return this.i18n.t(
      this.appearance.resolvedTheme() === 'dark' ? 'button.switchToLight' : 'button.switchToDark',
    );
  }

  localeToggleLabel(): string {
    return this.i18n.t(
      this.i18n.locale() === 'es' ? 'button.switchToEnglish' : 'button.switchToSpanish',
    );
  }

  private syncHeaderState(): void {
    if (this.isDetailRoute()) {
      this.minimizeDetailHeader();
      return;
    }

    this.detailHeaderRevealed.set(false);

    if (this.isHomeRoute() && this.compactHeaderEnabled()) {
      this.headerCollapsed.set(true);
      return;
    }

    if (!this.compactHeaderEnabled()) {
      this.headerCollapsed.set(false);
    }
  }

  private isHomeRoute(): boolean {
    return this.activeUrl() === '/';
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

    if (!state) {
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
    return isHeaderRouteActive(route, activeUrl, 'exact' in item && !!item.exact);
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
      return item.action === 'save' ? (contextual.isSaved ?? false) : false;
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
      return item.route === '/research'
        ? url.startsWith('/research')
        : url.startsWith('/entities/article');
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
        return contextual.isSaved
          ? this.i18n.t('button.removingSaved')
          : this.i18n.t('button.saving');
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
}

export function isHeaderRouteActive(route: string, activeUrl: string, exact = false): boolean {
  if (route === '/entities') {
    return (
      activeUrl === route ||
      (activeUrl.startsWith(`${route}/`) && !activeUrl.startsWith('/entities/article'))
    );
  }
  if (exact || route === '/') return activeUrl === route;
  return activeUrl.startsWith(route);
}

export function shouldCollapseHeaderInitially(compact: boolean, url: string): boolean {
  return compact || url.startsWith('/entity/') || /^\/research\/[^/]+$/.test(url);
}
