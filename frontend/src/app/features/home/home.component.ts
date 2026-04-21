import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { navigateToAppSearch } from '../../core/search/search-navigation';
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
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setPageMeta({
      title: 'JANO | Discover Art Through Visual Exploration',
      description:
        'Explore artworks, articles, artists, movements, periods, and concepts in JANO through an immersive, visual-first art discovery experience.',
      path: '/',
      image: '/assets/home/artwork.jpg',
    });
  }

  deckItems: DeckItem[] = [
    {
      id: 'artwork',
      eyebrow: 'Artwork',
      title: 'Obras',
      description: 'Piezas clave para estudiar forma, técnica, simbolismo y contexto.',
      meta: 'Artwork',
      cta: 'Explorar obras →',
      image: '/assets/home/artwork.jpg',
      imageWidth: 736,
      imageHeight: 736,
      routeType: 'artwork',
    },
    {
      id: 'article',
      eyebrow: 'Article',
      title: 'Artículos',
      description: 'Lecturas editoriales, opinión y conexiones entre obras, autores e ideas.',
      meta: 'Article',
      cta: 'Explorar artículos →',
      image: '/assets/home/concept.jpg',
      imageWidth: 639,
      imageHeight: 960,
      routeType: 'article',
    },
    {
      id: 'artist',
      eyebrow: 'Artist',
      title: 'Artistas',
      description: 'Autores, trayectorias, obsesiones visuales e influencias cruzadas.',
      meta: 'Artist',
      cta: 'Explorar artistas →',
      image: '/assets/home/artist.jpg',
      imageWidth: 736,
      imageHeight: 736,
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
      imageWidth: 736,
      imageHeight: 977,
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
      imageWidth: 600,
      imageHeight: 800,
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
      imageWidth: 639,
      imageHeight: 960,
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
}
