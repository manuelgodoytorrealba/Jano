import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AppAppearanceService } from '../../core/app-appearance.service';
import { HomeDeck, HomeDecksApi } from '../../core/api/home-decks.api';
import { AuthService } from '../../core/auth/auth.service';
import { SeoService } from '../../core/seo/seo.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { navigateToAppSearch } from '../../core/search/search-navigation';
import { EntityDeckComponent } from '../../shared/ui/entity-deck/entity-deck.component';
import { DeckItem, DeckRailAction } from '../../shared/ui/entity-deck/entity-deck.types';

type HomeLoadState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [EntityDeckComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private router = inject(Router);
  private readonly appearance = inject(AppAppearanceService);
  private readonly homeDecksApi = inject(HomeDecksApi);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly deckItems = signal<DeckItem[]>([]);
  readonly loadState = signal<HomeLoadState>('loading');

  constructor() {
    this.seo.setPageMeta({
      title: 'JANO | Connected Cultural Knowledge',
      description:
        'Explore connected cultural knowledge in JANO through an immersive, visual-first discovery experience.',
      path: '/',
      image: '/assets/home/artwork.jpg',
    });

    effect(() => {
      const locale = this.i18n.locale();
      const cachedDecks = this.homeDecksApi.readCachedPublic('HOME', locale);

      if (cachedDecks) this.setDecks(cachedDecks);
      this.loadHomeDecks(locale);
    });
  }

  onCardClick(item: DeckItem): void {
    this.navigateDeckItem(item);
  }

  backgroundImage(): string {
    return this.appearance.currentBackgroundImageUrl();
  }

  onExpandClick(item: DeckItem): void {
    this.navigateDeckItem(item);
  }

  showAdminEdit(): boolean {
    return this.auth.currentUser?.role === 'ADMIN';
  }

  onAdminEditClick(item: DeckItem): void {
    if (item.adminEditRoute) void this.router.navigateByUrl(item.adminEditRoute);
  }

  onRailClick(action: DeckRailAction): void {
    if (action === 'home') {
      void this.router.navigate(['/']);
      return;
    }

    if (action === 'picks') {
      void this.router.navigate(['/curated']);
      return;
    }

    if (action === 'profile') {
      void this.router.navigate(['/my-space']);
    }
  }

  onSearchSubmit(query: string): void {
    void navigateToAppSearch(this.router, query);
  }

  onTabChange(tab: 'home' | 'picks' | 'my-space'): void {
    if (tab === 'home') {
      void this.router.navigate(['/']);
      return;
    }

    if (tab === 'picks') {
      void this.router.navigate(['/curated']);
      return;
    }

    if (tab === 'my-space') {
      void this.router.navigate(['/my-space']);
    }
  }

  retryLoad(): void {
    this.loadHomeDecks(this.i18n.locale());
  }

  private loadHomeDecks(locale: string): void {
    if (!this.deckItems().length) this.loadState.set('loading');

    this.homeDecksApi
      .listPublic('HOME', locale)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (decks) => this.setDecks(decks),
        error: () => {
          if (!this.deckItems().length) this.loadState.set('error');
        },
      });
  }

  private setDecks(decks: HomeDeck[]): void {
    const items = decks.map((deck) => this.deckToItem(deck));
    this.deckItems.set(items);
    this.loadState.set(items.length ? 'ready' : 'empty');
  }

  private deckToItem(deck: HomeDeck): DeckItem {
    return {
      id: deck.id,
      eyebrow: deck.subtitle ?? 'Discover',
      title: deck.title,
      description: deck.description ?? undefined,
      meta: deck.entities.length
        ? `${deck.entities.length} ${this.i18n.t('home.entities')}`
        : this.i18n.t('home.editorialDeck'),
      cta: `${deck.ctaLabel || this.i18n.t('home.viewSelection')} →`,
      image: deck.image?.url ?? '',
      imageWidth: deck.image?.width ?? undefined,
      imageHeight: deck.image?.height ?? undefined,
      routeType: this.routeTypeFromDeck(deck),
      ctaRoute: deck.ctaRoute ?? `/entities?deck=${encodeURIComponent(deck.slug)}`,
      ctaUrl: deck.ctaUrl ?? undefined,
      adminEditRoute: '/admin/home-decks/' + deck.id + '/edit?returnTo=/',
    };
  }

  private routeTypeFromDeck(deck: HomeDeck): string | undefined {
    const route = deck.ctaRoute ?? '';
    const match = route.match(/^\/entities\/([^/?#]+)/);
    return match?.[1] ?? undefined;
  }

  private navigateDeckItem(item: DeckItem): void {
    if (item.ctaUrl) {
      window.location.href = item.ctaUrl;
      return;
    }

    if (item.ctaRoute) {
      void this.router.navigateByUrl(item.ctaRoute);
      return;
    }

    if (item.routeType) {
      void this.router.navigate(['/entities', item.routeType]);
    }
  }
}
