import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EntityDeckComponent } from '../../shared/ui/entity-deck/entity-deck.component';
import { DeckItem, DeckRailAction } from '../../shared/ui/entity-deck/entity-deck.types';

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

    deckItems: DeckItem[] = [
        {
            id: 'pick-1',
            eyebrow: 'Staff Pick',
            title: 'Obras esenciales',
            description: 'Una selección curada para entrar a Jano por piezas clave y conexiones fuertes.',
            meta: 'Curated List',
            cta: 'Ver selección →',
            image: '/assets/home/artwork.jpg',
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
            routeType: 'concept',
        },
    ];

    onCardClick(item: DeckItem): void {
        if (!item.routeType) return;
        this.router.navigate(['/entities', item.routeType]);
    }

    onExpandClick(item: DeckItem): void {
        if (!item.routeType) return;
        this.router.navigate(['/entities', item.routeType]);
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
        console.log('search:', query);
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
}