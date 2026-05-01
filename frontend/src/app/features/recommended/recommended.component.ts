import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AppAppearanceService } from '../../core/app-appearance.service';
import { HomeDeck, HomeDecksApi } from '../../core/api/home-decks.api';
import { SeoService } from '../../core/seo/seo.service';
import { navigateToAppSearch } from '../../core/search/search-navigation';
import { EntityDeckComponent } from '../../shared/ui/entity-deck/entity-deck.component';
import { DeckItem, DeckRailAction } from '../../shared/ui/entity-deck/entity-deck.types';

const FALLBACK_RECOMMENDED_ITEMS: DeckItem[] = [
    {
        id: 'pick-1',
        eyebrow: 'Staff Pick',
        title: 'Obras esenciales',
        description: 'Una selección curada para entrar a Jano por piezas clave y conexiones fuertes.',
        meta: 'Curated List',
        cta: 'Ver selección →',
        image: '/assets/home/artwork.jpg',
        imageWidth: 736,
        imageHeight: 736,
        routeType: 'artwork',
    },
    {
        id: 'pick-2',
        eyebrow: 'Staff Pick',
        title: 'Artistas para empezar',
        description: 'Autores fundamentales para entender estilos, rupturas e influencias.',
        meta: 'Curated List',
        cta: 'Explorar artistas →',
        image: '/assets/home/artist.jpg',
        imageWidth: 736,
        imageHeight: 736,
        routeType: 'artist',
    },
    {
        id: 'pick-3',
        eyebrow: 'Staff Pick',
        title: 'Movimientos imprescindibles',
        description: 'Corrientes que reorganizaron la mirada y cambiaron la historia del arte.',
        meta: 'Curated List',
        cta: 'Explorar movimientos →',
        image: '/assets/home/movement.jpg',
        imageWidth: 736,
        imageHeight: 977,
        routeType: 'movement',
    },
    {
        id: 'pick-4',
        eyebrow: 'Staff Pick',
        title: 'Períodos clave',
        description: 'Etapas históricas para orientarte rápido dentro del archivo.',
        meta: 'Curated List',
        cta: 'Explorar períodos →',
        image: '/assets/home/period.jpg',
        imageWidth: 600,
        imageHeight: 800,
        routeType: 'period',
    },
    {
        id: 'pick-5',
        eyebrow: 'Staff Pick',
        title: 'Conceptos base',
        description: 'Términos e ideas para leer mejor obras, artistas y relaciones.',
        meta: 'Curated List',
        cta: 'Explorar conceptos →',
        image: '/assets/home/concept.jpg',
        imageWidth: 639,
        imageHeight: 960,
        routeType: 'concept',
    },
];

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
