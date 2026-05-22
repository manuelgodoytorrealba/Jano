import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AppAppearanceService } from '../../core/app-appearance.service';
import { HomeDeck, HomeDecksApi } from '../../core/api/home-decks.api';
import { SeoService } from '../../core/seo/seo.service';
import { navigateToAppSearch } from '../../core/search/search-navigation';
import { EntityDeckComponent } from '../../shared/ui/entity-deck/entity-deck.component';
import { DeckItem, DeckRailAction } from '../../shared/ui/entity-deck/entity-deck.types';
import { RECOMMENDED_FALLBACK_STARTERS, starterToDeckItem } from '../admin/home-deck-starters';

const FALLBACK_RECOMMENDED_ITEMS: DeckItem[] = RECOMMENDED_FALLBACK_STARTERS.map((starter) =>
    starterToDeckItem(starter),
);

@Component({
    standalone: true,
    selector: 'app-recommended',
    imports: [EntityDeckComponent],
    templateUrl: './recommended.component.html',
    styleUrl: './recommended.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendedComponent {
    private router = inject(Router);
    private readonly appearance = inject(AppAppearanceService);
    private readonly homeDecksApi = inject(HomeDecksApi);
    private readonly seo = inject(SeoService);
    private readonly destroyRef = inject(DestroyRef);

    readonly deckItems = signal<DeckItem[]>(FALLBACK_RECOMMENDED_ITEMS);

    constructor() {
        this.seo.setPageMeta({
            title: 'Recommended Art Picks | JANO',
            description:
                'Browse curated recommendations in JANO to start with essential artworks, artists, movements, periods, and concepts.',
            path: '/recommended',
            image: '/assets/home/artwork.jpg',
        });

        this.loadRecommendedDecks();
    }

    backgroundImage(): string {
        return this.appearance.currentBackgroundImageUrl();
    }

    onCardClick(item: DeckItem): void {
        this.navigateDeckItem(item);
    }

    onExpandClick(item: DeckItem): void {
        this.navigateDeckItem(item);
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

    private loadRecommendedDecks(): void {
        this.homeDecksApi
            .listPublic('RECOMMENDED')
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
                    this.deckItems.set(FALLBACK_RECOMMENDED_ITEMS);
                },
            });
    }

    private deckToItem(deck: HomeDeck): DeckItem {
        const image = deck.image?.url ?? '/assets/home/artwork.jpg';

        return {
            id: deck.id,
            eyebrow: deck.subtitle ?? 'Curated',
            title: deck.title,
            description: deck.description ?? undefined,
            meta: deck.entities.length ? `${deck.entities.length} entidades` : 'Curated List',
            cta: `${deck.ctaLabel || 'Ver selección'} →`,
            image,
            imageWidth: deck.image?.width ?? undefined,
            imageHeight: deck.image?.height ?? undefined,
            ctaRoute: `/entities?deck=${encodeURIComponent(deck.slug)}`,
            ctaUrl: deck.ctaUrl ?? undefined,
        };
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
