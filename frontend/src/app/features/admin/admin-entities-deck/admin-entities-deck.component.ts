import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EntityDeckComponent } from '../../../shared/ui/entity-deck/entity-deck.component';
import { DeckItem, DeckRailAction } from '../../../shared/ui/entity-deck/entity-deck.types';

@Component({
    standalone: true,
    selector: 'app-admin-entities-deck',
    imports: [EntityDeckComponent],
    templateUrl: './admin-entities-deck.component.html',
    styleUrl: './admin-entities-deck.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntitiesDeckComponent {
    private router = inject(Router);

    deckItems: DeckItem[] = [
        {
            id: 'admin-artwork',
            eyebrow: 'Admin',
            title: 'Obras',
            description: 'Gestiona las entidades del tipo artwork.',
            meta: 'Entity Type',
            cta: 'Abrir obras →',
            image: '/assets/home/artwork.jpg',
            routeType: 'artwork',
        },
        {
            id: 'admin-artist',
            eyebrow: 'Admin',
            title: 'Artistas',
            description: 'Gestiona las entidades del tipo artist.',
            meta: 'Entity Type',
            cta: 'Abrir artistas →',
            image: '/assets/home/artist.jpg',
            routeType: 'artist',
        },
        {
            id: 'admin-movement',
            eyebrow: 'Admin',
            title: 'Movimientos',
            description: 'Gestiona las entidades del tipo movement.',
            meta: 'Entity Type',
            cta: 'Abrir movimientos →',
            image: '/assets/home/movement.jpg',
            routeType: 'movement',
        },
        {
            id: 'admin-period',
            eyebrow: 'Admin',
            title: 'Períodos',
            description: 'Gestiona las entidades del tipo period.',
            meta: 'Entity Type',
            cta: 'Abrir períodos →',
            image: '/assets/home/period.jpg',
            routeType: 'period',
        },
        {
            id: 'admin-concept',
            eyebrow: 'Admin',
            title: 'Conceptos',
            description: 'Gestiona las entidades del tipo concept.',
            meta: 'Entity Type',
            cta: 'Abrir conceptos →',
            image: '/assets/home/concept.jpg',
            routeType: 'concept',
        },
    ];

    onCardClick(item: DeckItem): void {
        if (!item.routeType) return;

        this.router.navigate(['/admin/entities'], {
            queryParams: {
                type: item.routeType.toUpperCase(),
            },
        });
    }

    onExpandClick(item: DeckItem): void {
        if (!item.routeType) return;

        this.router.navigate(['/admin/entities'], {
            queryParams: {
                type: item.routeType.toUpperCase(),
            },
        });
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
            this.router.navigate(['/admin']);
        }
    }

    onSearchSubmit(query: string): void {
        this.router.navigate(['/admin/entities'], {
            queryParams: { q: query },
        });
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