import {
  afterNextRender,
  ElementRef,
  Injector,
  viewChild,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AppAppearanceService } from '../../core/app-appearance.service';
import { EntitiesApi } from '../../core/api/entities.api';
import { ArchiveCardEditorComponent } from './archive-card-editor.component';
import { PublicHomeEntityTypeCard } from '../../core/api/entities.models';
import { entityTypeLabel } from '../../core/i18n/domain-labels';
import { AuthService } from '../../core/auth/auth.service';
import { SeoService } from '../../core/seo/seo.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { resolveEntityMediaItem } from '../../shared/media/media.utils';

const ARCHIVE_SELECTION_KEY = 'jano.archive.types';

type HomeLoadState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [RouterLink, ArchiveCardEditorComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly appearance = inject(AppAppearanceService);
  private readonly entitiesApi = inject(EntitiesApi);
  private readonly seo = inject(SeoService);
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly cards = signal<PublicHomeEntityTypeCard[]>([]);
  readonly showAllTypes = signal(false);
  readonly recentKeys = signal<string[]>([]);
  readonly additionMessage = signal('');
  private readonly removingKeys = new Set<string>();
  private readonly page = viewChild<ElementRef<HTMLElement>>('archivePage');
  private readonly injector = inject(Injector);

  toggleTypes(): void {
    if (this.showAllTypes()) {
      this.closeTypes();
      return;
    }
    this.recentKeys.set([]);
    this.additionMessage.set('');
    this.showAllTypes.set(true);
  }

  closeTypes(): void {
    this.showAllTypes.set(false);
    const page = this.page()?.nativeElement;
    page
      ?.querySelector<HTMLButtonElement>('.archive-page__add-toggle')
      ?.focus({ preventScroll: true });
    if (this.recentKeys().length)
      page?.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
  }

  private readonly selectedKeys = signal<string[] | null>(this.readSelection());
  readonly announcement = signal('');
  readonly editing = signal<PublicHomeEntityTypeCard | null>(null);
  readonly editorImage = computed(
    () => this.deckItems().find((item) => item.key === this.editing()?.type.key)?.image ?? '',
  );
  editCard(key: string): void {
    if (this.auth.currentUser?.role === 'ADMIN')
      this.editing.set(this.cards().find((card) => card.type.key === key) ?? null);
  }
  finishEditing(saved = false): void {
    const key = this.editing()?.type.key;
    this.editing.set(null);
    if (saved) {
      this.loadHomeDecks();
      this.announcement.set(this.i18n.t('archive.editor.saved'));
    }
    if (key) document.getElementById('archive-edit-' + key)?.focus();
  }
  readonly deckItems = computed(() =>
    this.cards().map(({ type, entity }) => ({
      id: `core-${type.key}`,
      key: type.key,
      title:
        (this.i18n.locale() === 'en' ? type.archiveTitleEn : type.archiveTitleEs) ||
        (['FASHION_COLLECTION', 'FASHION_PIECE'].includes(type.key)
          ? this.i18n.t('archive.type.' + type.key)
          : type.systemType
            ? this.typeTitle(type.key)
            : type.pluralName),
      description:
        (this.i18n.locale() === 'en' ? type.archiveDescriptionEn : type.archiveDescriptionEs) ||
        (type.systemType || ['FASHION_COLLECTION', 'FASHION_PIECE'].includes(type.key)
          ? this.coreTypeDescription(type.key)
          : (type.description ?? '')),
      image:
        type.homeCoverMedia?.url ||
        resolveEntityMediaItem(entity, 'card')?.url ||
        entity?.image ||
        '',
      ctaRoute: `/entities/${type.key.toLowerCase()}`,
      icon: type.icon,
    })),
  );
  readonly featuredItems = computed(() => {
    const items = this.deckItems();
    const keys = this.selectedKeys();
    return keys === null
      ? items.slice(0, 8)
      : keys.flatMap((key) => items.filter((item) => item.key === key));
  });
  readonly otherItems = computed(() => {
    const selected = new Set(this.featuredItems().map((item) => item.key));
    return this.deckItems().filter((item) => !selected.has(item.key));
  });
  readonly loadState = signal<HomeLoadState>('loading');

  constructor() {
    this.seo.setPageMeta({
      title: `${this.i18n.t('nav.explore')} | JANO`,
      description:
        'Explore connected cultural knowledge in JANO through an immersive, visual-first discovery experience.',
      path: '/entities',
      image: '/assets/home/artwork.jpg',
    });

    // Archive data loads after hydration so an API hop does not block SSR.
    if (isPlatformBrowser(this.platformId)) this.loadHomeDecks();
  }

  addType(key: string): void {
    const available = this.otherItems();
    const index = available.findIndex((item) => item.key === key);
    const item = available[index];
    if (!item) return;
    const page = this.page()?.nativeElement;
    const positions = new Map(
      Array.from(page?.querySelectorAll<HTMLElement>('[data-card-key]') ?? []).map((card) => [
        card.dataset['cardKey'],
        card.getBoundingClientRect(),
      ]),
    );
    this.saveSelection([key, ...this.featuredItems().map((item) => item.key)]);
    this.recentKeys.update((keys) => [key, ...keys.filter((value) => value !== key)]);
    const message = `${item.title}: ${this.i18n.t('archive.added')} ✓`;
    this.additionMessage.set(message);
    this.announcement.set(message);
    afterNextRender(
      () => {
        const buttons = page?.querySelectorAll<HTMLButtonElement>('.archive-page__type');
        const next = buttons?.[Math.min(index, buttons.length - 1)];
        (next ?? page?.querySelector<HTMLButtonElement>('.archive-page__done'))?.focus({
          preventScroll: true,
        });
        if (
          !window.matchMedia('(min-width: 861px)').matches ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        )
          return;
        page?.querySelectorAll<HTMLElement>('[data-card-key]').forEach((card) => {
          const before = positions.get(card.dataset['cardKey']);
          if (!before) return;
          const after = card.getBoundingClientRect();
          card.animate(
            [
              {
                transform: `translate(${before.left - after.left}px, ${before.top - after.top}px)`,
              },
              { transform: 'translate(0, 0)' },
            ],
            { duration: 350, easing: 'cubic-bezier(.2,.8,.2,1)' },
          );
        });
      },
      { injector: this.injector },
    );
  }

  async removeType(key: string): Promise<void> {
    const item = this.featuredItems().find((item) => item.key === key);
    if (!item || this.removingKeys.has(key)) return;
    this.removingKeys.add(key);
    const page = this.page()?.nativeElement;
    const card = Array.from(page?.querySelectorAll<HTMLElement>('[data-card-key]') ?? []).find(
      (card) => card.dataset['cardKey'] === key,
    );
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (card && !reducedMotion) {
      await card
        .animate(
          [
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'scale(.96)' },
          ],
          { duration: 180, easing: 'ease-in', fill: 'forwards' },
        )
        .finished.catch(() => undefined);
    }
    this.removingKeys.delete(key);
    if (this.destroyRef.destroyed) return;
    const positions = new Map(
      Array.from(page?.querySelectorAll<HTMLElement>('[data-card-key]') ?? []).map((card) => [
        card.dataset['cardKey'],
        card.getBoundingClientRect(),
      ]),
    );
    const moveFocus = !!card?.contains(document.activeElement);
    const current = this.featuredItems();
    const index = current.findIndex((item) => item.key === key);
    const remaining = current.filter((item) => item.key !== key);
    const neighbor = remaining[Math.min(index, remaining.length - 1)]?.key;
    this.saveSelection(remaining.map((item) => item.key));
    this.recentKeys.update((keys) => keys.filter((value) => value !== key));
    this.announcement.set(`${item.title}: ${this.i18n.t('archive.removed')}`);
    afterNextRender(
      () => {
        const cards = Array.from(page?.querySelectorAll<HTMLElement>('[data-card-key]') ?? []);
        if (moveFocus) {
          const button = cards
            .find((card) => card.dataset['cardKey'] === neighbor)
            ?.querySelector<HTMLButtonElement>('.archive-page__remove');
          (button ?? page?.querySelector<HTMLButtonElement>('.archive-page__add-toggle'))?.focus({
            preventScroll: true,
          });
        }
        if (reducedMotion) return;
        cards.forEach((card) => {
          const before = positions.get(card.dataset['cardKey']);
          if (!before) return;
          const after = card.getBoundingClientRect();
          card.animate(
            [
              {
                transform: `translate(${before.left - after.left}px, ${before.top - after.top}px)`,
              },
              { transform: 'translate(0, 0)' },
            ],
            { duration: 220, easing: 'ease-out' },
          );
        });
      },
      { injector: this.injector },
    );
  }

  private readSelection(): string[] | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const stored = window.localStorage.getItem(ARCHIVE_SELECTION_KEY);
      if (stored === null) return null;
      const keys: unknown = JSON.parse(stored);
      return Array.isArray(keys) && keys.every((key) => typeof key === 'string')
        ? [...new Set(keys)]
        : null;
    } catch {
      return null;
    }
  }

  private saveSelection(keys: string[]): void {
    this.selectedKeys.set(keys);
    try {
      window.localStorage.setItem(ARCHIVE_SELECTION_KEY, JSON.stringify(keys));
    } catch {
      // Storage may be unavailable; the selection still works for this visit.
    }
  }

  backgroundImage(): string {
    return this.appearance.currentBackgroundImageUrl();
  }

  hideBrokenImage(event: Event): void {
    (event.target as HTMLImageElement).hidden = true;
  }

  private typeTitle(key: string): string {
    const pluralKeys: Record<string, string> = {
      ARTWORK: 'entities.type.artwork',
      ARTIST: 'entities.type.artist',
      CONCEPT: 'entities.type.concept',
      MOVEMENT: 'entities.type.movement',
      PERIOD: 'entities.type.period',
      PLACE: 'entities.type.place',
      ARTICLE: 'entities.type.article',
      TEXT: 'entities.type.text',
    };
    return pluralKeys[key] ? this.i18n.t(pluralKeys[key]) : entityTypeLabel(key, this.i18n);
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
    const priorities = [
      'ARTWORK',
      'ARTIST',
      'CONCEPT',
      'FASHION_COLLECTION',
      'PLACE',
      'PERIOD',
      'MOVEMENT',
      'PERSON',
    ];
    const rank = (key: string) => {
      const index = priorities.indexOf(key);
      return index < 0 ? priorities.length : index;
    };
    this.cards.set([...cards].sort((a, b) => rank(a.type.key) - rank(b.type.key)));
    this.loadState.set(cards.length ? 'ready' : 'empty');
  }

  private coreTypeDescription(type: string): string {
    const descriptions: Record<string, { es: string; en: string }> = {
      FASHION_COLLECTION: {
        es: 'Colecciones y temporadas de la historia de la moda.',
        en: 'Collections and seasons from fashion history.',
      },
      FASHION_PIECE: {
        es: 'Prendas y piezas para explorar forma, materia y autoría.',
        en: 'Garments and pieces exploring form, material and authorship.',
      },
      PERSON: {
        es: 'Personas y trayectorias que conectan la cultura.',
        en: 'People and careers connecting culture.',
      },
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
}
