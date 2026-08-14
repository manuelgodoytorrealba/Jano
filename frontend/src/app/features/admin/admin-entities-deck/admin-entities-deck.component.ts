import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppAppearanceService } from '../../../core/app-appearance.service';
import { I18nService } from '../../../core/i18n/i18n.service';
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
  private readonly appearance = inject(AppAppearanceService);
  readonly i18n = inject(I18nService);

  get deckItems(): DeckItem[] {
    return [
      {
        id: 'admin-artwork',
        eyebrow: this.i18n.t('common.admin'),
        title: this.i18n.t('entities.type.artwork'),
        description: this.i18n.t('admin.entitiesDeck.artworkDescription'),
        meta: this.i18n.t('mySpace.type'),
        cta: this.i18n.t('admin.entitiesDeck.openArtworks') + ' →',
        image: '/assets/home/artwork.jpg',
        routeType: 'artwork',
      },
      {
        id: 'admin-artist',
        eyebrow: this.i18n.t('common.admin'),
        title: this.i18n.t('entities.type.artist'),
        description: this.i18n.t('admin.entitiesDeck.artistDescription'),
        meta: this.i18n.t('mySpace.type'),
        cta: this.i18n.t('admin.entitiesDeck.openArtists') + ' →',
        image: '/assets/home/artist.jpg',
        routeType: 'artist',
      },
      {
        id: 'admin-article',
        eyebrow: this.i18n.t('common.admin'),
        title: this.i18n.t('entities.type.article'),
        description: this.i18n.t('admin.entitiesDeck.articleDescription'),
        meta: this.i18n.t('mySpace.type'),
        cta: this.i18n.t('admin.entitiesDeck.openArticles') + ' →',
        image: '/assets/home/concept.jpg',
        routeType: 'article',
      },
      {
        id: 'admin-movement',
        eyebrow: this.i18n.t('common.admin'),
        title: this.i18n.t('entities.type.movement'),
        description: this.i18n.t('admin.entitiesDeck.movementDescription'),
        meta: this.i18n.t('mySpace.type'),
        cta: this.i18n.t('admin.entitiesDeck.openMovements') + ' →',
        image: '/assets/home/movement.jpg',
        routeType: 'movement',
      },
      {
        id: 'admin-period',
        eyebrow: this.i18n.t('common.admin'),
        title: this.i18n.t('entities.type.period'),
        description: this.i18n.t('admin.entitiesDeck.periodDescription'),
        meta: this.i18n.t('mySpace.type'),
        cta: this.i18n.t('admin.entitiesDeck.openPeriods') + ' →',
        image: '/assets/home/period.jpg',
        routeType: 'period',
      },
      {
        id: 'admin-concept',
        eyebrow: this.i18n.t('common.admin'),
        title: this.i18n.t('entities.type.concept'),
        description: this.i18n.t('admin.entitiesDeck.conceptDescription'),
        meta: this.i18n.t('mySpace.type'),
        cta: this.i18n.t('admin.entitiesDeck.openConcepts') + ' →',
        image: '/assets/home/concept.jpg',
        routeType: 'concept',
      },
    ];
  }

  backgroundImage(): string {
    return this.appearance.currentBackgroundImageUrl();
  }

  onCardClick(item: DeckItem): void {
    if (!item.routeType) return;

    void this.router.navigate(['/admin/entities'], {
      queryParams: {
        type: item.routeType.toUpperCase(),
      },
    });
  }

  onExpandClick(item: DeckItem): void {
    if (!item.routeType) return;

    void this.router.navigate(['/admin/entities'], {
      queryParams: {
        type: item.routeType.toUpperCase(),
      },
    });
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
      void this.router.navigate(['/admin']);
    }
  }

  onSearchSubmit(query: string): void {
    void this.router.navigate(['/admin/entities'], {
      queryParams: { q: query },
    });
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
}
