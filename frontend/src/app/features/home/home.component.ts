import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AppAppearanceService } from '../../core/app-appearance.service';
import { EntitiesApi } from '../../core/api/entities.api';
import { PublicHomeEntityTypeCard } from '../../core/api/entities.models';
import { entityTypeLabel } from '../../core/i18n/domain-labels';
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
  private readonly entitiesApi = inject(EntitiesApi);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

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

    // Home data is interactive and must not block Angular SSR on an API hop.
    // Hydration runs this branch in the browser and fills the deck immediately.
    if (isPlatformBrowser(this.platformId)) this.loadHomeDecks();
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
    this.loadHomeDecks();
  }

  private loadHomeDecks(): void {
    if (!this.deckItems().length) this.loadState.set('loading');

    this.entitiesApi
      .home()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entities) => this.setCoreDecks(entities),
        error: () => {
          if (!this.deckItems().length) this.loadState.set('error');
        },
      });
  }

  private setCoreDecks(cards: PublicHomeEntityTypeCard[]): void {
    const items = cards.map(({ type, entity }) => ({
      id: `core-${type.key}`,
      eyebrow: this.i18n.t('home.defaultEyebrow'),
      title: type.systemType ? entityTypeLabel(type.key, this.i18n) : type.singularName,
      description: type.systemType ? this.coreTypeDescription(type.key) : (type.description ?? ''),
      meta: entity?.title ?? type.pluralName,
      cta: `${this.i18n.t('home.viewSelection')} →`,
      image:
        entity?.resolvedMedia?.card?.url ?? entity?.resolvedMedia?.hero?.url ?? entity?.image ?? '',
      routeType: type.key.toLowerCase(),
      ctaRoute: `/entities/${type.key.toLowerCase()}`,
      adminEditRoute: '/admin/entity-types',
    }));
    this.deckItems.set(items);
    this.loadState.set(items.length ? 'ready' : 'empty');
  }

  private coreTypeDescription(type: string): string {
    const descriptions: Record<string, { es: string; en: string }> = {
      ARTWORK: {
        es: 'Obras y piezas que abren recorridos por forma, materia y contexto.',
        en: 'Works that open paths through form, material and context.',
      },
      ARTIST: {
        es: 'Personas, prácticas e influencias que articulan la historia cultural.',
        en: 'People, practices and influences that shape cultural history.',
      },
      CONCEPT: {
        es: 'Ideas transversales para cruzar obras, épocas y conversaciones.',
        en: 'Cross-cutting ideas connecting works, periods and conversations.',
      },
      MOVEMENT: {
        es: 'Corrientes y escuelas que dan forma a nuevas maneras de mirar.',
        en: 'Movements and schools that shape new ways of seeing.',
      },
      PERIOD: {
        es: 'Marcos temporales para situar cambios, continuidades y rupturas.',
        en: 'Timeframes for locating change, continuity and rupture.',
      },
      PLACE: {
        es: 'Lugares donde se encuentran prácticas, obras e instituciones.',
        en: 'Places where practices, works and institutions meet.',
      },
      EVENT: {
        es: 'Acontecimientos que desplazan la cultura y sus imaginarios.',
        en: 'Events that shift culture and its imaginaries.',
      },
      ORGANIZATION: {
        es: 'Museos, escuelas y agentes que sostienen la vida cultural.',
        en: 'Museums, schools and organisations that sustain cultural life.',
      },
      ARTICLE: {
        es: 'Textos editoriales para leer, interpretar y conectar conocimiento.',
        en: 'Editorial texts for reading, interpreting and connecting knowledge.',
      },
      TEXT: {
        es: 'Fuentes escritas que amplían el contexto de la biblioteca.',
        en: 'Written sources that extend the library context.',
      },
    };
    const value = descriptions[type] ?? descriptions['ARTWORK'];
    return this.i18n.locale().startsWith('en') ? value.en : value.es;
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
