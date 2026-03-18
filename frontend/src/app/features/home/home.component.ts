import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EntityDeckComponent } from '../../shared/ui/entity-deck/entity-deck.component';
import { DeckItem, DeckRailAction } from '../../shared/ui/entity-deck/entity-deck.types';

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

  deckItems: DeckItem[] = [
    {
      id: 'artwork',
      eyebrow: 'Artwork',
      title: 'Obras',
      description: 'Piezas clave para estudiar forma, técnica, simbolismo y contexto.',
      meta: 'Artwork',
      cta: 'Explorar obras →',
      image: '/assets/home/artwork.jpg',
      routeType: 'artwork',
    },
    {
      id: 'artist',
      eyebrow: 'Artist',
      title: 'Artistas',
      description: 'Autores, trayectorias, obsesiones visuales e influencias cruzadas.',
      meta: 'Artist',
      cta: 'Explorar artistas →',
      image: '/assets/home/artist.jpg',
      routeType: 'artist',
    },
    {
      id: 'movement',
      eyebrow: 'Movement',
      title: 'Movimientos',
      description: 'Corrientes estéticas e ideas que redefinieron la historia del arte.',
      meta: 'Movement',
      cta: 'Explorar movimientos →',
      image: '/assets/home/movement.jpg',
      routeType: 'movement',
    },
    {
      id: 'period',
      eyebrow: 'Period',
      title: 'Períodos',
      description: 'Etapas históricas para entender cambios culturales y visuales.',
      meta: 'Period',
      cta: 'Explorar períodos →',
      image: '/assets/home/period.jpg',
      routeType: 'period',
    },
    {
      id: 'concept',
      eyebrow: 'Concept',
      title: 'Conceptos',
      description: 'Ideas fundamentales para leer obras y relaciones con más claridad.',
      meta: 'Concept',
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
    this.router.navigate(['/search'], {
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