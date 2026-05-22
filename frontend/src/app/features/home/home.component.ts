import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AppAppearanceService } from '../../core/app-appearance.service';
import { HomeDeck, HomeDecksApi } from '../../core/api/home-decks.api';
import { AuthService } from '../../core/auth/auth.service';
import { SeoService } from '../../core/seo/seo.service';
import { navigateToAppSearch } from '../../core/search/search-navigation';
import { EntityDeckComponent } from '../../shared/ui/entity-deck/entity-deck.component';
import { DeckItem, DeckRailAction } from '../../shared/ui/entity-deck/entity-deck.types';
import { HOME_FALLBACK_STARTERS, starterToDeckItem } from '../admin/home-deck-starters';

const FALLBACK_DECK_ITEMS: DeckItem[] = HOME_FALLBACK_STARTERS.map((starter) => starterToDeckItem(starter));

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
  private readonly destroyRef = inject(DestroyRef);

  readonly deckItems = signal<DeckItem[]>(FALLBACK_DECK_ITEMS);

  constructor() {
    this.seo.setPageMeta({
      title: 'JANO | Discover Art Through Visual Exploration',
      description:
        'Explore artworks, articles, artists, movements, periods, and concepts in JANO through an immersive, visual-first art discovery experience.',
      path: '/',
      image: '/assets/home/artwork.jpg',
    });

    this.loadHomeDecks();
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
    if (!item.adminEditRoute) return;
    this.router.navigateByUrl(item.adminEditRoute);
  }

  onRailClick(action: DeckRailAction): void {
    if (action === 'home') {
      this.router.navigate(['/']);
      return;
    }

    if (action === 'picks') {
      this.router.navigate(['/recommended']);
      return;
    }

    if (action === 'profile') {
      this.router.navigate(['/my-space']);
    }
  }

  onSearchSubmit(query: string): void {
    void navigateToAppSearch(this.router, query);
  }

  onTabChange(tab: 'home' | 'picks' | 'my-space'): void {
    if (tab === 'home') {
      this.router.navigate(['/']);
      return;
    }

    if (tab === 'picks') {
      this.router.navigate(['/recommended']);
      return;
    }

    if (tab === 'my-space') {
      this.router.navigate(['/my-space']);
    }
  }

  private loadHomeDecks(): void {
    this.homeDecksApi
      .listPublic()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (decks) => {
          const items = decks
            .map((deck) => this.deckToItem(deck))
            .filter((item): item is DeckItem => !!item);

          if (items.length) {
            this.deckItems.set(items);
          }
        },
        error: () => {
          this.deckItems.set(FALLBACK_DECK_ITEMS);
        },
      });
  }

  private deckToItem(deck: HomeDeck): DeckItem | null {
    const image = deck.image?.url ?? '/assets/home/artwork.jpg';

    return {
      id: deck.id,
      eyebrow: deck.subtitle ?? 'Discover',
      title: deck.title,
      description: deck.description ?? undefined,
      meta: deck.entities.length ? `${deck.entities.length} entidades` : 'Editorial deck',
      cta: `${deck.ctaLabel || 'Ver selección'} →`,
      image,
      imageWidth: deck.image?.width ?? undefined,
      imageHeight: deck.image?.height ?? undefined,
      routeType: this.routeTypeFromDeck(deck),
      ctaRoute: deck.ctaRoute ?? `/entities?deck=${encodeURIComponent(deck.slug)}`,
      ctaUrl: deck.ctaUrl ?? undefined,
      adminEditRoute: `/admin/home-decks/${deck.id}/edit?returnTo=/`,
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
      this.router.navigateByUrl(item.ctaRoute);
      return;
    }

    if (item.routeType) {
      this.router.navigate(['/entities', item.routeType]);
    }
  }
}
